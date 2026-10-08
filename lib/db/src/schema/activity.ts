import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const activityTable = pgTable("vault_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  division: text("division").notNull().default(""),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertActivitySchema = createInsertSchema(activityTable);
