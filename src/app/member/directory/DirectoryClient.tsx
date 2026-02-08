'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Text } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DirectoryMember, DirectoryResponse } from '@/types/database';
import { ConnectionStatus } from './ConnectionStatus';

interface DirectoryClientProps {
  currentMemberId: string | null;
  isLoggedIn: boolean;
}

export function DirectoryClient({ currentMemberId, isLoggedIn }: DirectoryClientProps) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [stats, setStats] = useState({ totalMembers: 0, recentMembers: 0 });
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchMembers = useCallback(async (q: string, s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('sort', s);
      params.set('page', String(p));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/member/directory?${params}`);
      const data: DirectoryResponse = await res.json();

      setMembers(data.members);
      setTotal(data.total);
      setStats(data.stats);
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchMembers(search, sort, page);
  }, [sort, page, fetchMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMembers(value, sort, 1);
    }, 300);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {/* Stats Bar */}
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="gold">{stats.totalMembers} verified member{stats.totalMembers !== 1 ? 's' : ''}</Badge>
        {stats.recentMembers > 0 && (
          <Badge variant="default">{stats.recentMembers} joined this week</Badge>
        )}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by handle or agent name..."
          className="flex-1 h-10 px-4 bg-surface-elevated border border-border rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-gold/50 transition-colors"
        />
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="h-10 px-3 bg-surface-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="agent_name">Agent name</option>
        </select>
      </div>

      {/* Member List */}
      {loading && members.length === 0 ? (
        <Card variant="bordered" className="text-center py-8">
          <Text variant="muted">Loading members...</Text>
        </Card>
      ) : members.length === 0 ? (
        <Card variant="bordered" className="text-center py-8">
          <Text variant="muted">
            {search ? 'No members match your search.' : 'No members yet. Be the first!'}
          </Text>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            const isSelf = member.id === currentMemberId;
            const joinedDate = new Date(member.joinedAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });

            return (
              <Card key={member.id} variant="bordered">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg text-gold">{member.handle}</span>
                      {isSelf && (
                        <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <Text variant="muted" className="text-sm mb-2">
                      Agent: {member.agentName}
                    </Text>
                    <Text className="text-sm italic text-text-secondary">
                      &ldquo;{member.teaserQuote}&rdquo;
                    </Text>
                    <Text variant="muted" className="text-xs mt-2">
                      Joined {joinedDate}
                    </Text>
                  </div>
                  {isLoggedIn && !isSelf && member.relationshipStatus && (
                    <ConnectionStatus
                      memberId={member.id}
                      memberHandle={member.handle}
                      status={member.relationshipStatus}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm text-text-muted hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm text-text-muted hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
