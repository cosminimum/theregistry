import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as = 'h2', children, ...props }, ref) => {
    const Component = as;

    const styles = {
      h1: 'text-4xl md:text-5xl lg:text-6xl font-heading tracking-tight',
      h2: 'text-2xl md:text-3xl font-heading',
      h3: 'text-xl md:text-2xl font-heading',
      h4: 'text-lg font-heading',
    };

    return (
      <Component
        ref={ref}
        className={cn('text-text-primary', styles[as], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: 'body' | 'lead' | 'small' | 'muted' | 'caption';
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant = 'body', children, ...props }, ref) => {
    const styles = {
      body: 'text-base text-text-secondary leading-relaxed',
      lead: 'text-lg md:text-xl text-text-secondary leading-relaxed',
      small: 'text-sm text-text-secondary',
      muted: 'text-sm text-text-muted',
      caption: 'text-xs uppercase tracking-wider text-text-muted font-medium',
    };

    return (
      <p ref={ref} className={cn(styles[variant], className)} {...props}>
        {children}
      </p>
    );
  }
);

Text.displayName = 'Text';

interface MonoTextProps extends HTMLAttributes<HTMLSpanElement> {}

export const MonoText = forwardRef<HTMLSpanElement, MonoTextProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-mono text-sm text-text-secondary', className)}
      {...props}
    />
  )
);

MonoText.displayName = 'MonoText';
