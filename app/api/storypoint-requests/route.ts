import { NextResponse } from 'next/server';
import { createStorypointRequest } from '@/lib/store';

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.title || !body?.body || !body?.email) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const created = createStorypointRequest({
    title: String(body.title),
    body: String(body.body),
    email: String(body.email),
    locale: body.locale === 'es' || body.locale === 'en' ? body.locale : 'ca',
    lat: Number(body.lat),
    lng: Number(body.lng)
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
