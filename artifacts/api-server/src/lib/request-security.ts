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

const EXTENSION_ID = /^[a-p]{32}$/;

export function configuredExtensionOrigin(): string | undefined {
  const id = process.env.VAULT_EXTENSION_ID?.trim();
  return id && EXTENSION_ID.test(id) ? `chrome-extension://${id}` : undefined;
}

export function isTrustedExtensionOrigin(origin: string | undefined): boolean {
  const trusted = configuredExtensionOrigin();
  return Boolean(trusted && origin === trusted);
}

export function isChromeExtensionOrigin(origin: string | undefined): boolean {
  return Boolean(origin && /^chrome-extension:\/\/[a-p]{32}$/.test(origin));
}

export function isAllowedVaultMutationOrigin(input: {
  origin: string | undefined;
  publicOrigin: string | undefined;
  secFetchSite: string | undefined;
}): boolean {
  if (isTrustedExtensionOrigin(input.origin)) return true;
  return Boolean(
    input.origin &&
    input.publicOrigin &&
    input.origin === input.publicOrigin &&
    input.secFetchSite !== "cross-site"
  );
}
