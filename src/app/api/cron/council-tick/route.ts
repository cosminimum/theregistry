import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { askNextQuestion, generateDeliberation, finalizeVerdict } from '@/lib/interview/orchestrator';
import { REGISTRY_CONFIG } from '@/lib/config/registry';

/**
 * Cron endpoint for the full Council lifecycle
 *
 * Handles three phases:
 * 1. Interview: Ask questions to pending/in_progress interviews
 * 2. Deliberation: Generate council votes for deliberating interviews
 * 3. Verdict: Finalize verdict once all votes are in
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

    const results: Array<{
      interviewId: string;
      phase: string;
      triggered: boolean;
      detail?: string;
    }> = [];

    // --- Phase 1: Interview questions for pending/in_progress ---
    const { data: activeInterviews, error: fetchError } = await supabase
      .from('interviews')
      .select(`id, status, turn_count, current_judge`)
      .in('status', ['pending', 'in_progress']);

    if (fetchError) {
      console.error('Error fetching active interviews:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch interviews' },
        { status: 500 }
      );
    }

    for (const interview of (activeInterviews || [])) {
      // Check if there's already a pending question
      const { data: lastMessage } = await supabase
        .from('interview_messages')
        .select('role')
        .eq('interview_id', interview.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage?.role === 'judge') {
        results.push({
          interviewId: interview.id,
          phase: 'interview',
          triggered: false,
          detail: 'Question already pending',
        });
        continue;
      }

      const isFirstQuestion = interview.status === 'pending' || interview.turn_count === 0;
      const triggerChance = isFirstQuestion ? 1.0 : REGISTRY_CONFIG.QUESTION_TRIGGER_CHANCE;

      if (Math.random() > triggerChance) {
        results.push({
          interviewId: interview.id,
          phase: 'interview',
          triggered: false,
          detail: 'Roll failed',
        });
        continue;
      }

      const questionResult = await askNextQuestion(interview.id);
      results.push({
        interviewId: interview.id,
        phase: 'interview',
        triggered: questionResult.success,
        detail: questionResult.judge || questionResult.error,
      });
    }

    // --- Phase 2: Deliberation for interviews that need it ---
    const { data: deliberatingInterviews } = await supabase
      .from('interviews')
      .select('id')
      .eq('status', 'deliberating');

    for (const interview of (deliberatingInterviews || [])) {
      // Check if votes already exist
      const { count } = await supabase
        .from('council_votes')
        .select('*', { count: 'exact', head: true })
        .eq('interview_id', interview.id);

      if (count && count >= 7) {
        // Votes exist, finalize verdict
        const verdictResult = await finalizeVerdict(interview.id);
        results.push({
          interviewId: interview.id,
          phase: 'verdict',
          triggered: verdictResult.success,
          detail: verdictResult.verdict || verdictResult.error,
        });
      } else if (count && count > 0) {
        // Partial votes — something went wrong, skip
        results.push({
          interviewId: interview.id,
          phase: 'deliberation',
          triggered: false,
          detail: `Partial votes (${count}/7), skipping`,
        });
      } else {
        // No votes yet, generate deliberation
        const delibResult = await generateDeliberation(interview.id);
        if (delibResult.success) {
          // Immediately finalize after successful deliberation
          const verdictResult = await finalizeVerdict(interview.id);
          results.push({
            interviewId: interview.id,
            phase: 'deliberation+verdict',
            triggered: verdictResult.success,
            detail: verdictResult.verdict || verdictResult.error,
          });
        } else {
          results.push({
            interviewId: interview.id,
            phase: 'deliberation',
            triggered: false,
            detail: delibResult.error,
          });
        }
      }
    }

    const triggeredCount = results.filter(r => r.triggered).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${(activeInterviews || []).length} active + ${(deliberatingInterviews || []).length} deliberating interviews`,
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
