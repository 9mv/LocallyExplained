import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userCookieName } from '@/lib/auth';
import { revokeSession } from '@/lib/store';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(userCookieName())?.value;
  if (token) {
    await revokeSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set('x-locally-debug', 'logout-complete');
  response.cookies.set(userCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return response;
}
