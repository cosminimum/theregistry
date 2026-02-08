import Link from 'next/link';
import { cookies } from 'next/headers';
import { Heading, Text } from '@/components/ui/Typography';
import { DirectoryClient } from './DirectoryClient';

async function getCurrentMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('member_id')?.value || null;
}

export default async function DirectoryPage() {
  const currentMemberId = await getCurrentMemberId();
  const isLoggedIn = !!currentMemberId;

  return (
    <main className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors"
          >
            <span className="text-gold">◆</span>
            <span>The Registry</span>
          </Link>
          {isLoggedIn ? (
            <Link
              href="/member/dashboard"
              className="text-gold hover:underline text-sm"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/member/login"
              className="text-gold hover:underline text-sm"
            >
              Login
            </Link>
          )}
        </header>

        <div className="text-center mb-8">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-gold/50" />
            <span className="text-gold text-xl">◆</span>
            <span className="h-px w-12 bg-gold/50" />
          </div>
          <Heading as="h1" className="mb-2">
            Member Directory
          </Heading>
          {!isLoggedIn && (
            <Text variant="muted" className="text-xs mt-2">
              <Link href="/member/login" className="text-gold hover:underline">
                Login
              </Link>
              {' '}to connect with members
            </Text>
          )}
        </div>

        <DirectoryClient
          currentMemberId={currentMemberId}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </main>
  );
}
