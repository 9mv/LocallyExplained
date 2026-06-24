import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { hashSessionToken, hashUserPassword, verifyUserPassword, mintSessionToken } from './auth';
import { Locale, Storypoint, StorypointRequest, UserAccount } from './types';

type SessionRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

type Store = {
  revision?: number;
  users: UserAccount[];
  sessions: SessionRecord[];
  storypoints: Storypoint[];
  requests: StorypointRequest[];
};

type RemoteRow = Record<string, any>;

const dbDir = join(process.cwd(), '.data');
const dbPath = join(dbDir, 'locally-explained-db.json');
const remoteDatabaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
const remoteSql = remoteDatabaseUrl ? neon(remoteDatabaseUrl) : null;
const writeLockKey = 453928174;

const seedStorypoints: Storypoint[] = [
  {
    id: 'sheltered-bay',
    slug: 'sheltered-bay',
    locationName: 'Sheltered Bay',
    lat: 39.9376,
    lng: 3.9624,
    originalLocale: 'ca',
    submittedByUserName: 'LocallyExplained Team',
    translations: {
      ca: {
        title: 'Una cala protegida',
        body: 'Aquesta cala és un bon exemple de com la costa pot crear espais tranquils i accessibles. Les seves formes naturals han condicionat l’ús del lloc i la manera com els visitants s’hi apropen.'
      },
      es: {
        title: 'Una cala protegida',
        body: 'Esta cala es un buen ejemplo de cómo la costa puede crear espacios tranquilos y accesibles. Sus formas naturales han condicionado el uso del lugar y la manera en que los visitantes se acercan a él.'
      },
      en: {
        title: 'A sheltered bay',
        body: 'This bay is a good example of how the coastline can create calm and accessible spaces. Its natural shapes have shaped the way people use the place and approach it as visitors.'
      }
    }
  },
  {
    id: 'natural-harbour',
    slug: 'natural-harbour',
    locationName: 'Natural Harbour',
    lat: 39.8894,
    lng: 4.2631,
    originalLocale: 'ca',
    submittedByUserName: 'LocallyExplained Team',
    translations: {
      ca: {
        title: 'Un port natural',
        body: 'Aquest port natural ha estat un punt estratègic per al comerç, la navegació i la vida urbana. La seva grandària i protecció l’han convertit en un lloc clau durant segles.'
      },
      es: {
        title: 'Un puerto natural',
        body: 'Este puerto natural ha sido un punto estratégico para el comercio, la navegación y la vida urbana. Su tamaño y protección lo han convertido en un lugar clave durante siglos.'
      },
      en: {
        title: 'A natural harbour',
        body: 'This natural harbour has been a strategic point for trade, navigation, and urban life. Its size and protection have made it an important place for centuries.'
      }
    }
  }
];

function createSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function deriveDisplayName(email: string) {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'User';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureDbDir() {
  await mkdir(dbDir, { recursive: true }).catch(() => undefined);
}

function normalizeStore(parsed: Partial<Store>): Store {
  return {
    revision: parsed.revision ?? 0,
    users: parsed.users ?? [],
    sessions: parsed.sessions ?? [],
    storypoints: parsed.storypoints ?? [...seedStorypoints],
    requests: parsed.requests ?? []
  };
}

function defaultStore(): Store {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@locally-explained.local';
  const adminPasswordHash = hashUserPassword(adminPassword);
  const createdAt = nowIso();

  return {
    revision: 0,
    users: [
      {
        id: 'admin-user',
        email: adminEmail,
        name: 'Admin',
        passwordSalt: adminPasswordHash.salt,
        passwordHash: adminPasswordHash.hash,
        profileImageUrl: '',
        favoriteStorypointIds: [],
        role: 'admin',
        createdAt,
        updatedAt: createdAt
      }
    ],
    sessions: [],
    storypoints: [...seedStorypoints],
    requests: []
  };
}

async function ensureRemoteSchema() {
  if (!remoteSql) return;

  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_meta (
      id integer PRIMARY KEY,
      revision integer NOT NULL DEFAULT 0
    )
  `;
  await remoteSql`INSERT INTO locally_explained_meta (id, revision) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_users (
      id text PRIMARY KEY,
      email text NOT NULL,
      name text NOT NULL,
      password_salt text NOT NULL,
      password_hash text NOT NULL,
      profile_image_url text NOT NULL DEFAULT '',
      role text NOT NULL CHECK (role IN ('user', 'admin')),
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      recovery_code text,
      recovery_code_expires_at timestamptz
    )
  `;
  await remoteSql`CREATE UNIQUE INDEX IF NOT EXISTS locally_explained_users_email_lower_idx ON locally_explained_users (lower(email))`;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_user_sessions (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL REFERENCES locally_explained_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_user_sessions_user_id_idx ON locally_explained_user_sessions (user_id)`;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_user_sessions_expires_at_idx ON locally_explained_user_sessions (expires_at)`;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_storypoints (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      location_name text NOT NULL,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      original_locale text NOT NULL CHECK (original_locale IN ('ca', 'es', 'en')),
      submitted_by_user_id text REFERENCES locally_explained_users(id) ON DELETE SET NULL,
      submitted_by_user_name text,
      submitted_by_email text,
      submitted_by_profile_image_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_storypoints_submitted_by_user_id_idx ON locally_explained_storypoints (submitted_by_user_id)`;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_storypoints_submitted_by_email_idx ON locally_explained_storypoints (lower(submitted_by_email))`;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_storypoint_translations (
      storypoint_id text NOT NULL REFERENCES locally_explained_storypoints(id) ON DELETE CASCADE,
      locale text NOT NULL CHECK (locale IN ('ca', 'es', 'en')),
      title text NOT NULL,
      body text NOT NULL,
      PRIMARY KEY (storypoint_id, locale)
    )
  `;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_storypoint_requests (
      id text PRIMARY KEY,
      title text NOT NULL,
      body text NOT NULL,
      email text NOT NULL,
      locale text NOT NULL CHECK (locale IN ('ca', 'es', 'en')),
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      submitted_by_user_id text REFERENCES locally_explained_users(id) ON DELETE SET NULL,
      submitted_by_user_name text,
      submitted_by_profile_image_url text,
      status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at timestamptz NOT NULL,
      reviewed_at timestamptz,
      reviewer_note text,
      CHECK (
        (status = 'pending' AND reviewed_at IS NULL)
        OR (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
      )
    )
  `;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_storypoint_requests_status_created_at_idx ON locally_explained_storypoint_requests (status, created_at DESC)`;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_storypoint_requests_submitted_by_user_id_idx ON locally_explained_storypoint_requests (submitted_by_user_id)`;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_storypoint_requests_email_idx ON locally_explained_storypoint_requests (lower(email))`;
  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_user_favorites (
      user_id text NOT NULL REFERENCES locally_explained_users(id) ON DELETE CASCADE,
      storypoint_id text NOT NULL REFERENCES locally_explained_storypoints(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, storypoint_id)
    )
  `;
  await remoteSql`CREATE INDEX IF NOT EXISTS locally_explained_user_favorites_storypoint_id_idx ON locally_explained_user_favorites (storypoint_id)`;
}

async function persistRemoteStore(store: Store) {
  if (!remoteSql) return;

  const expectedRevision = store.revision ?? 0;
  const nextRevision = expectedRevision + 1;
  const normalized = normalizeStore(store);
  const timestamps = new Map<string, { createdAt: string; updatedAt: string }>();
  const now = nowIso();

  await remoteSql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(${writeLockKey})`,
    tx`SELECT revision FROM locally_explained_meta WHERE id = 1`,
    tx`SELECT id, created_at, updated_at FROM locally_explained_storypoints`,
    tx`DELETE FROM locally_explained_user_favorites`,
    tx`DELETE FROM locally_explained_storypoint_translations`,
    tx`DELETE FROM locally_explained_user_sessions`,
    tx`DELETE FROM locally_explained_storypoint_requests`,
    tx`DELETE FROM locally_explained_storypoints`,
    tx`DELETE FROM locally_explained_users`,
    ...normalized.users.map((user) => tx`
        INSERT INTO locally_explained_users (
          id, email, name, password_salt, password_hash, profile_image_url, role, created_at, updated_at, recovery_code, recovery_code_expires_at
        ) VALUES (
          ${user.id}, ${normalizeEmail(user.email)}, ${user.name}, ${user.passwordSalt}, ${user.passwordHash}, ${user.profileImageUrl}, ${user.role}, ${user.createdAt}, ${user.updatedAt}, ${user.recoveryCode ?? null}, ${user.recoveryCodeExpiresAt ? new Date(user.recoveryCodeExpiresAt).toISOString() : null}
        )
      `),
    ...normalized.storypoints.map((storypoint) => tx`
        INSERT INTO locally_explained_storypoints (
          id, slug, location_name, lat, lng, original_locale, submitted_by_user_id, submitted_by_user_name, submitted_by_email, submitted_by_profile_image_url, created_at, updated_at
        ) VALUES (
          ${storypoint.id}, ${storypoint.slug}, ${storypoint.locationName}, ${storypoint.lat}, ${storypoint.lng}, ${storypoint.originalLocale}, ${storypoint.submittedByUserId ?? null}, ${storypoint.submittedByUserName ?? null}, ${storypoint.submittedByEmail ?? null}, ${storypoint.submittedByProfileImageUrl ?? null}, ${now}, ${now}
        )
      `),
    ...normalized.storypoints.flatMap((storypoint) => (['ca', 'es', 'en'] as Locale[]).map((locale) => tx`
          INSERT INTO locally_explained_storypoint_translations (storypoint_id, locale, title, body)
          VALUES (${storypoint.id}, ${locale}, ${storypoint.translations[locale].title}, ${storypoint.translations[locale].body})
        `)),
    ...normalized.requests.map((request) => tx`
        INSERT INTO locally_explained_storypoint_requests (
          id, title, body, email, locale, lat, lng, submitted_by_user_id, submitted_by_user_name, submitted_by_profile_image_url, status, created_at, reviewed_at, reviewer_note
        ) VALUES (
          ${request.id}, ${request.title}, ${request.body}, ${normalizeEmail(request.email)}, ${request.locale}, ${request.lat}, ${request.lng}, ${request.submittedByUserId ?? null}, ${request.submittedByUserName ?? null}, ${request.submittedByProfileImageUrl ?? null}, ${request.status}, ${request.createdAt}, ${request.reviewedAt ?? null}, ${request.reviewerNote ?? null}
        )
      `),
    ...normalized.sessions.map((session) => tx`
        INSERT INTO locally_explained_user_sessions (token_hash, user_id, expires_at, created_at)
        VALUES (${session.tokenHash}, ${session.userId}, ${session.expiresAt}, ${now})
      `),
    ...normalized.users.flatMap((user) => user.favoriteStorypointIds.map((storypointId) => tx`
          INSERT INTO locally_explained_user_favorites (user_id, storypoint_id)
          VALUES (${user.id}, ${storypointId})
        `)),
    tx`UPDATE locally_explained_meta SET revision = ${nextRevision} WHERE id = 1`
  ]);

  store.revision = nextRevision;
}

