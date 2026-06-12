import { createHmac, timingSafeEqual } from 'crypto';

const cookieName = 'locally_explained_admin';

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';
}

function adminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? hashPassword(process.env.ADMIN_PASSWORD ?? 'admin');
}

function hashPassword(password: string) {
  return createHmac('sha256', secret()).update(password).digest('hex');
}

export function verifyAdminPassword(password: string) {
  const received = Buffer.from(hashPassword(password));
  const expected = Buffer.from(adminPasswordHash());

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function mintAdminToken() {
  return createHmac('sha256', secret()).update('admin-session').digest('hex');
}

export function isAdminTokenValid(token: string | undefined | null) {
  return token === mintAdminToken();
}

export function adminCookieName() {
  return cookieName;
}
