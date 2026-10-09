# NEXTAURA Vault

A private, encrypted credential command center for the two NextAura founders.

## Product requirements

- Only Mohannad and Moayad may access the vault, using separate identities.
- Original uploaded Agency, AI, Studios and OS logos must remain unchanged.
- No demo bypasses, hardcoded login credentials, fabricated statistics, or seeded business passwords.
- Authenticator MFA is mandatory; enrollment alone is not sufficient, a second factor must be verified.
- Brand-specific ambient themes, an approximately 4.5-second skippable intro after authorization, reduced-motion support, and settings replay are required.
- Keep all private APIs server-authorized; the browser's route gates are not security boundaries.

## Run & operate

- `pnpm --filter @workspace/api-server run dev` — managed shared API workflow.
- `pnpm --filter @workspace/nextaura-vault run dev` — managed web workflow; workflow supplies PORT and BASE_PATH.
- `pnpm run typecheck` — complete TypeScript check.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate clients/validators after OpenAPI changes.
- `pnpm --filter @workspace/db run push` — development schema only.
- `pnpm --filter @workspace/scripts run test:vault-security` — isolated tests with explicitly fake test values.

## Required setup before real credentials

1. Disable public sign-up in the dedicated Supabase project, then create exactly
   two confirmed Auth users through an approved administrative path. Configure
   `FOUNDER_MOHANNAD_USER_ID` and `FOUNDER_MOAYAD_USER_ID` with their distinct
   Supabase Auth UUIDs. Never authorize founders by email or profile metadata.
2. Both founders must enroll and verify TOTP. The API refuses access without a
   verified TOTP factor, an `aal2` token, and a current Supabase Auth session.
3. Add `VAULT_ENCRYPTION_KEY` through the server's secret manager: a securely generated 32-byte key
   encoded as exactly 64 hexadecimal characters. Do not paste this key into chat,
   source, logs, or databases. Keep an offline recovery copy in a trusted secure
   location. Do not reuse a login password, SESSION_SECRET, or another app's key.
4. Keep development and production Supabase projects separate. Configure each
   environment with its own project URL, publishable key, founder UUIDs, and
   encryption key.
5. Complete signed-in acceptance checks before production use. No authentication
   bypass should ever be introduced just to screenshot or test the dashboard.

## Architecture & security

- React/Vite, Wouter, React Query, and Supabase Auth bearer sessions.
- Shared Express server and PostgreSQL/Drizzle; contract is `lib/api-spec/openapi.yaml`.
- Ciphertexts use AES-256-GCM, random 96-bit nonces, HKDF-separated credential and
   backup keys, and authenticated per-record IDs. Missing/malformed encryption
   configuration fails closed rather than generating a temporary key.
- Founder allowlist is trusted server configuration, never user-editable profile
  metadata. Auth checks verify signed claims, the current Auth session, `aal2`,
  and verified TOTP enrollment.
- Secrets are decrypted only on a recent-MFA-authorized POST reveal. Metadata
   queries never select encrypted passwords. Responses use no-store headers.
- All sensitive writes, reveal, delete, access changes, export and restore require
   second-factor verification within five minutes.
- Sessions are revoked on lock and marked revoked locally to close token-TTL gaps.
   Backend idle expiry is 15 minutes. `/me` polling does not reset inactivity.
- Mutations reject absent/mismatched origins, cross-site requests and non-JSON
   bodies. API rate limits are per network address and per authenticated user.
- Audit data contains server-generated action names and IDs, never secret values,
   usernames or account names. Errors log only error types, not raw SDK/DB errors.
- Backups encrypt the entire archive, include only accessible divisions, and restore
   atomically without overwriting existing IDs. Authentication codes and the master
   encryption key are not included in backups.
- Platform logos are local SVGs sourced from Simple Icons (OpenAI from the last
   supported historical collection). Do not send credential data to logo providers.

## Recovery design and limits

- A second verified TOTP factor can recover account access; encrypted archives
  recover vault records. Both still require the original encryption key to decrypt.
- Losing or changing the master key without re-encryption makes stored credentials
   and backups unreadable. Never rotate/delete it casually. Key rotation tooling
   and external KMS/HSM integration are not implemented.
- This is server-side encryption, **not zero-knowledge encryption**. A compromised
   app server or project administrator with database and secret access can decrypt.
   Secure the hosting/project accounts and limit collaborator access.
- JavaScript strings and operating-system clipboards cannot be guaranteed erased.
   Reveals are short-lived and never persisted in browser storage; clipboard
   contents should be treated as sensitive after copying.
- Authentication/MFA enrollment, signed-in CRUD, recovery drills, and multi-founder
   permission behavior require verification with the configured founder accounts.
   Unit tests and unauthenticated checks are not a substitute for those checks or an
   independent security assessment.
- Do not recommend this application for real business credentials until setup,
   signed-in verification, backup/recovery testing, and a security assessment are done.
