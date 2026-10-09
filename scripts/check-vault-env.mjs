function configured(name) {
  const value = process.env[name];
  const placeholder = /YOUR_|DATABASE_(?:USER|PASSWORD|HOST)|MIGRATION_(?:USER|PASSWORD)|DIRECT_DATABASE_HOST/i;
  return typeof value === 'string' && value.length > 0 && !placeholder.test(value);
}

const EXPECTED_PROJECT_REF = 'qulqcuuzncyyszgdpfad';

function exactValue(name) {
  return configured(name) ? process.env[name]?.trim() : undefined;
}

function projectRefFromPostgres(value) {
  try {
    const url = new URL(value);
    const direct = /^db\.([a-z]{20})\.supabase\.co$/.exec(url.hostname)?.[1];
    const pooled = /\.([a-z]{20})$/.exec(decodeURIComponent(url.username))?.[1];
    return direct ?? pooled;
  } catch {
    return undefined;
  }
}

function postgresStatus(name, expectedRef) {
  const value = exactValue(name);
  if (!value) return {
    configured: false, validUrl: false, tlsRequired: false, projectMatches: false,
    transactionPooler: false,
  };
  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get('sslmode');
    return {
      configured: true,
      validUrl: url.protocol === 'postgres:' || url.protocol === 'postgresql:',
      tlsRequired: sslMode === 'require' || sslMode === 'verify-full',
      projectMatches: projectRefFromPostgres(value) === expectedRef,
      transactionPooler: url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543',
    };
  } catch {
    return {
      configured: true, validUrl: false, tlsRequired: false, projectMatches: false,
      transactionPooler: false,
    };
  }
}

const projectId = exactValue('SUPABASE_PROJECT_ID');
const browserProjectId = exactValue('VITE_SUPABASE_PROJECT_ID');
const expectedUrl = projectId ? `https://${projectId}.supabase.co` : undefined;
const serverUrl = exactValue('SUPABASE_URL')?.replace(/\/$/, '');
const browserUrl = exactValue('VITE_SUPABASE_URL')?.replace(/\/$/, '');
const serverKey = exactValue('SUPABASE_PUBLISHABLE_KEY');
const browserKey = exactValue('VITE_SUPABASE_PUBLISHABLE_KEY');
const projectConfigValid = Boolean(
  projectId === EXPECTED_PROJECT_REF && browserProjectId === EXPECTED_PROJECT_REF &&
  serverUrl === expectedUrl && browserUrl === expectedUrl,
);
const publishableKeysValid = Boolean((serverKey?.startsWith('sb_publishable_') || serverKey?.startsWith('eyJ')) && serverKey === browserKey);

const mohannad = exactValue('FOUNDER_MOHANNAD_USER_ID');
const moayad = exactValue('FOUNDER_MOAYAD_USER_ID');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const founderConfigValid = Boolean(mohannad && moayad && mohannad !== moayad && uuid.test(mohannad) && uuid.test(moayad));

const runtimeDatabase = postgresStatus('DATABASE_URL', EXPECTED_PROJECT_REF);
const migrationDatabase = postgresStatus('DATABASE_MIGRATION_URL', EXPECTED_PROJECT_REF);
const encryptionKeyValid = /^[a-fA-F0-9]{64}$/.test(exactValue('VAULT_ENCRYPTION_KEY') ?? '');
const supabaseCaConfigured = Boolean(exactValue('SUPABASE_CA_CERT'));

const report = {
  supabase: { projectConfigured: Boolean(projectId), projectConsistent: projectConfigValid, publishableKeysValid },
  runtimeDatabase,
  migrationDatabase,
  founders: {
    mohannadConfigured: Boolean(mohannad),
    moayadConfigured: Boolean(moayad),
    distinct: Boolean(mohannad && moayad && mohannad !== moayad),
    valid: founderConfigValid,
  },
  encryptionKeyValid,
  supabaseCaConfigured,
  readyForLocalStartup: Boolean(
    runtimeDatabase.configured && runtimeDatabase.validUrl && runtimeDatabase.tlsRequired && runtimeDatabase.projectMatches &&
    projectConfigValid && publishableKeysValid && founderConfigValid && encryptionKeyValid,
  ),
  readyForVercel: Boolean(
    runtimeDatabase.configured && runtimeDatabase.validUrl && runtimeDatabase.tlsRequired &&
    runtimeDatabase.projectMatches && runtimeDatabase.transactionPooler &&
    projectConfigValid && publishableKeysValid && founderConfigValid && encryptionKeyValid && supabaseCaConfigured,
  ),
  readyForMigrationInspection: Boolean(
    migrationDatabase.configured && migrationDatabase.validUrl && migrationDatabase.tlsRequired && migrationDatabase.projectMatches,
  ),
};

console.log(JSON.stringify(report, null, 2));
const vercelCheck = process.argv.includes('--vercel');
if (vercelCheck ? !report.readyForVercel : !report.readyForLocalStartup) process.exitCode = 1;
