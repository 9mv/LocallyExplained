import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { createStorypointRequest } from '@/lib/store';
import { getUserBySessionToken } from '@/lib/store';
import { sendRequestSubmissionEmail } from '@/lib/email';

export async function POST(request: Request) {
  const body = await request.json();
  const token = request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
  const currentUser = getUserBySessionToken(token);

  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const email = currentUser?.email ?? String(body.email ?? '').trim();

  if (!email) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const created = createStorypointRequest({
    title: String(body.title),
    body: String(body.body),
    email,
    locale: body.locale === 'es' || body.locale === 'en' ? body.locale : 'ca',
    lat: Number(body.lat),
    lng: Number(body.lng),
    submittedByUserId: currentUser?.id,
    submittedByUserName: currentUser?.name,
    submittedByProfileImageUrl: currentUser?.profileImageUrl
  });

  await sendRequestSubmissionEmail(email, created.title);

  return NextResponse.json({ request: created }, { status: 201 });
}
