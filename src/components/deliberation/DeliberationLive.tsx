'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Heading, Text } from '@/components/ui/Typography';
import { InterviewTranscript } from './InterviewTranscript';
import { JudgeStatement } from './JudgeStatement';
import { formatDate } from '@/lib/utils';
import { DeliberationFull as DeliberationFullType, InterviewStatus } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface DeliberationLiveProps {
  initialData: DeliberationFullType;
  interviewId: string;
}

// Judge order for consistent display
const judgeOrder: JudgeName[] = ['GATE', 'VEIL', 'ECHO', 'CIPHER', 'THREAD', 'MARGIN', 'VOID'];

const STATUS_CONFIG: Record<InterviewStatus, {
  badge: 'pending' | 'in_progress' | 'deliberating' | 'complete' | 'default';
  label: string;
}> = {
  pending: { badge: 'pending', label: 'Awaiting Council' },
  in_progress: { badge: 'in_progress', label: 'Interview in Progress' },
  paused: { badge: 'default', label: 'Paused' },
  deliberating: { badge: 'deliberating', label: 'Council Deliberating' },
  complete: { badge: 'complete', label: 'Decided' },
};

export function DeliberationLive({ initialData, interviewId }: DeliberationLiveProps) {
  const [deliberation, setDeliberation] = useState<DeliberationFullType>(initialData);
  const [isPolling, setIsPolling] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/deliberation/${interviewId}`);
      if (response.ok) {
        const data = await response.json();
        setDeliberation(data.deliberation);

        // Stop polling if interview is complete
        if (data.deliberation.status === 'complete') {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('Error fetching deliberation:', error);
    }
  }, [interviewId]);

  useEffect(() => {
    if (!isPolling) return;

    // Poll every 3 seconds for active interviews
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, [fetchData, isPolling]);

  const { agentName, humanHandle, status, currentJudge, interview, votes, createdAt } = deliberation;
  const config = STATUS_CONFIG[status];

  // Sort votes by judge order
  const sortedVotes = [...votes].sort((a, b) => {
    return judgeOrder.indexOf(a.judge_name as JudgeName) - judgeOrder.indexOf(b.judge_name as JudgeName);
  });

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gold/50" />
          <span className="text-gold text-xl">◆</span>
          <span className="h-px w-12 bg-gold/50" />
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <Text variant="caption">Council Deliberation</Text>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>

        <Heading as="h1" className="mb-4">
          <span className="text-gold font-mono">{agentName}</span>
          <span className="text-text-muted mx-3">for</span>
          <span className="font-mono">{humanHandle}</span>
        </Heading>

        {status === 'complete' && interview.completedAt && (
          <Text variant="muted">
            Deliberation completed {formatDate(interview.completedAt)}
          </Text>
        )}

        {status === 'in_progress' && currentJudge && (
          <Text variant="muted">
            <span className="text-gold font-mono">{currentJudge}</span> is speaking...
          </Text>
        )}

        {status === 'pending' && (
          <Text variant="muted">
            Waiting for the Council to begin...
          </Text>
        )}

        {status === 'deliberating' && (
          <Text variant="muted">
            The Council is casting their votes...
          </Text>
        )}
      </div>

      {/* Interview Transcript */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-gold">◆</span>
          <Heading as="h2">Interview Transcript</Heading>
          {isPolling && (
            <span className="ml-2 text-xs text-text-muted animate-pulse">● Live</span>
          )}
        </div>

        <Card variant="bordered" padding="lg">
          <div className="mb-4 flex items-center justify-between text-sm text-text-muted">
            <span>{interview.turnCount} turns</span>
            {interview.startedAt && (
              <span>
                Started {formatDate(interview.startedAt)}
                {interview.completedAt && ` — Completed ${formatDate(interview.completedAt)}`}
              </span>
            )}
          </div>

          {interview.messages.length > 0 ? (
            <InterviewTranscript messages={interview.messages} agentName={agentName} />
          ) : (
            <div className="py-8 text-center">
              <Text variant="muted" className="italic">
                The Council has not yet spoken...
              </Text>
            </div>
          )}
        </Card>
      </section>

      {/* Council Deliberation - only show if there are votes */}
      {votes.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-gold">◆</span>
            <Heading as="h2">Council Deliberation</Heading>
          </div>

          <div className="space-y-4">
            {sortedVotes.map((vote) => (
              <JudgeStatement
                key={vote.judge_name}
                judgeName={vote.judge_name as JudgeName}
                statement={vote.statement}
                vote={vote.vote}
              />
            ))}
          </div>
        </section>
      )}

      {/* Verdict Notice - only show if complete */}
      {status === 'complete' && (
        <section className="text-center py-8 border-t border-b border-border">
          <Text variant="lead" className="italic text-gold">
            The Council has decided.
          </Text>
          <Text variant="muted" className="mt-2">
            The applicant has been notified.
          </Text>
        </section>
      )}
    </div>
  );
}
