# NEXTAURA Vault Chrome extension

The Manifest V3 extension lives in `artifacts/nextaura-vault-extension`. It uses
the existing Supabase Auth project and Express vault API. It never reads
PostgreSQL or Supabase Data API tables directly.

## Build and load unpacked

1. Set the existing `VITE_SUPABASE_PUBLISHABLE_KEY` in the root `.env.local`.
   Do not add service-role keys, database credentials, or encryption keys.
2. Configure the API deployment with the public extension ID:

   ```text
   VAULT_EXTENSION_ID=mfhbbeeolmdfojdfenemmnehkagboeoo
   ```

3. Build from the repository root:

   ```powershell
   pnpm --filter @workspace/nextaura-vault-extension run build
   ```

4. Open `chrome://extensions` (or `edge://extensions`), enable **Developer
   mode**, choose **Load unpacked**, and select:

   ```text
   artifacts/nextaura-vault-extension/dist
   ```

5. Confirm the displayed extension ID is
   `mfhbbeeolmdfojdfenemmnehkagboeoo`. A different ID will be rejected by the
   API's exact-origin policy.

Reload the unpacked extension after each rebuild. The extension is not published
or deployed by these steps.

## Security model

- The public Supabase publishable key is the only bundled key.
- Auth sessions use `chrome.storage.session`, explicitly restricted to trusted
  extension contexts, and disappear when the browser exits.
- The API independently validates the JWT, active Supabase session, configured
  founder UUID, verified TOTP factor, `aal2`, division grants, and MFA age.
- Credential listings contain metadata only. Passwords are returned only from
  the existing recent-MFA-protected reveal endpoint and are immediately handed
  to the clipboard without entering React state or a cache.
- CORS is exact-origin, bearer-token based, and never credentialed. No wildcard
  origin, content scripts, page scraping, or automatic form filling are used.
- Logging out first revokes the vault session and then clears the Supabase
  session. The server also locks inactive vault sessions after 15 minutes.

Copied secrets remain in the operating system clipboard until replaced by the
user or another application. The extension warns after every copy but does not
silently overwrite later clipboard contents.

## Verification checklist

Use fake credentials only outside the dedicated founder accounts.

- Authorized founder: password sign-in, TOTP challenge, and AAL2 vault load.
- Unauthorized account: `/api/vault/me` remains `access_pending`; no credential
  metadata is returned.
- Search each of platform, account name, and username; test all four divisions.
- Copy a username with an explicit click.
- Let MFA freshness exceed five minutes, then copy a password and confirm the
  extension reverifies TOTP before retrying reveal.
- Leave the vault idle for more than 15 minutes and confirm reauthentication is
  required.
- Lock/sign out, close and reopen the popup, and confirm no session remains.
- Inspect the built manifest for only `storage`, `clipboardWrite`, the production
  API origin, and the exact Supabase project origin.
- Repeat the unpacked flow in current Chrome and Edge.
