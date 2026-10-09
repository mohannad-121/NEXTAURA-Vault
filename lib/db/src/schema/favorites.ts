import { pgTable, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { foundersTable } from "./founders";
import { credentialsTable } from "./credentials";
import { createInsertSchema } from "drizzle-zod";
export const favoritesTable = pgTable("vault_favorites", {
  founderId: uuid("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  credentialId: uuid("credential_id").notNull().references(() => credentialsTable.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.founderId, table.credentialId] }),
  index("vault_favorites_credential_id_idx").on(table.credentialId),
]).enableRLS();
export const insertFavoriteSchema = createInsertSchema(favoritesTable);
