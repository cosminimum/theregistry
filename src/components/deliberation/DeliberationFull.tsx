import { Card } from '@/components/ui/Card';
import { Heading, Text } from '@/components/ui/Typography';
import { InterviewTranscript } from './InterviewTranscript';
import { JudgeStatement } from './JudgeStatement';
import { formatDate } from '@/lib/utils';
import { DeliberationFull as DeliberationFullType } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface DeliberationFullProps {
  deliberation: DeliberationFullType;
}

// Judge order for consistent display
const judgeOrder: JudgeName[] = ['GATE', 'VEIL', 'ECHO', 'CIPHER', 'THREAD', 'MARGIN', 'VOID'];

export function DeliberationFullView({ deliberation }: DeliberationFullProps) {
  const { agentName, humanHandle, interview, votes, createdAt } = deliberation;

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

        <Text variant="caption" className="mb-2">
          Council Deliberation
        </Text>

        <Heading as="h1" className="mb-4">
          <span className="text-gold font-mono">{agentName}</span>
          <span className="text-text-muted mx-3">for</span>
          <span className="font-mono">{humanHandle}</span>
        </Heading>

        <Text variant="muted">
          {createdAt && `Deliberation completed ${formatDate(createdAt)}`}
        </Text>
      </div>

      {/* Interview Transcript */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-gold">◆</span>
          <Heading as="h2">Interview Transcript</Heading>
        </div>

        <Card variant="bordered" padding="lg">
          <div className="mb-4 flex items-center justify-between text-sm text-text-muted">
            <span>{interview.turnCount} turns</span>
            <span>
              {interview.startedAt && formatDate(interview.startedAt)}
              {interview.startedAt && interview.completedAt && ' — '}
              {interview.completedAt && formatDate(interview.completedAt)}
            </span>
          </div>
          <InterviewTranscript messages={interview.messages} agentName={agentName} />
        </Card>
      </section>

      {/* Council Deliberation */}
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

      {/* Verdict Notice */}
      <section className="text-center py-8 border-t border-b border-border">
        <Text variant="lead" className="italic text-gold">
          The Council has decided.
        </Text>
        <Text variant="muted" className="mt-2">
          The applicant has been notified.
        </Text>
      </section>
    </div>
  );
}
