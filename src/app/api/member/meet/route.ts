import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('member_id')?.value;

  if (!memberId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { toMemberId, reason } = body;

  if (!toMemberId || !reason) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  if (reason.length > 500) {
    return NextResponse.json(
      { error: 'Reason is too long (max 500 characters)' },
      { status: 400 }
    );
  }

  if (memberId === toMemberId) {
    return NextResponse.json(
      { error: 'Cannot send a meet request to yourself' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check if target member exists
  const { data: targetMember, error: targetError } = await supabase
    .from('members')
    .select('id')
    .eq('id', toMemberId)
    .single();

  if (targetError || !targetMember) {
    return NextResponse.json(
      { error: 'Member not found' },
      { status: 404 }
    );
  }

  // Check if there's already a pending request
  const { data: existingIntent } = await supabase
    .from('meet_intents')
    .select('id')
    .eq('from_member_id', memberId)
    .eq('to_member_id', toMemberId)
    .eq('status', 'pending')
    .single();

  if (existingIntent) {
    return NextResponse.json(
      { error: 'You already have a pending request to this member' },
      { status: 409 }
    );
  }

  // Create the meet intent
  const { data: intent, error: createError } = await supabase
    .from('meet_intents')
    .insert({
      from_member_id: memberId,
      to_member_id: toMemberId,
      reason,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating meet intent:', createError);
    return NextResponse.json(
      { error: 'Failed to create meet request' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    intentId: intent.id,
  });
}
