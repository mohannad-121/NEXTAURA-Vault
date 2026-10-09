import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, encryptionReady } from "./vault-crypto.js";
import { configuredFounderRole, validSecondFactorAge } from "./vault-policy.js";
import { authRateLimitKey, publicHost } from "./request-security.js";

// Explicitly fake test-only key. Tests never read or use the project's real key.
beforeEach(() => {
  process.env.VAULT_ENCRYPTION_KEY = "0".repeat(64);
  process.env.FOUNDER_MOHANNAD_USER_ID = "11111111-1111-4111-8111-111111111111";
  process.env.FOUNDER_MOAYAD_USER_ID = "22222222-2222-4222-8222-222222222222";
});
test("credential encryption round trips fake unicode secrets", () => {
  const fake = "test-only-password-✓";
  const envelope = encrypt(fake, "credential-test");
  assert.equal(decrypt(envelope, "credential-test"), fake);
  assert.ok(!envelope.includes(fake));
});
test("unique randomized nonces for identical inputs", () => {
  assert.notEqual(encrypt("fake-only", "record"), encrypt("fake-only", "record"));
});
test("per-record associated data prevents swapping encrypted secrets", () => {
  const envelope = encrypt("fake-only", "first");
  assert.throws(() => decrypt(envelope, "second"));
});
test("authentication tag rejects ciphertext tampering", () => {
  const parts = encrypt("fake-only", "record").split(".");
  const bytes = Buffer.from(parts[3]!, "base64");
  bytes[0] = bytes[0]! ^ 1;
  parts[3] = bytes.toString("base64");
  assert.throws(() => decrypt(parts.join("."), "record"));
});
test("backup keys are domain-separated from credential keys", () => {
  const envelope = encrypt("fake-only", "archive", "backup");
  assert.equal(decrypt(envelope, "archive", "backup"), "fake-only");
  assert.throws(() => decrypt(envelope, "archive", "credential"));
});
test("a replaced master key cannot decrypt previous ciphertext", () => {
  const envelope = encrypt("fake-only", "record");
  process.env.VAULT_ENCRYPTION_KEY = "1".repeat(64);
  assert.throws(() => decrypt(envelope, "record"));
});
test("missing and malformed keys fail closed without an ephemeral fallback", () => {
  delete process.env.VAULT_ENCRYPTION_KEY;
  assert.equal(encryptionReady(), false);
  assert.throws(() => encrypt("fake-only", "record"));
  process.env.VAULT_ENCRYPTION_KEY = "bad-key";
  assert.equal(encryptionReady(), false);
  assert.throws(() => encrypt("fake-only", "record"));
});
test("invalid envelope shapes are rejected", () => {
  for (const input of ["", "v1.a.b.c", "v2.a.b.c", "v1.a.b.c.d"]) assert.throws(() => decrypt(input, "record"));
});
test("only two configured founder identities are authorized", () => {
  assert.equal(configuredFounderRole("11111111-1111-4111-8111-111111111111"), "mohannad");
  assert.equal(configuredFounderRole("22222222-2222-4222-8222-222222222222"), "moayad");
  assert.equal(configuredFounderRole("33333333-3333-4333-8333-333333333333"), undefined);
});
test("partial founder configuration denies every identity", () => {
  delete process.env.FOUNDER_MOAYAD_USER_ID;
  assert.equal(configuredFounderRole("11111111-1111-4111-8111-111111111111"), undefined);
});
test("duplicate founder identities fail closed", () => {
  process.env.FOUNDER_MOAYAD_USER_ID = process.env.FOUNDER_MOHANNAD_USER_ID;
  assert.equal(configuredFounderRole("11111111-1111-4111-8111-111111111111"), undefined);
});
test("malformed founder IDs fail closed", () => {
  process.env.FOUNDER_MOHANNAD_USER_ID = "not-a-uuid";
  assert.equal(configuredFounderRole("22222222-2222-4222-8222-222222222222"), undefined);
});
test("missing, negative and nonnumeric MFA claims cannot authorize access", () => {
  for (const input of [undefined, null, -1, NaN, Infinity, "0", {}, []]) assert.equal(validSecondFactorAge(input), Infinity);
  assert.equal(validSecondFactorAge(0), 0);
  assert.equal(validSecondFactorAge(4), 4);
  assert.ok(validSecondFactorAge(5) >= 5);
});
test("rate-limit keys never contain bearer credentials", () => {
  const token = "test-only-bearer-value";
  const req = {
    get: (name: string) => name === "authorization" ? `Bearer ${token}` : undefined,
  };
  const key = authRateLimitKey(req as never);
  assert.equal(key.length, 64);
  assert.ok(!key.includes(token));
});
test("forwarded production host is normalized without trusting extra values", () => {
  const req = {
    headers: { "x-forwarded-host": "vault.example.com, internal.example" },
    get: () => "ignored.example",
  };
  assert.equal(publicHost(req as never), "vault.example.com");
});
test("division and recent-MFA gates fail closed", async () => {
  const testDatabaseUrl = new URL("postgresql://127.0.0.1:5432/postgres?sslmode=require");
  testDatabaseUrl.username = "test";
  testDatabaseUrl.password = "test";
  process.env.DATABASE_URL = testDatabaseUrl.toString();
  process.env.SUPABASE_PROJECT_ID = "qulqcuuzncyyszgdpfad";
  process.env.SUPABASE_URL = "https://qulqcuuzncyyszgdpfad.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-only-publishable-key";
  const { allows, requireRecentMfa } = await import("../middlewares/vault-auth.js");
  const res = {
    locals: {
      founder: { allowedDivisions: ["agency"] },
      auth: { aal: "aal2", secondFactorAgeMinutes: 4 },
    },
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  assert.equal(allows(res as never, "agency"), true);
  assert.equal(allows(res as never, "tech"), false);
  let passed = false;
  requireRecentMfa({} as never, res as never, () => { passed = true; });
  assert.equal(passed, true);
  res.locals.auth.secondFactorAgeMinutes = 5;
  requireRecentMfa({} as never, res as never, () => assert.fail("stale MFA must not pass"));
  assert.equal(res.statusCode, 403);
});
