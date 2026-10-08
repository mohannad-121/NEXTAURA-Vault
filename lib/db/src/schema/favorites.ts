import { pgTable, text, uuid, primaryKey } from "drizzle-orm/pg-core";
import { foundersTable } from "./founders";
import { credentialsTable } from "./credentials";
import { createInsertSchema } from "drizzle-zod";
export const favoritesTable = pgTable("vault_favorites", {
  founderId: text("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  credentialId: uuid("credential_id").notNull().references(() => credentialsTable.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.founderId, table.credentialId] })]);
export const insertFavoriteSchema = createInsertSchema(favoritesTable);
