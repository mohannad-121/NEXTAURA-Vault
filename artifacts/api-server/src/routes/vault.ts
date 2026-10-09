import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, desc } from "drizzle-orm";
import { db, credentialsTable, favoritesTable, activityTable, foundersTable, vaultSessionsTable } from "@workspace/db";
import {
  GetVaultSessionResponse, GetVaultSummaryResponse, GetVaultActivityResponse, GetPlatformsResponse,
  ListCredentialsQueryParams, ListCredentialsResponse, CreateCredentialBody, CreateCredentialResponse,
  UpdateCredentialParams, UpdateCredentialBody, UpdateCredentialResponse, DeleteCredentialParams,
  FavoriteCredentialParams, FavoriteCredentialBody, FavoriteCredentialResponse,
  RevealCredentialParams, RevealCredentialResponse, UpdateVaultSettingsBody, UpdateVaultSettingsResponse,
  GetFounderAccessResponse, UpdateFounderAccessParams, UpdateFounderAccessBody, UpdateFounderAccessResponse,
} from "@workspace/api-zod";
import { sessionGate, requireVault, requireRecentMfa, currentFounder, allows, founderRole } from "../middlewares/vault-auth.js";
import { verifySupabaseRequest } from "../lib/supabase-auth.js";
import { platforms, divisions } from "../lib/platforms.js";
import { encrypt, decrypt } from "../lib/vault-crypto.js";
import { audit } from "../lib/audit.js";
import backupRouter from "./vault-backup.js";

const router: IRouter = Router();
router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store, private", "Pragma": "no-cache" });
  res.vary("Authorization");
  next();
});

router.get("/me", async (req, res): Promise<void> => {
  const gate = await sessionGate(req, res);
  if (gate) res.json(GetVaultSessionResponse.parse(gate));
});

// Lock is possible even before MFA/encryption setup. Mark locally revoked first
// so the already-issued access token cannot reopen the vault during its TTL.
router.post("/lock", async (req, res): Promise<void> => {
  const auth = await verifySupabaseRequest(req);
  if (!auth || !founderRole(auth.userId)) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  await db.insert(vaultSessionsTable).values({
    id: auth.sessionId, founderId: auth.userId, revoked: true,
  }).onConflictDoUpdate({ target: vaultSessionsTable.id, set: { revoked: true } });
  const [founder] = await db.select().from(foundersTable).where(eq(foundersTable.id, auth.userId));
  if (founder) await audit(founder, "Vault locked");
  res.sendStatus(204);
});

router.use(requireVault);

async function metadata(res: Parameters<typeof currentFounder>[0]) {
  const founder = currentFounder(res);
  if (!founder.allowedDivisions.length) return [];
  const rows = await db.select({
    id: credentialsTable.id, division: credentialsTable.division, platform: credentialsTable.platform,
    accountName: credentialsTable.accountName, username: credentialsTable.username,
    favoriteId: favoritesTable.credentialId, createdAt: credentialsTable.createdAt, updatedAt: credentialsTable.updatedAt,
  }).from(credentialsTable).leftJoin(favoritesTable, and(
    eq(favoritesTable.credentialId, credentialsTable.id), eq(favoritesTable.founderId, founder.id),
  )).where(inArray(credentialsTable.division, founder.allowedDivisions)).orderBy(desc(credentialsTable.updatedAt));
  return rows.map(({ favoriteId, createdAt, updatedAt, ...row }) => ({
    ...row, favorite: !!favoriteId, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
  }));
}

