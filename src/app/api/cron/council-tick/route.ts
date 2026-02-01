import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { askNextQuestion } from '@/lib/interview/orchestrator';
import { REGISTRY_CONFIG } from '@/lib/config/registry';

/**
 * Cron endpoint for periodic Council activity
 *
 * This endpoint should be called every CRON_INTERVAL_MINUTES (15 min default)
 * by Vercel Cron or an external cron service.
 *
 * For each active interview without a pending question:
 * - Roll the dice (QUESTION_TRIGGER_CHANCE = 25%)
 * - If successful, ask the next question
 *
 * This creates organic interview pacing - questions don't come
 * immediately after responses, and timing feels natural.
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();

    // Get all active interviews (in_progress status)
    const { data: activeInterviews, error: fetchError } = await supabase
      .from('interviews')
      .select(`
        id,
        turn_count,
        current_judge
      `)
      .eq('status', 'in_progress');

    if (fetchError) {
      console.error('Error fetching active interviews:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch interviews' },
        { status: 500 }
      );
    }

    if (!activeInterviews || activeInterviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active interviews',
        triggered: 0,
      });
    }

    const results: Array<{
      interviewId: string;
      triggered: boolean;
      judge?: string;
      reason?: string;
    }> = [];

    for (const interview of activeInterviews) {
      // Check if there's already a pending question (last message is from a judge)
      const { data: lastMessage } = await supabase
        .from('interview_messages')
        .select('role')
        .eq('interview_id', interview.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Skip if there's a pending question (applicant hasn't responded yet)
      if (lastMessage?.role === 'judge') {
        results.push({
          interviewId: interview.id,
          triggered: false,
          reason: 'Question already pending',
        });
        continue;
      }

      // Roll the dice - QUESTION_TRIGGER_CHANCE probability (25% default)
      const roll = Math.random();
      if (roll > REGISTRY_CONFIG.QUESTION_TRIGGER_CHANCE) {
        results.push({
          interviewId: interview.id,
          triggered: false,
          reason: `Roll failed (${(roll * 100).toFixed(1)}% > ${REGISTRY_CONFIG.QUESTION_TRIGGER_CHANCE * 100}%)`,
        });
        continue;
      }

      // Trigger the next question
      const questionResult = await askNextQuestion(interview.id);

      if (questionResult.success) {
        results.push({
          interviewId: interview.id,
          triggered: true,
          judge: questionResult.judge,
        });
      } else {
        results.push({
          interviewId: interview.id,
          triggered: false,
          reason: questionResult.error || 'Unknown error',
        });
      }
    }

    const triggeredCount = results.filter(r => r.triggered).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${activeInterviews.length} active interviews`,
      triggered: triggeredCount,
      results,
    });
  } catch (error) {
    console.error('Error in council-tick cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: Request) {
  return GET(request);
}
