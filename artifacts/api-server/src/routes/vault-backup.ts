import { Router, type IRouter } from "express";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db, credentialsTable, activityTable } from "@workspace/db";
import { ExportVaultBackupResponse, RestoreVaultBackupBody, RestoreVaultBackupResponse } from "@workspace/api-zod";
import { requireRecentMfa, currentFounder, allows } from "../middlewares/vault-auth";
import { encrypt, decrypt } from "../lib/vault-crypto";
import { platforms } from "../lib/platforms";
import { audit } from "../lib/audit";

const router: IRouter = Router();
const archivedCredential = z.object({
  id: z.string().uuid(),
  division: z.enum(["agency", "ai", "studios", "os"]),
  platform: z.string().max(50).refine((v) => platforms.some((p) => p.id === v)),
  accountName: z.string().min(1).max(120),
  username: z.string().min(1).max(320),
  encryptedPassword: z.string().min(1).max(10_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const archiveSchema = z.object({
  version: z.literal(1),
  credentials: z.array(archivedCredential).max(2500),
});

router.post("/backup", requireRecentMfa, async (_req, res): Promise<void> => {
  const founder = currentFounder(res);
  const rows = founder.allowedDivisions.length ? await db.select({
    id: credentialsTable.id, division: credentialsTable.division, platform: credentialsTable.platform,
    accountName: credentialsTable.accountName, username: credentialsTable.username,
    encryptedPassword: credentialsTable.encryptedPassword, createdAt: credentialsTable.createdAt,
    updatedAt: credentialsTable.updatedAt,
  }).from(credentialsTable).where(inArray(credentialsTable.division, founder.allowedDivisions)) : [];
  if (rows.length > 2500) { res.status(413).json({ error: "Archive limit exceeded. Contact the vault administrator." }); return; }
  const serialized = JSON.stringify({
    version: 1,
    credentials: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
  });
  if (Buffer.byteLength(serialized) > 7_000_000) { res.status(413).json({ error: "Archive size limit exceeded." }); return; }
  await audit(founder, "Encrypted backup exported");
  res.json(ExportVaultBackupResponse.parse({
    format: "nextaura-vault-v1",
    ciphertext: encrypt(serialized, "archive", "backup"),
  }));
});

router.post("/restore", requireRecentMfa, async (req, res): Promise<void> => {
  const input = RestoreVaultBackupBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Invalid backup file." }); return; }
  let archive: z.infer<typeof archiveSchema>;
  try {
    archive = archiveSchema.parse(JSON.parse(decrypt(input.data.ciphertext, "archive", "backup")));
    // Authenticate every inner secret before any write. A ciphertext copied to a
    // different credential ID cannot pass the per-record associated-data check.
    for (const row of archive.credentials) {
      const password = decrypt(row.encryptedPassword, row.id);
      if (!password.length || password.length > 4096) throw new Error("Invalid secret");
    }
  } catch {
    res.status(400).json({ error: "Backup is corrupted or belongs to another encryption key." }); return;
  }
  if (archive.credentials.some((r) => !allows(res, r.division))) {
    res.status(403).json({ error: "This backup includes divisions you cannot access." }); return;
  }
  const founder = currentFounder(res);
  const restored = await db.transaction(async (tx) => {
    let count = 0;
    for (const row of archive.credentials) {
      const inserted = await tx.insert(credentialsTable).values({
        ...row, createdBy: founder.id, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt),
      }).onConflictDoNothing().returning({ id: credentialsTable.id });
      count += inserted.length;
    }
    await tx.insert(activityTable).values({
      actorId: founder.id, actor: founder.name, action: "Encrypted backup restored",
    });
    return count;
  });
  res.json(RestoreVaultBackupResponse.parse({ restored, skipped: archive.credentials.length - restored }));
});
export default router;
