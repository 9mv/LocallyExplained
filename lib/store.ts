import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
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
const storeKey = Symbol.for('locally-explained.store');

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

function ensureDbDir() {
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
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

function loadStore(): Store {
  ensureDbDir();

  if (!existsSync(dbPath)) {
    const initial = defaultStore();
    writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const parsed = JSON.parse(readFileSync(dbPath, 'utf8')) as Partial<Store>;

    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      storypoints: parsed.storypoints ?? [...seedStorypoints],
      requests: parsed.requests ?? []
    };
  } catch {
    const initial = defaultStore();
    writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function getStore() {
  const globalForStore = globalThis as typeof globalThis & { [storeKey]?: Store };

  if (!globalForStore[storeKey]) {
    globalForStore[storeKey] = loadStore();
  }

  return globalForStore[storeKey] as Store;
}

function persistStore() {
  ensureDbDir();
  writeFileSync(dbPath, JSON.stringify(getStore(), null, 2));
}

function purgeExpiredSessions() {
  const store = getStore();
  const now = Date.now();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > now);

  if (store.sessions.length !== before) {
    persistStore();
  }
}

function claimContentForEmail(email: string, userId: string, userName: string) {
  const store = getStore();
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
    persistStore();
  }
}

export function listStorypoints() {
  return getStore().storypoints;
}

export function getStorypoint(id: string) {
  return getStore().storypoints.find((storypoint) => storypoint.id === id);
}

export function listRequests() {
  return getStore().requests;
}

export function listUsers() {
  return getStore().users;
}

export function getUserById(id: string) {
  return getStore().users.find((user) => user.id === id);
}

export function getUserByEmail(email: string) {
  return getStore().users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

export function listUserRequests(user: UserAccount) {
  return getStore().requests.filter((request) => request.submittedByUserId === user.id || normalizeEmail(request.email) === normalizeEmail(user.email));
}

export function listUserStorypoints(user: UserAccount) {
  return getStore().storypoints.filter(
    (storypoint) => storypoint.submittedByUserId === user.id || normalizeEmail(storypoint.submittedByEmail ?? '') === normalizeEmail(user.email)
  );
}

export function listUserFavorites(user: UserAccount) {
  return getStore().storypoints.filter((storypoint) => user.favoriteStorypointIds.includes(storypoint.id));
}

export function createUserAccount(input: { email: string; password: string; name?: string; profileImageUrl?: string; role?: 'user' | 'admin' }) {
   const store = getStore();
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
   claimContentForEmail(email, user.id, user.name);
   persistStore();
   return user;
}

export function authenticateUser(email: string, password: string) {
  const user = getUserByEmail(email);

  if (!user || !verifyUserPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  claimContentForEmail(user.email, user.id, user.name);

  return user;
}

export function updateUserAccount(
   userId: string,
   input: { email?: string; name?: string; profileImageUrl?: string; currentPassword?: string; newPassword?: string }
 ) {
   const store = getStore();
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
   persistStore();

   return user;
 }

export function updateUserPassword(userId: string, recoveryCode: string, expiresAt: number) {
  const store = getStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.recoveryCode = recoveryCode;
  user.recoveryCodeExpiresAt = expiresAt;
  persistStore();

  return user;
}

export function resetUserPassword(email: string, code: string, newPassword: string) {
  const store = getStore();
  const user = getUserByEmail(email);

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
  persistStore();

  return user;
}

export function createSession(userId: string) {
  const store = getStore();
  const token = mintSessionToken();
  store.sessions.unshift({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  });
  persistStore();
  return token;
}

export function getUserBySessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  purgeExpiredSessions();
  const store = getStore();
  const session = store.sessions.find((item) => item.tokenHash === hashSessionToken(token));

  return session ? getUserById(session.userId) ?? null : null;
}

export function revokeSession(token: string | undefined | null) {
  if (!token) {
    return;
  }

  const store = getStore();
  const tokenHash = hashSessionToken(token);
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);

  if (store.sessions.length !== before) {
    persistStore();
  }
}

export function toggleFavoriteStorypoint(userId: string, storypointId: string) {
  const store = getStore();
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
  persistStore();

  return user;
}

export function createStorypointRequest(input: {
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
  const request: StorypointRequest = {
    id: randomUUID(),
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  getStore().requests.unshift(request);
  persistStore();

  return request;
}

export function reviewStorypointRequest(id: string, decision: 'approved' | 'rejected', reviewerNote?: string) {
  const store = getStore();
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

  persistStore();
  return request;
}

export function deleteStorypoint(id: string) {
  const store = getStore();
  const exists = store.storypoints.some((storypoint) => storypoint.id === id);

  if (!exists) {
    return false;
  }

  store.storypoints = store.storypoints.filter((storypoint) => storypoint.id !== id);
  store.users.forEach((user) => {
    user.favoriteStorypointIds = user.favoriteStorypointIds.filter((storypointId) => storypointId !== id);
  });
  persistStore();

  return true;
}
