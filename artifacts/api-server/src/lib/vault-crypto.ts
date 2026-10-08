import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Separate from Clerk and session keys. Never generate an ephemeral fallback:
// loss or replacement of this key makes both credentials and backups unreadable.
export function encryptionReady(): boolean {
  return /^[a-fA-F0-9]{64}$/.test(process.env.VAULT_ENCRYPTION_KEY ?? "");
}

function key(purpose: "credential" | "backup"): Buffer {
  if (!encryptionReady()) throw new Error("Vault encryption is not configured");
  const root = Buffer.from(process.env.VAULT_ENCRYPTION_KEY!, "hex");
  try {
    return Buffer.from(hkdfSync("sha256", root, "nextaura-vault-v1", purpose, 32));
  } finally {
    root.fill(0);
  }
}

export function encrypt(plaintext: string, context: string, purpose: "credential" | "backup" = "credential"): string {
  const derived = key(purpose);
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", derived, iv);
    cipher.setAAD(Buffer.from(`nextaura-vault-v1:${purpose}:${context}`));
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
  } finally {
    derived.fill(0);
  }
}

export function decrypt(envelope: string, context: string, purpose: "credential" | "backup" = "credential"): string {
  const [version, nonce, tag, ciphertext, extra] = envelope.split(".");
  if (version !== "v1" || !nonce || !tag || !ciphertext || extra) throw new Error("Invalid encrypted envelope");
  const iv = Buffer.from(nonce, "base64");
  const authTag = Buffer.from(tag, "base64");
  if (iv.length !== 12 || authTag.length !== 16) throw new Error("Invalid encrypted envelope");
  const derived = key(purpose);
  try {
    const cipher = createDecipheriv("aes-256-gcm", derived, iv);
    cipher.setAAD(Buffer.from(`nextaura-vault-v1:${purpose}:${context}`));
    cipher.setAuthTag(authTag);
    return Buffer.concat([cipher.update(Buffer.from(ciphertext, "base64")), cipher.final()]).toString("utf8");
  } finally {
    derived.fill(0);
  }
}
