import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const EXPECTED_PROJECT_REF = 'qulqcuuzncyyszgdpfad';
const TABLES = [
  'vault_activity',
  'vault_credentials',
  'vault_favorites',
  'vault_founders',
  'vault_sessions',
];
const RESTRICTED_ROLES = ['anon', 'authenticated', 'service_role'];
const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('A PostgreSQL connection is required.');

const url = new URL(connectionString);
const directRef = /^db\.([a-z]{20})\.supabase\.co$/.exec(url.hostname)?.[1];
const pooledRef = /\.([a-z]{20})$/.exec(decodeURIComponent(url.username))?.[1];
if ((directRef ?? pooledRef) !== EXPECTED_PROJECT_REF) {
  throw new Error('Refusing to inspect any project other than NEXTAURA Vault.');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Schema validation failed: ${message}`);
}

url.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();

try {
  await client.query('begin read only');
  await client.query(`set local statement_timeout = '10s'`);

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_name = any($1::text[])
    order by table_name
  `, [TABLES]);
  assert(JSON.stringify(tables.rows.map((row) => row.table_name)) === JSON.stringify(TABLES), 'vault table set is incomplete');

  const columns = await client.query(`
    select table_name, column_name, data_type, udt_name, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = any($1::text[])
  `, [TABLES]);
  const columnMap = new Map(columns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]));
  for (const key of [
    'vault_founders.id',
    'vault_credentials.created_by',
    'vault_favorites.founder_id',
    'vault_activity.actor_id',
    'vault_sessions.id',
    'vault_sessions.founder_id',
  ]) {
    assert(columnMap.get(key)?.data_type === 'uuid', `${key} is not UUID`);
  }
  assert(columnMap.get('vault_credentials.encrypted_password')?.data_type === 'text', 'encrypted password column is missing');
  assert(!columns.rows.some((row) => row.column_name === 'password'), 'plaintext password column exists');

  const constraints = await client.query(`
    select c.conname, c.contype, c.convalidated,
      c.confrelid::regclass::text as referenced_table
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = any($1::text[])
    order by c.conname
  `, [TABLES]);
  assert(constraints.rows.length === 17, 'unexpected constraint count');
  assert(constraints.rows.every((row) => row.convalidated === true), 'an unvalidated constraint exists');
  assert(constraints.rows.filter((row) => row.contype === 'f').length === 6, 'unexpected foreign-key count');
  assert(constraints.rows.some((row) => row.conname === 'vault_founders_id_users_id_fk' && row.referenced_table === 'auth.users'), 'auth.users founder foreign key is missing');

  const indexes = await client.query(`
    select indexname
    from pg_indexes
    where schemaname = 'public' and tablename = any($1::text[])
    order by indexname
  `, [TABLES]);
  assert(indexes.rows.length === 12, 'unexpected index count');

  const rls = await client.query(`
    select c.relname, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any($1::text[])
    order by c.relname
  `, [TABLES]);
  assert(rls.rows.length === 5 && rls.rows.every((row) => row.relrowsecurity === true), 'RLS is not enabled on every table');

  const policies = await client.query(`
    select count(*)::int as count
    from pg_policies
    where schemaname = 'public' and tablename = any($1::text[])
  `, [TABLES]);
  assert(policies.rows[0]?.count === 0, 'unexpected Data API policy exists');

  const privileges = await client.query(`
    select role_name, table_name,
      has_table_privilege(role_name, format('public.%I', table_name), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as has_privilege
    from unnest($1::text[]) role_name
    cross join unnest($2::text[]) table_name
  `, [RESTRICTED_ROLES, TABLES]);
  assert(privileges.rows.every((row) => row.has_privilege === false), 'a restricted role retains table privileges');
  const publicPrivileges = await client.query(`
    select count(*)::int as count
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = any($1::text[]) and grantee = 'PUBLIC'
  `, [TABLES]);
  assert(publicPrivileges.rows[0]?.count === 0, 'PUBLIC retains table privileges');

  const rowCounts = {};
  for (const table of TABLES) {
    const result = await client.query(`select count(*)::int as count from public.${table}`);
    rowCounts[table] = result.rows[0]?.count ?? -1;
  }
  assert(Object.values(rowCounts).every((count) => count === 0), 'a vault table contains unexpected rows');

  const history = await client.query('select hash from drizzle.__drizzle_migrations order by created_at');
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');
  const localHashes = readMigrationFiles({ migrationsFolder }).map((migration) => migration.hash);
  assert(history.rows.length === 3, 'unexpected migration-history count');
  assert(JSON.stringify(history.rows.map((row) => row.hash)) === JSON.stringify(localHashes), 'migration hashes do not match reviewed SQL');
  const authUsers = await client.query('select count(*)::int as count from auth.users');
  assert(authUsers.rows[0]?.count === 0, 'founder accounts were created unexpectedly');

  console.log(JSON.stringify({
    projectRef: EXPECTED_PROJECT_REF,
    transaction: 'read-only',
    tables: TABLES.length,
    indexes: indexes.rows.length,
    constraints: constraints.rows.length,
    foreignKeys: constraints.rows.filter((row) => row.contype === 'f').length,
    rlsEnabledTables: rls.rows.filter((row) => row.relrowsecurity).length,
    dataApiPolicies: policies.rows[0]?.count,
    restrictedRolePrivileges: privileges.rows.filter((row) => row.has_privilege).length,
    migrationEntries: history.rows.length,
    authUsers: authUsers.rows[0]?.count,
    allVaultTablesEmpty: Object.values(rowCounts).every((count) => count === 0),
  }, null, 2));
  await client.query('rollback');
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
