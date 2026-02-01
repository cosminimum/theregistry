import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'accept' | 'reject' | 'pending' | 'in_progress' | 'deliberating' | 'complete';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-surface border-border text-text-secondary',
      gold: 'bg-gold/10 border-gold/30 text-gold',
      accept: 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#2E7D32]',
      reject: 'bg-[#8B0000]/10 border-[#8B0000]/30 text-[#8B0000]',
      pending: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
      in_progress: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      deliberating: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      complete: 'bg-[#4A4A8A]/10 border-[#4A4A8A]/30 text-[#4A4A8A]',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
