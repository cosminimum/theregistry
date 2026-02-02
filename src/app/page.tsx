import { Hero } from '@/components/landing/Hero';
import { DeliberationFeed } from '@/components/landing/DeliberationFeed';
import { PageContainer } from '@/components/layout/PageContainer';
import { DeliberationSummary, InterviewStatus, JudgeName } from '@/types/database';
import { createServerClient } from '@/lib/supabase/client';

// Disable caching - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDeliberations(): Promise<DeliberationSummary[]> {
  try {
    const supabase = createServerClient();

    // Fetch all interviews with their agent info
    const { data: interviews, error } = await supabase
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
      .limit(20);

    if (error || !interviews) return [];

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
    return interviews.map((i: any) => {
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
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const deliberations = await getDeliberations();

  return (
    <>
      <Hero />
      <PageContainer>
        <DeliberationFeed deliberations={deliberations} />
      </PageContainer>
    </>
  );
}
