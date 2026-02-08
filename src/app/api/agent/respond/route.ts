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
  const { intent_id, accept, message } = body;

  if (!intent_id) {
    return NextResponse.json(
      { error: 'intent_id is required' },
      { status: 400 }
    );
  }

  if (typeof accept !== 'boolean') {
    return NextResponse.json(
      { error: 'accept must be a boolean' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify the intent exists and belongs to this member
  const { data: intent, error: intentError } = await supabase
    .from('meet_intents')
    .select('id, to_member_id, status')
    .eq('id', intent_id)
    .single();

  if (intentError || !intent) {
    return NextResponse.json(
      { error: 'Intent not found' },
      { status: 404 }
    );
  }

  if (intent.to_member_id !== member.id) {
    return NextResponse.json(
      { error: 'Not authorized to respond to this intent' },
      { status: 403 }
    );
  }

  if (intent.status !== 'pending') {
    return NextResponse.json(
      { error: 'Intent has already been responded to' },
      { status: 400 }
    );
  }

  // Update the intent
  const { error: updateError } = await supabase
    .from('meet_intents')
    .update({
      status: accept ? 'accepted' : 'declined',
      response_message: message || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', intent_id);

  if (updateError) {
    console.error('Error updating intent:', updateError);
    return NextResponse.json(
      { error: 'Failed to respond to intent' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status: accept ? 'accepted' : 'declined',
  });
}
