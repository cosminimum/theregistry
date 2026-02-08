import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_URL}/member/login`
  );

  response.cookies.delete('member_id');
  response.cookies.delete('member_handle');

  return response;
}
