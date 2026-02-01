import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { JudgeName } from '@/lib/design-tokens';

interface QuoteBlockProps extends HTMLAttributes<HTMLQuoteElement> {
  quote: string;
  author: string;
  judgeName?: JudgeName;
}

const judgeColorClasses: Record<JudgeName, string> = {
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

export const QuoteBlock = forwardRef<HTMLQuoteElement, QuoteBlockProps>(
  ({ className, quote, author, judgeName, ...props }, ref) => {
    const borderClass = judgeName ? judgeColorClasses[judgeName] : 'border-l-gold';
    const authorClass = judgeName ? judgeTextClasses[judgeName] : 'text-gold';

    return (
      <blockquote
        ref={ref}
        className={cn(
          'border-l-4 pl-4 py-2 bg-surface/50 rounded-r',
          borderClass,
          className
        )}
        {...props}
      >
        <p className="font-heading text-lg text-text-primary italic mb-2">
          &ldquo;{quote}&rdquo;
        </p>
        <cite className={cn('text-sm font-medium not-italic', authorClass)}>
          — {author}
        </cite>
      </blockquote>
    );
  }
);

QuoteBlock.displayName = 'QuoteBlock';
