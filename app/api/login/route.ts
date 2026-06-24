import { NextResponse } from 'next/server';
import { createSession, authenticateUser } from '@/lib/store';
import { userCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');
  const user = await authenticateUser(email, password);

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  response.headers.set('x-locally-debug', `login-session-created ${token.slice(0, 8)}`);
  response.cookies.set(userCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
