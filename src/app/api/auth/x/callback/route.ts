import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { nanoid } from 'nanoid';

const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_USER_URL = 'https://api.twitter.com/2/users/me';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim?error=oauth_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim?error=invalid_callback`
    );
  }

  // Parse state to get claim token and type
  let claimToken: string;
  let authType: string = 'claim';
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    claimToken = stateData.claimToken;
    authType = stateData.type || 'claim';
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim?error=invalid_state`
    );
  }

  // Get code verifier from cookie
  const codeVerifier = request.cookies.get('x_code_verifier')?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim?error=session_expired`
    );
  }

  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/auth/x/callback`;

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info
    const userResponse = await fetch(X_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text());
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=user_fetch_failed`
      );
    }

    const userData = await userResponse.json();
    const xHandle = `@${userData.data.username}`;
    const xUserId = userData.data.id;

    const supabase = createServerClient();

    // Handle member login flow
    if (authType === 'member_login') {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, x_handle')
        .eq('x_handle', xHandle)
        .single();

      if (memberError || !member) {
        const response = NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_URL}/member/login?error=not_member`
        );
        response.cookies.delete('x_code_verifier');
        return response;
      }

      // Set member session cookie
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/member/dashboard`
      );
      response.cookies.delete('x_code_verifier');
      response.cookies.set('member_handle', xHandle, {
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
    }

    // Handle claim flow - verify claim token and handle match
    const { data: verdict, error: verdictError } = await supabase
      .from('verdicts')
      .select(`
        id,
        interview_id,
        claimed,
        interviews!inner (
          applications!inner (
            agents!inner (
              id,
              human_handle
            )
          )
        )
      `)
      .eq('claim_token', claimToken)
      .single();

    if (verdictError || !verdict) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=invalid_token`
      );
    }

    if (verdict.claimed) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=already_claimed`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interviewData = verdict.interviews as any;
    const expectedHandle = interviewData.applications.agents.human_handle;
    const agentId = interviewData.applications.agents.id;

    // Check if handle matches
    if (xHandle.toLowerCase() !== expectedHandle.toLowerCase()) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=handle_mismatch&expected=${encodeURIComponent(expectedHandle)}&got=${encodeURIComponent(xHandle)}`
      );
    }

    // Generate verification code for tweet
    const verificationCode = nanoid(8).toUpperCase();

    // Create pending claim instead of member record
    const { error: pendingError } = await supabase.from('pending_claims').insert({
      x_handle: xHandle,
      x_user_id: xUserId,
      verification_code: verificationCode,
      claim_token: claimToken,
      agent_id: agentId,
      oauth_data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    if (pendingError) {
      console.error('Pending claim creation failed:', pendingError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/claim?error=claim_failed`
      );
    }

    // Redirect to tweet verification page
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim/verify?code=${verificationCode}`
    );

    // Clear the code verifier cookie
    response.cookies.delete('x_code_verifier');

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/claim?error=unknown`
    );
  }
}
