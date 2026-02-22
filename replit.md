# ArchiLex — AI Βοηθός για Ελληνικές Οικοδομικές Άδειες

## Overview

ArchiLex is a web application for Greek architects and engineers. It provides an AI-powered assistant (Claude) that answers questions about Greek building permits, construction law, and technical regulations — entirely in Greek.

## Features

- **User Registration/Login** — Secure auth with bcryptjs + PostgreSQL sessions
- **Free & Pro Plans** — Free users get 5 AI questions/month; Pro users get unlimited
- **AI Assistant** — Powered by Anthropic Claude (claude-opus-4-5), specialized in Greek building permits (Ν. 4495/2017, ΓΟΚ, ΝΟΚ, ΚΕΝΑΚ, αντισεισμικός κανονισμός, αυθαίρετα)
- **Chat Interface** — Conversational UI with example prompts
- **Question History** — Full history of all past questions and answers
- **Plan Upgrade** — One-click plan upgrade
- **Greek Language** — Full app UI and AI responses in Greek

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Routing**: wouter

## Project Structure

```
client/src/
  pages/
    Landing.tsx       — Public landing page (Greek)
    Login.tsx         — Login form
    Register.tsx      — Registration form with profession selection
    Dashboard.tsx     — Main app (AI chat + history sidebar)
  lib/
    auth.tsx          — Auth context/hooks
    queryClient.ts    — TanStack Query setup
server/
  index.ts            — Express entry point
  routes.ts           — All API routes
  storage.ts          — Database storage layer
  db.ts               — Drizzle ORM connection
  anthropic.ts        — Claude AI integration
shared/
  schema.ts           — Drizzle schema + Zod validation types
```

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
- `POST /api/subscription/upgrade` — Upgrade to Pro plan

## Business Logic

- Free plan: 5 questions/month, resets on new calendar month
- Pro plan: unlimited questions
- Claude is instructed to answer only questions about Greek building permits, construction law, and related technical regulations
