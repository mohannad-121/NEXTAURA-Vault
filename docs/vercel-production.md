# Vercel production checklist

Deploy this repository as one Vercel project rooted at the repository root. Vite is emitted as static CDN assets and `api/[...path].ts` packages the existing Express app as one Node.js Function. Filesystem routes take precedence over the SPA fallback, so `/api/*` never resolves to `index.html`.

The Function is pinned to Vercel `hnd1` (Tokyo), matching the current Supabase `ap-northeast-1` database region.

## Production environment variables

Set these for **Production** before the first build. Apply equivalent isolated values to Preview only if previews are allowed to reach a non-production database.

Public Vite build variables (Vercel Config values):

- `VITE_SUPABASE_PROJECT_ID=qulqcuuzncyyszgdpfad`
- `VITE_SUPABASE_URL=https://qulqcuuzncyyszgdpfad.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the project's publishable key

Server runtime variables:

- `SUPABASE_PROJECT_ID=qulqcuuzncyyszgdpfad` (Config)
- `SUPABASE_URL=https://qulqcuuzncyyszgdpfad.supabase.co` (Config)
- `SUPABASE_PUBLISHABLE_KEY` (Config; it is public by design)
- `DATABASE_URL` (Secret) — Supabase **transaction pooler**, port `6543`, project `qulqcuuzncyyszgdpfad`, and `sslmode=verify-full` or `sslmode=require`
- `SUPABASE_CA_CERT` (Secret) — the Supabase root CA PEM contents; use a multiline value or escaped `\\n` newlines
- `VAULT_ENCRYPTION_KEY` (Secret) — the existing 64-character hexadecimal production key; changing it makes existing ciphertext unreadable
- `FOUNDER_MOHANNAD_USER_ID` and `FOUNDER_MOAYAD_USER_ID` (Secret) — existing, distinct Supabase Auth UUIDs
- `VAULT_EXTENSION_ID=mfhbbeeolmdfojdfenemmnehkagboeoo` (Config) — exact trusted Manifest V3 origin; do not use an origin wildcard
- `LOG_LEVEL=info` (optional Config)

Do not configure `DATABASE_MIGRATION_URL`, `PORT`, `LOCAL_API_URL`, or `NODE_EXTRA_CA_CERTS` in Vercel. Certificate files remain excluded from Git; the Function reads `SUPABASE_CA_CERT` and keeps `rejectUnauthorized` enabled.

## Supabase Auth URL configuration

In project `qulqcuuzncyyszgdpfad`, set **Site URL** to the exact canonical HTTPS production origin. Add the exact canonical origin/path to **Redirect URLs**. If authenticated preview testing is required, separately allow `https://*-<vercel-team-slug>.vercel.app/**`; otherwise do not wildcard previews. Keep `http://localhost:5173/**` only for local development.

The current app uses password sign-in and TOTP MFA without OAuth redirects, but correct Site/Redirect URLs are still required for future recovery or email flows.

## First release

1. Create/link the Vercel project as `nextaura-vault-git` (Vercel slugs must be lowercase), with the repository root as **Root Directory** and Node.js 24.
2. Add the variables above without printing or committing values.
3. Confirm the Supabase transaction-pooler URI and Auth URL allowlist.
4. Create a preview deployment, verify `/api/healthz`, sign-in, TOTP, founder isolation, credential reveal/write controls, and security headers.
5. Stage a production build with `--skip-domain`, repeat smoke tests, then promote it.
