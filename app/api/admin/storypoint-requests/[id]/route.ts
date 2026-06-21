import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { getUserBySessionToken, reviewStorypointRequest } from '@/lib/store';
import { sendRequestNotification } from '@/lib/email';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
  const admin = getUserBySessionToken(token);

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const decision = body?.decision === 'approved' ? 'approved' : 'rejected';
  const reviewerNote = body?.reviewerNote;
  const result = reviewStorypointRequest(id, decision, reviewerNote);

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await sendRequestNotification(result.email, decision, result.title, reviewerNote);

  return NextResponse.json({ request: result });
}
