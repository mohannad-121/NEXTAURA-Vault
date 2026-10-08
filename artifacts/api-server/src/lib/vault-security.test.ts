import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, encryptionReady } from "./vault-crypto";
import { configuredFounderRole, validSecondFactorAge } from "./vault-policy";

// Explicitly fake test-only key. Tests never read or use the project's real key.
beforeEach(() => {
  process.env.VAULT_ENCRYPTION_KEY = "0".repeat(64);
  process.env.FOUNDER_MOHANNAD_ID = "user_testFounderA";
  process.env.FOUNDER_MOAYAD_ID = "user_testFounderB";
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
  assert.equal(configuredFounderRole("user_testFounderA"), "mohannad");
  assert.equal(configuredFounderRole("user_testFounderB"), "moayad");
  assert.equal(configuredFounderRole("user_randomUser"), undefined);
});
test("partial founder configuration denies every identity", () => {
  delete process.env.FOUNDER_MOAYAD_ID;
  assert.equal(configuredFounderRole("user_testFounderA"), undefined);
});
test("duplicate founder identities fail closed", () => {
  process.env.FOUNDER_MOAYAD_ID = process.env.FOUNDER_MOHANNAD_ID;
  assert.equal(configuredFounderRole("user_testFounderA"), undefined);
});
test("malformed founder IDs fail closed", () => {
  process.env.FOUNDER_MOHANNAD_ID = "not-a-clerk-id";
  assert.equal(configuredFounderRole("user_testFounderB"), undefined);
});
test("missing, negative and nonnumeric MFA claims cannot authorize access", () => {
  for (const input of [undefined, null, -1, NaN, Infinity, "0", {}, []]) assert.equal(validSecondFactorAge(input), Infinity);
  assert.equal(validSecondFactorAge(0), 0);
  assert.equal(validSecondFactorAge(4), 4);
  assert.ok(validSecondFactorAge(5) >= 5);
});
