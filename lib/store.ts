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
  users: UserAccount[];
  sessions: SessionRecord[];
  storypoints: Storypoint[];
  requests: StorypointRequest[];
};

const dbDir = join(process.cwd(), '.data');
const dbPath = join(dbDir, 'locally-explained-db.json');
const remoteDatabaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
const remoteSql = remoteDatabaseUrl ? neon(remoteDatabaseUrl) : null;

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

async function ensureDbDir() {
  await mkdir(dbDir, { recursive: true }).catch(() => undefined);
}

function normalizeStore(parsed: Partial<Store>): Store {
  return {
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

   return {
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
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       }
     ],
     sessions: [],
     storypoints: [...seedStorypoints],
     requests: []
   };
}

async function ensureRemoteSchema() {
  if (!remoteSql) {
    return;
  }

  await remoteSql`
    CREATE TABLE IF NOT EXISTS locally_explained_state (
      id integer PRIMARY KEY,
      data jsonb NOT NULL
    )
  `;
}

async function loadStore(): Promise<Store> {
  if (remoteSql) {
    await ensureRemoteSchema();
    const rows = await remoteSql`SELECT data FROM locally_explained_state WHERE id = 1`;

    if (rows.length > 0) {
      return normalizeStore(rows[0].data as Partial<Store>);
    }

    const initial = defaultStore();
    await remoteSql`INSERT INTO locally_explained_state (id, data) VALUES (1, ${JSON.stringify(initial)}::jsonb)`;
    return initial;
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

let storePromise: Promise<Store> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = loadStore();
  }

  return storePromise;
}

