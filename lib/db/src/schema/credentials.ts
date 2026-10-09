import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, check, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { foundersTable } from "./founders";
export const credentialsTable = pgTable("vault_credentials", {
  id: uuid("id").primaryKey(),
  division: text("division").notNull(),
  platform: text("platform").notNull(),
  accountName: text("account_name").notNull(),
  username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  createdBy: uuid("created_by").notNull().references(() => foundersTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("vault_credentials_division_check", sql`${table.division} in ('agency', 'ai', 'studios', 'os')`),
  index("vault_credentials_division_updated_at_idx").on(table.division, table.updatedAt),
  index("vault_credentials_created_by_idx").on(table.createdBy),
]).enableRLS();
export const insertCredentialSchema = createInsertSchema(credentialsTable);
export type StoredCredential = typeof credentialsTable.$inferSelect;
