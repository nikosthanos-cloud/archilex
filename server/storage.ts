import { db } from "./db";
import { users, questions, uploads, type User, type InsertUser, type Question, type Upload } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string }): Promise<User>;
  updateUserPlan(id: string, plan: string): Promise<User>;
  incrementQuestionCount(id: string): Promise<User>;
  resetMonthlyQuestions(id: string): Promise<User>;
  createQuestion(userId: string, question: string, answer: string): Promise<Question>;
  getUserQuestions(userId: string): Promise<Question[]>;
  createUpload(userId: string, filename: string, fileType: string, analysis: string): Promise<Upload>;
  getUserUploads(userId: string): Promise<Upload[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser & { password: string }): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPlan(id: string, plan: string): Promise<User> {
    const result = await db.update(users).set({ plan }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async incrementQuestionCount(id: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const sameMonth = now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear();

    if (!sameMonth) {
      const result = await db.update(users)
        .set({ questionsUsedThisMonth: 1, lastResetDate: now })
        .where(eq(users.id, id))
        .returning();
      return result[0];
    }

    const result = await db.update(users)
      .set({ questionsUsedThisMonth: user.questionsUsedThisMonth + 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async resetMonthlyQuestions(id: string): Promise<User> {
    const result = await db.update(users)
      .set({ questionsUsedThisMonth: 0, lastResetDate: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async createQuestion(userId: string, question: string, answer: string): Promise<Question> {
    const result = await db.insert(questions).values({ userId, question, answer }).returning();
    return result[0];
  }

  async getUserQuestions(userId: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.userId, userId)).orderBy(desc(questions.createdAt));
  }

  async createUpload(userId: string, filename: string, fileType: string, analysis: string): Promise<Upload> {
    const result = await db.insert(uploads).values({ userId, filename, fileType, analysis }).returning();
    return result[0];
  }

  async getUserUploads(userId: string): Promise<Upload[]> {
    return await db.select().from(uploads).where(eq(uploads.userId, userId)).orderBy(desc(uploads.createdAt));
  }
}

export const storage = new DatabaseStorage();
