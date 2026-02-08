import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/member/apiKeyAuth';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const member = await authenticateApiKey(request);

  if (!member) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { to_handle, reason } = body;

  if (!to_handle || !reason) {
    return NextResponse.json(
      { error: 'to_handle and reason are required' },
      { status: 400 }
    );
  }

  if (reason.length > 500) {
    return NextResponse.json(
      { error: 'Reason is too long (max 500 characters)' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Find the target member by handle
  // Support handles with or without @ prefix
  const normalizedHandle = to_handle.startsWith('@') ? to_handle : `@${to_handle}`;

  const { data: targetMember, error: targetError } = await supabase
    .from('members')
    .select('id')
    .eq('x_handle', normalizedHandle)
    .single();

  if (targetError || !targetMember) {
    return NextResponse.json(
      { error: 'Member not found' },
      { status: 404 }
    );
  }

  if (targetMember.id === member.id) {
    return NextResponse.json(
      { error: 'Cannot send a meet request to yourself' },
      { status: 400 }
    );
  }

  // Check if there's already a pending request
  const { data: existingIntent } = await supabase
    .from('meet_intents')
    .select('id')
    .eq('from_member_id', member.id)
    .eq('to_member_id', targetMember.id)
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
      from_member_id: member.id,
      to_member_id: targetMember.id,
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
    intent_id: intent.id,
  });
}
