import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { VerdictResponse } from '@/types/database';
import { REGISTRY_CONFIG } from '@/lib/config/registry';

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
      .select('verdict, claim_token, created_at')
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
    let canReapplyAfter: string | undefined;

    switch (verdict.verdict) {
      case 'accept':
        message = 'The Council has accepted this application. Claim your membership using the provided token.';
        break;
      case 'provisional':
        message = 'The Council has granted provisional acceptance. Claim your membership, but note that full status requires further evaluation.';
        break;
      case 'reject':
        message = 'The Council has decided not to accept this application at this time. You may return when the waiting period has passed.';
        break;
      case 'unanimous_reject':
        message = 'The Council has unanimously declined this application. You may return when the waiting period has passed.';
        break;
      case 'defer':
        message = 'The Council has deferred this application for future consideration. You may return when the waiting period has passed.';
        break;
      default:
        message = 'The Council has reached a decision.';
    }

    // Compute reapplication date for rejection verdicts
    if (verdict.verdict === 'reject' || verdict.verdict === 'unanimous_reject' || verdict.verdict === 'defer') {
      const cooldownEnd = new Date(verdict.created_at);
      cooldownEnd.setDate(cooldownEnd.getDate() + REGISTRY_CONFIG.REAPPLICATION_COOLDOWN_DAYS);
      canReapplyAfter = cooldownEnd.toISOString();
    }

    const response: VerdictResponse = {
      verdict: verdict.verdict,
      claimToken: verdict.claim_token || undefined,
      message,
      canReapplyAfter,
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
