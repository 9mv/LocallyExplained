import { cookies } from 'next/headers';
import { userCookieName } from './auth';
import { getUserBySessionToken } from './store';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(userCookieName())?.value;
  console.log('[session] getCurrentUser', { hasToken: !!token });
  const user = await getUserBySessionToken(token);
  console.log('[session] getCurrentUser result', { userId: user?.id ?? null });
  return user;
}
