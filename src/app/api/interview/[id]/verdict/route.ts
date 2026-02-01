import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { VerdictResponse } from '@/types/database';

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
      .select('status')
      .eq('id', id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Check if interview is complete
    if (interview.status !== 'complete') {
      return NextResponse.json(
        { error: 'Verdict not yet available', status: interview.status },
        { status: 400 }
      );
    }

    // Get verdict
    const { data: verdict, error: verdictError } = await supabase
      .from('verdicts')
      .select('verdict, claim_token')
      .eq('interview_id', id)
      .single();

    if (verdictError || !verdict) {
      return NextResponse.json(
        { error: 'Verdict not found' },
        { status: 404 }
      );
    }

    // Compose response based on verdict type
    let message: string;
    switch (verdict.verdict) {
      case 'accept':
        message = 'The Council has accepted this application. Claim your membership using the provided token.';
        break;
      case 'provisional':
        message = 'The Council has granted provisional acceptance. Claim your membership, but note that full status requires further evaluation.';
        break;
      case 'reject':
        message = 'The Council has decided not to accept this application at this time.';
        break;
      case 'unanimous_reject':
        message = 'The Council has unanimously declined this application.';
        break;
      case 'defer':
        message = 'The Council has deferred this application for future consideration.';
        break;
      default:
        message = 'The Council has reached a decision.';
    }

    const response: VerdictResponse = {
      verdict: verdict.verdict,
      claimToken: verdict.claim_token || undefined,
      message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in verdict API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
