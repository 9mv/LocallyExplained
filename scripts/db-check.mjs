import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  const [users, storypoints, requests] = await Promise.all([
    sql`SELECT id, email, name, role, created_at, updated_at FROM locally_explained_users ORDER BY created_at DESC`,
    sql`SELECT id, slug, location_name, original_locale, created_at, updated_at FROM locally_explained_storypoints ORDER BY created_at DESC`,
    sql`SELECT id, title, email, status, created_at, reviewed_at FROM locally_explained_storypoint_requests ORDER BY created_at DESC`
  ]);

  console.log('users=', JSON.stringify(users, null, 2));
  console.log('requests=', JSON.stringify(requests, null, 2));
  console.log('storypoints=', JSON.stringify(storypoints, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
