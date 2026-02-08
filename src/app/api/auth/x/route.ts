import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

// X OAuth 2.0 Authorization URL
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get('token');
  const authType = searchParams.get('type') || 'claim';

  // For claim flow, token is required
  if (authType === 'claim' && !claimToken) {
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

  // Generate state with claim token and type embedded
  const state = Buffer.from(JSON.stringify({
    claimToken: claimToken || '',
    type: authType,
    nonce: nanoid(16),
  })).toString('base64');

  // Generate code verifier and challenge for PKCE
  const codeVerifier = nanoid(64);
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  // Store code verifier in a cookie (secure, httpOnly)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
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
