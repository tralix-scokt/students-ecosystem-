# E-LEARNING ECOSYSTEM — Powered by TRALIX AI

Complete, production-grade digital learning, AI tutoring, CBT examination preparation, academic planning, study note-taking, and curriculum governance platform built for Secondary School (`JSS1–SS3`), University (`100L–Final Year`), and Polytechnic / Technical (`ND / HND`) learners.

---

## Completed Architecture (Steps 1–10)

1. **Step 1 — Brand Landing & Interactive 3D Hardcover Book Experience** (`/`, `/learning-space`)
2. **Step 2 — Real Supabase Authentication & Session Security** (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/confirm`)
3. **Step 3 — 4-Step Academic Personalization Onboarding** (`/onboarding`)
4. **Step 4 — Personalized Student Dashboard & Real Telemetry** (`/dashboard`, `/dashboard/profile`)
5. **Step 5 — Structured Learning System & 3-Tier Content Provenance** (`/dashboard/learn`, `/dashboard/learn/courses/[courseSlug]`, `/dashboard/learn/courses/[courseSlug]/lessons/[lessonSlug]`, `/dashboard/progress`)
6. **Step 6 — Complete Conversational AI Tutor (6 Learning Modes)** (`/dashboard/ai-tutor`, `/api/ai/gateway`, Supabase Edge Function `ai-gateway`)
7. **Step 7 — AI & Curated Exam Preparation Engine** (`/dashboard/exams` — `WAEC`, `NECO`, `JAMB UTME`, School, University, and Polytechnic practice with non-affiliation disclaimers & deterministic answer-key grading)
8. **Step 8 — Academic Management System** (`/dashboard/planner` — Daily/Weekly/Monthly Planner, Weekly Class Timetable, Assignment Manager with 48h deadline sync, and Live Study Focus Timer)
9. **Step 9 — Private Offline-Cached Study Notes, Real Event Notifications & Protected Admin Governance Portal** (`/dashboard/notes`, `/dashboard/notifications`, `/admin`)
10. **Step 10 — PWA Manifest, Error Boundaries, NDPA/Child-Safety Data Retention & Purge Controls, Automated Suites & Build Readiness** (`/dashboard/settings`, `/manifest.webmanifest`)

---

## Database Migrations (`supabase/migrations/`)

All **42 `public` tables** enforce `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`:

1. `20261101000001_create_profiles_and_rls.sql`
2. `20261101000002_create_student_academic_profiles.sql`
3. `20261101000003_create_dashboard_supporting_tables_and_rls.sql`
4. `20261101000004_create_structured_learning_system_and_rls.sql`
5. `20261101000005_create_steps_6_to_9_ecosystem_schema_and_rls.sql`

Server-side AI Edge Function source:
- `supabase/functions/ai-gateway/index.ts` (deployed to Supabase project `epngfzpghwdwycpeqsfi`)

---

## Environment Variables

Copy `.env.example` to `.env.local` (never commit `.env.local`):

- **Required Public Keys**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Required Server-Only AI Keys** (stored in server env & Supabase Edge Secrets; never exposed to client):
  - `OPENAI_API_KEY`
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_API_KEY_FALLBACK` (optional secondary failover)
- **Optional External Notification Delivery**:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` (or `RESEND_API_KEY`) for outbound email notifications
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` for browser Web Push notifications

---

## Bootstrapping the First Platform Administrator

Client sessions can never self-assign `role = 'admin'` due to `trg_profiles_security_and_timestamps`. To promote the initial administrator in Supabase SQL Editor (running as `postgres`):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-verified-admin@domain.com';
```

Once one admin exists, subsequent role management is audited inside `/admin` via `public.admin_update_user_role()`.

---

## Local Development & Verification

```bash
npm install --legacy-peer-deps
npm run typecheck
npm run test
npm run build
npm run dev
```
