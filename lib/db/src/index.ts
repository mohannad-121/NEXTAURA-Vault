import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function createPoolConfig(): pg.PoolConfig {
  const connectionString = process.env.DATABASE_URL!;
  const url = new URL(connectionString);
  const isVercel = process.env.VERCEL === "1";

  if (
    isVercel &&
    (!url.hostname.endsWith(".pooler.supabase.com") || url.port !== "6543")
  ) {
    throw new Error(
      "Vercel requires the Supabase transaction pooler on port 6543",
    );
  }

  const inlineCa = process.env.SUPABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (isVercel && !inlineCa) {
    throw new Error("SUPABASE_CA_CERT is required on Vercel");
  }

  const localCaPath = [
    process.env.NODE_EXTRA_CA_CERTS?.trim(),
    path.resolve(process.cwd(), "supabase-root-ca.crt"),
    path.resolve(import.meta.dirname, "../../../supabase-root-ca.crt"),
    path.resolve(import.meta.dirname, "../../supabase-root-ca.crt"),
  ].find((candidate) => Boolean(candidate && fs.existsSync(candidate)));
  const ca = inlineCa ?? (localCaPath ? fs.readFileSync(localCaPath, "utf-8") : undefined);

  if (ca) {
    url.searchParams.delete("sslmode");
    return {
      connectionString: url.toString(),
      ssl: { ca, rejectUnauthorized: true },
      max: isVercel ? 1 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    };
  }

  return {
    connectionString,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  };
}

export const pool = new Pool(createPoolConfig());
export const db = drizzle(pool, { schema });

export * from "./schema/index";
