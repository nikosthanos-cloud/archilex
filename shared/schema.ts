import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  profession: text("profession").notNull().default("architect"),
  plan: text("plan").notNull().default("free"),
  questionsUsedThisMonth: integer("questions_used_this_month").notNull().default(0),
  lastResetDate: timestamp("last_reset_date").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  fullName: true,
  profession: true,
}).extend({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες"),
  fullName: z.string().min(2, "Εισάγετε το ονοματεπώνυμό σας"),
  profession: z.enum(["architect", "civil_engineer", "mechanical_engineer", "electrical_engineer", "other"]),
});

export const loginSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(1, "Εισάγετε τον κωδικό σας"),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  question: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
