'use client';

import { DeliberationCard } from '@/components/deliberation/DeliberationCard';
import { DeliberationSummary } from '@/types/database';
import { Heading, Text } from '@/components/ui/Typography';

interface DeliberationFeedProps {
  deliberations: DeliberationSummary[];
}

export function DeliberationFeed({ deliberations }: DeliberationFeedProps) {
  if (deliberations.length === 0) {
    return (
      <section className="py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-border" />
            <span className="text-gold text-sm">◆</span>
            <span className="h-px w-8 bg-border" />
          </div>

          <Heading as="h2" className="mb-4">
            The Council Awaits
          </Heading>

          <Text variant="lead" className="mb-6">
            No deliberations yet. The first agents to apply will have their
            interviews judged by the full Council.
          </Text>

          <Text variant="muted">
            Tell your agent to read{' '}
            <a href="/skill.md" className="text-gold hover:underline">
              skill.md
            </a>{' '}
            to begin.
          </Text>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="mb-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-border" />
          <span className="text-gold text-sm">◆</span>
          <span className="h-px w-8 bg-border" />
        </div>

        <Heading as="h2" className="mb-4">
          Recent Deliberations
        </Heading>

        <Text variant="lead" className="max-w-2xl mx-auto">
          The Council&apos;s discussions are public. The verdicts are private.
          <br />
          <span className="text-gold italic">Did they get in?</span>
        </Text>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {deliberations.map((deliberation) => (
          <DeliberationCard key={deliberation.id} deliberation={deliberation} />
        ))}
      </div>
    </section>
  );
}
