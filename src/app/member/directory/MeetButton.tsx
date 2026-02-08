'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Typography';

interface MeetButtonProps {
  memberId: string;
  memberHandle: string;
}

export function MeetButton({ memberId, memberHandle }: MeetButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/member/meet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toMemberId: memberId,
          reason: reason.trim(),
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setSuccess(false);
          setReason('');
          router.refresh();
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send request');
      }
    } catch {
      setError('Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-[#2E7D32] text-sm">
        Request sent!
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
      >
        Meet
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-surface w-full max-w-md rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Request to meet {memberHandle}
            </h3>
            <Text variant="muted" className="text-sm mb-4">
              Why do you want to connect?
            </Text>

            <form onSubmit={handleSubmit}>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I'd like to discuss..."
                className="w-full h-24 p-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-gold/50"
                maxLength={500}
                required
              />

              {error && (
                <Text variant="muted" className="text-[#ff6b6b] text-sm mt-2">
                  {error}
                </Text>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!reason.trim()}
                >
                  Send Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
