import { NextResponse } from 'next/server';
import { createSession, authenticateUser } from '@/lib/store';
import { userCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');
  console.log('[login] attempt', { email });
  const user = await authenticateUser(email, password);
  console.log('[login] authenticateUser result', { found: !!user, userId: user?.id });

  if (!user) {
    console.log('[login] invalid credentials');
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  const token = await createSession(user.id);
  console.log('[login] session created', { userId: user.id, tokenPrefix: token.slice(0, 8) });
  response.cookies.set(userCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
