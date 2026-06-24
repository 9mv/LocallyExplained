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

export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;

type CookieSetter = { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } };

export function setSessionCookie(response: CookieSetter, token: string) {
  response.cookies.set(userCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE
  });
}

// Opaque, short-lived token carrying a userId so the client can resume the
// verify/resend flow without the server ever exposing the raw userId. The token
// is "<base64url(payload)>.<hex(signature)>" where payload is
// "resume:<userId>:<expiresAt>"; it cannot be forged without the secret and the
// userId is recoverable only by the server-side verifier.
const RESUME_PREFIX = 'resume';
const RESUME_TTL_MS = 30 * 60 * 1000;

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function mintResumeToken(userId: string) {
  const expiresAt = Date.now() + RESUME_TTL_MS;
  const payload = `${RESUME_PREFIX}:${userId}:${expiresAt}`;
  const signature = createHmac('sha256', secret()).update(payload).digest('hex');
  return `${base64url(payload)}.${signature}`;
}

export function verifyResumeToken(token: string): { userId: string } | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0) return null;
  const payloadB64 = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== RESUME_PREFIX) return null;
  const userId = parts[1];
  const expiresAt = Number(parts[2]);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const expected = Buffer.from(createHmac('sha256', secret()).update(payload).digest('hex'), 'hex');
  const received = Buffer.from(signature, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  return { userId };
}
