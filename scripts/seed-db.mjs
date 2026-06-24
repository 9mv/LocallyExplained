import { randomBytes, scryptSync } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl) {
  console.error('Missing DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL.');
  process.exit(1);
}

const sql = neon(dbUrl);
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

async function ensureSchema() {
  await sql`
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
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS locally_explained_users_email_lower_idx ON locally_explained_users (lower(email))`;
  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS locally_explained_storypoint_translations (
      storypoint_id text NOT NULL REFERENCES locally_explained_storypoints(id) ON DELETE CASCADE,
      locale text NOT NULL CHECK (locale IN ('ca', 'es', 'en')),
      title text NOT NULL,
      body text NOT NULL,
      PRIMARY KEY (storypoint_id, locale)
    )
  `;
  await sql`
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
      reviewer_note text
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS locally_explained_user_favorites (
      user_id text NOT NULL REFERENCES locally_explained_users(id) ON DELETE CASCADE,
      storypoint_id text NOT NULL REFERENCES locally_explained_storypoints(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, storypoint_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS locally_explained_user_sessions (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL REFERENCES locally_explained_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function main() {
  const data = defaultStore();

  await ensureSchema();

  await sql`DELETE FROM locally_explained_user_favorites`;
  await sql`DELETE FROM locally_explained_storypoint_translations`;
  await sql`DELETE FROM locally_explained_user_sessions`;
  await sql`DELETE FROM locally_explained_storypoint_requests`;
  await sql`DELETE FROM locally_explained_storypoints`;
  await sql`DELETE FROM locally_explained_users`;

  for (const user of data.users) {
    await sql`
      INSERT INTO locally_explained_users (
        id, email, name, password_salt, password_hash, profile_image_url, role, created_at, updated_at
      ) VALUES (
        ${user.id}, ${user.email}, ${user.name}, ${user.passwordSalt}, ${user.passwordHash}, ${user.profileImageUrl}, ${user.role}, ${user.createdAt}, ${user.updatedAt}
      )
    `;
  }

  for (const storypoint of data.storypoints) {
    await sql`
      INSERT INTO locally_explained_storypoints (
        id, slug, location_name, lat, lng, original_locale, submitted_by_user_name, created_at, updated_at
      ) VALUES (
        ${storypoint.id}, ${storypoint.slug}, ${storypoint.locationName}, ${storypoint.lat}, ${storypoint.lng}, ${storypoint.originalLocale}, ${storypoint.submittedByUserName ?? null}, ${new Date().toISOString()}, ${new Date().toISOString()}
      )
    `;

    for (const locale of ['ca', 'es', 'en']) {
      const translation = storypoint.translations[locale];
      await sql`
        INSERT INTO locally_explained_storypoint_translations (storypoint_id, locale, title, body)
        VALUES (${storypoint.id}, ${locale}, ${translation.title}, ${translation.body})
      `;
    }
  }

  console.log('Database seeded.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
