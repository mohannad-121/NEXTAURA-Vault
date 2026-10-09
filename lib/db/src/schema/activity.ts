import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, check, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { foundersTable } from "./founders";
export const activityTable = pgTable("vault_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").notNull().references(() => foundersTable.id, { onDelete: "restrict" }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  division: text("division").notNull().default(""),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("vault_activity_division_check", sql`${table.division} in ('', 'agency', 'ai', 'studios', 'os')`),
  index("vault_activity_division_created_at_idx").on(table.division, table.createdAt),
  index("vault_activity_actor_created_at_idx").on(table.actorId, table.createdAt),
]).enableRLS();
export const insertActivitySchema = createInsertSchema(activityTable);
