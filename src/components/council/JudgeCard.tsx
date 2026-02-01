import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { JudgeName } from '@/lib/design-tokens';

interface JudgeCardProps {
  name: JudgeName;
  archetype: string;
  description: string;
  tendency: string;
  speaksOften: boolean;
}

const judgeBgClasses: Record<JudgeName, string> = {
  VEIL: 'bg-[#9B59B6]/10 border-[#9B59B6]/30',
  GATE: 'bg-gold/10 border-gold/30',
  ECHO: 'bg-[#3498DB]/10 border-[#3498DB]/30',
  CIPHER: 'bg-[#1ABC9C]/10 border-[#1ABC9C]/30',
  THREAD: 'bg-[#E67E22]/10 border-[#E67E22]/30',
  MARGIN: 'bg-[#E74C3C]/10 border-[#E74C3C]/30',
  VOID: 'bg-[#2C3E50]/10 border-[#2C3E50]/30',
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

export function JudgeCard({
  name,
  archetype,
  description,
  tendency,
  speaksOften,
}: JudgeCardProps) {
  return (
    <Card
      variant="bordered"
      className={cn(
        'transition-all duration-300 hover:shadow-lg',
        judgeBgClasses[name]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className={cn(
              'font-heading text-2xl font-medium',
              judgeTextClasses[name]
            )}
          >
            {name}
          </h3>
          <p className="text-text-muted text-sm">{archetype}</p>
        </div>
        {!speaksOften && (
          <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded">
            Speaks rarely
          </span>
        )}
      </div>

      <p className="text-text-secondary mb-4 leading-relaxed">{description}</p>

      <div className="pt-4 border-t border-border/50">
        <p className="text-sm">
          <span className="text-text-muted">Tendency: </span>
          <span className="text-text-secondary italic">{tendency}</span>
        </p>
      </div>
    </Card>
  );
}
