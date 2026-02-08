import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/client';
import { DirectoryMember, DirectoryResponse, RelationshipStatus } from '@/types/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const supabase = createServerClient();

  // Build base query
  let dbQuery = supabase
    .from('members')
    .select(`
      id,
      x_handle,
      claimed_at,
      agents!inner (
        name
      ),
      verdicts!inner (
        teaser_quote
      )
    `, { count: 'exact' });

  // Search on handle and agent name
  if (query) {
    dbQuery = dbQuery.or(`x_handle.ilike.%${query}%,agents.name.ilike.%${query}%`);
  }

  // Sorting
  if (sort === 'oldest') {
    dbQuery = dbQuery.order('claimed_at', { ascending: true });
  } else if (sort === 'agent_name') {
    dbQuery = dbQuery.order('claimed_at', { ascending: false });
  } else {
    dbQuery = dbQuery.order('claimed_at', { ascending: false });
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  dbQuery = dbQuery.range(from, to);

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  // Get stats
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('claimed_at', sevenDaysAgo.toISOString());

  // Get current member ID from cookies for relationship status
  const cookieStore = await cookies();
  const currentMemberId = cookieStore.get('member_id')?.value;

  // Fetch meet intents for relationship mapping
  let relationshipMap: Record<string, RelationshipStatus> = {};

  if (currentMemberId) {
    const { data: intents } = await supabase
      .from('meet_intents')
      .select('from_member_id, to_member_id, status')
      .or(`from_member_id.eq.${currentMemberId},to_member_id.eq.${currentMemberId}`);

    if (intents) {
      for (const intent of intents) {
        const otherMemberId = intent.from_member_id === currentMemberId
          ? intent.to_member_id
          : intent.from_member_id;

        if (intent.status === 'accepted') {
          relationshipMap[otherMemberId] = 'connected';
        } else if (intent.status === 'pending') {
          if (intent.from_member_id === currentMemberId) {
            // Don't downgrade connected status
            if (relationshipMap[otherMemberId] !== 'connected') {
              relationshipMap[otherMemberId] = 'request_sent';
            }
          } else {
            if (relationshipMap[otherMemberId] !== 'connected') {
              relationshipMap[otherMemberId] = 'request_received';
            }
          }
        }
      }
    }
  }

  const members: DirectoryMember[] = (data || []).map((member) => ({
    id: member.id,
    handle: member.x_handle,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentName: (member.agents as any).name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teaserQuote: (member.verdicts as any).teaser_quote,
    joinedAt: member.claimed_at,
    ...(currentMemberId ? { relationshipStatus: relationshipMap[member.id] || 'none' } : {}),
  }));

  // Sort by agent name client-side if needed (Supabase can't sort by joined table)
  if (sort === 'agent_name') {
    members.sort((a, b) => a.agentName.localeCompare(b.agentName));
  }

  const response: DirectoryResponse = {
    members,
    total: count || 0,
    page,
    pageSize: limit,
    stats: {
      totalMembers: count || 0,
      recentMembers: recentCount || 0,
    },
  };

  return NextResponse.json(response);
}
