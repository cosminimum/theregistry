'use client';

import { RelationshipStatus } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { MeetButton } from './MeetButton';

interface ConnectionStatusProps {
  memberId: string;
  memberHandle: string;
  status: RelationshipStatus;
}

export function ConnectionStatus({ memberId, memberHandle, status }: ConnectionStatusProps) {
  switch (status) {
    case 'connected':
      return <Badge variant="accept">Connected</Badge>;
    case 'request_sent':
      return <Badge variant="pending">Request Sent</Badge>;
    case 'request_received':
      return <Badge variant="gold">Wants to Meet</Badge>;
    default:
      return <MeetButton memberId={memberId} memberHandle={memberHandle} />;
  }
}
