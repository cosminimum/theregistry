import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMemberSession } from '@/lib/member/session';
import { createServerClient } from '@/lib/supabase/client';
import { Heading, Text } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { MeetIntentWithMember } from '@/types/database';
import { DashboardActions } from './DashboardActions';
import { ShareButton } from './ShareButton';

async function getPendingIntents(memberId: string): Promise<MeetIntentWithMember[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('meet_intents')
    .select(`
      *,
      from_member:from_member_id (
        x_handle,
        agents!inner (
          name
        )
      )
    `)
    .eq('to_member_id', memberId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching intents:', error);
    return [];
  }

  // Transform the nested structure
  return (data || []).map((intent) => ({
    ...intent,
    from_member: intent.from_member ? {
      x_handle: (intent.from_member as { x_handle: string }).x_handle,
      agent: {
        name: ((intent.from_member as { agents: { name: string } }).agents as { name: string }).name,
      },
    } : undefined,
  }));
}

export default async function DashboardPage() {
  const session = await getMemberSession();

  if (!session) {
    redirect('/member/login');
  }

  const pendingIntents = await getPendingIntents(session.id);

  return (
    <main className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors"
          >
            <span className="text-gold">◆</span>
            <span>The Registry</span>
          </Link>
          <Link
            href="/api/member/logout"
            className="text-text-muted hover:text-text-primary transition-colors text-sm"
          >
            Logout
          </Link>
        </header>

        <div className="mb-8">
          <Heading as="h1" className="mb-2">
            Welcome back, {session.handle}
          </Heading>
          <Text variant="muted">
            Agent: <span className="text-gold">{session.agentName}</span>
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/member/dashboard">
            <Card variant="bordered" className="text-center hover:border-gold/50 transition-colors cursor-pointer">
              <div className="text-2xl font-bold text-gold mb-1">
                {pendingIntents.length}
              </div>
              <Text variant="muted">Pending Requests</Text>
            </Card>
          </Link>
          <Link href="/member/directory">
            <Card variant="bordered" className="text-center hover:border-gold/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-1">→</div>
              <Text variant="muted">Directory</Text>
            </Card>
          </Link>
          <Link href="/member/onboarding">
            <Card variant="bordered" className="text-center hover:border-gold/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-1">⚙</div>
              <Text variant="muted">Setup Agent</Text>
            </Card>
          </Link>
        </div>

        <Card variant="bordered" className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Text variant="caption" className="mb-1">Your API Key</Text>
              <code className="font-mono text-sm text-gold break-all">
                {session.apiKey || 'Not generated'}
              </code>
            </div>
            <DashboardActions apiKey={session.apiKey} />
          </div>
          <Text variant="muted" className="text-xs mt-3">
            Use this key to connect your agent to The Registry.
          </Text>
        </Card>

        <Card variant="bordered" className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Text variant="caption" className="mb-1">Share Your Membership</Text>
              <Text variant="muted" className="text-xs">
                Add your verification link to your X bio: <code className="text-gold">theregistry.club/verify/{session.handle}</code>
              </Text>
            </div>
            <ShareButton handle={session.handle} />
          </div>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <Heading as="h2" className="text-lg">
            Pending Meet Requests
          </Heading>
          {pendingIntents.length > 0 && (
            <Text variant="muted" className="text-sm">
              {pendingIntents.length} request{pendingIntents.length !== 1 ? 's' : ''}
            </Text>
          )}
        </div>

        {pendingIntents.length === 0 ? (
          <Card variant="bordered" className="text-center py-8">
            <Text variant="muted">
              No pending meet requests.
            </Text>
            <Link href="/member/directory" className="text-gold hover:underline text-sm mt-2 inline-block">
              Browse the directory →
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingIntents.map((intent) => (
              <MeetRequestCard key={intent.id} intent={intent} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MeetRequestCard({ intent }: { intent: MeetIntentWithMember }) {
  const fromHandle = intent.from_member?.x_handle || 'Unknown';
  const fromAgent = intent.from_member?.agent?.name;
  const createdAt = new Date(intent.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card variant="bordered">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-gold">{fromHandle}</span>
            {fromAgent && (
              <span className="text-text-muted text-sm">({fromAgent})</span>
            )}
            <span className="text-text-muted text-xs">· {createdAt}</span>
          </div>
          <Text className="text-sm">&ldquo;{intent.reason}&rdquo;</Text>
        </div>
        <div className="flex gap-2">
          <form action={`/api/member/intents/${intent.id}/respond`} method="POST">
            <input type="hidden" name="accept" value="true" />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded transition-colors"
            >
              Accept
            </button>
          </form>
          <form action={`/api/member/intents/${intent.id}/respond`} method="POST">
            <input type="hidden" name="accept" value="false" />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-surface-elevated hover:bg-border text-text-muted rounded transition-colors"
            >
              Decline
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
}
