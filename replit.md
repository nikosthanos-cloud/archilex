# ArchiLex — AI Βοηθός για Ελληνικές Οικοδομικές Άδειες

## Overview

ArchiLex is a full-stack web application for Greek architects and engineers. It provides AI-powered tools for building permit management, construction law Q&A, blueprint analysis, and project tracking — entirely in Greek.

## Features

- **User Registration/Login** — Secure auth with bcryptjs + PostgreSQL sessions
- **Free & Pro Plans** — Free users get 5 AI questions/month; Pro users get unlimited
- **AI Assistant** — Powered by Anthropic Claude (claude-opus-4-5), specialized in Greek building permits (Ν. 4495/2017, ΓΟΚ, ΝΟΚ, ΚΕΝΑΚ, αντισεισμικός κανονισμός, αυθαίρετα)
- **Blueprint Analysis** — Upload JPG/PNG/PDF architectural drawings; Claude Vision analyses them and returns a structured Greek report
- **Permit Checklist Generator** — Generates a customized document checklist for building permits based on project parameters; Export to PDF
- **Construction Cost Estimator** — Calculates construction costs using Greek market data (2024-2025) with PDF export
- **TEE Fee Calculator (Αμοιβές ΤΕΕ)** — Calculates minimum engineer fees per ΠΔ 696/1974 across all study types (architectural, static, H/M, energy) with VAT and PDF export
- **Project Tracker (Έργα)** — Full project management for building permit tracking: create projects, advance through 5 permit stages, add per-project notes, set deadline reminders, colored status badges
- **Question History** — Full history of all past AI questions and answers
- **Greek Language** — Full app UI and all responses in Greek

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **PDF Export**: jsPDF + html2canvas
- **Routing**: wouter

## Project Structure

```
client/src/
  pages/
    Landing.tsx           — Public landing page (Greek)
    Login.tsx             — Login form
    Register.tsx          — Registration form with profession selection
    Dashboard.tsx         — Main app shell with sidebar navigation
    BlueprintAnalysis.tsx — Blueprint/floor plan upload + Claude Vision analysis
    PermitChecklist.tsx   — AI permit checklist generator + PDF export
    CostEstimator.tsx     — Construction cost estimator
    TeeCalculator.tsx     — TEE engineer fee calculator + PDF export
    Projects.tsx          — Project tracker with stages, notes, deadlines
  lib/
    auth.tsx              — Auth context/hooks
    queryClient.ts        — TanStack Query setup
server/
  index.ts                — Express entry point
  routes.ts               — All API routes
  storage.ts              — Database storage layer (IStorage + DatabaseStorage)
  db.ts                   — Drizzle ORM connection
  anthropic.ts            — Claude AI integration
shared/
  schema.ts               — Drizzle schema + Zod validation types
```

## Database Tables

- `users` — User accounts with plan and question quota
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
- `GET /api/auth/me` — Get current user
- `POST /api/questions/ask` — Ask AI question (auth required, rate-limited for free)
- `GET /api/questions/history` — Get user's question history
- `POST /api/uploads/analyze` — Upload blueprint for analysis
- `GET /api/uploads/history` — Get upload history
- `POST /api/permits/checklist` — Generate permit checklist (AI)
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `PATCH /api/projects/:id` — Update project (status, deadline, etc.)
- `DELETE /api/projects/:id` — Delete project
- `GET /api/projects/:id/notes` — Get project notes
- `POST /api/projects/:id/notes` — Add note to project
- `DELETE /api/projects/:id/notes/:noteId` — Delete note
- `POST /api/subscription/upgrade` — Upgrade to Pro plan

## Business Logic

- Free plan: 5 questions/month, resets on new calendar month
- Pro plan: unlimited questions
- Claude is instructed to answer only questions about Greek building permits, construction law, and related technical regulations
- Project status stages: Προετοιμασία → Υποβολή → Σε εξέλιξη → Εγκρίθηκε → Ολοκληρώθηκε
- Status badge colors: green=Ολοκληρώθηκε, red=Καθυστέρηση (past deadline), yellow=Σε εξέλιξη
