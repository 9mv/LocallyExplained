import { NextResponse } from 'next/server';
import { createUserAccount } from '@/lib/store';
import { sendVerificationEmail } from '@/lib/email';
import { mintResumeToken, VERIFICATION_CODE_TTL_MS } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const EMAIL_SEND_ERROR = 'Could not send verification email. Please try again later.';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const email = String(body.email ?? '').trim();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (!email || !password || password !== confirmPassword) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }

  try {
    const user = await createUserAccount({ email, password, username });
    const result = await sendVerificationEmail(user.email, user.verificationCode ?? '');
    if (!result.ok) {
      // Account was created but the email could not be sent. Return a resume
      // token so the user can resend the code from the verify step instead of
      // being stuck (the email/username are now taken).
      return NextResponse.json(
        { error: EMAIL_SEND_ERROR, resumeToken: mintResumeToken(user.id), ttl: VERIFICATION_CODE_TTL_MS },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { resumeToken: mintResumeToken(user.id), ttl: VERIFICATION_CODE_TTL_MS },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
