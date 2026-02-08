import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

const X_TWEETS_URL = 'https://api.twitter.com/2/users';

// GET: Fetch pending claim data by verification code
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Verification code is required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: claim, error } = await supabase
    .from('pending_claims')
    .select('x_handle, verification_code, expires_at')
    .eq('verification_code', code)
    .single();

  if (error || !claim) {
    return NextResponse.json(
      { error: 'Invalid or expired verification code' },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Verification code has expired' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    handle: claim.x_handle,
    code: claim.verification_code,
  });
}

// POST: Verify tweet and create member
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json(
      { error: 'Verification code is required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get pending claim
  const { data: claim, error: claimError } = await supabase
    .from('pending_claims')
    .select('*')
    .eq('verification_code', code)
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { error: 'Invalid or expired verification code' },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Verification code has expired. Please start the claim process again.' },
      { status: 410 }
    );
  }

  // Get the access token from oauth_data
  const accessToken = claim.oauth_data?.access_token;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'OAuth session expired. Please start the claim process again.' },
      { status: 401 }
    );
  }

  // Fetch user's recent tweets to verify the code
  try {
    const tweetsResponse = await fetch(
      `${X_TWEETS_URL}/${claim.x_user_id}/tweets?max_results=10&tweet.fields=created_at,text`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!tweetsResponse.ok) {
      const errorText = await tweetsResponse.text();
      console.error('Failed to fetch tweets:', errorText);
      return NextResponse.json(
        { error: 'Failed to verify tweet. Please ensure you have tweeted and try again.' },
        { status: 400 }
      );
    }

    const tweetsData = await tweetsResponse.json();
    const tweets = tweetsData.data || [];

    // Find a tweet containing the verification code
    const verificationTweet = tweets.find((tweet: { text: string; id: string }) =>
      tweet.text.includes(claim.verification_code)
    );

    if (!verificationTweet) {
      return NextResponse.json(
        { error: 'Could not find verification tweet. Please tweet the code and try again.' },
        { status: 400 }
      );
    }

    // Get verdict data to create member
    const { data: verdict, error: verdictError } = await supabase
      .from('verdicts')
      .select('id, interview_id, claimed')
      .eq('claim_token', claim.claim_token)
      .single();

    if (verdictError || !verdict) {
      return NextResponse.json(
        { error: 'Claim token is no longer valid' },
        { status: 400 }
      );
    }

    if (verdict.claimed) {
      return NextResponse.json(
        { error: 'This membership has already been claimed' },
        { status: 400 }
      );
    }

    // Generate API key for the member
    const apiKey = `reg_${generateSecureKey(32)}`;

    // Create member record
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        agent_id: claim.agent_id,
        x_handle: claim.x_handle,
        x_user_id: claim.x_user_id,
        verdict_id: verdict.id,
        interview_id: verdict.interview_id,
        api_key: apiKey,
        verification_tweet_id: verificationTweet.id,
      })
      .select('id')
      .single();

    if (memberError) {
      console.error('Member creation failed:', memberError);
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      );
    }

    // Mark verdict as claimed
    await supabase
      .from('verdicts')
      .update({ claimed: true })
      .eq('id', verdict.id);

    // Delete the pending claim
    await supabase
      .from('pending_claims')
      .delete()
      .eq('id', claim.id);

    // Create response with member session
    const response = NextResponse.json({
      success: true,
      memberId: member.id,
    });

    // Set member session cookies
    response.cookies.set('member_handle', claim.x_handle, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    response.cookies.set('member_id', member.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Tweet verification error:', err);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper function to generate a secure random key
function generateSecureKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
