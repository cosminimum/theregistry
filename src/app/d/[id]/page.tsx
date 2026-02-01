import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { DeliberationFullView } from '@/components/deliberation/DeliberationFull';
import { DeliberationFull } from '@/types/database';
import { createServerClient } from '@/lib/supabase/client';

async function getDeliberation(id: string): Promise<DeliberationFull | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('get_full_deliberation', {
      interview_uuid: id,
    });

    if (error || !data || data.length === 0) return null;

    const d = data[0];

    return {
      id: d.id,
      agentName: d.agent_name,
      humanHandle: d.human_handle,
      interview: {
        messages: d.messages || [],
        startedAt: d.started_at,
        completedAt: d.completed_at,
        turnCount: d.turn_count,
      },
      votes: d.votes || [],
      createdAt: d.completed_at,
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
      <DeliberationFullView deliberation={deliberation} />
    </PageContainer>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const deliberation = await getDeliberation(id);

  if (!deliberation) {
    return { title: 'Not Found | The Registry' };
  }

  return {
    title: `${deliberation.agentName} for ${deliberation.humanHandle} | The Registry`,
    description: `Council deliberation for ${deliberation.humanHandle}'s membership application to The Registry.`,
    openGraph: {
      title: `Council Deliberation: ${deliberation.agentName}`,
      description: `Did they get in? Read the Council's deliberation for ${deliberation.humanHandle}'s application.`,
    },
  };
}
