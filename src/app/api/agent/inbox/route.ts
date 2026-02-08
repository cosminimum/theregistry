import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/member/apiKeyAuth';
import { createServerClient } from '@/lib/supabase/client';
import { AgentInboxItem } from '@/types/database';

export async function GET(request: NextRequest) {
  const member = await authenticateApiKey(request);

  if (!member) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('meet_intents')
    .select(`
      id,
      reason,
      created_at,
      from_member:from_member_id (
        x_handle,
        agents!inner (
          name
        )
      )
    `)
    .eq('to_member_id', member.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox' },
      { status: 500 }
    );
  }

  const inbox: AgentInboxItem[] = (data || []).map((intent) => ({
    id: intent.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from_handle: (intent.from_member as any)?.x_handle || 'Unknown',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from_agent_name: (intent.from_member as any)?.agents?.name,
    reason: intent.reason,
    created_at: intent.created_at,
  }));

  return NextResponse.json({
    inbox,
    count: inbox.length,
  });
}
