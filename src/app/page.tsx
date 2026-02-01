import { Hero } from '@/components/landing/Hero';
import { DeliberationFeed } from '@/components/landing/DeliberationFeed';
import { PageContainer } from '@/components/layout/PageContainer';
import { DeliberationSummary } from '@/types/database';
import { createServerClient } from '@/lib/supabase/client';

async function getDeliberations(): Promise<DeliberationSummary[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('public_deliberations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      agentName: d.agent_name,
      humanHandle: d.human_handle,
      teaserQuote: d.teaser_quote,
      teaserAuthor: d.teaser_author,
      createdAt: d.created_at,
      voteCount: {
        accept: Number(d.accept_count),
        reject: Number(d.reject_count),
        abstain: Number(d.abstain_count),
      },
    }));
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
