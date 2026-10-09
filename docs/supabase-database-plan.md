# Supabase initialization plan

The only authorized project is `qulqcuuzncyyszgdpfad`. It supplies Supabase
Auth and PostgreSQL. The browser does not query vault tables through the Data
API; Express uses the TLS PostgreSQL connection and keeps AES-256-GCM keys
server-side.

## Read-only gate

Before any migration, verify that `DATABASE_URL` targets the expected project,
configure the trusted CA if required, then run:

```bash
pnpm --filter @workspace/db run inspect:readonly -- qulqcuuzncyyszgdpfad
```

The inspector starts a read-only transaction, inventories public tables and
migration history, counts Auth users and MFA factors, and rolls back. It does
not read vault contents. If the project cannot be verified, it exits before
querying.

Compare the inventory with `lib/db/drizzle/`. Do not infer that the database is
empty from a missing application table alone.

## Reviewed local migrations

- `0000_nextaura_vault_baseline.sql` preserves the original five-table model.
- `0001_supabase_private_access.sql` enables RLS and revokes Data API access
  from `anon` and `authenticated` for the vault tables.
- `0002_supabase_auth_uuids.sql` changes founder/session relationships to UUIDs
  and links `vault_founders.id` to `auth.users.id`.

Migration `0002` deliberately aborts if any vault table contains rows. If the
inventory finds existing records, first produce an owner-reviewed mapping from
the two legacy founder IDs to the two Supabase Auth UUIDs and validate all
dependent row counts. Never cast, delete, or reassign existing founder data by
assumption.

## Founder provisioning gate

In Supabase Auth, disable public sign-up before creating accounts. Create exactly
two confirmed email/password users through an approved administrative path,
record their UUIDs in the server environment, and insert matching
`vault_founders` rows only after migration approval. Each founder must enroll
and verify a TOTP factor. A second verified TOTP factor is recommended for
recovery because the application does not generate recovery codes.

Before any approved migration, take and verify an encrypted backup and preserve
the exact AES-256-GCM key separately. Losing that key makes existing ciphertext
unrecoverable.
