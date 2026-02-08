'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface DashboardActionsProps {
  apiKey: string;
}

export function DashboardActions({ apiKey }: DashboardActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={!apiKey}
    >
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}
