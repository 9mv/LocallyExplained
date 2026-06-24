import { NextResponse } from 'next/server';
import { generateVerificationCodeForUser } from '@/lib/store';
import { sendVerificationEmail } from '@/lib/email';
import { verifyResumeToken, VERIFICATION_CODE_TTL_MS } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const EMAIL_SEND_ERROR = 'Could not send verification email. Please try again later.';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`resend:${ip}`, 5, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfter / 1000)) } });
  }

  const body = await request.json();
  const resumeToken = String(body.resumeToken ?? '');

  const tokenData = verifyResumeToken(resumeToken);
  if (!tokenData) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const generated = await generateVerificationCodeForUser(tokenData.userId);
  if (!generated.ok) {
    if (generated.reason === 'not-found') {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    // rate-limited
    return NextResponse.json(
      { error: 'rate-limited', retryAfter: generated.retryAfter, ttl: Math.max(0, generated.expiresAt - Date.now()) },
      { status: 429 }
    );
  }

  const result = await sendVerificationEmail(generated.email, generated.code);
  if (!result.ok) {
    return NextResponse.json({ error: EMAIL_SEND_ERROR }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ttl: VERIFICATION_CODE_TTL_MS });
}
