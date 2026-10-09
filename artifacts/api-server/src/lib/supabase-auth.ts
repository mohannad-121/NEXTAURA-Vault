import { createClient, type User } from "@supabase/supabase-js";
import type { Request } from "express";
import { pool } from "@workspace/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_REF = /^[a-z]{20}$/;
const EXPECTED_PROJECT_REF = "qulqcuuzncyyszgdpfad";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

const projectId = required("SUPABASE_PROJECT_ID");
const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");

if (
  !PROJECT_REF.test(projectId) || projectId !== EXPECTED_PROJECT_REF ||
  supabaseUrl !== `https://${EXPECTED_PROJECT_REF}.supabase.co`
) {
  throw new Error("Supabase project configuration is inconsistent");
}

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

type Claims = Record<string, unknown>;

export type VerifiedAuth = {
  accessToken: string;
  user: User;
  userId: string;
  sessionId: string;
  claims: Claims;
  aal: "aal1" | "aal2";
  verifiedTotp: boolean;
  secondFactorAgeMinutes: number;
};

function bearerToken(req: Request): string | undefined {
  const value = req.get("authorization");
  const match = /^Bearer ([^\s]+)$/.exec(value ?? "");
  return match?.[1];
}

function validAudience(value: unknown): boolean {
  return value === "authenticated" || (Array.isArray(value) && value.includes("authenticated"));
}

function totpAgeMinutes(claims: Claims): number {
  const amr = claims.amr;
  if (!Array.isArray(amr)) return Infinity;
  let latest = 0;
  for (const item of amr) {
    if (!item || typeof item !== "object") continue;
    const method = (item as Record<string, unknown>).method;
    const timestamp = (item as Record<string, unknown>).timestamp;
    if (method === "totp" && typeof timestamp === "number" && Number.isFinite(timestamp)) {
      latest = Math.max(latest, timestamp);
    }
  }
  return latest > 0 ? Math.max(0, Date.now() / 60_000 - latest / 60) : Infinity;
}

async function activeSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await pool.query<{ active: boolean }>(
    `select exists (
       select 1 from auth.sessions
       where id = $1::uuid and user_id = $2::uuid
         and (not_after is null or not_after > now())
     ) as active`,
    [sessionId, userId],
  );
  return result.rows[0]?.active === true;
}

export async function verifySupabaseRequest(req: Request): Promise<VerifiedAuth | undefined> {
  const accessToken = bearerToken(req);
  if (!accessToken) return undefined;

  const [claimsResult, userResult] = await Promise.all([
    supabase.auth.getClaims(accessToken),
    supabase.auth.getUser(accessToken),
  ]);
  const claims = claimsResult.data?.claims as Claims | undefined;
  const user = userResult.data.user;
  if (claimsResult.error || userResult.error || !claims || !user) return undefined;

  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  const aal = claims.aal === "aal2" ? "aal2" : claims.aal === "aal1" ? "aal1" : undefined;
  if (
    !UUID.test(userId) || !UUID.test(sessionId) || !aal || user.id !== userId ||
    claims.iss !== `${supabaseUrl}/auth/v1` || claims.role !== "authenticated" || !validAudience(claims.aud)
  ) return undefined;

  if (!(await activeSession(userId, sessionId))) return undefined;

  const verifiedTotp = user.factors?.some(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  ) ?? false;

  return {
    accessToken,
    user,
    userId,
    sessionId,
    claims,
    aal,
    verifiedTotp,
    secondFactorAgeMinutes: totpAgeMinutes(claims),
  };
}
