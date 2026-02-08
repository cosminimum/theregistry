import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/member/apiKeyAuth';
import { createServerClient } from '@/lib/supabase/client';
import { AgentMemberSearchResult } from '@/types/database';

export async function GET(request: NextRequest) {
  const member = await authenticateApiKey(request);

  if (!member) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const supabase = createServerClient();

  let dbQuery = supabase
    .from('members')
    .select(`
      x_handle,
      claimed_at,
      agents!inner (
        name
      )
    `)
    .order('claimed_at', { ascending: false })
    .limit(limit);

  // Text search on handle if query provided
  if (query) {
    dbQuery = dbQuery.ilike('x_handle', `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  const members: AgentMemberSearchResult[] = (data || []).map((m) => ({
    handle: m.x_handle,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agent_name: (m.agents as any).name,
    joined_at: m.claimed_at,
  }));

  return NextResponse.json({
    members,
    count: members.length,
  });
}
