<!-- .github/copilot-instructions.md -->
# ParkBoard AI Playbook (Copilot Instructions)

# ParkBoard AI Agent Instructions

ParkBoard is a minimal parking booking app for condo communities, built as an MVP using Supabase, Next.js, and Tailwind. The codebase is organized for rapid iteration and strict scope control.

## Architecture & Data Flow
- **Frontend:** Next.js + React + Tailwind CSS. UI flows are modular, with canonical components in `/components` (see below).
- **Backend:** Next.js API routes in `/app/api/*` handle bookings, slots, profiles, and payments. All business logic is enforced both client- and server-side.
- **Database:** Supabase/PostgreSQL. Schema is frozen (see `/db/schema_v2.sql`). Row Level Security (RLS) is enforced via `/db/rls_policies.sql`.
- **Auth:** Supabase Auth, with user profiles in `user_profiles` (linked to `auth.users`). Roles: `resident` and `admin`.

## Key Conventions
- **Business rules are frozen for 30 days.** No new rules or schema changes—see `/parkboard_mvp_plan.md` for allowed flows.
- **Canonical components:** Always use/extend, never duplicate:
	- `components/AuthWrapper.tsx` (auth/session)
	- `components/Navigation.tsx` (header/nav)
	- `components/UserDashboard.tsx` (resident dashboard)
	- `components/UserBookingsList.tsx` (user bookings)
	- `components/BookingForm.tsx` (booking creation)
	- `components/SlotGrid.tsx` (slot selection)
	- `components/AdminDashboard.tsx` (admin dashboard)
	- `components/TimeRangePicker.tsx` (date/time picker)
	- `components/BookingConfirmation.tsx` (success state)

## API Endpoints
- `/api/slots` — GET: list slots, POST: create slot (admin only)
- `/api/bookings` — GET: user bookings, POST: create booking (with conflict checks)
- `/api/bookings/[id]` — GET/PATCH/DELETE: manage booking
- `/api/profiles` — GET: list profiles, POST: create profile
- `/api/payments` — GET/POST: payment records (optional)

## Developer Workflows
- **Install:** `npm install`
- **Run dev server:** `npm run dev`
- **Test:** `npm test` (unit), `npm run test:e2e` (Playwright E2E)
- **DB setup:** Run `/db/schema_v2.sql`, `/db/rls_policies.sql`, `/db/seed_data.sql` in Supabase SQL editor
- **Reset DB:** `/db/wipe_and_reset.sql` (destructive)
- **Useful queries:** `/db/useful_queries.sql` for slot/booking checks

## Patterns & Guardrails
- **Booking logic:** Always check for time conflicts and enforce "one active booking per resident" both in UI and API. See `BookingForm.tsx`, `SlotGrid.tsx`, and `/db/useful_queries.sql`.
- **RLS policies:** Never bypass RLS except for admin/service role. See `/db/rls_policies.sql`.
- **Timezone:** All timestamps are UTC (TIMESTAMPTZ). Format only at render time.
- **Environment:** Use `.env.local` for secrets. Never commit keys.
- **Error handling:** Return meaningful HTTP status codes and user-friendly messages. See API route examples.

## Testing
- **Unit tests:** See `/tests/unit/BookingForm.test.js` for booking logic validation.
- **E2E tests:** See `/tests/e2e.spec.ts` for full user/admin flows. Run with Playwright.

## Common Pitfalls
- ❌ Never modify `auth.users` directly—use `user_profiles` for app data.
- ❌ Never skip foreign key constraints or RLS policies.
- ❌ Never expose internal IDs to the client unless required.
- ❌ Never trust client validation alone—always validate server-side.
- ❌ Never change schema or business rules without updating `/parkboard_mvp_plan.md`.

## Quick Reference
- **Schema:** `/db/schema_v2.sql` (frozen)
- **RLS policies:** `/db/rls_policies.sql`
- **Seed data:** `/db/seed_data.sql`
- **API routes:** `/app/api/*`
- **Components:** `/components/*`
- **Tests:** `/tests/*`

For more, see `/README.md` and `/parkboard_mvp_plan.md`.