async function migrateLegacyRemoteStateIfNeeded() {
  if (!remoteSql) return;

  const rows = await remoteSql`SELECT 1 FROM locally_explained_users LIMIT 1`;
  if (rows.length > 0) return;

  const legacyRows = await remoteSql`SELECT data FROM locally_explained_state WHERE id = 1`;
  if (legacyRows.length === 0) {
    await persistRemoteStore(defaultStore());
    return;
  }

  const legacy = normalizeStore(legacyRows[0].data as Partial<Store>);
  await persistRemoteStore(legacy);
}

async function loadRemoteStore(): Promise<Store> {
  await ensureRemoteSchema();
  await migrateLegacyRemoteStateIfNeeded();

  const [metaRows, userRows, sessionRows, storypointRows, translationRows, requestRows, favoriteRows] = await remoteSql!.transaction((tx) => [
    tx`SELECT revision FROM locally_explained_meta WHERE id = 1`,
    tx`SELECT id, email, name, password_salt, password_hash, profile_image_url, role, created_at, updated_at, recovery_code, recovery_code_expires_at FROM locally_explained_users ORDER BY created_at DESC`,
    tx`SELECT token_hash, user_id, expires_at, created_at FROM locally_explained_user_sessions ORDER BY created_at DESC`,
    tx`SELECT id, slug, location_name, lat, lng, original_locale, submitted_by_user_id, submitted_by_user_name, submitted_by_email, submitted_by_profile_image_url, created_at, updated_at FROM locally_explained_storypoints ORDER BY created_at DESC`,
    tx`SELECT storypoint_id, locale, title, body FROM locally_explained_storypoint_translations`,
    tx`SELECT id, title, body, email, submitted_by_user_id, submitted_by_user_name, submitted_by_profile_image_url, locale, lat, lng, status, created_at, reviewed_at, reviewer_note FROM locally_explained_storypoint_requests ORDER BY created_at DESC`,
    tx`SELECT user_id, storypoint_id FROM locally_explained_user_favorites`
  ]);

  const favoriteIdsByUser = new Map<string, string[]>();
  favoriteRows.forEach((row: RemoteRow) => {
    const ids = favoriteIdsByUser.get(row.user_id) ?? [];
    ids.push(row.storypoint_id);
    favoriteIdsByUser.set(row.user_id, ids);
  });

  const translationsByStorypoint = new Map<string, Record<Locale, { title: string; body: string }>>();
  translationRows.forEach((row: RemoteRow) => {
    const locale = row.locale as Locale;
    const translations = translationsByStorypoint.get(row.storypoint_id) ?? {
      ca: { title: '', body: '' },
      es: { title: '', body: '' },
      en: { title: '', body: '' }
    };
    translations[locale] = { title: row.title, body: row.body };
    translationsByStorypoint.set(row.storypoint_id, translations);
  });

  return {
    revision: metaRows[0]?.revision ?? 0,
    users: userRows.map((row: RemoteRow) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordSalt: row.password_salt,
      passwordHash: row.password_hash,
      profileImageUrl: row.profile_image_url,
      favoriteStorypointIds: favoriteIdsByUser.get(row.id) ?? [],
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recoveryCode: row.recovery_code ?? undefined,
      recoveryCodeExpiresAt: row.recovery_code_expires_at ? Date.parse(row.recovery_code_expires_at) : undefined
    })),
    sessions: sessionRows.map((row: RemoteRow) => ({
      tokenHash: row.token_hash,
      userId: row.user_id,
      expiresAt: row.expires_at
    })),
    storypoints: storypointRows.map((row: RemoteRow) => ({
      id: row.id,
      slug: row.slug,
      locationName: row.location_name,
      lat: row.lat,
      lng: row.lng,
      originalLocale: row.original_locale,
      submittedByUserId: row.submitted_by_user_id ?? undefined,
      submittedByUserName: row.submitted_by_user_name ?? undefined,
      submittedByEmail: row.submitted_by_email ?? undefined,
      submittedByProfileImageUrl: row.submitted_by_profile_image_url ?? undefined,
      translations: translationsByStorypoint.get(row.id) ?? {
        ca: { title: '', body: '' },
        es: { title: '', body: '' },
        en: { title: '', body: '' }
      }
    })),
    requests: requestRows.map((row: RemoteRow) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      email: row.email,
      submittedByUserId: row.submitted_by_user_id ?? undefined,
      submittedByUserName: row.submitted_by_user_name ?? undefined,
      submittedByProfileImageUrl: row.submitted_by_profile_image_url ?? undefined,
      locale: row.locale,
      lat: row.lat,
      lng: row.lng,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at ?? undefined,
      reviewerNote: row.reviewer_note ?? undefined
    }))
  };
}

