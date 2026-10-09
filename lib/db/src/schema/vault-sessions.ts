import { pgTable, uuid, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { foundersTable } from "./founders";
export const vaultSessionsTable = pgTable("vault_sessions", {
  id: uuid("id").primaryKey(),
  founderId: uuid("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  revoked: boolean("revoked").notNull().default(false),
  lastActivity: timestamp("last_activity", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("vault_sessions_founder_id_idx").on(table.founderId),
]).enableRLS();
export const insertVaultSessionSchema = createInsertSchema(vaultSessionsTable);
