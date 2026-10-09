import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const EXPECTED_PROJECT_REF = 'qulqcuuzncyyszgdpfad';
const approval = `--apply-to=${EXPECTED_PROJECT_REF}`;

if (!process.argv.includes(approval)) {
  throw new Error(`Explicit ${approval} confirmation is required.`);
}

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('A PostgreSQL connection is required.');

const url = new URL(connectionString);
const directRef = /^db\.([a-z]{20})\.supabase\.co$/.exec(url.hostname)?.[1];
const pooledRef = /\.([a-z]{20})$/.exec(decodeURIComponent(url.username))?.[1];
if ((directRef ?? pooledRef) !== EXPECTED_PROJECT_REF) {
  throw new Error('Refusing to migrate any project other than NEXTAURA Vault.');
}

url.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();

try {
  const publicTables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const authUsers = await client.query('select count(*)::int as count from auth.users');
  const migrationHistory = await client.query(`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as exists
  `);

  if (publicTables.rows.length !== 0) {
    throw new Error('Preflight failed: public schema is no longer empty.');
  }
  if (authUsers.rows[0]?.count !== 0) {
    throw new Error('Preflight failed: founder accounts must not exist yet.');
  }
  if (migrationHistory.rows[0]?.exists === true) {
    throw new Error('Preflight failed: migration history already exists.');
  }

  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../drizzle',
  );
  await migrate(drizzle(client), { migrationsFolder });
  console.log(JSON.stringify({ projectRef: EXPECTED_PROJECT_REF, migrationsApplied: 3 }));
} finally {
  await client.end();
}
