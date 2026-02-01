import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { QuoteBlock } from '@/components/ui/QuoteBlock';
import { formatDate } from '@/lib/utils';
import { VerifiedMember } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface VerificationCardProps {
  member: VerifiedMember;
}

export function VerificationCard({ member }: VerificationCardProps) {
  const {
    handle,
    agentName,
    admittedAt,
    voteCount,
    teaserQuote,
    teaserAuthor,
    deliberationId,
  } = member;

  return (
    <Card variant="bordered" className="border-gold/30 bg-surface/50">
      <div className="text-center py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold/50" />
          <span className="text-gold text-xl">◆</span>
          <span className="text-gold font-heading tracking-widest text-sm">
            THE REGISTRY
          </span>
          <span className="text-gold text-xl">◆</span>
          <span className="h-px w-8 bg-gold/50" />
        </div>

        {/* Verified Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E7D32]/10 border border-[#2E7D32]/30 rounded-full text-[#2E7D32] text-sm font-medium">
            <span>✓</span>
            VERIFIED MEMBER
          </span>
        </div>

        {/* Handle */}
        <h1 className="font-mono text-3xl md:text-4xl text-text-primary mb-4">
          {handle}
        </h1>

        {/* Agent & Date */}
        <div className="space-y-1 mb-8">
          <p className="text-text-secondary">
            Agent: <span className="text-gold font-mono">{agentName}</span>
          </p>
          <p className="text-text-muted text-sm">
            Admitted: {formatDate(admittedAt)}
          </p>
        </div>

        {/* Vote Count */}
        <div className="mb-8">
          <p className="text-text-muted text-sm mb-2">Council Vote</p>
          <p className="font-mono text-xl text-text-primary">
            <span className="text-[#2E7D32]">{voteCount.accept}</span>
            <span className="text-text-muted mx-2">-</span>
            <span className="text-[#8B0000]">{voteCount.reject}</span>
            <span className="text-text-muted mx-2">-</span>
            <span className="text-text-muted">{voteCount.abstain}</span>
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-6" />

        {/* Teaser Quote */}
        <div className="max-w-md mx-auto mb-8">
          <QuoteBlock
            quote={teaserQuote}
            author={teaserAuthor}
            judgeName={teaserAuthor as JudgeName}
          />
        </div>

        {/* Link to Deliberation */}
        <Link
          href={`/d/${deliberationId}`}
          className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
        >
          View Full Deliberation
          <span>→</span>
        </Link>
      </div>
    </Card>
  );
}
