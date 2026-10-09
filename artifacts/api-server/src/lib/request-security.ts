import { createHash } from "node:crypto";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

export function publicHost(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || req.get("host")?.trim() || undefined;
}

export function authRateLimitKey(req: Request): string {
  const authorization = req.get("authorization");
  if (!authorization) return ipKeyGenerator(req.ip ?? "127.0.0.1");
  return createHash("sha256").update(authorization).digest("hex");
}
