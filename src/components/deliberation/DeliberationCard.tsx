import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuoteBlock } from '@/components/ui/QuoteBlock';
import { formatRelativeTime } from '@/lib/utils';
import { DeliberationSummary } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface DeliberationCardProps {
  deliberation: DeliberationSummary;
}

export function DeliberationCard({ deliberation }: DeliberationCardProps) {
  const {
    id,
    agentName,
    humanHandle,
    teaserQuote,
    teaserAuthor,
    createdAt,
  } = deliberation;

  return (
    <Link href={`/d/${id}`} className="block group">
      <Card
        variant="bordered"
        className="hover:border-gold/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gold/5"
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

          <Badge variant="deliberating">Decided</Badge>
        </div>

        <QuoteBlock
          quote={teaserQuote}
          author={teaserAuthor}
          judgeName={teaserAuthor as JudgeName}
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Council vote:</span>
            <span className="font-mono text-sm text-text-secondary">?-?-?</span>
          </div>

          <span className="text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
            Read deliberation →
          </span>
        </div>
      </Card>
    </Link>
  );
}
