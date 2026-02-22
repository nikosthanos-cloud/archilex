import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import { storage } from "./storage";
import { askClaude, analyzeBlueprintImage, analyzeBlueprintPDF, generatePermitChecklist } from "./anthropic";
import { insertUserSchema, loginSchema, insertQuestionSchema, insertProjectSchema, insertProjectNoteSchema } from "@shared/schema";
import { ZodError, z } from "zod";
import { Pool } from "pg";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const FREE_MONTHLY_LIMIT = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Μη αποδεκτός τύπος αρχείου"));
  },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({ pool }),
      secret: process.env.SESSION_SECRET || "archivault-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: false },
    })
  );

  function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.session.userId) return res.status(401).json({ error: "Δεν είστε συνδεδεμένοι" });
    next();
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ error: "Το email χρησιμοποιείται ήδη" });
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την εγγραφή" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
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
    if (!req.session.userId) return res.status(401).json({ error: "Δεν είστε συνδεδεμένοι" });
    const user = await storage.getUser(req.session.userId);
    if (!user) { req.session.destroy(() => {}); return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" }); }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // ── AI Questions ──────────────────────────────────────────────────────
  app.post("/api/questions/ask", requireAuth, async (req, res) => {
    try {
      const { question } = insertQuestionSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" });

      const now = new Date();
      const lastReset = new Date(user.lastResetDate);
      const sameMonth = now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear();
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
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την επεξεργασία της ερώτησης" });
    }
  });

  app.get("/api/questions/history", requireAuth, async (req, res) => {
    const userQuestions = await storage.getUserQuestions(req.session.userId!);
    res.json({ questions: userQuestions });
  });

  // ── Blueprint Analysis ────────────────────────────────────────────────
  app.post("/api/uploads/analyze", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Δεν βρέθηκε αρχείο" });

      const { buffer, mimetype, originalname } = req.file;
      const base64Data = buffer.toString("base64");

      let analysis: string;
      if (mimetype === "application/pdf") {
        analysis = await analyzeBlueprintPDF(base64Data, originalname);
      } else {
        const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
        type ImageMediaType = typeof allowedImageTypes[number];
        if (!allowedImageTypes.includes(mimetype as ImageMediaType)) {
          return res.status(400).json({ error: "Μη υποστηριζόμενος τύπος αρχείου" });
        }
        analysis = await analyzeBlueprintImage(base64Data, mimetype as ImageMediaType, originalname);
      }

      const saved = await storage.createUpload(req.session.userId!, originalname, mimetype, analysis);
      res.json({ upload: saved });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Σφάλμα κατά την ανάλυση αρχείου" });
    }
  });

  app.get("/api/uploads/history", requireAuth, async (req, res) => {
    const userUploads = await storage.getUserUploads(req.session.userId!);
    res.json({ uploads: userUploads });
  });

  // ── Permit Checklist ──────────────────────────────────────────────────
  const checklistSchema = z.object({
    projectType: z.string().min(1),
    location: z.string().min(1),
    area: z.string().min(1),
    floors: z.string().min(1),
    useType: z.string().min(1),
    isNew: z.boolean(),
    hasBasement: z.boolean(),
    nearAntiquities: z.boolean(),
    nearSea: z.boolean(),
    isTraditionalSettlement: z.boolean(),
  });

  app.post("/api/permits/checklist", requireAuth, async (req, res) => {
    try {
      const data = checklistSchema.parse(req.body);
      const checklist = await generatePermitChecklist(data);
      res.json({ checklist });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά τη δημιουργία λίστας" });
    }
  });

  // ── Projects ──────────────────────────────────────────────────────────
  app.get("/api/projects", requireAuth, async (req, res) => {
    const userProjects = await storage.getUserProjects(req.session.userId!);
    res.json({ projects: userProjects });
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(req.session.userId!, data);
      res.json({ project });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: "Σφάλμα κατά τη δημιουργία έργου" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const project = await storage.getProject(id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Το έργο δεν βρέθηκε" });
      const data = insertProjectSchema.partial().parse(req.body);
      const updated = await storage.updateProject(id, req.session.userId!, data);
      res.json({ project: updated });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: "Σφάλμα κατά την ενημέρωση έργου" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const project = await storage.getProject(id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Το έργο δεν βρέθηκε" });
      await storage.deleteProject(id, req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά τη διαγραφή έργου" });
    }
  });

  app.get("/api/projects/:id/notes", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const project = await storage.getProject(id, req.session.userId!);
    if (!project) return res.status(404).json({ error: "Το έργο δεν βρέθηκε" });
    const notes = await storage.getProjectNotes(id, req.session.userId!);
    res.json({ notes });
  });

  app.post("/api/projects/:id/notes", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const project = await storage.getProject(id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Το έργο δεν βρέθηκε" });
      const { content } = insertProjectNoteSchema.parse(req.body);
      const note = await storage.addProjectNote(id, req.session.userId!, content);
      res.json({ note });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: "Σφάλμα κατά την προσθήκη σημείωσης" });
    }
  });

  app.delete("/api/projects/:id/notes/:noteId", requireAuth, async (req, res) => {
    try {
      await storage.deleteProjectNote(String(req.params.noteId), req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά τη διαγραφή σημείωσης" });
    }
  });

  // ── Subscription ──────────────────────────────────────────────────────
  app.post("/api/subscription/upgrade", requireAuth, async (req, res) => {
    const user = await storage.updateUserPlan(req.session.userId!, "pro");
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  return httpServer;
}
