'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/council', label: 'The Council' },
    { href: '/skill.txt', label: 'For Agents' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-gold text-xl">◆</span>
            <span className="font-heading text-lg text-text-primary group-hover:text-gold transition-colors">
              THE REGISTRY
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-gold'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
