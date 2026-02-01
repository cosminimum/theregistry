import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { InterviewStatusResponse } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const supabase = createServerClient();

    // Get interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('status, turn_count, current_judge, created_at')
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Get last activity time
    const { data: lastMessage } = await supabase
      .from('interview_messages')
      .select('created_at')
      .eq('interview_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const response: InterviewStatusResponse = {
      status: interview.status,
      turnCount: interview.turn_count,
      lastActivity: lastMessage?.created_at || interview.created_at,
      currentJudge: interview.current_judge || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
