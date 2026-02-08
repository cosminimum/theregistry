'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Heading, Text } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors mb-8"
    >
      <span>←</span>
      <span className="text-gold">◆</span>
      <span>The Registry</span>
    </Link>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimData, setClaimData] = useState<{
    handle: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    async function fetchClaimData() {
      if (!code) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/claim/verify?code=${code}`);
        if (response.ok) {
          const data = await response.json();
          setClaimData(data);
        } else {
          const data = await response.json();
          setError(data.error || 'Invalid verification code');
        }
      } catch {
        setError('Failed to load verification data');
      } finally {
        setLoading(false);
      }
    }

    fetchClaimData();
  }, [code]);

  const tweetText = `I'm a verified member of The Registry @thelosingclub

CODE: ${claimData?.code || code}`;

  const handleCopyTweet = async () => {
    await navigator.clipboard.writeText(tweetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/member/dashboard?claimed=true');
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // No code provided
  if (!code) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 text-4xl text-[#8B0000]">✕</div>
            <Heading as="h1" className="mb-4">
              Missing Code
            </Heading>
            <Text variant="lead" className="mb-6">
              No verification code provided.
            </Text>
            <Button variant="outline" onClick={() => router.push('/')}>
              Return Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 animate-pulse text-gold text-4xl">◆</div>
            <Text variant="lead">Loading verification...</Text>
          </div>
        </div>
      </main>
    );
  }

  // Error state (invalid code)
  if (!claimData) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 text-4xl text-[#8B0000]">✕</div>
            <Heading as="h1" className="mb-4">
              Invalid Code
            </Heading>
            <Text variant="lead" className="mb-6">
              {error || 'This verification code is invalid or has expired.'}
            </Text>
            <Button variant="outline" onClick={() => router.push('/')}>
              Return Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Verification form
  return (
    <main className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-md mx-auto">
        <BackLink />

        <div className="text-center py-8">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-gold/50" />
            <span className="text-gold text-xl">◆</span>
            <span className="h-px w-12 bg-gold/50" />
          </div>

          <Heading as="h1" className="mb-4">
            Almost there, {claimData.handle}!
          </Heading>

          <Text variant="lead" className="mb-8">
            Tweet to verify your membership
          </Text>
        </div>

        <Card variant="bordered" className="mb-6">
          <Text variant="caption" className="mb-3 text-center">
            Tweet this to verify
          </Text>
          <div className="bg-surface-elevated rounded-lg p-4 font-mono text-sm text-text-primary whitespace-pre-wrap">
            {tweetText}
          </div>
        </Card>

        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyTweet}
          >
            {copied ? 'Copied!' : 'Copy Tweet'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleOpenTwitter}
          >
            Open Twitter
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#8B0000]/10 border border-[#8B0000]/30 rounded-lg">
            <Text variant="muted" className="text-[#ff6b6b] text-center">
              {error}
            </Text>
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleVerify}
          loading={verifying}
        >
          I&apos;ve Tweeted - Verify Now
        </Button>

        <Text variant="muted" className="text-xs text-center mt-4">
          We&apos;ll check your recent tweets to confirm verification.
        </Text>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background py-8 px-6">
          <div className="max-w-md mx-auto">
            <div className="text-center py-16">
              <div className="mb-6 animate-pulse text-gold text-4xl">◆</div>
              <Text variant="lead">Loading...</Text>
            </div>
          </div>
        </main>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
