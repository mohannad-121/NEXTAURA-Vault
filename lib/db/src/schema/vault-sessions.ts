import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const vaultSessionsTable = pgTable("vault_sessions", {
  id: text("id").primaryKey(),
  founderId: text("founder_id").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  lastActivity: timestamp("last_activity", { withTimezone: true }).notNull().defaultNow(),
});
export const insertVaultSessionSchema = createInsertSchema(vaultSessionsTable);
