import { db } from "./db";
import {
  users, questions, uploads, projects, projectNotes, passwordResetTokens, payments,
  type User, type InsertUser, type UpdateProfile, type Question, type Upload,
  type Project, type InsertProject, type ProjectNote, type PasswordResetToken,
  type Payment,
} from "@shared/schema";
import { eq, desc, gte, lt, count, sum } from "drizzle-orm";

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  inactiveUsers: number;
  recentSignups: number;
  monthlyRevenue: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string, emailVerificationToken?: string }): Promise<User>;
  updateUserPlan(id: string, plan: string, stripeSubscriptionId?: string): Promise<User>;
  updateUserSubscription(id: string, stripeCustomerId: string, stripeSubscriptionId: string, plan: string): Promise<User>;
  updateUserProfile(id: string, data: UpdateProfile): Promise<User>;
  updateLastLogin(id: string): Promise<void>;
  updatePassword(id: string, passwordHashed: string): Promise<void>;
  verifyEmail(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  getAdminStats(): Promise<AdminStats>;
  incrementUsageCount(id: string): Promise<User>;
  resetMonthlyUsage(id: string): Promise<User>;
  createQuestion(userId: string, question: string, answer: string): Promise<Question>;
  getUserQuestions(userId: string): Promise<Question[]>;
  createPayment(data: { userId: string; stripePaymentId: string; plan: string; amount: number; status: string }): Promise<Payment>;
  getAllPayments(): Promise<Payment[]>;
  createUpload(userId: string, filename: string, fileType: string, analysis: string): Promise<Upload>;
  getUserUploads(userId: string): Promise<Upload[]>;
  createProject(userId: string, data: InsertProject): Promise<Project>;
  getAllProjects(): Promise<Project[]>;
  getUserProjects(userId: string): Promise<Project[]>;
  getProject(id: string, userId: string): Promise<Project | undefined>;
  updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string, userId: string): Promise<void>;
  getProjectNotes(projectId: string, userId: string): Promise<ProjectNote[]>;
  addProjectNote(projectId: string, userId: string, content: string): Promise<ProjectNote>;
  deleteProjectNote(noteId: string, userId: string): Promise<void>;
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  usePasswordResetToken(tokenId: string): Promise<void>;
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

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser & { password: string, emailVerificationToken?: string }): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPlan(id: string, plan: string, stripeSubscriptionId?: string): Promise<User> {
    const updateData: any = { plan };
    if (stripeSubscriptionId) updateData.stripeSubscriptionId = stripeSubscriptionId;
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUserSubscription(id: string, stripeCustomerId: string, stripeSubscriptionId: string, plan: string): Promise<User> {
    const result = await db.update(users)
      .set({ stripeCustomerId, stripeSubscriptionId, plan })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserProfile(id: string, data: UpdateProfile): Promise<User> {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const result = await db.update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        email: data.email,
        phone: data.phone || null,
        officeAddress: data.officeAddress || null,
        teeNumber: data.teeNumber || null,
        specialty: data.specialty || null,
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async updatePassword(id: string, passwordHashed: string): Promise<void> {
    await db.update(users).set({ password: passwordHashed }).where(eq(users.id, id));
  }

  async verifyEmail(token: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ emailVerified: true, emailVerificationToken: null })
      .where(eq(users.emailVerificationToken, token))
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    await db.delete(projectNotes).where(eq(projectNotes.userId, id));
    await db.delete(projects).where(eq(projects.userId, id));
    await db.delete(uploads).where(eq(uploads.userId, id));
    await db.delete(questions).where(eq(questions.userId, id));
    await db.delete(payments).where(eq(payments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminStats(): Promise<AdminStats> {
    const allUsers = await db.select().from(users);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = allUsers.length;
    const activeSubscriptions = allUsers.filter(u => u.plan !== "free").length;
    const inactiveUsers = allUsers.filter(u => {
      if (u.lastLoginAt) return new Date(u.lastLoginAt) < sevenDaysAgo;
      return new Date(u.createdAt) < sevenDaysAgo;
    }).length;
    const recentSignups = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;

    // Calculate monthly revenue from payments
    const monthPayments = await db.select().from(payments)
      .where(gte(payments.createdAt, startOfMonth));
    const monthlyRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100; // Assuming cents

    return { totalUsers, activeSubscriptions, inactiveUsers, recentSignups, monthlyRevenue };
  }

  async incrementUsageCount(id: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const sameMonth = now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear();

    if (!sameMonth) {
      const result = await db.update(users)
        .set({ usesThisMonth: 1, lastResetDate: now })
        .where(eq(users.id, id))
        .returning();
      return result[0];
    }

    const result = await db.update(users)
      .set({ usesThisMonth: user.usesThisMonth + 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async resetMonthlyUsage(id: string): Promise<User> {
    const result = await db.update(users)
      .set({ usesThisMonth: 0, lastResetDate: new Date() })
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

  async createPayment(data: { userId: string; stripePaymentId: string; plan: string; amount: number; status: string }): Promise<Payment> {
    const result = await db.insert(payments).values(data).returning();
    return result[0];
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(50);
  }

  async createProject(userId: string, data: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values({ ...data, userId }).returning();
    return result[0];
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string, userId: string): Promise<Project | undefined> {
    const result = await db.select().from(projects)
      .where(eq(projects.id, id)).limit(1);
    if (!result[0] || result[0].userId !== userId) return undefined;
    return result[0];
  }

  async updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project> {
    const result = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    await db.delete(projectNotes).where(eq(projectNotes.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getProjectNotes(projectId: string, userId: string): Promise<ProjectNote[]> {
    return await db.select().from(projectNotes)
      .where(eq(projectNotes.projectId, projectId))
      .orderBy(desc(projectNotes.createdAt));
  }

  async addProjectNote(projectId: string, userId: string, content: string): Promise<ProjectNote> {
    const result = await db.insert(projectNotes).values({ projectId, userId, content }).returning();
    return result[0];
  }

  async deleteProjectNote(noteId: string, userId: string): Promise<void> {
    await db.delete(projectNotes).where(eq(projectNotes.id, noteId));
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return result[0];
  }

  async usePasswordResetToken(tokenId: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, tokenId));
  }
}

export const storage = new DatabaseStorage();
