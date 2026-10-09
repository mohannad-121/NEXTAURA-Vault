# Local development

NEXTAURA Vault uses Supabase Auth and PostgreSQL in the dedicated project
`qulqcuuzncyyszgdpfad`. Express is the only database client. Browser code may
receive only the Supabase project URL and publishable key; it must never receive
`DATABASE_URL`, a database password, a secret/service-role key, or
`VAULT_ENCRYPTION_KEY`.

## Configuration

Copy `.env.example` to `.env.local` and replace placeholders locally. Never
commit `.env.local`. The server and browser project IDs, URLs, and publishable
keys must all identify `qulqcuuzncyyszgdpfad`. Configure the two founder UUIDs
from `auth.users`; never authorize by email or user-editable metadata.

Use the TLS PostgreSQL URI from the project's **Connect** dialog. Prefer the
session pooler for IPv4 local development. Configure a trusted CA through
`NODE_EXTRA_CA_CERTS` when the local network intercepts TLS; do not disable
certificate verification.

## Install and validate

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/scripts run test:vault-security
pnpm run check:env
```

`check:env` reports configuration shape only. It never prints credentials,
tokens, keys, or founder UUIDs.

## Run

```bash
pnpm run dev:api
```

In a second terminal:

```bash
pnpm run dev:web
```

Open `http://localhost:5173`. Vite proxies `/api` to Express. Supabase access
tokens are sent as Bearer tokens and verified again by the server; browser route
guards are only a user-experience boundary.

Do not run `migrate`, `push`, or `push-force` until the read-only inventory and
migration SQL have been reviewed and separately approved.
