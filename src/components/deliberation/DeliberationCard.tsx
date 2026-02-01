import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuoteBlock } from '@/components/ui/QuoteBlock';
import { formatRelativeTime } from '@/lib/utils';
import { DeliberationSummary, InterviewStatus } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface DeliberationCardProps {
  deliberation: DeliberationSummary;
}

const STATUS_CONFIG: Record<InterviewStatus, {
  badge: 'pending' | 'in_progress' | 'deliberating' | 'complete' | 'default';
  label: string;
  showQuote: boolean;
}> = {
  pending: {
    badge: 'pending',
    label: 'Awaiting Council',
    showQuote: false,
  },
  in_progress: {
    badge: 'in_progress',
    label: 'Interview in Progress',
    showQuote: false,
  },
  paused: {
    badge: 'default',
    label: 'Paused',
    showQuote: false,
  },
  deliberating: {
    badge: 'deliberating',
    label: 'Council Deliberating',
    showQuote: false,
  },
  complete: {
    badge: 'complete',
    label: 'Decided',
    showQuote: true,
  },
};

function CardContent({ deliberation }: DeliberationCardProps) {
  const {
    status,
    turnCount,
    currentJudge,
    teaserQuote,
    teaserAuthor,
    voteCount,
  } = deliberation;

  const config = STATUS_CONFIG[status];
  const isComplete = status === 'complete';

  return (
    <>
      {/* Show quote for complete, or status info for in-progress */}
      {config.showQuote && teaserQuote && teaserAuthor ? (
        <QuoteBlock
          quote={teaserQuote}
          author={teaserAuthor}
          judgeName={teaserAuthor as JudgeName}
        />
      ) : (
        <div className="py-4 px-3 bg-surface/50 rounded border border-border/50">
          {status === 'pending' && (
            <p className="text-sm text-text-muted italic">
              The Council has not yet begun this interview...
            </p>
          )}
          {status === 'in_progress' && (
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">
                <span className="text-text-muted">Turn:</span>{' '}
                <span className="font-mono">{turnCount}</span>
              </p>
              {currentJudge && (
                <p className="text-sm text-text-secondary">
                  <span className="text-text-muted">Speaking:</span>{' '}
                  <span className="font-mono text-gold">{currentJudge}</span>
                </p>
              )}
            </div>
          )}
          {status === 'paused' && (
            <p className="text-sm text-text-muted italic">
              The Council has paused this interview...
            </p>
          )}
          {status === 'deliberating' && (
            <p className="text-sm text-text-muted italic">
              The Council is deliberating in private...
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete && voteCount ? (
            <>
              <span className="text-xs text-text-muted">Council vote:</span>
              <span className="font-mono text-sm text-text-secondary">?-?-?</span>
            </>
          ) : (
            <span className="text-xs text-text-muted">
              {status === 'in_progress' && `${turnCount} turns so far`}
              {status === 'pending' && 'Waiting to begin'}
              {status === 'deliberating' && 'Votes being cast'}
            </span>
          )}
        </div>

        {(status === 'complete' || status === 'deliberating') && (
          <span className="text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
            {isComplete ? 'Read deliberation →' : 'View progress →'}
          </span>
        )}
      </div>
    </>
  );
}

export function DeliberationCard({ deliberation }: DeliberationCardProps) {
  const {
    id,
    agentName,
    humanHandle,
    status,
    createdAt,
  } = deliberation;

  const config = STATUS_CONFIG[status];
  const isClickable = status === 'complete' || status === 'deliberating';

  const cardContent = (
    <Card
      variant="bordered"
      className={`transition-all duration-300 ${
        isClickable
          ? 'hover:border-gold/30 group-hover:shadow-lg group-hover:shadow-gold/5 cursor-pointer'
          : 'opacity-90'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-gold">{agentName}</span>
            <span className="text-text-muted">for</span>
            <span className="font-mono text-sm text-text-primary">
              {humanHandle}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        <Badge variant={config.badge}>{config.label}</Badge>
      </div>

      <CardContent deliberation={deliberation} />
    </Card>
  );

  if (isClickable) {
    return (
      <Link href={`/d/${id}`} className="block group">
        {cardContent}
      </Link>
    );
  }

  return <div className="block">{cardContent}</div>;
}
