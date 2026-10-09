import { sql } from "drizzle-orm";
import { pgSchema, pgTable, text, boolean, timestamp, check, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

const authUsersTable = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

export const foundersTable = pgTable("vault_founders", {
  id: uuid("id").primaryKey().references(() => authUsersTable.id, { onDelete: "restrict" }),
  founder: text("founder").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  allowedDivisions: text("allowed_divisions").array().notNull().default(["agency", "ai", "studios", "os"]),
  introSeen: boolean("intro_seen").notNull().default(false),
  defaultDivision: text("default_division").notNull().default("agency"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("vault_founders_founder_check", sql`${table.founder} in ('mohannad', 'moayad')`),
  check("vault_founders_default_division_check", sql`${table.defaultDivision} in ('agency', 'ai', 'studios', 'os')`),
  check("vault_founders_allowed_divisions_check", sql`${table.allowedDivisions} <@ array['agency', 'ai', 'studios', 'os']::text[]`),
]).enableRLS();
export const insertFounderSchema = createInsertSchema(foundersTable);
export type Founder = typeof foundersTable.$inferSelect;
