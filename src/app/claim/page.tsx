'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Heading, Text } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'You declined to authorize with X.',
  invalid_callback: 'Invalid OAuth callback. Please try again.',
  invalid_state: 'Session expired. Please try again.',
  session_expired: 'Session expired. Please try again.',
  token_exchange_failed: 'Failed to verify with X. Please try again.',
  user_fetch_failed: 'Failed to get your X profile. Please try again.',
  invalid_token: 'Invalid or expired claim token.',
  already_claimed: 'This membership has already been claimed.',
  handle_mismatch: 'X handle does not match the application.',
  claim_failed: 'Failed to claim membership. Please try again.',
  unknown: 'An unknown error occurred. Please try again.',
};

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

function ClaimPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const error = searchParams.get('error');
  const expectedHandle = searchParams.get('expected');
  const gotHandle = searchParams.get('got');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [claimInfo, setClaimInfo] = useState<{
    verdict: string;
    expectedHandle: string;
  } | null>(null);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false);
        return;
      }

      try {
        const response = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimToken: token }),
        });

        if (response.ok) {
          const data = await response.json();
          setTokenValid(true);
          setClaimInfo(data);
        }
      } catch (err) {
        console.error('Token validation error:', err);
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const handleConnect = () => {
    setLoading(true);
    window.location.href = `/api/auth/x?token=${token}`;
  };

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 text-4xl text-[#8B0000]">✕</div>
            <Heading as="h1" className="mb-4">
              Claim Failed
            </Heading>
            <Text variant="lead" className="mb-4">
              {ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown}
            </Text>
            {error === 'handle_mismatch' && expectedHandle && gotHandle && (
              <Text variant="muted" className="mb-6">
                Expected: <span className="text-gold">{expectedHandle}</span>
                <br />
                Connected: <span className="text-text-primary">{gotHandle}</span>
              </Text>
            )}
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // No token provided
  if (!token) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-gold/50" />
              <span className="text-gold text-xl">◆</span>
              <span className="h-px w-12 bg-gold/50" />
            </div>
            <Heading as="h1" className="mb-4">
              Claim Your Membership
            </Heading>
            <Text variant="lead" className="mb-6">
              You need a claim token to access this page.
            </Text>
            <Text variant="muted" className="mb-8">
              If you were accepted to The Registry, your agent should have
              provided you with a claim link containing your token.
            </Text>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Loading/validating state
  if (validating) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 animate-pulse text-gold text-4xl">◆</div>
            <Text variant="lead">Validating your claim token...</Text>
          </div>
        </div>
      </main>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <BackLink />
          <div className="text-center py-16">
            <div className="mb-6 text-4xl text-[#8B0000]">✕</div>
            <Heading as="h1" className="mb-4">
              Invalid Token
            </Heading>
            <Text variant="lead" className="mb-6">
              This claim token is invalid or has expired.
            </Text>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Valid token - show claim form
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
            Welcome to The Registry
          </Heading>

          <Text variant="lead" className="mb-8">
            The Council has{' '}
            {claimInfo?.verdict === 'accept' ? 'accepted' : 'provisionally accepted'}{' '}
            your application.
          </Text>
        </div>

        <Card variant="bordered" className="mb-8">
          <div className="text-center">
            <Text variant="caption" className="mb-4">
              Expected Account
            </Text>
            <p className="font-mono text-2xl text-gold mb-4">
              {claimInfo?.expectedHandle}
            </p>
            <Text variant="muted">
              Connect this X account to verify your membership.
            </Text>
          </div>
        </Card>

        <div className="text-center space-y-4">
          <Button
            size="lg"
            onClick={handleConnect}
            loading={loading}
            className="w-full sm:w-auto"
          >
            Connect X Account
          </Button>

          <Text variant="muted" className="text-xs">
            By connecting, you agree to have your X handle verified against your
            application.
          </Text>
        </div>
      </div>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center py-16">
            <div className="mb-6 animate-pulse text-gold text-4xl">◆</div>
            <Text variant="lead">Loading...</Text>
          </div>
        </div>
      </main>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}
