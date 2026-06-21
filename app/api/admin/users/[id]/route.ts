import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { getUserBySessionToken, deleteUserAccount } from '@/lib/store';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
  const admin = await getUserBySessionToken(token);

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (admin.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 });
  }

  const deleted = await deleteUserAccount(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found or cannot delete' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
