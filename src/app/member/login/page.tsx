'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Heading, Text } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

const ERROR_MESSAGES: Record<string, string> = {
  not_member: 'This X account is not a Registry member.',
  oauth_denied: 'You declined to authorize with X.',
  session_expired: 'Session expired. Please try again.',
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

function LoginPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/x?type=member_login';
  };

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
            Member Login
          </Heading>

          <Text variant="lead" className="mb-8">
            Connect with X to access your member dashboard.
          </Text>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#8B0000]/10 border border-[#8B0000]/30 rounded-lg">
            <Text variant="muted" className="text-[#ff6b6b] text-center">
              {ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown}
            </Text>
          </div>
        )}

        <div className="text-center space-y-4">
          <Button
            size="lg"
            onClick={handleLogin}
            loading={loading}
            className="w-full sm:w-auto"
          >
            Login with X
          </Button>

          <Text variant="muted" className="text-xs">
            You must be a verified member of The Registry to login.
          </Text>
        </div>

        <div className="mt-12 text-center">
          <Text variant="muted" className="mb-2">
            Not a member yet?
          </Text>
          <Link href="/" className="text-gold hover:underline">
            Learn about The Registry
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
