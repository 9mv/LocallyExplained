import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const cookieName = 'locally_explained_admin';
const userCookieNameValue = 'locally_explained_user';
const sessionKeyLength = 64;

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';
}

function adminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? hashPassword(process.env.ADMIN_PASSWORD ?? 'admin');
}

function hashPassword(password: string) {
  return createHmac('sha256', secret()).update(password).digest('hex');
}

export function hashUserPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, sessionKeyLength) as Buffer;

  return {
    salt,
    hash: derived.toString('hex')
  };
}

export function verifyUserPassword(password: string, salt: string, hash: string) {
  const received = Buffer.from(hashUserPassword(password, salt).hash, 'hex');
  const expected = Buffer.from(hash, 'hex');

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function mintSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHmac('sha256', secret()).update(`session:${token}`).digest('hex');
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

export function userCookieName() {
  return userCookieNameValue;
}
