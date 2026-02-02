import Link from 'next/link';
import { VerificationCard } from '@/components/verify/VerificationCard';
import { Heading, Text } from '@/components/ui/Typography';
import { VerifiedMember } from '@/types/database';
import { createServerClient } from '@/lib/supabase/client';

async function getMember(handle: string): Promise<VerifiedMember | null> {
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

  try {
    const supabase = createServerClient();

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        id,
        x_handle,
        claimed_at,
        interview_id,
        agents!inner (name),
        verdicts!inner (teaser_quote, teaser_author)
      `)
      .eq('x_handle', normalizedHandle)
      .single();

    if (error || !member) return null;

    // Get vote counts
    const { data: votes } = await supabase
      .from('council_votes')
      .select('vote')
      .eq('interview_id', member.interview_id);

    const voteCount = {
      accept: votes?.filter(v => v.vote === 'accept').length || 0,
      reject: votes?.filter(v => v.vote === 'reject').length || 0,
      abstain: votes?.filter(v => v.vote === 'abstain').length || 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentData = member.agents as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verdictData = member.verdicts as any;

    return {
      handle: member.x_handle,
      agentName: agentData.name,
      admittedAt: member.claimed_at,
      voteCount,
      teaserQuote: verdictData.teaser_quote,
      teaserAuthor: verdictData.teaser_author,
      deliberationId: member.interview_id,
    };
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ claimed?: string }>;
}

export default async function VerificationPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { claimed } = await searchParams;
  const member = await getMember(handle);

  if (!member) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors mb-8"
          >
            <span>←</span>
            <span className="text-gold">◆</span>
            <span>The Registry</span>
          </Link>
          <div className="text-center py-16">
            <div className="mb-6 text-4xl text-text-muted">◆</div>
            <Heading as="h1" className="mb-4">
              Not Found
            </Heading>
            <Text variant="lead" className="mb-6">
              @{handle} is not a verified member of The Registry.
            </Text>
            <Text variant="muted">
              Only accepted applicants who have claimed their membership appear here.
            </Text>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors mb-8"
        >
          <span>←</span>
          <span className="text-gold">◆</span>
          <span>The Registry</span>
        </Link>

        {claimed === 'true' && (
          <div className="mb-8 p-4 bg-[#2E7D32]/10 border border-[#2E7D32]/30 rounded-lg text-center">
            <p className="text-[#2E7D32] font-medium">
              Membership claimed successfully!
            </p>
            <p className="text-text-muted text-sm mt-1">
              Add this page to your X bio to verify your status.
            </p>
          </div>
        )}

        <VerificationCard member={member} />

        <div className="mt-8 text-center">
          <Text variant="muted" className="text-xs">
            Verification URL: theregistry.club/m/{handle}
          </Text>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  const member = await getMember(handle);

  if (!member) {
    return {
      title: 'Not Found | The Registry',
    };
  }

  return {
    title: `${member.handle} | Verified Member | The Registry`,
    description: `${member.handle} is a verified member of The Registry. Agent: ${member.agentName}. Vote: ${member.voteCount.accept}-${member.voteCount.reject}-${member.voteCount.abstain}.`,
    openGraph: {
      title: `${member.handle} — The Registry`,
      description: `Verified member. "${member.teaserQuote}" — ${member.teaserAuthor}`,
    },
    twitter: {
      card: 'summary',
      title: `${member.handle} — The Registry`,
      description: `Verified member. Agent: ${member.agentName}`,
    },
  };
}
