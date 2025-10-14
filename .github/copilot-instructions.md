<!-- .github/copilot-instructions.md -->
# ParkBoard — AI agent instructions (short)

1) Big picture (what to know)
 - Frontend: Next.js App Router (app/), React, TypeScript. Pages under `app/` (auth, marketplace, admin). Client components live in `components/`.
 - Backend: Next.js API routes under `app/api/*` (bookings, slots, profiles). Server routes sometimes use the Supabase service role key for validation.
 - DB: Supabase / PostgreSQL. Canonical schema in `db/schema_optimized.sql` (or `db/schema.sql` in older branches). RLS policies live in `db/rls_policies.sql` and are the primary security boundary.
 - Auth: Supabase Auth + `user_profiles` table for app data. Never modify `auth.users` directly.

2) Quick commands (run in repo root)
 - Install dependencies: `npm install`
 - Dev server: `npm run dev` (Next dev at http://localhost:3000)
 - Build: `npm run build`
 - Start production: `npm start`
 - Unit tests: `npm test` (Jest)
 - E2E tests: `npm run test:e2e` (Playwright)
 - Lint: `npm run lint`

3) Where to start when changing features
 - Read `db/schema_optimized.sql` and `db/rls_policies.sql` before touching data access or schema.
 - For booking logic: inspect `app/api/bookings/route.ts` and `components/booking/BookingForm.tsx` and `components/booking/SlotGrid.tsx`.
 - For auth/session flows: open `components/auth/AuthWrapper.tsx`, `lib/supabase/client.ts`, and `lib/supabase/server.ts`.

4) Important conventions & patterns
 - Business rules are intentionally frozen for short windows. Check `parkboard_mvp_plan.md` before changing booking rules or schema.
 - Timezone convention: DB stores timestamps as TIMESTAMPTZ (UTC). Convert only when rendering in UI.
 - Supabase clients:
   - Client-side: use the anon client (`lib/supabase/client.ts`) so RLS applies.
   - Server-side: use server client (`lib/supabase/server.ts`) with SUPABASE_SERVICE_ROLE_KEY for validations that must bypass RLS. NEVER expose service role to the browser.
 - Ownership model: `parking_slots.owner_id` nullable — NULL = shared slot; owned slots can only be booked by the owner. This is enforced in RLS and in `/api/bookings`.
 - Price calculation: total price is calculated server-side (DB trigger). Client may show an estimate but must not be trusted for final amounts.
 - Path aliasing: imports use `@/` root alias (e.g. `@/lib/supabase/client`).

5) Key files to read first
 - DB: `db/schema_optimized.sql`, `db/rls_policies.sql`, `db/useful_queries.sql`
 - API: `app/api/bookings/route.ts`, `app/api/slots/route.ts`, `app/api/profiles/route.ts`
 - Auth/UI: `components/auth/AuthWrapper.tsx`, `components/booking/BookingForm.tsx`, `components/booking/SlotGrid.tsx`
 - Core libs: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/constants.ts`

6) Tests & QA
 - Unit tests in `__tests__/` (Jest). Run `npm test` then inspect `test-results/` for artifacts.
 - Playwright E2E tests produce `playwright-report/` — useful for debugging flows.
 - Use `db/fixed_development_seed.sql` (if present) or `db/useful_queries.sql` to seed test data.

7) Pitfalls & guardrails (do not bypass these)
 - DO NOT edit `auth.users` directly; use `user_profiles` and API routes.
 - RLS is the security boundary. Avoid adding server code that relies on client-side filtering only.
 - Service role key goes only into server environment (`.env`/deployment secrets) and server routes.
 - Overlap booking checks are enforced server-side; mirror validations on the client for UX but not security.

8) Small, safe improvements you can do
 - Add types to any API route responses (refer to existing patterns in `app/api/*/route.ts`).
 - Add unit tests for validation logic in `app/api/bookings/route.ts` (Jest tests live under `__tests__/`).
 - When editing UI, reuse `components/booking/SlotGrid.tsx` and `components/booking/BookingForm.tsx` patterns.

9) Where to find longer context
 - Planning & detailed notes: `docs/parkboard_mvp_plan.md`, `docs/parkboard_claude_context_2025-10-04_172204.md` (archive)
 - Historical AI notes: see `archive/*/CLAUDE.md` for extended agent context

10) When you're unsure
 - Read the API route and the matching component first. If it interacts with the DB, open `db/schema_optimized.sql` and `db/rls_policies.sql` to confirm expectations.
 - If a business-rule change is required, flag it and leave it minimal; the `parkboard_mvp_plan.md` documents the freeze window and rationale.

If anything above is unclear or you want specific examples added (scripts, queries, or test hints), tell me which area to expand and I'll iterate.
