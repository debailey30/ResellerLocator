import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  binLocation: text("bin_location").notNull(),
  brand: text("brand"),
  size: text("size"),
  color: text("color"),
  category: text("category"),
  condition: text("condition"),
  price: decimal("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: text("status").default("active").notNull(), // active, sold
  soldDate: timestamp("sold_date"),
  soldPrice: decimal("sold_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  soldDate: true,
  soldPrice: true,
});

export const updateItemSchema = insertItemSchema.partial();

// Schema for marking items as sold
export const markSoldSchema = z.object({
  soldPrice: z.string().optional(),
  soldDate: z.string().optional(),
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type MarkSoldData = z.infer<typeof markSoldSchema>;
export type Item = typeof items.$inferSelect;
