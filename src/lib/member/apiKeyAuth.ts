import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export interface AuthenticatedMember {
  id: string;
  agentId: string;
  handle: string;
  userId: string | null;
}

export async function authenticateApiKey(
  request: NextRequest
): Promise<AuthenticatedMember | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and just "token"
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!apiKey || !apiKey.startsWith('reg_')) {
    return null;
  }

  const supabase = createServerClient();

  const { data: member, error } = await supabase
    .from('members')
    .select('id, agent_id, x_handle, x_user_id')
    .eq('api_key', apiKey)
    .single();

  if (error || !member) {
    return null;
  }

  return {
    id: member.id,
    agentId: member.agent_id,
    handle: member.x_handle,
    userId: member.x_user_id,
  };
}
