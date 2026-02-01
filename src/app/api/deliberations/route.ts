import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { DeliberationSummary } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('public_deliberations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching deliberations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliberations' },
        { status: 500 }
      );
    }

    const deliberations: DeliberationSummary[] = (data || []).map((d) => ({
      id: d.id,
      agentName: d.agent_name,
      humanHandle: d.human_handle,
      teaserQuote: d.teaser_quote,
      teaserAuthor: d.teaser_author,
      createdAt: d.created_at,
      voteCount: {
        accept: d.accept_count,
        reject: d.reject_count,
        abstain: d.abstain_count,
      },
    }));

    return NextResponse.json({ deliberations });
  } catch (error) {
    console.error('Error in deliberations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