router.get("/platforms", (_req, res): void => { res.json(GetPlatformsResponse.parse(platforms)); });
router.get("/summary", async (_req, res): Promise<void> => {
  const rows = await metadata(res);
  const founder = currentFounder(res);
  res.json(GetVaultSummaryResponse.parse({
    credentialCount: rows.length, platformCount: new Set(rows.map((r) => r.platform)).size,
    favoriteCount: rows.filter((r) => r.favorite).length, divisionCount: founder.allowedDivisions.length,
    divisions: divisions.filter((d) => allows(res, d)).map((division) => ({
      division, credentialCount: rows.filter((r) => r.division === division).length,
      platformCount: new Set(rows.filter((r) => r.division === division).map((r) => r.platform)).size,
    })),
  }));
});
router.get("/activity", async (_req, res): Promise<void> => {
  const founder = currentFounder(res);
  const events = await db.select({
    id: activityTable.id, actor: activityTable.actor, action: activityTable.action,
    division: activityTable.division, createdAt: activityTable.createdAt,
  }).from(activityTable).where(or(
    and(eq(activityTable.division, ""), eq(activityTable.actorId, founder.id)),
    inArray(activityTable.division, founder.allowedDivisions.length ? founder.allowedDivisions : ["__none"]),
  )).orderBy(desc(activityTable.createdAt)).limit(50);
  res.json(GetVaultActivityResponse.parse(events.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))));
});
router.get("/credentials", async (req, res): Promise<void> => {
  // Explicit boolean coercion prevents "false" becoming truthy in Zod.
  const query = ListCredentialsQueryParams.safeParse({
    ...req.query, favorites: req.query.favorites === undefined ? undefined : req.query.favorites === "true",
  });
  if (!query.success) { res.status(400).json({ error: "Invalid search filters." }); return; }
  if (query.data.division && !allows(res, query.data.division)) { res.status(403).json({ error: "Division access denied." }); return; }
  let rows = await metadata(res);
  if (query.data.division) rows = rows.filter((r) => r.division === query.data.division);
  if (query.data.favorites) rows = rows.filter((r) => r.favorite);
  if (query.data.search) {
    const search = query.data.search.toLowerCase();
    rows = rows.filter((r) => [r.accountName, r.username, r.platform].some((s) => s.toLowerCase().includes(search)));
  }
  res.json(ListCredentialsResponse.parse(rows));
});

router.post("/credentials", requireRecentMfa, async (req, res): Promise<void> => {
  const input = CreateCredentialBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Check the credential fields." }); return; }
  const data = input.data;
  if (!allows(res, data.division)) { res.status(403).json({ error: "Division access denied." }); return; }
  if (!platforms.some((p) => p.id === data.platform)) { res.status(400).json({ error: "Unknown platform." }); return; }
  const id = randomUUID();
  const founder = currentFounder(res);
  await db.transaction(async (tx) => {
    await tx.insert(credentialsTable).values({
      id, division: data.division, platform: data.platform, accountName: data.accountName,
      username: data.username, encryptedPassword: encrypt(data.password, id), createdBy: founder.id,
    });
    await tx.insert(activityTable).values({
      actorId: founder.id, actor: founder.name, action: "Credential added", division: data.division, resourceId: id,
    });
  });
  const created = (await metadata(res)).find((r) => r.id === id);
  res.status(201).json(CreateCredentialResponse.parse(created));
});

router.patch("/credentials/:id", requireRecentMfa, async (req, res): Promise<void> => {
  const params = UpdateCredentialParams.safeParse(req.params);
  const input = UpdateCredentialBody.safeParse(req.body);
  if (!params.success || !input.success || !Object.keys(input.data).length) { res.status(400).json({ error: "Invalid credential update." }); return; }
  const [stored] = await db.select().from(credentialsTable).where(eq(credentialsTable.id, params.data.id));
  if (!stored || !allows(res, stored.division)) { res.status(404).json({ error: "Credential not found." }); return; }
  const data = input.data;
  if (data.division && !allows(res, data.division)) { res.status(403).json({ error: "Division access denied." }); return; }
  if (data.platform && !platforms.some((p) => p.id === data.platform)) { res.status(400).json({ error: "Unknown platform." }); return; }
  const { password, ...fields } = data;
  const founder = currentFounder(res);
  await db.transaction(async (tx) => {
    await tx.update(credentialsTable).set({
      ...fields, updatedAt: new Date(), ...(password !== undefined ? { encryptedPassword: encrypt(password, stored.id) } : {}),
    }).where(eq(credentialsTable.id, stored.id));
    await tx.insert(activityTable).values({
      actorId: founder.id, actor: founder.name, action: "Credential updated", division: stored.division, resourceId: stored.id,
    });
  });
  const result = (await metadata(res)).find((r) => r.id === stored.id);
  res.json(UpdateCredentialResponse.parse(result));
});

