# ArchiLex — AI Βοηθός για Ελληνικές Οικοδομικές Άδειες

## Overview

ArchiLex is a full-stack web application for Greek architects and engineers. It provides AI-powered tools for building permit management, construction law Q&A, blueprint analysis, project tracking, technical report generation, and cost calculations — entirely in Greek.

## Features

- **User Registration/Login** — Secure auth with bcryptjs + PostgreSQL sessions
- **Free & Pro Plans** — Free users get 10 AI uses/month across ALL tools; Pro users get unlimited
- **AI Assistant** — Powered by Anthropic Claude (claude-opus-4-5), specialized in Greek building permits (Ν. 4495/2017, ΓΟΚ, ΝΟΚ, ΚΕΝΑΚ, αντισεισμικός κανονισμός, αυθαίρετα)
- **Blueprint Analysis** — Upload JPG/PNG/PDF architectural drawings; Claude Vision analyses them and returns a structured Greek report
- **Permit Checklist Generator** — Generates a customized document checklist for building permits based on project parameters; Export to PDF
- **Construction Cost Estimator** — Calculates construction costs using Greek market data (2024-2025) with PDF export; usage tracked
- **TEE Fee Calculator (Αμοιβές ΤΕΕ)** — Calculates minimum engineer fees per ΠΔ 696/1974 across all study types (architectural, static, H/M, energy) with VAT and PDF export; usage tracked
- **Technical Reports (Τεχνικές Εκθέσεις)** — AI-generated professional technical reports (Architectural Description, Static Study Summary, Energy Inspection, Unauthorized Construction Assessment) with PDF and Word export
- **Project Tracker (Έργα)** — Full project management for building permit tracking: create projects, advance through 5 permit stages, add per-project notes, set deadline reminders, colored status badges
- **Question History** — Full history of all past AI questions and answers
- **Profile Settings (Προφίλ)** — Users can edit their personal info (first/last name, email, phone, office address, TEE registration number, specialty); saved values auto-fill engineer fields in Technical Reports and TEE Calculator PDF
- **Admin Dashboard** — Role-based admin panel at `/admin` (requires `role = "admin"` in DB). Shows: KPI summary cards (total users, active subscriptions, inactive users 7d, new signups 7d), full user table with subscription status and last login, Chart.js analytics (daily logins 30d bar chart, weekly signups 12w line chart, plan distribution, activity stats). Accessible via "Admin Panel" button visible only to admin users in the sidebar.
- **Greek Language** — Full app UI and all responses in Greek

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **PDF Export**: jsPDF + html2canvas
- **Word Export**: docx package (for Technical Reports)
- **Routing**: wouter

## Project Structure

```
client/src/
  pages/
    Landing.tsx              — Public landing page (Greek)
    Login.tsx                — Login form
    Register.tsx             — Registration form with profession selection
    Dashboard.tsx            — Main app shell with sidebar navigation + unified usage counter
    BlueprintAnalysis.tsx    — Blueprint/floor plan upload + Claude Vision analysis
    PermitChecklist.tsx      — AI permit checklist generator + PDF export
    CostEstimator.tsx        — Construction cost estimator + usage tracking
    TeeCalculator.tsx        — TEE engineer fee calculator + PDF export + usage tracking
    TechnicalReports.tsx     — AI technical report generator + PDF/Word export
    Projects.tsx             — Project tracker with stages, notes, deadlines
  lib/
    auth.tsx                 — Auth context/hooks (includes refreshUser)
    queryClient.ts           — TanStack Query setup
server/
  index.ts                   — Express entry point
  routes.ts                  — All API routes with checkAndIncrementUsage helper
  storage.ts                 — Database storage layer (IStorage + DatabaseStorage)
  db.ts                      — Drizzle ORM connection
  anthropic.ts               — Claude AI integration
shared/
  schema.ts                  — Drizzle schema + Zod validation types
```

## Database Tables

- `users` — User accounts with plan and usage quota (`questions_used_this_month` DB column, `usesThisMonth` TS property)
- `questions` — AI question/answer history per user
- `uploads` — Blueprint upload + analysis history per user
- `projects` — Building permit projects (name, client, address, type, status, deadline)
- `project_notes` — Notes attached to projects

## Environment Variables / Secrets

- `ANTHROPIC_API_KEY` — Required for AI responses
- `DATABASE_URL` — PostgreSQL connection string (auto-set)
- `SESSION_SECRET` — Session signing key

## API Endpoints

- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user (returns `usesThisMonth` field)
- `POST /api/questions/ask` — Ask AI question (auth required, checks 10 uses/month limit)
- `GET /api/questions/history` — Get user's question history
- `POST /api/uploads/analyze` — Upload blueprint for analysis (checks limit)
- `GET /api/uploads/history` — Get upload history
- `POST /api/permits/checklist` — Generate permit checklist (AI, checks limit)
- `POST /api/reports/generate` — Generate technical report (AI, checks limit)
- `POST /api/usage/increment` — Increment usage count for client-side tools (TEE, Cost Estimator)
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `PATCH /api/projects/:id` — Update project (status, deadline, etc.)
- `DELETE /api/projects/:id` — Delete project
- `GET /api/projects/:id/notes` — Get project notes
- `POST /api/projects/:id/notes` — Add note to project
- `DELETE /api/projects/:id/notes/:noteId` — Delete note
- `POST /api/subscription/upgrade` — Upgrade to Pro plan

## Business Logic

- **Unified usage limit**: Free plan = 10 uses/month across ALL tools (AI Chat, Blueprint Analysis, Permit Checklist, TEE Calculator, Cost Estimator, Technical Reports). Pro plan = unlimited.
- Usage counter displayed in sidebar with color-coded progress bar (green < 60%, amber < 80%, red ≥ 80%)
- Storage method: `incrementUsageCount` (renamed from `incrementQuestionCount`), `resetMonthlyUsage`
- DB column `questions_used_this_month` unchanged; TypeScript property name is `usesThisMonth`
- Server-side tools (AI chat, blueprint, checklist, reports) call `checkAndIncrementUsage` before processing
- Client-side tools (TEE calculator, cost estimator) call `/api/usage/increment` after calculation
- Claude is instructed to answer only questions about Greek building permits, construction law, and related technical regulations
- Project status stages: Προετοιμασία → Υποβολή → Σε εξέλιξη → Εγκρίθηκε → Ολοκληρώθηκε
- Technical report types: Αρχιτεκτονική Έκθεση, Σύνοψη Στατικής Μελέτης, Ενεργειακή Επιθεώρηση, Αυθαίρετα
