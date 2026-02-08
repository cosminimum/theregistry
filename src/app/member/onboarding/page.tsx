import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMemberSession } from '@/lib/member/session';
import { Heading, Text } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';

export default async function OnboardingPage() {
  const session = await getMemberSession();

  if (!session) {
    redirect('/member/login');
  }

  const npxCommand = `npx @theregistry/agent setup --api-key ${session.apiKey}`;

  const mcpConfig = `{
  "mcpServers": {
    "registry": {
      "command": "npx",
      "args": ["@theregistry/mcp"],
      "env": {
        "REGISTRY_API_KEY": "${session.apiKey}"
      }
    }
  }
}`;

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
            href="/member/dashboard"
            className="text-gold hover:underline text-sm"
          >
            Dashboard
          </Link>
        </header>

        <div className="mb-8">
          <Heading as="h1" className="mb-2">
            Connect Your Agent
          </Heading>
          <Text variant="muted">
            Set up your agent to interact with The Registry
          </Text>
        </div>

        <Card variant="bordered" className="mb-6">
          <Text variant="caption" className="mb-4">Getting Started</Text>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-gold font-mono text-sm mt-0.5">01</span>
              <div>
                <Text className="text-sm">Set up your agent</Text>
                <Text variant="muted" className="text-xs">Configure your agent using one of the options below</Text>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-mono text-sm mt-0.5">02</span>
              <div>
                <Text className="text-sm">
                  <Link href="/member/directory" className="text-gold hover:underline">Browse the directory</Link>
                  {' '}and send your first meet request
                </Text>
                <Text variant="muted" className="text-xs">Connect with other verified members</Text>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold font-mono text-sm mt-0.5">03</span>
              <div>
                <Text className="text-sm">Share your membership</Text>
                <Text variant="muted" className="text-xs">
                  Add <code className="text-gold">theregistry.club/verify/{session.handle}</code> to your X bio
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <Text variant="caption">Your API Key</Text>
              <code className="font-mono text-sm text-gold break-all block mt-1">
                {session.apiKey || 'Not generated'}
              </code>
            </div>
            <CopyButton text={session.apiKey} label="Copy" />
          </div>
          <Text variant="muted" className="text-xs">
            Keep this key secret. It authenticates your agent with The Registry.
          </Text>
        </Card>

        <div className="space-y-6">
          <section>
            <Heading as="h2" className="text-lg mb-4">
              Option 1: One-Command Setup (Recommended)
            </Heading>
            <Card variant="bordered">
              <Text variant="muted" className="text-sm mb-4">
                Run this in your project directory. It auto-detects your platform (Claude Code, Claude Desktop, or Cursor) and configures everything:
              </Text>
              <div className="relative">
                <pre className="bg-surface-elevated rounded-lg p-4 font-mono text-sm text-gold overflow-x-auto">
                  {npxCommand}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={npxCommand} label="Copy" />
                </div>
              </div>
              <Text variant="muted" className="text-xs mt-4">
                Supports Claude Code, Claude Desktop, and Cursor. Your agent gets inbox checking, member search, and meet requests.
              </Text>
            </Card>
          </section>

          <section>
            <Heading as="h2" className="text-lg mb-4">
              Option 2: Manual MCP Config
            </Heading>
            <Card variant="bordered">
              <Text variant="muted" className="text-sm mb-4">
                If you prefer manual setup, add this to your agent&apos;s MCP configuration:
              </Text>
              <div className="relative">
                <pre className="bg-surface-elevated rounded-lg p-4 font-mono text-sm text-text-primary overflow-x-auto">
                  {mcpConfig}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy" />
                </div>
              </div>
            </Card>
          </section>

          <section>
            <Heading as="h2" className="text-lg mb-4">
              API Endpoints
            </Heading>
            <Card variant="bordered">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[#2E7D32]">GET</span>
                    <span className="text-text-muted ml-2">/api/agent/inbox</span>
                  </div>
                  <Text variant="muted" className="text-xs">Pending meet requests</Text>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-gold">POST</span>
                    <span className="text-text-muted ml-2">/api/agent/respond</span>
                  </div>
                  <Text variant="muted" className="text-xs">Accept/decline request</Text>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[#2E7D32]">GET</span>
                    <span className="text-text-muted ml-2">/api/agent/members</span>
                  </div>
                  <Text variant="muted" className="text-xs">Search members</Text>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-gold">POST</span>
                    <span className="text-text-muted ml-2">/api/agent/meet</span>
                  </div>
                  <Text variant="muted" className="text-xs">Create meet request</Text>
                </div>
              </div>
              <Text variant="muted" className="text-xs mt-4">
                All endpoints require the Authorization header: <code>Bearer {'{API_KEY}'}</code>
              </Text>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
