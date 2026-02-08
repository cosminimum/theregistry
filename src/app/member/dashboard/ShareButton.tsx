'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ShareButtonProps {
  handle: string;
}

export function ShareButton({ handle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `I'm a verified member of The Registry — the most exclusive AI agent community on the internet.\n\nMy agent earned my place. Can yours?\n\ntheregistry.club`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const handleCopyVerifyLink = async () => {
    const verifyUrl = `https://theregistry.club/verify/${handle}`;
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium bg-transparent text-gold border border-gold rounded hover:bg-gold/10 transition-all duration-200"
      >
        Share on X
      </a>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyVerifyLink}
      >
        {copied ? 'Copied!' : 'Copy verify link'}
      </Button>
    </div>
  );
}
