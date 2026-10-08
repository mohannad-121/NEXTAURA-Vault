import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const credentialsTable = pgTable("vault_credentials", {
  id: uuid("id").primaryKey(),
  division: text("division").notNull(),
  platform: text("platform").notNull(),
  accountName: text("account_name").notNull(),
  username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertCredentialSchema = createInsertSchema(credentialsTable);
export type StoredCredential = typeof credentialsTable.$inferSelect;
