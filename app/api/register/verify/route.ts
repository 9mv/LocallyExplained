import { NextResponse } from 'next/server';
import { verifyUserEmailAndCreateSession } from '@/lib/store';
import { verifyResumeToken, setSessionCookie } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`verify:${ip}`, 20, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const resumeToken = String(body.resumeToken ?? '');
  const code = String(body.code ?? '').trim();

  const tokenData = verifyResumeToken(resumeToken);
  if (!tokenData || !code) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const result = await verifyUserEmailAndCreateSession(tokenData.userId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const { user, token } = result;
  if (!token) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  setSessionCookie(response, token);
  return response;
}
