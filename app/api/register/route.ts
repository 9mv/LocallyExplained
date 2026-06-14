import { NextResponse } from 'next/server';
import { createSession, createUserAccount } from '@/lib/store';
import { userCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (!email || !password || password !== confirmPassword) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }

  try {
    const user = createUserAccount({ email, password });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    response.cookies.set(userCookieName(), createSession(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }
}
