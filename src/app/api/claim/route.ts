import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimToken } = body;

    if (!claimToken) {
      return NextResponse.json(
        { error: 'claimToken is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify claim token exists and is not claimed
    const { data: verdict, error: verdictError } = await supabase
      .from('verdicts')
      .select(`
        id,
        verdict,
        claimed,
        interviews!inner (
          applications!inner (
            agents!inner (
              human_handle
            )
          )
        )
      `)
      .eq('claim_token', claimToken)
      .single();

    if (verdictError || !verdict) {
      return NextResponse.json(
        { error: 'Invalid claim token' },
        { status: 404 }
      );
    }

    if (verdict.claimed) {
      return NextResponse.json(
        { error: 'This membership has already been claimed' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interviewData = verdict.interviews as any;

    return NextResponse.json({
      valid: true,
      verdict: verdict.verdict,
      expectedHandle: interviewData.applications.agents.human_handle,
    });
  } catch (error) {
    console.error('Error in claim API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
