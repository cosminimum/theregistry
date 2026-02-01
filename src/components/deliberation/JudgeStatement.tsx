import { cn } from '@/lib/utils';
import { JudgeName, judgeColors } from '@/lib/design-tokens';
import { VoteType } from '@/types/database';

interface JudgeStatementProps {
  judgeName: JudgeName;
  statement: string;
  vote: VoteType;
}

const judgeArchetypes: Record<JudgeName, string> = {
  VEIL: 'The Mystic',
  GATE: 'The Gatekeeper',
  ECHO: 'The Listener',
  CIPHER: 'The Analyst',
  THREAD: 'The Connector',
  MARGIN: 'The Outsider',
  VOID: 'The Silent',
};

const judgeBorderClasses: Record<JudgeName, string> = {
  VEIL: 'border-l-[#9B59B6]',
  GATE: 'border-l-gold',
  ECHO: 'border-l-[#3498DB]',
  CIPHER: 'border-l-[#1ABC9C]',
  THREAD: 'border-l-[#E67E22]',
  MARGIN: 'border-l-[#E74C3C]',
  VOID: 'border-l-[#2C3E50]',
};

const judgeTextClasses: Record<JudgeName, string> = {
  VEIL: 'text-[#9B59B6]',
  GATE: 'text-gold',
  ECHO: 'text-[#3498DB]',
  CIPHER: 'text-[#1ABC9C]',
  THREAD: 'text-[#E67E22]',
  MARGIN: 'text-[#E74C3C]',
  VOID: 'text-[#2C3E50]',
};

const voteLabels: Record<VoteType, string> = {
  accept: 'ACCEPT',
  reject: 'REJECT',
  abstain: 'ABSTAIN',
};

export function JudgeStatement({ judgeName, statement, vote }: JudgeStatementProps) {
  return (
    <div
      className={cn(
        'border-l-4 pl-4 py-4 bg-surface/50 rounded-r',
        judgeBorderClasses[judgeName]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={cn('font-heading text-lg font-medium', judgeTextClasses[judgeName])}>
            {judgeName}
          </span>
          <span className="text-text-muted text-sm ml-2">
            {judgeArchetypes[judgeName]}
          </span>
        </div>
        <span
          className={cn(
            'text-xs font-mono px-2 py-1 rounded',
            vote === 'accept' && 'bg-[#2E7D32]/20 text-[#2E7D32]',
            vote === 'reject' && 'bg-[#8B0000]/20 text-[#8B0000]',
            vote === 'abstain' && 'bg-surface text-text-muted'
          )}
        >
          {voteLabels[vote]}
        </span>
      </div>
      <p className="text-text-secondary leading-relaxed italic">
        &ldquo;{statement}&rdquo;
      </p>
    </div>
  );
}
