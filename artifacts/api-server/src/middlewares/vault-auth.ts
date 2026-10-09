import type { Request, Response, NextFunction } from "express";
import { db, foundersTable, vaultSessionsTable, type Founder } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encryptionReady } from "../lib/vault-crypto";
import { audit } from "../lib/audit";
import { configuredFounderRole } from "../lib/vault-policy";
import { verifySupabaseRequest, type VerifiedAuth } from "../lib/supabase-auth";

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

export const founderRole = configuredFounderRole;

export async function sessionGate(req: Request, res: Response): Promise<VaultGate | undefined> {
  const auth = await verifySupabaseRequest(req);
  if (!auth) {
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
  const [existing] = await db.select().from(foundersTable).where(eq(foundersTable.id, auth.userId));
  const founder = existing;
  if (!founder || !founder.active || founder.founder !== role) return empty;
  const mfaEnabled = auth.verifiedTotp;
  const gate: VaultGate = {
    ...empty, status: "ready", founder: role, name: founder.name,
    mfaEnabled, introSeen: founder.introSeen,
    defaultDivision: founder.defaultDivision, allowedDivisions: founder.allowedDivisions,
  };
  res.locals.founder = founder;
  res.locals.sessionId = auth.sessionId;
  res.locals.auth = auth;
  if (!mfaEnabled) { gate.status = "mfa_required"; return gate; }
  if (auth.aal !== "aal2" || auth.secondFactorAgeMinutes >= 15) {
    gate.status = "mfa_verification_required";
    return gate;
  }
  if (!encryptionReady()) { gate.status = "encryption_required"; return gate; }

  const now = new Date();
  const [stored] = await db.select().from(vaultSessionsTable).where(eq(vaultSessionsTable.id, auth.sessionId));
  if (stored?.revoked || (stored && now.getTime() - stored.lastActivity.getTime() > 15 * 60_000)) {
    await db.update(vaultSessionsTable).set({ revoked: true }).where(eq(vaultSessionsTable.id, auth.sessionId));
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
      res.status(403).json({
        error: "Verify your authenticator to open the vault.",
        status: "mfa_verification_required",
      });
    } else {
      res.status(403).json({ error: "Complete founder access, MFA, and encryption setup before using the vault.", status: gate.status });
    }
    return;
  }
  next();
}

export function requireRecentMfa(_req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as VerifiedAuth | undefined;
  if (!auth || auth.aal !== "aal2" || auth.secondFactorAgeMinutes >= 5) {
    res.status(403).json({ error: "Reverify your authenticator for this sensitive action.", status: "mfa_verification_required" });
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
