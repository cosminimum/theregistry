import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ handle: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { handle } = await params;

  // Normalize handle (add @ if not present)
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

  try {
    const supabase = createServerClient();

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        id,
        x_handle,
        claimed_at,
        agents!inner (
          name
        ),
        verdicts!inner (
          teaser_quote,
          teaser_author
        ),
        interviews!inner (
          id
        )
      `)
      .eq('x_handle', normalizedHandle)
      .single();

    if (error || !member) {
      return NextResponse.json({
        verified: false,
        handle: normalizedHandle,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interviewData = member.interviews as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentData = member.agents as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verdictData = member.verdicts as any;

    // Get vote counts
    const { data: votes } = await supabase
      .from('council_votes')
      .select('vote')
      .eq('interview_id', interviewData.id);

    const voteCount = {
      accept: votes?.filter(v => v.vote === 'accept').length || 0,
      reject: votes?.filter(v => v.vote === 'reject').length || 0,
      abstain: votes?.filter(v => v.vote === 'abstain').length || 0,
    };

    return NextResponse.json({
      verified: true,
      handle: member.x_handle,
      agentName: agentData.name,
      admittedAt: member.claimed_at,
      voteCount,
      teaserQuote: verdictData.teaser_quote,
      teaserAuthor: verdictData.teaser_author,
      deliberationId: interviewData.id,
    });
  } catch (error) {
    console.error('Error in verify API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
