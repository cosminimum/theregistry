import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: intentId } = await params;
  const cookieStore = await cookies();
  const memberId = cookieStore.get('member_id')?.value;

  if (!memberId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/member/login`
    );
  }

  // Handle both JSON and form data
  let accept: boolean;
  let message: string | undefined;

  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const body = await request.json();
    accept = body.accept === true || body.accept === 'true';
    message = body.message;
  } else {
    const formData = await request.formData();
    accept = formData.get('accept') === 'true';
    message = formData.get('message')?.toString();
  }

  const supabase = createServerClient();

  // Verify the intent exists and belongs to this member
  const { data: intent, error: intentError } = await supabase
    .from('meet_intents')
    .select('id, to_member_id, status')
    .eq('id', intentId)
    .single();

  if (intentError || !intent) {
    if (contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Intent not found' },
        { status: 404 }
      );
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/member/dashboard?error=not_found`
    );
  }

  if (intent.to_member_id !== memberId) {
    if (contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Not authorized to respond to this intent' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/member/dashboard?error=not_authorized`
    );
  }

  if (intent.status !== 'pending') {
    if (contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Intent has already been responded to' },
        { status: 400 }
      );
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/member/dashboard?error=already_responded`
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
    .eq('id', intentId);

  if (updateError) {
    console.error('Error updating intent:', updateError);
    if (contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Failed to respond to intent' },
        { status: 500 }
      );
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/member/dashboard?error=update_failed`
    );
  }

  if (contentType?.includes('application/json')) {
    return NextResponse.json({
      success: true,
      status: accept ? 'accepted' : 'declined',
    });
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_URL}/member/dashboard`
  );
}
