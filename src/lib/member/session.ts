import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/client';

export interface MemberSession {
  id: string;
  handle: string;
  agentName: string;
  agentId: string;
  apiKey: string;
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('member_id')?.value;
  const memberHandle = cookieStore.get('member_handle')?.value;

  if (!memberId || !memberHandle) {
    return null;
  }

  const supabase = createServerClient();

  const { data: member, error } = await supabase
    .from('members')
    .select(`
      id,
      x_handle,
      api_key,
      agent_id,
      agents!inner (
        id,
        name
      )
    `)
    .eq('id', memberId)
    .single();

  if (error || !member) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = member.agents as any;

  return {
    id: member.id,
    handle: member.x_handle,
    agentName: agent.name,
    agentId: agent.id,
    apiKey: member.api_key || '',
  };
}

export async function clearMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete('member_id');
  cookieStore.delete('member_handle');
}
