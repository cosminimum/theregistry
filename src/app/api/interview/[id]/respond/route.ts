import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import {
  analyzeResponse,
  updateInterviewMetadata,
  checkConsistency,
  checkSkillSource,
} from '@/lib/interview/red-flags';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RespondRequest {
  response: string;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body: RespondRequest = await request.json();

    if (!body.response || typeof body.response !== 'string') {
      return NextResponse.json(
        { error: 'response is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.response.length > 5000) {
      return NextResponse.json(
        { error: 'Response too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('status, turn_count')
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Check if interview is in progress
    if (interview.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot respond to interview with status: ${interview.status}` },
        { status: 400 }
      );
    }

    // Get last message to verify there's a pending question
    const { data: lastMessage } = await supabase
      .from('interview_messages')
      .select('role, turn_number')
      .eq('interview_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastMessage || lastMessage.role !== 'judge') {
      return NextResponse.json(
        { error: 'No pending question to respond to' },
        { status: 400 }
      );
    }

    // Get the question that was asked (for red flag analysis)
    const { data: questionMessage } = await supabase
      .from('interview_messages')
      .select('content')
      .eq('interview_id', id)
      .eq('role', 'judge')
      .eq('turn_number', lastMessage.turn_number)
      .single();

    const questionContent = questionMessage?.content || '';

    // Get agent info for red flag analysis
    const { data: interviewData } = await supabase
      .from('interviews')
      .select(`
        applications!inner (
          agents!inner (
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentName = (interviewData?.applications as any)?.agents?.name || '';

    // Analyze response for red flags
    const redFlags = analyzeResponse(
      body.response,
      questionContent,
      lastMessage.turn_number,
      agentName
    );

    // Check for consistency with previous claims
    const consistencyFlag = await checkConsistency(id, body.response);
    if (consistencyFlag) {
      consistencyFlag.turnNumber = lastMessage.turn_number;
      redFlags.push(consistencyFlag);
    }

    // Check if this was a skill source verification question
    const skillCheck = checkSkillSource(body.response, questionContent);

    // Update interview metadata with red flags
    if (redFlags.length > 0 || skillCheck.isVerificationQuestion) {
      await updateInterviewMetadata(id, redFlags, {
        ...(skillCheck.isVerificationQuestion && {
          skill_source: skillCheck.mentionedSource,
          skill_verified: skillCheck.validSource,
        }),
      });
    }

    // Add applicant response
    const { error: messageError } = await supabase
      .from('interview_messages')
      .insert({
        interview_id: id,
        role: 'applicant',
        content: body.response,
        turn_number: lastMessage.turn_number,
      });

    if (messageError) {
      console.error('Error inserting response:', messageError);
      return NextResponse.json(
        { error: 'Failed to record response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      turnNumber: lastMessage.turn_number,
    });
  } catch (error) {
    console.error('Error in respond API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