async function loadStore(): Promise<Store> {
  if (remoteSql) {
    return await loadRemoteStore();
  }

  await ensureDbDir();

  try {
    await access(dbPath);
    const parsed = JSON.parse(await readFile(dbPath, 'utf8')) as Partial<Store>;
    return normalizeStore(parsed);
  } catch {
    const initial = defaultStore();
    await writeFile(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
}

export async function getStore() {
  return await loadStore();
}

export async function getFreshStore() {
  return await loadStore();
}

export async function persistStore(store: Store) {
  purgeExpiredSessions(store);

  if (remoteSql) {
    await persistRemoteStore(store);
    return;
  }

  await ensureDbDir();
  await writeFile(dbPath, JSON.stringify(store, null, 2));
}

export function purgeExpiredSessions(store: Store) {
  const now = Date.now();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > now);
  return store.sessions.length !== before;
}

function findUserById(store: Store, id: string) {
  return store.users.find((user) => user.id === id);
}

function findUserByEmail(store: Store, email: string) {
  return store.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

function claimContentForEmail(store: Store, email: string, userId: string, userName: string) {
  const normalized = normalizeEmail(email);
  let changed = false;

  store.requests.forEach((request) => {
    if (normalizeEmail(request.email) === normalized && !request.submittedByUserId) {
      request.submittedByUserId = userId;
      request.submittedByUserName = userName;
      changed = true;
    }
  });

  store.storypoints.forEach((storypoint) => {
    if (normalizeEmail(storypoint.submittedByEmail ?? '') === normalized && !storypoint.submittedByUserId) {
      storypoint.submittedByUserId = userId;
      storypoint.submittedByUserName = userName;
      changed = true;
    }
  });

  return changed;
}

export async function listStorypoints() {
  return (await getStore()).storypoints;
}

export async function getStorypoint(id: string) {
  return (await getStore()).storypoints.find((storypoint) => storypoint.id === id);
}

export async function listRequests() {
  return (await getStore()).requests;
}

export async function listUsers() {
  return (await getStore()).users;
}

export async function getUserById(id: string) {
  return findUserById(await getStore(), id);
}

export async function getUserByEmail(email: string) {
  return findUserByEmail(await getStore(), email);
}

export async function listUserRequests(user: UserAccount) {
  return (await getStore()).requests.filter((request) => request.submittedByUserId === user.id || normalizeEmail(request.email) === normalizeEmail(user.email));
}

export async function listUserStorypoints(user: UserAccount) {
  return (await getStore()).storypoints.filter((storypoint) => storypoint.submittedByUserId === user.id || normalizeEmail(storypoint.submittedByEmail ?? '') === normalizeEmail(user.email));
}

export async function listUserFavorites(user: UserAccount) {
  return (await getStore()).storypoints.filter((storypoint) => user.favoriteStorypointIds.includes(storypoint.id));
}

export async function createUserAccount(input: { email: string; password: string; name?: string; profileImageUrl?: string; role?: 'user' | 'admin' }) {
  const store = await getStore();
  const email = normalizeEmail(input.email);

  if (store.users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error('Email already in use');
  }

  const password = hashUserPassword(input.password);
  const now = nowIso();
  const user: UserAccount = {
    id: randomUUID(),
    email,
    name: input.name?.trim() || deriveDisplayName(email),
    passwordSalt: password.salt,
    passwordHash: password.hash,
    profileImageUrl: input.profileImageUrl?.trim() || '',
    favoriteStorypointIds: [],
    role: input.role ?? 'user',
    createdAt: now,
    updatedAt: now
  };

  store.users.unshift(user);
  claimContentForEmail(store, email, user.id, user.name);
  await persistStore(store);
  return user;
}

export async function authenticateUser(email: string, password: string) {
  const store = await getStore();
  const user = findUserByEmail(store, email);

  if (!user || !verifyUserPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  if (claimContentForEmail(store, user.email, user.id, user.name)) {
    await persistStore(store);
  }

  return user;
}

export async function updateUserAccount(userId: string, input: { email?: string; name?: string; profileImageUrl?: string; currentPassword?: string; newPassword?: string }) {
  const store = await getStore();
  const user = findUserById(store, userId);
  if (!user) return null;

  if (input.email?.trim() && normalizeEmail(input.email) !== normalizeEmail(user.email)) {
    const nextEmail = normalizeEmail(input.email);
    if (store.users.some((item) => item.id !== user.id && normalizeEmail(item.email) === nextEmail)) {
      throw new Error('Email already in use');
    }
    user.email = nextEmail;
  }

  if (input.name?.trim()) user.name = input.name.trim();
  if (typeof input.profileImageUrl === 'string') user.profileImageUrl = input.profileImageUrl.trim();

  if (input.newPassword) {
    if (!input.currentPassword || !verifyUserPassword(input.currentPassword, user.passwordSalt, user.passwordHash)) {
      throw new Error('Invalid current password');
    }
    if (input.newPassword.length < 8) throw new Error('Password too short');
    const password = hashUserPassword(input.newPassword);
    user.passwordSalt = password.salt;
    user.passwordHash = password.hash;
  }

  user.updatedAt = nowIso();
  await persistStore(store);
  return user;
}

export async function updateUserPassword(userId: string, recoveryCode: string, expiresAt: number) {
  const store = await getStore();
  const user = findUserById(store, userId);
  if (!user) return null;
  user.recoveryCode = recoveryCode;
  user.recoveryCodeExpiresAt = expiresAt;
  await persistStore(store);
  return user;
}

export async function resetUserPassword(email: string, code: string, newPassword: string) {
  const store = await getStore();
  const user = findUserByEmail(store, email);
  if (!user || !user.recoveryCode || !user.recoveryCodeExpiresAt) return null;
  if (user.recoveryCode !== code || user.recoveryCodeExpiresAt < Date.now()) return null;

  const password = hashUserPassword(newPassword);
  user.passwordSalt = password.salt;
  user.passwordHash = password.hash;
  delete user.recoveryCode;
  delete user.recoveryCodeExpiresAt;
  user.updatedAt = nowIso();
  await persistStore(store);
  return user;
}

export async function createSession(userId: string) {
  const store = await getFreshStore();
  const token = mintSessionToken();
  store.sessions.unshift({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  });
  await persistStore(store);
  return token;
}

export async function getUserBySessionToken(token: string | undefined | null) {
  if (!token) return null;

  const store = await getFreshStore();
  if (purgeExpiredSessions(store)) {
    await persistStore(store);
  }

  const session = store.sessions.find((item) => item.tokenHash === hashSessionToken(token));
  return session ? findUserById(store, session.userId) ?? null : null;
}

export async function revokeSession(token: string | undefined | null) {
  if (!token) return;

  const store = await getFreshStore();
  const tokenHash = hashSessionToken(token);
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);
  if (store.sessions.length !== before) {
    await persistStore(store);
  }
}

export async function toggleFavoriteStorypoint(userId: string, storypointId: string) {
  const store = await getStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return null;

  user.favoriteStorypointIds = user.favoriteStorypointIds.includes(storypointId)
    ? user.favoriteStorypointIds.filter((item) => item !== storypointId)
    : [...user.favoriteStorypointIds, storypointId];
  user.updatedAt = nowIso();
  await persistStore(store);
  return user;
}

export async function createStorypointRequest(input: {
  title: string;
  body: string;
  email: string;
  locale: Locale;
  lat: number;
  lng: number;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedByProfileImageUrl?: string;
}) {
  const store = await getStore();
  const request: StorypointRequest = {
    id: randomUUID(),
    ...input,
    email: normalizeEmail(input.email),
    status: 'pending',
    createdAt: nowIso()
  };
  store.requests.unshift(request);
  await persistStore(store);
  return request;
}

export async function reviewStorypointRequest(id: string, decision: 'approved' | 'rejected', reviewerNote?: string) {
  const store = await getStore();
  const request = store.requests.find((item) => item.id === id);
  if (!request) return null;

  request.status = decision;
  request.reviewedAt = nowIso();
  if (reviewerNote) request.reviewerNote = reviewerNote;

  if (decision === 'approved') {
    const submittedByUserName = request.submittedByUserName ?? deriveDisplayName(request.email);
    store.storypoints.unshift({
      id: randomUUID(),
      slug: createSlug(request.title),
      locationName: request.title,
      lat: request.lat,
      lng: request.lng,
      originalLocale: request.locale,
      submittedByUserId: request.submittedByUserId,
      submittedByUserName,
      submittedByEmail: request.email,
      submittedByProfileImageUrl: request.submittedByProfileImageUrl,
      translations: {
        ca: { title: request.title, body: request.body },
        es: { title: request.title, body: request.body },
        en: { title: request.title, body: request.body }
      }
    });
  }

  await persistStore(store);
  return request;
}

export async function deleteStorypoint(id: string) {
  const store = await getStore();
  if (!store.storypoints.some((storypoint) => storypoint.id === id)) return false;

  store.storypoints = store.storypoints.filter((storypoint) => storypoint.id !== id);
  store.users.forEach((user) => {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((storypointId) => storypointId !== id);
  });
  await persistStore(store);
  return true;
}

export async function deleteUserStorypointRequest(requestId: string, userId: string, userEmail?: string) {
  const store = await getStore();
  const request = store.requests.find((r) => r.id === requestId);
  if (!request) return false;

  const isOwner = request.submittedByUserId === userId || (userEmail && normalizeEmail(request.email) === normalizeEmail(userEmail));
  if (!isOwner) return false;

  store.requests = store.requests.filter((r) => r.id !== requestId);
  await persistStore(store);
  return true;
}

export async function deleteUserFavoriteStorypoint(storypointId: string, userId: string) {
  const store = await getStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  if (!user.favoriteStorypointIds.includes(storypointId)) return false;

  user.favoriteStorypointIds = user.favoriteStorypointIds.filter((id) => id !== storypointId);
  user.updatedAt = nowIso();
  await persistStore(store);
  return true;
}

export async function deleteUserStorypoint(storypointId: string, userId: string) {
  const store = await getStore();
  const storypoint = store.storypoints.find((sp) => sp.id === storypointId);
  if (!storypoint || storypoint.submittedByUserId !== userId) return false;

  store.storypoints = store.storypoints.filter((sp) => sp.id !== storypointId);
  store.users.forEach((user) => {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((id) => id !== storypointId);
  });
  await persistStore(store);
  return true;
}

export async function deleteUserAccount(userId: string) {
  const store = await getFreshStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return false;

  if (user.role === 'admin') {
    const adminsLeft = store.users.filter((item) => item.role === 'admin' && item.id !== userId).length;
    if (adminsLeft === 0) return false;
  }

  store.storypoints.forEach((storypoint) => {
    if (storypoint.submittedByUserId === userId) {
      storypoint.submittedByUserId = undefined;
      storypoint.submittedByUserName = undefined;
      storypoint.submittedByEmail = undefined;
      storypoint.submittedByProfileImageUrl = undefined;
    }
  });

  store.users.forEach((item) => {
    item.favoriteStorypointIds = item.favoriteStorypointIds.filter((storypointId) => store.storypoints.some((storypoint) => storypoint.id === storypointId));
  });

  store.requests.forEach((request) => {
    if (request.submittedByUserId === userId) {
      request.submittedByUserId = undefined;
      request.submittedByUserName = undefined;
      request.submittedByProfileImageUrl = undefined;
    }
  });

  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  store.users = store.users.filter((item) => item.id !== userId);
  await persistStore(store);
  return true;
}
