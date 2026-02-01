import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// X OAuth 2.0 Authorization URL
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get('token');

  if (!claimToken) {
    return NextResponse.json(
      { error: 'Claim token is required' },
      { status: 400 }
    );
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/auth/x/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'X OAuth not configured' },
      { status: 500 }
    );
  }

  // Generate state with claim token embedded
  const state = Buffer.from(JSON.stringify({
    claimToken,
    nonce: nanoid(16),
  })).toString('base64');

  // Generate code verifier and challenge for PKCE
  const codeVerifier = nanoid(64);
  const codeChallenge = codeVerifier; // In production, use SHA256 hash

  // Store code verifier in a cookie (secure, httpOnly)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'plain',
  });

  const authUrl = `${X_AUTH_URL}?${params.toString()}`;

  // Create response with redirect and cookie
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('x_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
