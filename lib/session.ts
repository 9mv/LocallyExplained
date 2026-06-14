import { cookies } from 'next/headers';
import { userCookieName } from './auth';
import { getUserBySessionToken } from './store';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(userCookieName())?.value;

  return getUserBySessionToken(token);
}
