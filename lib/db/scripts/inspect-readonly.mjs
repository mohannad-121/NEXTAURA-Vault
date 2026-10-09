import pg from 'pg';

const EXPECTED_PROJECT_REF = 'qulqcuuzncyyszgdpfad';
const requestedRef = process.argv[2] ?? process.env.SUPABASE_PROJECT_ID ?? EXPECTED_PROJECT_REF;
if (requestedRef !== EXPECTED_PROJECT_REF) {
  throw new Error('Refusing to inspect any Supabase project other than the NEXTAURA Vault project.');
}
const expectedRef = EXPECTED_PROJECT_REF;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error('DATABASE_URL is required.');

const url = new URL(connectionString);
const directMatch = /^db\.([a-z]{20})\.supabase\.co$/.exec(url.hostname);
const pooledMatch = /\.([a-z]{20})$/.exec(decodeURIComponent(url.username));
const actualRef = directMatch?.[1] ?? pooledMatch?.[1];
if (actualRef !== expectedRef) {
  throw new Error('DATABASE_URL does not target the expected Supabase project.');
}

// Force hostname and CA verification even if the runtime URL currently says
// sslmode=require. NODE_EXTRA_CA_CERTS supplies the trusted Supabase root.
url.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query('begin read only');
  await client.query(`set local statement_timeout = '10s'`);
  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const migrations = await client.query(`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as drizzle_history_exists
  `);
  const auth = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from auth.mfa_factors where status = 'verified') as verified_mfa_factors
  `);
  console.log(JSON.stringify({
    projectRef: actualRef,
    transaction: 'read-only',
    publicTables: tables.rows.map((row) => row.table_name),
    drizzleHistoryExists: migrations.rows[0]?.drizzle_history_exists === true,
    authUsers: auth.rows[0]?.auth_users ?? 0,
    verifiedMfaFactors: auth.rows[0]?.verified_mfa_factors ?? 0,
  }, null, 2));
  await client.query('rollback');
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
