import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import { storage } from "./storage";
import { askClaude, analyzeBlueprintImage, analyzeBlueprintPDF, generatePermitChecklist, generateTechnicalReport } from "./anthropic";
import { insertUserSchema, loginSchema, insertQuestionSchema, insertProjectSchema, insertProjectNoteSchema, updateProfileSchema } from "@shared/schema";
import { ZodError, z } from "zod";
import { Pool } from "pg";
import crypto from "crypto";
import { sendEmail, emailTemplates } from "./email";
import { stripe, createCheckoutSession, cancelSubscription } from "./stripe";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const PLAN_LIMITS: Record<string, number | null> = {
  free: 10,
  starter: 50,
  professional: 200,
  unlimited: null,
  pro: null,
};

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

  async function checkAndIncrementUsage(userId: string, res: Response): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) { res.status(401).json({ error: "Χρήστης δεν βρέθηκε" }); return false; }
    const limit = PLAN_LIMITS[user.plan] ?? null;
    if (limit === null) {
      await storage.incrementUsageCount(userId);
      return true;
    }
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const sameMonth = now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear();
    const currentCount = sameMonth ? user.usesThisMonth : 0;

    if (currentCount >= limit) {
      const planNames: Record<string, string> = { free: "Δωρεάν", starter: "Starter", professional: "Professional" };
      res.status(403).json({
        error: `Έχετε εξαντλήσει το μηνιαίο όριο των ${limit} χρήσεων (πλάνο ${planNames[user.plan] || user.plan}). Αναβαθμίστε για περισσότερες χρήσεις.`,
        limitReached: true,
      });
      // Send 100% notification if not already sent this month? 
      // Simplified: just send it once when they hit it.
      if (currentCount === limit) {
        sendEmail({
          to: user.email,
          ...emailTemplates.usageLimitReached(limit)
        }).catch(console.error);
      }
      return false;
    }

    const updatedUser = await storage.incrementUsageCount(userId);

    // Check for 80% threshold
    if (limit && updatedUser.usesThisMonth === Math.floor(limit * 0.8)) {
      sendEmail({
        to: user.email,
        ...emailTemplates.usageWarning80(updatedUser.usesThisMonth, limit)
      }).catch(console.error);
    }

    return true;
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ error: "Το email χρησιμοποιείται ήδη" });
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        emailVerificationToken: verificationToken
      });

      // Send verification email
      sendEmail({
        to: user.email,
        ...emailTemplates.verification(verificationToken)
      }).catch(console.error);

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την εγγραφή" });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: "Λείπει το token επαλήθευσης" });

    const user = await storage.verifyEmail(token);
    if (!user) return res.status(400).json({ error: "Μη έγκυρο ή ληγμένο token" });

    res.json({ success: true, message: "Το email επαληθεύτηκε με επιτυχία" });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user) return res.json({ success: true }); // Silent for security

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await storage.createPasswordResetToken(user.id, token, expiresAt);

    sendEmail({
      to: user.email,
      ...emailTemplates.passwordReset(token)
    }).catch(console.error);

    res.json({ success: true });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Λείπουν στοιχεία" });

    const tokenData = await storage.getPasswordResetToken(token);
    if (!tokenData || tokenData.used || new Date(tokenData.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Το token είναι άκυρο ή έχει λήξει" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await storage.updatePassword(tokenData.userId, hashedPassword);
    await storage.usePasswordResetToken(tokenData.id);

    res.json({ success: true, message: "Ο κωδικός ενημερώθηκε" });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) return res.status(401).json({ error: "Λάθος email ή κωδικός" });
      req.session.userId = user.id;
      await storage.updateLastLogin(user.id);
      const updatedUser = await storage.getUser(user.id);
      const { password: _, ...safeUser } = updatedUser!;
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
    if (!user) { req.session.destroy(() => { }); return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" }); }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // ── Profile ───────────────────────────────────────────────────────────
  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing && existing.id !== req.session.userId) {
        return res.status(400).json({ error: "Το email χρησιμοποιείται ήδη από άλλο λογαριασμό" });
      }
      const user = await storage.updateUserProfile(req.session.userId!, data);
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά την ενημέρωση του προφίλ" });
    }
  });

  // ── AI Questions ──────────────────────────────────────────────────────
  app.post("/api/questions/ask", requireAuth, async (req, res) => {
    try {
      const { question } = insertQuestionSchema.parse(req.body);
      const canProceed = await checkAndIncrementUsage(req.session.userId!, res);
      if (!canProceed) return;
      const answer = await askClaude(question);
      const saved = await storage.createQuestion(req.session.userId!, question, answer);
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

  // ── Usage increment for client-side tools (TEE, Cost Estimator) ──────
  app.post("/api/usage/increment", requireAuth, async (req, res) => {
    try {
      const canProceed = await checkAndIncrementUsage(req.session.userId!, res);
      if (!canProceed) return;
      const user = await storage.getUser(req.session.userId!);
      res.json({ ok: true, usesThisMonth: user?.usesThisMonth ?? 0 });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα" });
    }
  });

  // ── Blueprint Analysis ────────────────────────────────────────────────
  app.post("/api/uploads/analyze", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Δεν βρέθηκε αρχείο" });
      const canProceed = await checkAndIncrementUsage(req.session.userId!, res);
      if (!canProceed) return;

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
      const canProceed = await checkAndIncrementUsage(req.session.userId!, res);
      if (!canProceed) return;
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

  // ── Technical Reports ──────────────────────────────────────────────────
  app.post("/api/reports/generate", requireAuth, async (req, res) => {
    try {
      const canProceed = await checkAndIncrementUsage(req.session.userId!, res);
      if (!canProceed) return;
      const schema = z.object({
        reportType: z.string().min(1),
        address: z.string().min(1),
        area: z.string().min(1),
        floors: z.string().min(1),
        constructionYear: z.string().min(1),
        ownerName: z.string().min(1),
        engineerName: z.string().min(1),
        engineerSpecialty: z.string().min(1),
        teeNumber: z.string().min(1),
        specialNotes: z.string().default(""),
        reportDate: z.string().min(1),
      });
      const params = schema.parse(req.body);
      const report = await generateTechnicalReport(params);
      res.json({ report });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: "Σφάλμα κατά τη δημιουργία της έκθεσης" });
    }
  });

  // ── Admin ─────────────────────────────────────────────────────────────
  async function requireAdmin(req: Request, res: Response, next: Function) {
    if (!req.session.userId) return res.status(401).json({ error: "Δεν είστε συνδεδεμένοι" });
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Δεν έχετε δικαίωμα πρόσβασης" });
    next();
  }

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά τη φόρτωση στατιστικών" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json({ users: safeUsers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Σφάλμα κατά τη φόρτωση χρηστών" });
    }
  });

  app.patch("/api/admin/users/:id/plan", requireAdmin, async (req, res) => {
    try {
      const { plan } = req.body;
      const userId = String(req.params.id);
      const updated = await storage.updateUserPlan(userId, plan);
      const { password: _, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά την αλλαγή πλάνου" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = String(req.params.id);
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά τη διαγραφή χρήστη" });
    }
  });

  app.get("/api/admin/users/:id/questions", requireAdmin, async (req, res) => {
    try {
      const userId = String(req.params.id);
      const questions = await storage.getUserQuestions(userId);
      res.json({ questions });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά τη φόρτωση ιστορικού" });
    }
  });

  app.get("/api/admin/payments", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json({ payments });
    } catch (err) {
      res.status(500).json({ error: "Σφάλμα κατά τη φόρτωση πληρωμών" });
    }
  });

  // ── Subscription ──────────────────────────────────────────────────────
  app.post("/api/subscription/create-checkout", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Χρήστης δεν βρέθηκε" });

      const session = await createCheckoutSession(user.id, user.email, plan);
      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/subscription/cancel", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.stripeSubscriptionId) return res.status(400).json({ error: "Δεν βρέθηκε ενεργή συνδρομή" });

      await cancelSubscription(user.stripeSubscriptionId);
      await storage.updateUserPlan(user.id, "free");
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stripe Webhook (Raw body required)
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      const plan = session.metadata.plan;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const amount = session.amount_total;

      if (userId && plan) {
        await storage.updateUserSubscription(userId, customerId, subscriptionId, plan);

        // Save payment to DB
        await storage.createPayment({
          userId,
          stripePaymentId: session.payment_intent || session.id,
          plan,
          amount: amount || 0,
          status: "completed"
        });

        const user = await storage.getUser(userId);
        if (user) {
          sendEmail({
            to: user.email,
            ...emailTemplates.upgradeSuccess(plan)
          }).catch(console.error);
        }
      }
    }

    res.json({ received: true });
  });

  // Helper for periodic tasks (can be triggered by a CRON or simple endpoint)
  app.post("/api/system/check-reminders", async (req, res) => {
    // Check project deadlines (3 days away)
    const allProjects = await storage.getAllProjects();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    for (const project of allProjects) {
      if (project.deadline) {
        const deadline = new Date(project.deadline);
        // Simple check for within 3 days and not already past
        if (deadline > now && deadline <= threeDaysFromNow) {
          const user = await storage.getUser(project.userId);
          if (user) {
            sendEmail({
              to: user.email,
              ...emailTemplates.deadlineReminder(project.name, 3)
            }).catch(console.error);
          }
        }
      }
    }
    res.json({ ok: true });
  });

  return httpServer;
}
