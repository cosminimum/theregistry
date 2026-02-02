import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { InterviewStatus } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const supabase = createServerClient();

    // Get interview with agent info
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        status,
        turn_count,
        current_judge,
        started_at,
        completed_at,
        created_at,
        applications!inner (
          agents!inner (
            name,
            human_handle
          )
        )
      `)
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Get messages (exclude deliberation messages - those are internal)
    const { data: messages } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', id)
      .neq('role', 'deliberation')
      .order('turn_number', { ascending: true })
      .order('created_at', { ascending: true });

    // Get votes if interview is complete or deliberating
    let votes: Array<{ judge_name: string; vote: string; statement: string; created_at: string }> = [];
    if (interview.status === 'complete' || interview.status === 'deliberating') {
      const { data: voteData } = await supabase
        .from('council_votes')
        .select('*')
        .eq('interview_id', id)
        .order('created_at', { ascending: true });

      votes = voteData || [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = interview.applications as any;

    const deliberation = {
      id: interview.id,
      status: interview.status as InterviewStatus,
      agentName: app.agents.name,
      humanHandle: app.agents.human_handle,
      currentJudge: interview.current_judge,
      interview: {
        messages: messages || [],
        startedAt: interview.started_at,
        completedAt: interview.completed_at,
        turnCount: interview.turn_count,
      },
      votes,
      createdAt: interview.created_at,
    };

    return NextResponse.json({ deliberation });
  } catch (error) {
    console.error('Error in deliberation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
