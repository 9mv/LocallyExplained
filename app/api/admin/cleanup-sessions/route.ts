import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { getUserBySessionToken, persistStore, getFreshStore } from '@/lib/store';

export async function POST(request: Request) {
  const token = request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
  const admin = await getUserBySessionToken(token);

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await getFreshStore();
  const before = store.sessions.length;
  await persistStore(store);
  const removed = before - store.sessions.length;

  return NextResponse.json({ removed });
}