router.delete("/credentials/:id", requireRecentMfa, async (req, res): Promise<void> => {
  const params = DeleteCredentialParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid credential ID." }); return; }
  const [stored] = await db.select().from(credentialsTable).where(eq(credentialsTable.id, params.data.id));
  if (!stored || !allows(res, stored.division)) { res.status(404).json({ error: "Credential not found." }); return; }
  const founder = currentFounder(res);
  await db.transaction(async (tx) => {
    await tx.delete(credentialsTable).where(eq(credentialsTable.id, stored.id));
    await tx.insert(activityTable).values({
      actorId: founder.id, actor: founder.name, action: "Credential deleted", division: stored.division, resourceId: stored.id,
    });
  });
  res.sendStatus(204);
});
router.patch("/credentials/:id/favorite", async (req, res): Promise<void> => {
  const params = FavoriteCredentialParams.safeParse(req.params);
  const input = FavoriteCredentialBody.safeParse(req.body);
  if (!params.success || !input.success) { res.status(400).json({ error: "Invalid favorite change." }); return; }
  const [stored] = await db.select({ division: credentialsTable.division }).from(credentialsTable).where(eq(credentialsTable.id, params.data.id));
  if (!stored || !allows(res, stored.division)) { res.status(404).json({ error: "Credential not found." }); return; }
  const founderId = currentFounder(res).id;
  if (input.data.favorite) {
    await db.insert(favoritesTable).values({ founderId, credentialId: params.data.id }).onConflictDoNothing();
  } else {
    await db.delete(favoritesTable).where(and(eq(favoritesTable.founderId, founderId), eq(favoritesTable.credentialId, params.data.id)));
  }
  res.json(FavoriteCredentialResponse.parse((await metadata(res)).find((r) => r.id === params.data.id)));
});
router.post("/credentials/:id/reveal", requireRecentMfa, async (req, res): Promise<void> => {
  const params = RevealCredentialParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid credential ID." }); return; }
  const [stored] = await db.select().from(credentialsTable).where(eq(credentialsTable.id, params.data.id));
  if (!stored || !allows(res, stored.division)) { res.status(404).json({ error: "Credential not found." }); return; }
  await audit(currentFounder(res), "Credential secret accessed", stored.division, stored.id);
  res.json(RevealCredentialResponse.parse({ password: decrypt(stored.encryptedPassword, stored.id) }));
});
router.patch("/settings", async (req, res): Promise<void> => {
  const input = UpdateVaultSettingsBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Invalid settings." }); return; }
  if (input.data.defaultDivision && !allows(res, input.data.defaultDivision)) { res.status(403).json({ error: "Division access denied." }); return; }
  await db.update(foundersTable).set(input.data).where(eq(foundersTable.id, currentFounder(res).id));
  const gate = await sessionGate(req, res);
  if (gate) res.json(UpdateVaultSettingsResponse.parse(gate));
});
router.get("/access", async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: foundersTable.id, name: foundersTable.name, founder: foundersTable.founder,
    allowedDivisions: foundersTable.allowedDivisions, active: foundersTable.active,
  }).from(foundersTable);
  res.json(GetFounderAccessResponse.parse(rows));
});
router.patch("/access/:id", requireRecentMfa, async (req, res): Promise<void> => {
  const params = UpdateFounderAccessParams.safeParse(req.params);
  const input = UpdateFounderAccessBody.safeParse(req.body);
  if (!params.success || !input.success) { res.status(400).json({ error: "Invalid founder permissions." }); return; }
  if (params.data.id === currentFounder(res).id) {
    res.status(400).json({ error: "You cannot change your own access. Ask the other founder." }); return;
  }
  const [updated] = await db.update(foundersTable).set({
    active: input.data.active, allowedDivisions: [...new Set(input.data.allowedDivisions)],
  }).where(eq(foundersTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Founder not found." }); return; }
  await audit(currentFounder(res), "Founder access updated");
  res.json(UpdateFounderAccessResponse.parse(updated));
});
router.use(backupRouter);
export default router;
