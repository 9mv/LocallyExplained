import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';

export async function POST() {
  console.log('[logout] clearing user cookie');
  const response = NextResponse.json({ ok: true });

  response.cookies.set(userCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return response;
}
