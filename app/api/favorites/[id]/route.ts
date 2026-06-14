import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { getUserBySessionToken, toggleFavoriteStorypoint } from '@/lib/store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
  const user = getUserBySessionToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updated = toggleFavoriteStorypoint(user.id, id);

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ favoriteStorypointIds: updated.favoriteStorypointIds });
}
