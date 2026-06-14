import { NextResponse } from 'next/server';
import { adminCookieName, isAdminTokenValid } from '@/lib/auth';
import { sendModerationEmail } from '@/lib/email';
import { reviewStorypointRequest } from '@/lib/store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('cookie')?.match(new RegExp(`${adminCookieName()}=([^;]+)`))?.[1];

  if (!isAdminTokenValid(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const decision = body?.decision === 'approved' ? 'approved' : 'rejected';
  const result = reviewStorypointRequest(id, decision);

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await sendModerationEmail(result, decision);

  return NextResponse.json({ request: result });
}
