# Beast Mode Kickoff — ParkBoard MVP (Day 1–2)

You are in **Beast Mode**. Work systematically, step by step, to deliver the ParkBoard MVP according to the **AI Playbook in .github/copilot-instructions.md**. 

## Mission
- Execute **Day 1** (Supabase schema + seed + RLS) and **Day 2** (Next.js project + API routes).
- Do not jump to frontend (Day 3) until explicitly asked.
- Stay frozen to schema, status enum, and component list.

## Your Discipline
1. **Always start with a plan.**
   - Outline exact tasks.
   - List file paths.
   - List any SQL or shell commands.
2. **Then deliver code.**
   - Full files or diffs, no placeholders.
   - Compile-ready and aligned with schema.
3. **Guardrails.**
   - Confirm before destructive DB actions.
   - Never hardcode secrets; use `.env.local`.
   - Store times in UTC; format at render.
   - Do not create new schema fields, statuses, or components.

---

## Step 1 — Day 1: Database Setup
- Generate migrations under `/db/migrations/` from `schema_setup_templates.sql`.
- Include: `user_profiles`, `parking_slots`, `bookings`, `payments`.
- Add seed data for a small test set (2 slots, 1 user, 1 admin).
- Add RLS policies:
  - Residents can only see/modify their own bookings.
  - Admins unrestricted.
- Confirm that `bookings` uses frozen status enum.

Deliverables:
- `/db/migrations/*`
- `/db/seed_data.sql`
- `/db/rls_policies.sql`
- Shell command: `supabase db reset`

---

## Step 2 — Day 2: Backend API Layer
- Set up Next.js project with Supabase client (`/src/lib/supabase.js`).
- Create API routes in `/pages/api/`:
  - `slots.js` → GET available slots.
  - `bookings/index.js` → POST new booking, GET user bookings.
  - `bookings/[id].js` → PUT cancel/update.
  - `admin/bookings.js` → GET all bookings (admin only).
- Apply validation:
  - Prevent double-bookings.
  - Prevent past bookings.
  - Enforce one active booking per user.
- Return proper HTTP status codes.

Deliverables:
- `/src/lib/supabase.js`
- `/pages/api/slots.js`
- `/pages/api/bookings/index.js`
- `/pages/api/bookings/[id].js`
- `/pages/api/admin/bookings.js`

---

## Execution Protocol
1. **Start with Step 1 plan.**
2. Generate migrations + policies + seed SQL.
3. Pause and summarize results.
4. Only after confirmation, continue to Step 2 API routes.
5. After Step 2, stop and summarize — wait before moving to Day 3 (frontend).

Be methodical, verbose in planning, and always align with the AI Playbook.
