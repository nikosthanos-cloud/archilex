# ArchiLex — AI Βοηθός για Ελληνικές Οικοδομικές Άδειες

## Overview

ArchiLex is a full-stack web application for Greek architects and engineers. It provides AI-powered tools for building permit management, construction law Q&A, blueprint analysis, project tracking, technical report generation, and cost calculations — entirely in Greek.

## Features

- **User Registration/Login** — Secure auth with bcryptjs + PostgreSQL sessions
- **Email Verification** — Mandatory verification via token sent to email on registration
- **Password Reset** — Email-based token flow for resetting forgotten passwords
- **Stripe Subscriptions** — Automated payments and plan upgrades:
    - **Free**: 10 uses/month
    - **Starter (€19)**: 50 uses/month
    - **Professional (€49)**: 200 uses/month
    - **Unlimited (€99)**: Unlimited uses
- **Email Notifications** — Automated alerts:
    - 80% usage threshold warning
    - 100% usage limit reached
    - Project deadline reminders (3 days before)
    - Subscription confirmation
- **AI Assistant** — Powered by Anthropic Claude (claude-opus-4-5), specialized in Greek building permits (Ν. 4495/2017, ΓΟΚ, ΝΟΚ, ΚΕΝΑΚ, αντισεισμικός κανονισμός, αυθαίρετα)
- **Blueprint Analysis** — Upload JPG/PNG/PDF architectural drawings; Claude Vision analyses them and returns a structured Greek report
- **Permit Checklist Generator** — Generates a customized document checklist for building permits based on project parameters; Export to PDF
- **Construction Cost Estimator** — Calculates construction costs using Greek market data (2024-2025) with PDF export
- **TEE Fee Calculator (Αμοιβές ΤΕΕ)** — Calculates minimum engineer fees per ΠΔ 696/1974 across all study types
- **Technical Reports (Τεχνικές Εκθέσεις)** — AI-generated professional technical reports (Architectural Description, Static Study Summary, Energy Inspection, Unauthorized Construction Assessment) with PDF and Word export
- **Project Tracker (Έργα)** — Full project management with 5 permit stages, notes, and deadline reminders
- **Admin Dashboard** — Full statistics and user management

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude API
- **Payments**: Stripe (Stripe Checkout + Webhooks)
- **Emails**: Nodemailer / Resend
- **Auth**: express-session + bcryptjs
- **Routing**: wouter

## Project Structure

```
client/src/
  pages/
    Landing.tsx              — Public landing page
    Login.tsx                — Login with Forgot Password link
    Register.tsx             — Registration with Profession
    ForgotPassword.tsx       — Email input for reset link [NEW]
    ResetPassword.tsx        — New password input with token [NEW]
    VerifyEmail.tsx          — Token validation page [NEW]
    Dashboard.tsx            — Main shell with sidebar, usage meter, and verification banner
    ... (tools pages)
server/
  routes.ts                  — All API routes including Stripe and Email logic
  storage.ts                 — Database layer with token and subscription support
  email.ts                   — Email service and templates [NEW]
  stripe.ts                  — Stripe integration service [NEW]
  ...
shared/
  schema.ts                  — Updated schema with stripe fields and reset tokens
```

## Database Tables

- `users` — Includes `emailVerified`, `emailVerificationToken`, `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `usesThisMonth`
- `password_reset_tokens` — Stores tokens for password reset flow [NEW]
- `questions` — AI Q&A history
- `uploads` — Blueprint analysis history
- `projects` — Project tracking
- `project_notes` — Project-specific notes

## Environment Variables / Secrets

- `ANTHROPIC_API_KEY` — AI responses
- `DATABASE_URL` — PostgreSQL connection
- `SESSION_SECRET` — Session signing
- `STRIPE_SECRET_KEY` — Stripe API secret
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signature verification
- `STRIPE_PRICE_ID_STARTER` — Stripe Price ID for €19 plan
- `STRIPE_PRICE_ID_PROFESSIONAL` — Stripe Price ID for €49 plan
- `STRIPE_PRICE_ID_UNLIMITED` — Stripe Price ID for €99 plan
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Email credentials
- `EMAIL_FROM` — Sender email address
- `APP_URL` — Full URL of the app (for emails & redirects)

## API Endpoints

- `POST /api/auth/register` — Create account & send verification email
- `GET /api/auth/verify-email?token=xxx` — Verify email token
- `POST /api/auth/forgot-password` — Send reset email
- `POST /api/auth/reset-password` — Update password with token
- `POST /api/subscription/create-checkout` — Start Stripe payment session
- `POST /api/webhooks/stripe` — Handle payment confirmation (automated upgrade)
- `POST /api/subscription/cancel` — Cancel active subscription
- `POST /api/system/check-reminders` — Trigger deadline and usage alerts

## Business Logic

- **Tiered usage limits**: Free (10), Starter (50), Professional (200), Unlimited (Inf)
- **Stripe Automation**: Users are upgraded instantly when a checkout session is completed. Plan names are synchronized between Stripe metadata and DB.
- **Email Flow**:
    - Users receive 80% usage warning via email.
    - Users receive 100% limit reached announcement.
    - Projects approaching deadline (3 days) trigger engineer alerts.
- **Security**: Old `/api/subscription/upgrade` endpoint removed to prevent illegal plan hijacking. All payments are now Stripe-verified.
