import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const foundersTable = pgTable("vault_founders", {
  id: text("id").primaryKey(),
  founder: text("founder").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  allowedDivisions: text("allowed_divisions").array().notNull().default(["agency", "ai", "studios", "os"]),
  introSeen: boolean("intro_seen").notNull().default(false),
  defaultDivision: text("default_division").notNull().default("agency"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertFounderSchema = createInsertSchema(foundersTable);
export type Founder = typeof foundersTable.$inferSelect;
