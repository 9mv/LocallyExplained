import { NextResponse } from 'next/server';
import { createSession, authenticateUser } from '@/lib/store';
import { setSessionCookie, mintResumeToken, RESEND_COOLDOWN_MS } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`login:${ip}`, 20, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');
  const result = await authenticateUser(email, password);

  if (result.status === 'invalid') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (result.status === 'unverified') {
    const now = Date.now();
    const sentAt = result.user.verificationCodeSentAt ?? now;
    const expiresAt = result.user.verificationCodeExpiresAt ?? now;
    const remainingTtl = Math.max(0, expiresAt - now);
    const remainingCooldown = Math.max(0, RESEND_COOLDOWN_MS - (now - sentAt));
    return NextResponse.json(
      {
        error: 'Account not verified',
        resumeToken: mintResumeToken(result.user.id),
        ttl: remainingTtl,
        resendCooldown: remainingCooldown
      },
      { status: 403 }
    );
  }

  const user = result.user;
  const token = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  setSessionCookie(response, token);
  return response;
}