async function persistStore(store: Store) {
  storePromise = null;
  if (remoteSql) {
    await ensureRemoteSchema();
    await remoteSql`
      INSERT INTO locally_explained_state (id, data)
      VALUES (1, ${JSON.stringify(store)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return;
  }

  await ensureDbDir();
  await writeFile(dbPath, JSON.stringify(store, null, 2));
}

async function purgeExpiredSessions() {
  const store = await getStore();
  const now = Date.now();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > now);

  if (store.sessions.length !== before) {
    await persistStore(store);
  }
}

async function claimContentForEmail(email: string, userId: string, userName: string) {
  const store = await getStore();
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

  if (changed) {
    await persistStore(store);
  }
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
  return (await getStore()).users.find((user) => user.id === id);
}

export async function getUserByEmail(email: string) {
  return (await getStore()).users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

export async function listUserRequests(user: UserAccount) {
  return (await getStore()).requests.filter((request) => request.submittedByUserId === user.id || normalizeEmail(request.email) === normalizeEmail(user.email));
}

export async function listUserStorypoints(user: UserAccount) {
  return (await getStore()).storypoints.filter(
    (storypoint) => storypoint.submittedByUserId === user.id || normalizeEmail(storypoint.submittedByEmail ?? '') === normalizeEmail(user.email)
  );
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
  const now = new Date().toISOString();
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
  await claimContentForEmail(email, user.id, user.name);
  await persistStore(store);
  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user || !verifyUserPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  await claimContentForEmail(user.email, user.id, user.name);

  return user;
}

export async function updateUserAccount(
  userId: string,
  input: { email?: string; name?: string; profileImageUrl?: string; currentPassword?: string; newPassword?: string }
) {
  const store = await getStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  if (input.email?.trim() && normalizeEmail(input.email) !== normalizeEmail(user.email)) {
    const nextEmail = normalizeEmail(input.email);

    if (store.users.some((item) => item.id !== user.id && normalizeEmail(item.email) === nextEmail)) {
      throw new Error('Email already in use');
    }

    user.email = nextEmail;
  }

  if (input.name?.trim()) {
    user.name = input.name.trim();
  }

  if (typeof input.profileImageUrl === 'string') {
    user.profileImageUrl = input.profileImageUrl.trim();
  }

  if (input.newPassword) {
    if (!input.currentPassword || !verifyUserPassword(input.currentPassword, user.passwordSalt, user.passwordHash)) {
      throw new Error('Invalid current password');
    }

    if (input.newPassword.length < 8) {
      throw new Error('Password too short');
    }

    const password = hashUserPassword(input.newPassword);
    user.passwordSalt = password.salt;
    user.passwordHash = password.hash;
  }

  user.updatedAt = new Date().toISOString();
  await persistStore(store);

  return user;
}

export async function updateUserPassword(userId: string, recoveryCode: string, expiresAt: number) {
  const store = await getStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.recoveryCode = recoveryCode;
  user.recoveryCodeExpiresAt = expiresAt;
  await persistStore(store);

  return user;
}

export async function resetUserPassword(email: string, code: string, newPassword: string) {
  const store = await getStore();
  const user = await getUserByEmail(email);

  if (!user || !user.recoveryCode || !user.recoveryCodeExpiresAt) {
    return null;
  }

  if (user.recoveryCode !== code || user.recoveryCodeExpiresAt < Date.now()) {
    return null;
  }

  const password = hashUserPassword(newPassword);
  user.passwordSalt = password.salt;
  user.passwordHash = password.hash;
  delete user.recoveryCode;
  delete user.recoveryCodeExpiresAt;
  user.updatedAt = new Date().toISOString();
  await persistStore(store);

  return user;
}

export async function createSession(userId: string) {
  console.log('[session] createSession', { userId });
  const store = await getStore();
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
  if (!token) {
    console.log('[session] getUserBySessionToken: no token');
    return null;
  }

  await purgeExpiredSessions();
  const store = await getStore();
  const session = store.sessions.find((item) => item.tokenHash === hashSessionToken(token));
  console.log('[session] getUserBySessionToken', { found: !!session, tokenPrefix: token.slice(0, 8), sessionsCount: store.sessions.length });

  return session ? (await getUserById(session.userId)) ?? null : null;
}

export async function revokeSession(token: string | undefined | null) {
  if (!token) {
    return;
  }

  console.log('[session] revokeSession', { tokenPrefix: token.slice(0, 8) });
  const store = await getStore();
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

  if (!user) {
    return null;
  }

  if (user.favoriteStorypointIds.includes(storypointId)) {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((item) => item !== storypointId);
  } else {
    user.favoriteStorypointIds = [...user.favoriteStorypointIds, storypointId];
  }

  user.updatedAt = new Date().toISOString();
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
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  store.requests.unshift(request);
  await persistStore(store);

  return request;
}

export async function reviewStorypointRequest(id: string, decision: 'approved' | 'rejected', reviewerNote?: string) {
  const store = await getStore();
  const request = store.requests.find((item) => item.id === id);

  if (!request) {
    return null;
  }

  request.status = decision;
  request.reviewedAt = new Date().toISOString();
  if (reviewerNote) {
    request.reviewerNote = reviewerNote;
  }

  if (decision === 'approved') {
    const submittedByUserId = request.submittedByUserId;
    const submittedByUserName = request.submittedByUserName ?? deriveDisplayName(request.email);
    const submittedByProfileImageUrl = request.submittedByProfileImageUrl;

    store.storypoints.unshift({
      id: randomUUID(),
      slug: createSlug(request.title),
      locationName: request.title,
      lat: request.lat,
      lng: request.lng,
      originalLocale: request.locale,
      submittedByUserId,
      submittedByUserName,
      submittedByEmail: request.email,
      submittedByProfileImageUrl,
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
  const exists = store.storypoints.some((storypoint) => storypoint.id === id);

  if (!exists) {
    return false;
  }

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
  if (!request) {
    return false;
  }

  // Users can only delete their own submitted requests.
  const isOwner = request.submittedByUserId === userId ||
    (userEmail && normalizeEmail(request.email) === normalizeEmail(userEmail));
  if (!isOwner) {
    return false;
  }

  store.requests = store.requests.filter((r) => r.id !== requestId);
  await persistStore(store);
  return true;
}

export async function deleteUserFavoriteStorypoint(storypointId: string, userId: string) {
  const store = await getStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return false;
  }

  if (!user.favoriteStorypointIds.includes(storypointId)) {
    return false;
  }

  user.favoriteStorypointIds = user.favoriteStorypointIds.filter((id) => id !== storypointId);
  user.updatedAt = new Date().toISOString();
  await persistStore(store);
  return true;
}

export async function deleteUserStorypoint(storypointId: string, userId: string) {
  const store = await getStore();
  const storypoint = store.storypoints.find((sp) => sp.id === storypointId);
  if (!storypoint) {
    return false;
  }

  if (storypoint.submittedByUserId !== userId) {
    return false;
  }

  store.storypoints = store.storypoints.filter((sp) => sp.id !== storypointId);
  store.users.forEach((user) => {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((id) => id !== storypointId);
  });
  await persistStore(store);
  return true;
}

export async function deleteUserAccount(userId: string) {
  const store = await getStore();
  const exists = store.users.some((user) => user.id === userId);

  if (!exists) {
    return false;
  }

  const isAdmin = store.users.find((user) => user.id === userId)?.role === 'admin';

  // Safety: keep at least one admin in the system.
  if (isAdmin) {
    const adminsLeft = store.users.filter((u) => u.role === 'admin' && u.id !== userId).length;
    if (adminsLeft === 0) {
      return false;
    }
  }

  // Remove storypoints favorites and any user-linked fields.
  store.storypoints.forEach((storypoint) => {
    if (storypoint.submittedByUserId === userId) {
      storypoint.submittedByUserId = undefined;
      storypoint.submittedByUserName = undefined;
    }
  });

  store.users.forEach((user) => {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((storypointId) => {
      // Keep favorites unless storypoint got deleted elsewhere.
      return store.storypoints.some((storypoint) => storypoint.id === storypointId);
    });
  });

  // Reassign request submitter (if any) to keep history, but keep email/name.
  store.requests.forEach((request) => {
    if (request.submittedByUserId === userId) {
      request.submittedByUserId = undefined;
      request.submittedByUserName = undefined;
    }
  });

  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  store.users = store.users.filter((user) => user.id !== userId);
  await persistStore(store);

  return true;
}
