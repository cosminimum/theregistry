import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/client';

export async function GET() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('member_id')?.value;

  if (!memberId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const supabase = createServerClient();

  // Get intents where user is the recipient
  const { data: received, error: receivedError } = await supabase
    .from('meet_intents')
    .select(`
      id,
      reason,
      status,
      created_at,
      from_member:from_member_id (
        x_handle,
        agents!inner (
          name
        )
      )
    `)
    .eq('to_member_id', memberId)
    .order('created_at', { ascending: false });

  if (receivedError) {
    console.error('Error fetching received intents:', receivedError);
  }

  // Get intents where user is the sender
  const { data: sent, error: sentError } = await supabase
    .from('meet_intents')
    .select(`
      id,
      reason,
      status,
      response_message,
      created_at,
      responded_at,
      to_member:to_member_id (
        x_handle,
        agents!inner (
          name
        )
      )
    `)
    .eq('from_member_id', memberId)
    .order('created_at', { ascending: false });

  if (sentError) {
    console.error('Error fetching sent intents:', sentError);
  }

  return NextResponse.json({
    received: received || [],
    sent: sent || [],
  });
}
