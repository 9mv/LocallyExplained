import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl) {
  console.error('Missing DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL.');
  process.exit(1);
}

const sql = neon(dbUrl);
const dbPath = join(process.cwd(), '.data', 'locally-explained-db.json');

function hashUserPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, 64);

  return {
    salt,
    hash: derived.toString('hex')
  };
}

function defaultStore() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@locally-explained.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const password = hashUserPassword(adminPassword);
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'admin-user',
        email: adminEmail,
        name: 'Admin',
        passwordSalt: password.salt,
        passwordHash: password.hash,
        profileImageUrl: '',
        favoriteStorypointIds: [],
        role: 'admin',
        createdAt: now,
        updatedAt: now
      }
    ],
    sessions: [],
    storypoints: [],
    requests: []
  };
}

function sanitizeStore(store) {
  return {
    users: Array.isArray(store.users)
      ? store.users.map((user) => {
          const { recoveryCode, recoveryCodeExpiresAt, ...safeUser } = user;
          return safeUser;
        })
      : [],
    sessions: [],
    storypoints: Array.isArray(store.storypoints) ? store.storypoints : [],
    requests: Array.isArray(store.requests) ? store.requests : []
  };
}

async function main() {
  const data = existsSync(dbPath)
    ? sanitizeStore(JSON.parse(await readFile(dbPath, 'utf8')))
    : defaultStore();

  await sql`
    CREATE TABLE IF NOT EXISTS locally_explained_state (
      id integer PRIMARY KEY,
      data jsonb NOT NULL
    )
  `;

  await sql`
    INSERT INTO locally_explained_state (id, data)
    VALUES (1, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;

  console.log('Database seeded.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
