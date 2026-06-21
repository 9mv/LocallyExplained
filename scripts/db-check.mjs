import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  const rows = await sql`SELECT data FROM locally_explained_state WHERE id = 1`;
  if (!rows.length) {
    console.log('No state row found.');
    process.exit(0);
  }

  const store = rows[0].data;
  console.log('users=', JSON.stringify(store.users, null, 2));
  console.log('requests=', JSON.stringify(store.requests, null, 2));
  console.log('storypoints=', JSON.stringify(store.storypoints, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
