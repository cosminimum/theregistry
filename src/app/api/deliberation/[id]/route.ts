import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { DeliberationFull } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const supabase = createServerClient();

    // Get full deliberation using the database function
    const { data, error } = await supabase.rpc('get_full_deliberation', {
      interview_uuid: id,
    });

    if (error) {
      console.error('Error fetching deliberation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliberation' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Deliberation not found' },
        { status: 404 }
      );
    }

    const d = data[0];

    const deliberation: DeliberationFull = {
      id: d.id,
      agentName: d.agent_name,
      humanHandle: d.human_handle,
      interview: {
        messages: d.messages || [],
        startedAt: d.started_at,
        completedAt: d.completed_at,
        turnCount: d.turn_count,
      },
      votes: d.votes || [],
      createdAt: d.completed_at,
    };

    return NextResponse.json({ deliberation });
  } catch (error) {
    console.error('Error in deliberation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
