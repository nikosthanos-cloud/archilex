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
  usesThisMonth: integer("questions_used_this_month").notNull().default(0),
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

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  analysis: text("analysis").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  address: text("address").notNull(),
  projectType: text("project_type").notNull(),
  startDate: text("start_date").notNull(),
  deadline: text("deadline"),
  status: text("status").notNull().default("Προετοιμασία"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const projectNotes = pgTable("project_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  question: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true, userId: true, createdAt: true,
}).extend({
  name: z.string().min(2, "Εισάγετε όνομα έργου"),
  clientName: z.string().min(2, "Εισάγετε όνομα πελάτη"),
  address: z.string().min(3, "Εισάγετε διεύθυνση"),
  projectType: z.string().min(1, "Επιλέξτε τύπο έργου"),
  startDate: z.string().min(1, "Εισάγετε ημερομηνία έναρξης"),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

export const insertProjectNoteSchema = z.object({
  content: z.string().min(1, "Εισάγετε σημείωση"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Upload = typeof uploads.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectNote = typeof projectNotes.$inferSelect;
