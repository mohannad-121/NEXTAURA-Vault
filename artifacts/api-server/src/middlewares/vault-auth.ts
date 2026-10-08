import { getAuth, clerkClient } from "@clerk/express";
import { reverificationError } from "@clerk/shared/authorization-errors";
import type { Request, Response, NextFunction } from "express";
import { db, foundersTable, vaultSessionsTable, type Founder } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encryptionReady } from "../lib/vault-crypto";
import { audit } from "../lib/audit";
import { configuredFounderRole, validSecondFactorAge } from "../lib/vault-policy";

export type VaultGate = {
  status: "ready" | "access_pending" | "mfa_required" | "mfa_verification_required" | "encryption_required";
  name: string;
  founder: string;
  mfaEnabled: boolean;
  encryptionReady: boolean;
  introSeen: boolean;
  defaultDivision: string;
  allowedDivisions: string[];
};

export function secondFactorAge(req: Request): number {
  return validSecondFactorAge(getAuth(req).sessionClaims?.fva?.[1]);
}

export const founderRole = configuredFounderRole;

export async function sessionGate(req: Request, res: Response): Promise<VaultGate | undefined> {
  const auth = getAuth(req);
  if (!auth.userId || !auth.sessionId) {
    res.status(401).json({ error: "Sign in to access the private vault." });
    return;
  }
  const role = founderRole(auth.userId);
  const empty: VaultGate = {
    status: "access_pending", name: "", founder: "", mfaEnabled: false,
    encryptionReady: encryptionReady(), introSeen: false, defaultDivision: "agency", allowedDivisions: [],
  };
  // No profile information, no JIT user, and no private data for other accounts.
  if (!role) return empty;
  const remoteSession = await clerkClient.sessions.getSession(auth.sessionId);
  if (remoteSession.status !== "active") {
    res.status(401).json({ error: "Session ended. Please sign in again." });
    return;
  }
  const [existing] = await db.select().from(foundersTable).where(eq(foundersTable.id, auth.userId));
  let founder = existing;
  if (!founder) {
    const [created] = await db.insert(foundersTable).values({
      id: auth.userId, founder: role, name: role === "mohannad" ? "Mohannad" : "Moayad",
    }).onConflictDoNothing().returning();
    founder = created ?? (await db.select().from(foundersTable).where(eq(foundersTable.id, auth.userId)))[0];
  }
  if (!founder || !founder.active || founder.founder !== role) return empty;
  const user = await clerkClient.users.getUser(auth.userId);
  const mfaEnabled = user.twoFactorEnabled && user.totpEnabled;
  const gate: VaultGate = {
    ...empty, status: "ready", founder: role, name: founder.name,
    mfaEnabled, introSeen: founder.introSeen,
    defaultDivision: founder.defaultDivision, allowedDivisions: founder.allowedDivisions,
  };
  res.locals.founder = founder;
  res.locals.sessionId = auth.sessionId;
  if (!mfaEnabled) { gate.status = "mfa_required"; return gate; }
  // An old MFA claim cannot keep a long-running session's dashboard open.
  if (secondFactorAge(req) >= 15) { gate.status = "mfa_verification_required"; return gate; }
  if (!encryptionReady()) { gate.status = "encryption_required"; return gate; }

  const now = new Date();
  const [stored] = await db.select().from(vaultSessionsTable).where(eq(vaultSessionsTable.id, auth.sessionId));
  if (stored?.revoked || (stored && now.getTime() - stored.lastActivity.getTime() > 15 * 60_000)) {
    await db.update(vaultSessionsTable).set({ revoked: true }).where(eq(vaultSessionsTable.id, auth.sessionId));
    await clerkClient.sessions.revokeSession(auth.sessionId).catch(() => undefined);
    res.status(401).json({ error: "Vault locked after inactivity. Sign in again." });
    return;
  }
  if (!stored) {
    await db.insert(vaultSessionsTable).values({ id: auth.sessionId, founderId: founder.id }).onConflictDoNothing();
    await audit(founder, "Vault unlocked");
  }
  // Session status polling cannot keep an idle vault alive.
  if (req.path !== "/me") {
    await db.update(vaultSessionsTable).set({ lastActivity: now }).where(eq(vaultSessionsTable.id, auth.sessionId));
  }
  return gate;
}

export async function requireVault(req: Request, res: Response, next: NextFunction): Promise<void> {
  const gate = await sessionGate(req, res);
  if (!gate) return;
  if (gate.status !== "ready") {
    if (gate.status === "mfa_verification_required") {
      res.status(403).json({ ...reverificationError({ level: "second_factor", afterMinutes: 5 }), error: "Verify your authenticator to open the vault." });
    } else {
      res.status(403).json({ error: "Complete founder access, MFA, and encryption setup before using the vault.", status: gate.status });
    }
    return;
  }
  next();
}

export function requireRecentMfa(req: Request, res: Response, next: NextFunction): void {
  if (secondFactorAge(req) >= 5) {
    res.status(403).json({ ...reverificationError({ level: "second_factor", afterMinutes: 5 }), error: "Reverify your authenticator for this sensitive action." });
    return;
  }
  next();
}

export function currentFounder(res: Response): Founder {
  return res.locals.founder as Founder;
}

export function allows(res: Response, division: string): boolean {
  return currentFounder(res).allowedDivisions.includes(division);
}
