import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { askClaude } from "./anthropic";
import { insertUserSchema, loginSchema, insertQuestionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { Pool } from "pg";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const FREE_MONTHLY_LIMIT = 5;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({ pool }),
      secret: process.env.SESSION_SECRET || "archivault-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
      },
    })
  );

  function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Δεν είστε συνδεδεμένοι" });
    }
    next();
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Το email χρησιμοποιείται ήδη" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την εγγραφή" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      }
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      }
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      res.status(500).json({ error: "Σφάλμα κατά τη σύνδεση" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Σφάλμα αποσύνδεσης" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Δεν είστε συνδεδεμένοι" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" });
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  app.post("/api/questions/ask", requireAuth, async (req, res) => {
    try {
      const { question } = insertQuestionSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" });

      const now = new Date();
      const lastReset = new Date(user.lastResetDate);
      const sameMonth =
        now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear();

      const currentCount = sameMonth ? user.questionsUsedThisMonth : 0;

      if (user.plan === "free" && currentCount >= FREE_MONTHLY_LIMIT) {
        return res.status(403).json({
          error: "Έχετε εξαντλήσει το μηνιαίο όριο των 5 ερωτήσεων. Αναβαθμίστε σε Pro για απεριόριστες ερωτήσεις.",
          limitReached: true,
        });
      }

      const answer = await askClaude(question);
      await storage.incrementQuestionCount(user.id);
      const saved = await storage.createQuestion(user.id, question, answer);

      res.json({ question: saved });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την επεξεργασία της ερώτησης" });
    }
  });

  app.get("/api/questions/history", requireAuth, async (req, res) => {
    const userQuestions = await storage.getUserQuestions(req.session.userId!);
    res.json({ questions: userQuestions });
  });

  app.post("/api/subscription/upgrade", requireAuth, async (req, res) => {
    const user = await storage.updateUserPlan(req.session.userId!, "pro");
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  return httpServer;
}
