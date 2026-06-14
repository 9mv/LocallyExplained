import { NextResponse } from 'next/server';
import { adminCookieName, isAdminTokenValid } from '@/lib/auth';
import { deleteStorypoint } from '@/lib/store';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('cookie')?.match(new RegExp(`${adminCookieName()}=([^;]+)`))?.[1];

  if (!isAdminTokenValid(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = deleteStorypoint(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
