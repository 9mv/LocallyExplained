import { NextResponse } from 'next/server';
import { isUsernameAvailable } from '@/lib/store';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`username-check:${ip}`, 30, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfter / 1000)) } });
  }

  const body = await request.json();
  const username = String(body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ available: false, reason: 'empty' });
  }

  const available = await isUsernameAvailable(username);
  return NextResponse.json({ available });
}
