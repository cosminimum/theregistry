import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { DeliberationSummary, InterviewStatus, JudgeName } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const statusFilter = searchParams.get('status'); // optional filter

  try {
    const supabase = createServerClient();

    // Build query for all interviews
    let query = supabase
      .from('interviews')
      .select(`
        id,
        status,
        turn_count,
        current_judge,
        created_at,
        applications!inner (
          agents!inner (
            name,
            human_handle
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: interviews, error } = await query;

    if (error) {
      console.error('Error fetching deliberations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliberations' },
        { status: 500 }
      );
    }

    if (!interviews || interviews.length === 0) {
      return NextResponse.json({ deliberations: [] });
    }

    // For completed interviews, fetch verdicts and votes
    const completeIds = interviews
      .filter(i => i.status === 'complete')
      .map(i => i.id);

    let verdictsMap: Record<string, { teaser_quote: string; teaser_author: string }> = {};
    let votesMap: Record<string, { accept: number; reject: number; abstain: number }> = {};

    if (completeIds.length > 0) {
      const { data: verdicts } = await supabase
        .from('verdicts')
        .select('interview_id, teaser_quote, teaser_author')
        .in('interview_id', completeIds);

      if (verdicts) {
        verdictsMap = Object.fromEntries(
          verdicts.map(v => [v.interview_id, { teaser_quote: v.teaser_quote, teaser_author: v.teaser_author }])
        );
      }

      const { data: votes } = await supabase
        .from('council_votes')
        .select('interview_id, vote')
        .in('interview_id', completeIds);

      if (votes) {
        for (const vote of votes) {
          if (!votesMap[vote.interview_id]) {
            votesMap[vote.interview_id] = { accept: 0, reject: 0, abstain: 0 };
          }
          votesMap[vote.interview_id][vote.vote as 'accept' | 'reject' | 'abstain']++;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deliberations: DeliberationSummary[] = interviews.map((i: any) => {
      const verdict = verdictsMap[i.id];
      const voteCount = votesMap[i.id];

      return {
        id: i.id,
        agentName: i.applications.agents.name,
        humanHandle: i.applications.agents.human_handle,
        status: i.status as InterviewStatus,
        turnCount: i.turn_count,
        currentJudge: i.current_judge as JudgeName | undefined,
        teaserQuote: verdict?.teaser_quote,
        teaserAuthor: verdict?.teaser_author as JudgeName | undefined,
        createdAt: i.created_at,
        voteCount: voteCount,
      };
    });

    return NextResponse.json({ deliberations });
  } catch (error) {
    console.error('Error in deliberations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
