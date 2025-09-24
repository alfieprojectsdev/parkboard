<!-- .github/copilot-instructions.md -->
# ParkBoard AI Playbook (Copilot Instructions)

## ParkBoard — AI agent instructions (short)

1) Big picture (what to know)
 - Frontend: Next.js + React + Tailwind. Pages live under `app/` and client components under `components/`.
 - Backend: Next.js API routes in `app/api/*` (bookings, slots, profiles, payments). Server routes often use Supabase anon or service keys explicitly (see `app/api/bookings/route.ts`).
 - DB: Supabase/Postgres. Canonical schema: `db/schema_v2.sql`. RLS policies in `db/rls_policies.sql` enforce row access (do not bypass in normal changes).

2) Must-follow conventions
 - Business rules are frozen for 30 days (see `parkboard_mvp_plan.md`). Don't change schema or booking rules without approval.
 - Use existing components — extend, don't duplicate: `AuthWrapper.tsx`, `BookingForm.tsx`, `SlotGrid.tsx`, `UserDashboard.tsx`, `AdminDashboard.tsx`.
 - Timezones: timestamps use TIMESTAMPTZ (UTC). Convert only when rendering.

3) Quick workflows (commands you can use)
 - Install: `npm install`
 - Dev: `npm run dev`
 - Build: `npm run build`
 - Unit tests: `npm test` (Jest). Example: `npm test -- tests/unit/BookingForm.test.js`
 - E2E: `npm run test:e2e` (Playwright)

4) API & validation notes (examples)
 - Booking creation endpoint `/api/bookings` performs overlap checks (see `app/api/bookings/route.ts`). Mirror its validations when updating UI logic.
 - `SlotGrid.tsx` uses `bookings` queries to mark availability — replicate server-side checks rather than trusting UI.

5) Files to open first (fast context)
 - `db/schema_v2.sql`, `db/rls_policies.sql`, `db/useful_queries.sql`
 - `app/api/bookings/route.ts`, `app/api/slots/route.ts`, `app/api/profiles/route.ts`
 - `components/AuthWrapper.tsx`, `components/BookingForm.tsx`, `components/SlotGrid.tsx`, `components/AdminDashboard.tsx`

6) Pitfalls & guardrails
 - Do not alter `auth.users` directly — use `user_profiles` for application data.
 - RLS is the primary security model. Only use service role keys in trusted server code (already used in some server routes).
 - Keep changes small and reversible; prefer adding helpers over large refactors in the MVP window.

If any of these references are out-of-date or you want the longer playbook merged back in, tell me which sections to restore or expand.
