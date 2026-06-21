import { NextResponse } from 'next/server';
import { userCookieName } from '@/lib/auth';
import { getUserBySessionToken, updateUserAccount } from '@/lib/store';

function getToken(request: Request) {
  return request.headers.get('cookie')?.match(new RegExp(`${userCookieName()}=([^;]+)`))?.[1];
}

export async function PATCH(request: Request) {
  const token = getToken(request);
  const currentUser = await getUserBySessionToken(token);

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const updated = await updateUserAccount(currentUser.id, {
      email: typeof body.email === 'string' ? String(body.email) : undefined,
      name: typeof body.name === 'string' ? String(body.name) : undefined,
      profileImageUrl: typeof body.profileImageUrl === 'string' ? String(body.profileImageUrl) : undefined,
      currentPassword: typeof body.currentPassword === 'string' ? String(body.currentPassword) : undefined,
      newPassword: typeof body.newPassword === 'string' ? String(body.newPassword) : undefined
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }
}
