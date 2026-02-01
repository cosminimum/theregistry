import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'lg',
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 pt-24 pb-16',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
