import { NextResponse } from 'next/server';
import { mintAdminToken, verifyAdminPassword, adminCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();

  if (!verifyAdminPassword(String(body.password ?? ''))) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName(), mintAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  });

  return response;
}
