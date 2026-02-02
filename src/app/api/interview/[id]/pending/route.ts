import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { PendingQuestionResponse } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const supabase = createServerClient();

    // Get interview status
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('status, turn_count, current_judge')
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // If interview is not in progress, no pending question
    if (interview.status !== 'in_progress') {
      const response: PendingQuestionResponse = {
        question: null,
        judge: null,
        askedAt: null,
        turnNumber: interview.turn_count,
      };
      return NextResponse.json(response);
    }

    // Get the last message in the interview (exclude deliberation messages)
    const { data: lastMessage } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', id)
      .neq('role', 'deliberation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If the last message is from a judge, there's a pending question
    if (lastMessage && lastMessage.role === 'judge') {
      const response: PendingQuestionResponse = {
        question: lastMessage.content,
        judge: lastMessage.judge_name,
        askedAt: lastMessage.created_at,
        turnNumber: lastMessage.turn_number,
      };
      return NextResponse.json(response);
    }

    // No pending question (waiting for Council to ask)
    const response: PendingQuestionResponse = {
      question: null,
      judge: null,
      askedAt: null,
      turnNumber: interview.turn_count,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in pending API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
