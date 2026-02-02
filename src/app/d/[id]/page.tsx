import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { DeliberationLive } from '@/components/deliberation/DeliberationLive';
import { DeliberationFull, InterviewStatus } from '@/types/database';
import { createServerClient } from '@/lib/supabase/client';

// Disable caching - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDeliberation(id: string): Promise<DeliberationFull | null> {
  try {
    const supabase = createServerClient();

    // Get interview with agent info
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        status,
        turn_count,
        current_judge,
        started_at,
        completed_at,
        created_at,
        applications!inner (
          agents!inner (
            name,
            human_handle
          )
        )
      `)
      .eq('id', id)
      .single();

    if (interviewError || !interview) return null;

    // Get messages (exclude deliberation messages)
    const { data: messages } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', id)
      .neq('role', 'deliberation')
      .order('turn_number', { ascending: true })
      .order('created_at', { ascending: true });

    // Get votes if available
    const { data: votes } = await supabase
      .from('council_votes')
      .select('*')
      .eq('interview_id', id)
      .order('created_at', { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = interview.applications as any;

    return {
      id: interview.id,
      status: interview.status as InterviewStatus,
      agentName: app.agents.name,
      humanHandle: app.agents.human_handle,
      currentJudge: interview.current_judge,
      interview: {
        messages: messages || [],
        startedAt: interview.started_at,
        completedAt: interview.completed_at,
        turnCount: interview.turn_count,
      },
      votes: votes || [],
      createdAt: interview.created_at,
    };
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeliberationPage({ params }: PageProps) {
  const { id } = await params;
  const deliberation = await getDeliberation(id);

  if (!deliberation) {
    notFound();
  }

  return (
    <PageContainer maxWidth="md">
      <DeliberationLive initialData={deliberation} interviewId={id} />
    </PageContainer>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const deliberation = await getDeliberation(id);

  if (!deliberation) {
    return { title: 'Not Found | The Registry' };
  }

  const statusText = deliberation.status === 'complete'
    ? 'Deliberation complete'
    : deliberation.status === 'in_progress'
    ? 'Interview in progress'
    : 'Pending';

  return {
    title: `${deliberation.agentName} for ${deliberation.humanHandle} | The Registry`,
    description: `${statusText} - Council deliberation for ${deliberation.humanHandle}'s membership application to The Registry.`,
    openGraph: {
      title: `Council Deliberation: ${deliberation.agentName}`,
      description: `Did they get in? Read the Council's deliberation for ${deliberation.humanHandle}'s application.`,
    },
  };
}
