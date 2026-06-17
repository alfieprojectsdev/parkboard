# ParkBoard v2 — Contact Board Rewrite — Implementation Plan

_Generated 2026-06-17 via planner skill (architect design, validation PASS). Source: plan.json `3d3e8083-d12d-47e1-bbc6-8a6172275a85`._

> Status: build **paused** pending owner secret-rotation. Code work has no blocker; only deploy does.

> **This document is the v2 roadmap.** It is the single source of truth for milestones, decisions, invariants, and owner-blocked prerequisites, and it survives context clears. Drive execution from here, one milestone = one PR (CodeRabbit-reviewed). Progress: **M-001 ✅ done (PR #2)**; M-002→M-007 pending.

### Execution strategy per milestone

How much process each milestone gets, judged by ambiguity + invariant risk (ref: `.claude/README.md` — "not every task needs the full planning workflow"). Each milestone header below carries its verdict.

| Tier | Meaning |
|------|---------|
| **Full planner** | Own sub-plan in `plans/` + review cycle + delegated execution. Reserved for genuine design choices / security invariants. |
| **Light planning** | Short design pass (or `frontend-design` skill), not the full machine. |
| **Direct execute** | Implement inline, then verify (tsc/build/test) + CodeRabbit per PR — the M-001 approach. |

Summary: **M-003 = full planner** (the one with real privacy/ownership stakes). **M-004 = light planning** (UI/UX). **M-002, M-005, M-006, M-007 = direct execute** (+ hard verify gate on M-006).

## Overview

### Problem

A half-finished Supabase->Neon migration left two incoherences. (1) Provider split: 20 files still import the Supabase JS client while the database lives on Neon, so signup, slot browse/create/edit, profile, and every data API route cannot reach data; only login (auth.ts via pg) and the migration runner use Neon. (2) Schema split: the optimized marketplace schema (community_code / slot_number / price_per_hour / bookings) was applied to Neon, but the slot UI queries the location-based MVP shape that was never applied. The product must also pivot from a booking/pricing marketplace to a single-condo contact bulletin board: post a slot -> a logged-in neighbour browses -> the app reveals the owner Viber/phone on demand -> they coordinate offline. No bookings, pricing, payments, multi-tenant, or OAuth.

### Approach

Apply db/schema_v2.sql (location-based, status enum available|taken|expired) greenfield to a fresh Neon branch via psql. Introduce one shared lib/db/client.ts pg Pool reused by every API route and signup, removing all Supabase client usage. Strip communityCode from the NextAuth credentials/JWT/session path while keeping NextAuth v5 + JWT + bcrypt and the edge(auth.config.ts)/node(auth.ts) split intact. Rewrite slot, profile, and signup API routes onto pg with app-level ownership checks (owner_id = session userId). Convert slot pages from direct browser->Supabase anon calls to fetch() against the API routes. Add an auth-gated GET /api/slots/[id]/contact (contact omitted from browse list and all anonymous paths) plus a Mark-taken action; owner removal soft-retires the row to status=expired. Delete the entire booking surface, OAuth callback, tenant-access helper, and Supabase libs. Migrate Navigation + LandingNav onto next-auth/react. Trim/rewrite tests for the deleted marketplace surface.

## Decision Log

- **DL-001** — Single shared lib/db/client.ts pg Pool reused by all API routes + signup; do not add @neondatabase/serverless
- **DL-002** — Apply db/schema_v2.sql greenfield via psql against a fresh Neon branch, not through scripts/run-migrations.ts
- **DL-003** — Slot pages call fetch() against API routes instead of the Supabase browser client
- **DL-004** — Reveal-contact is a dedicated auth-gated GET /api/slots/[id]/contact; browse list and detail payloads omit phone/viber until revealed
- **DL-005** — Slot removal sets status=expired (soft retire); no schema change, no hard delete
- **DL-006** — Rewrite Navigation + LandingNav onto next-auth/react (useSession/signOut), included in scope as a live-path bug
- **DL-007** — Signup hashes the password with bcrypt and INSERTs into user_profiles via pg; drop Supabase auth.admin.createUser + communities lookup

## Constraints

- C-001: All data access goes through Neon via pg; zero Supabase client usage in shipped code.
- C-002: Keep table name user_profiles (NextAuth login auth.ts + signup reference it).
- C-003: Login stays NextAuth v5 credentials + JWT strategy + bcrypt password_hash.
- C-004: API routes enforce slot ownership in app code (owner_id = session userId); no RLS / auth.uid().
- C-005: auth.ts (Node pg + bcrypt) MUST NOT be imported by middleware; middleware uses edge-safe auth.config.ts. Preserve the edge/node split.
- C-006: Single community (LMR) only; MUST NOT reintroduce community_code / multi-tenant.
- C-007: Reveal-contact must be login-gated; phone/viber never exposed to anonymous visitors or in the browse list.
- C-008: No commit of real secrets; placeholders only (rotation is a separate owner/console action).
- C-009: v2 intentionally has NO notifications/real-time; serverless LISTEN/NOTIFY rejected, polling+toast is the sanctioned later path (out of scope).
- C-010: Ship before parkboard.app expiry 2026-07-29 (~6wk); code work ~4-5 days. Secret rotation + Vercel deploy are owner actions, out of code scope.

## Rejected Alternatives

- **id**: RA-001 — **alternative**: Keep the booking marketplace (wire booking form, notifications, payment on the optimized schema) — **rejection_reason**: Contradicts the Viber-replacement product need, ~2-3wk; owner chose a contact board. — **decision_ref**: DL-005
- **id**: RA-002 — **alternative**: Keep Supabase as the database — **rejection_reason**: Owner moved to Neon; the Supabase project is to be deleted (kills the leaked service_role key). — **decision_ref**: DL-001
- **id**: RA-003 — **alternative**: Patch the schema split-brain in place via ALTERs — **rejection_reason**: Pre-launch with throwaway test data only, so a greenfield schema_v2.sql DROP/CREATE is cleaner and authoritative. — **decision_ref**: DL-002
- **id**: RA-004 — **alternative**: Add @neondatabase/serverless as the driver — **rejection_reason**: auth.ts already reaches Neon with node pg on the Node runtime; API routes are not edge, so a second driver adds ambiguity for no benefit. — **decision_ref**: DL-001
- **id**: RA-005 — **alternative**: Hard-delete slots on owner removal — **rejection_reason**: v2 status enum already has 'expired'; soft-retire keeps history and needs no schema change. — **decision_ref**: DL-005
- **id**: RA-006 — **alternative**: git filter-repo history scrub now — **rejection_reason**: Deferred by owner; secret rotation is the real fix, push-redaction-only chosen for now. — **decision_ref**: DL-001

## Risks

- **id**: R-001 — **risk**: Greenfield DROP/CREATE assumes live Neon holds only throwaway test data. — **mitigation**: Confirm no real users before applying; apply to a fresh Neon branch. — **anchor**: None — **decision_ref**: DL-002
- **id**: R-002 — **risk**: Neon-only signup must bcrypt-hash the password itself (Supabase Auth previously owned it); a miss silently breaks login. — **mitigation**: Signup + login share the same bcrypt + user_profiles.password_hash contract, covered by a register->login round-trip test. — **anchor**: None — **decision_ref**: DL-007
- **id**: R-003 — **risk**: Dropping NextAuth Account/Session tables invalidates existing JWT sessions. — **mitigation**: Acceptable (no real users); document as expected behaviour. — **anchor**: None — **decision_ref**: DL-002
- **id**: R-004 — **risk**: Browse list or detail payload accidentally leaking phone/viber. — **mitigation**: Contact lives only in the dedicated auth-gated /contact endpoint; tests assert list/detail responses omit contact fields. — **anchor**: None — **decision_ref**: DL-004
- **id**: R-005 — **risk**: Residual Supabase imports left after migration would fail at runtime on Neon-only data. — **mitigation**: Delete lib/supabase/* and remove @supabase/* deps so any stray import breaks the build, not production. — **anchor**: None — **decision_ref**: DL-001

## System Notes & Invariants

### System

ParkBoard v2 is a single-condo (LMR) parking contact board on Neon Postgres. Auth is NextAuth v5 credentials + JWT (NEXTAUTH_SECRET is the sole trust boundary; bcrypt against user_profiles.password_hash). Data flows browser -> Next.js API routes (Node runtime, shared lib/db pg Pool) -> Neon. There is no Supabase, no RLS (auth.uid() never validated under NextAuth JWT), no bookings, no pricing, no notifications, and no multi-tenant. Slots have status available|taken|expired; owners reveal contact to logged-in neighbours on demand and coordinate offline.

### Invariants (must hold)

- auth.ts (Node pg + bcrypt) must never be imported by middleware; middleware imports edge-safe auth.config.ts only.
- Contact (phone/contact_viber) is returned ONLY by the auth-gated GET /api/slots/[id]/contact; browse list and detail payloads must omit it.
- Every slot mutation API route verifies owner_id = session userId before write; ownership is enforced in app code, never by the database.
- Signup and login share one contract: bcrypt hash written by signup, compared by login, both against user_profiles.password_hash.
- Browse queries filter status='available'; owner removal sets status='expired' rather than deleting.
- No community_code anywhere; single-tenant LMR is hardcoded.

### Tradeoffs accepted

- App-level ownership checks instead of RLS: chosen because NextAuth JWT is incompatible with Supabase auth.uid(); cost is that every route must remember the ownership filter (mitigated by a shared helper + tests).
- Greenfield schema apply instead of in-place ALTERs: faster and authoritative pre-launch, at the cost of dropping current test data and existing sessions.
- No notifications in v2: serverless LISTEN/NOTIFY is unreliable on Vercel; polling+toast deferred to post-MVP, accepting that coordination is fully offline for now.

## Milestones

### M-001 — Foundation: Neon db client, v2 schema, auth de-tenanting

> **Execution: Direct execute — ✅ DONE (PR #2).** Mechanical, well-specified. Built inline, verified (source tsc clean, `next build` passes), CodeRabbit-gated. Scope note: `communityCode` type removal deferred to M-006 (consumers still live); `db/schema_v2.sql` apply stays owner-blocked.

**Files:** lib/db/client.ts; db/schema_v2.sql; lib/auth/auth.ts; lib/auth/auth.config.ts; scripts/run-migrations.ts; package.json

**Requirements:**
- Create shared pg Pool module lib/db/client.ts (mirrors auth.ts ssl rejectUnauthorized:false; exports a query helper and the pool)
- Apply db/schema_v2.sql greenfield to a fresh Neon branch via psql
- Remove communityCode from auth.ts authorize() credentials and the AND community_code=$2 SQL filter and jwt/session callbacks and type declarations and the UserProfile interface
- Keep auth.ts pg+bcrypt+rate-limit pattern and the edge(auth.config.ts)/node(auth.ts) split
- Remove @supabase/ssr and @supabase/supabase-js from package.json deps

**Code intents:**
- `lib/db/client.ts` — New module exporting a singleton pg Pool configured from DATABASE_URL with ssl rejectUnauthorized:false (mirroring the inline pool in auth.ts), plus a query(text, params) helper used by all API routes. Single connection-handling story; no @neondatabase/serverless.  _[DL-001]_
- `db/schema_v2.sql` — Source-of-truth greenfield schema applied via psql to a fresh Neon branch: user_profiles (id, email, password_hash, name, phone, contact_viber, ...) and parking_slots with location-based columns and a status enum available|taken|expired. No community_code, no bookings, no pricing tables.  _[DL-002, DL-005]_
- `lib/auth/auth.ts` — Drop communityCode end-to-end: remove it from authorize() credentials and remove the AND community_code=$2 clause from the user_profiles lookup SQL; remove communityCode from jwt and session callbacks, from the next-auth type declarations, and from the UserProfile interface. Keep the pg Pool, bcrypt compare, rate-limit, and generic-error behavior. Remove the google branch from the signIn callback (OAuth out of scope).  _[DL-007]_
- `lib/auth/auth.config.ts` — Keep edge-safe config that middleware imports. Remove any community-selector cosmetic comment in the authorized() callback; PUBLIC_ROUTES/AUTH_ONLY_ROUTES unchanged. Preserve the strict edge/node split (no pg/bcrypt here).  _[DL-001]_
- `scripts/run-migrations.ts` — Stop treating the stale optimized db/migrations/* set as the live chain; the v2 schema is applied via psql, not this runner. Either point the runner at an empty/v2 directory or leave it unused for v2 and document that db/migrations/ is dead.  _[DL-002]_
- `package.json` — Remove @supabase/ssr and @supabase/supabase-js from dependencies so any residual Supabase import fails the build rather than at runtime. Keep pg, @types/pg, bcryptjs, next-auth, zod.  _[DL-001]_

**Acceptance criteria:**
- lib/db/client.ts connects to Neon and returns rows for SELECT 1
- Login still succeeds end-to-end with email+password (no communityCode field required)
- npx tsc --noEmit passes with no communityCode references
- grep for community_code in lib/auth returns nothing
- Fresh Neon branch has user_profiles and parking_slots with location columns and status enum available|taken|expired

**Tests:**
- unit:jest:lib/db/client connects and queries Neon;unit:jest:auth.authorize accepts email+password and rejects bad password without communityCode

### M-002 — Auth UI + signup/profile API on pg

> **Execution: Direct execute + quality-review gate.** Security-sensitive (bcrypt, enumeration-safe errors, phone-or-viber, the `unit_number` NOT NULL fix) but unambiguous — the plan already specs it tightly and QR caught the INSERT bug. No planner; run a `quality-reviewer` pass on the diff before the PR.

**Files:** app/api/auth/signup/route.ts; app/(auth)/login/page.tsx; app/(auth)/register/page.tsx; app/api/profile/route.ts; lib/validation/api-schemas.ts

**Requirements:**
- Rewrite signup route to bcrypt-hash the password and INSERT into user_profiles via pg; drop Supabase auth.admin.createUser and communities lookup and community_code; keep rate-limit and 12-char minimum and generic errors
- Add contact_viber to signup; app enforces at least one of phone/contact_viber
- Remove communityCode field from login page and the test-credentials banner; signIn passes only email+password
- Remove community_code from register page; replace post-signup supabase.auth.signInWithPassword with NextAuth signIn credentials; add contact_viber field
- Rewrite profile GET/PATCH onto pg + auth() session (no getSessionWithCommunity); allow updating name/phone/contact_viber
- Rewrite slot and profile zod schemas in api-schemas.ts to the location shape; delete booking schemas and community_code refine logic

**Code intents:**
- `app/api/auth/signup/route.ts` — Rewrite onto pg: validate body, enforce 12-char password minimum and at-least-one of phone/contact_viber, bcrypt-hash the password, INSERT into user_profiles (email, password_hash, name, **unit_number**, phone, contact_viber). NOTE: `unit_number` is `NOT NULL` in schema_v2.sql and the register page already collects it — it MUST be in the INSERT or every registration 500s (QR finding, 2026-06-17). Drop Supabase auth.admin.createUser and the communities lookup and community_code. Keep the existing rate-limit and generic (enumeration-safe) error messages.  _[DL-007, DL-001]_
- `app/(auth)/login/page.tsx` — Remove the communityCode form field and the test-credentials banner; signIn(credentials) passes only email+password; keep redirect to the slots browse on success.  _[DL-007]_
- `app/(auth)/register/page.tsx` — Remove community_code; add a contact_viber field; on submit POST /api/auth/signup then call NextAuth signIn(credentials) instead of supabase.auth.signInWithPassword. App-side require at least one of phone/contact_viber before submit.  _[DL-007, DL-003]_
- `app/api/profile/route.ts` — Rewrite GET/PATCH onto pg + auth() session (drop getSessionWithCommunity). GET returns the session users profile; PATCH updates only name/phone/contact_viber for the session userId. No community scoping.  _[DL-001]_
- `lib/validation/api-schemas.ts` — Replace slot and profile zod schemas with the location shape (e.g. location/description/availability + status); add contact_viber to the profile/signup schema with a phone-or-viber refinement. Delete all booking schemas and any community_code refine logic.  _[DL-003, DL-004]_

**Acceptance criteria:**
- New user can register then immediately log in (bcrypt round-trip through user_profiles.password_hash)
- Signup rejects when both phone and contact_viber are empty
- Login and register pages render with no community selector
- Profile PATCH updates name/phone/contact_viber for the session user only
- No import of lib/supabase or getSessionWithCommunity remains in these files

**Tests:**
- unit:jest:signup hashes password and inserts user_profiles and rejects duplicate email and enforces phone-or-viber;unit:jest:profile PATCH scopes to session userId;e2e:playwright:register then login then reach slots browse (2026 dates)

### M-003 — Slots API on pg: CRUD, ownership, reveal-contact, mark-taken

> **Execution: FULL PLANNER WORKFLOW.** The security-critical heart of v2. The auth-gated `GET /api/slots/[id]/contact` *is* the product's privacy boundary (contact must never leak to anon / list / detail — R-004), plus app-side ownership enforcement (403) and soft-delete semantics. Genuine design choices + hard invariants = exactly where plan→review→delegated-execute pays. Run the `planner` skill scoped to M-003 → sub-plan in `plans/` → execute.

**Files:** app/api/slots/route.ts; app/api/slots/[id]/route.ts; app/api/slots/[id]/contact/route.ts

**Requirements:**
- Rewrite GET /api/slots (list available) and POST /api/slots (create) onto pg with location columns; drop community_code filter; set owner_id=session userId on create; list response MUST omit phone/contact_viber
- Rewrite PATCH/DELETE /api/slots/[id] onto pg; verify owner_id=session userId before any write; DELETE sets status=expired (soft retire); drop bookings active-check; support edit and a mark-taken transition (status=taken)
- Add GET /api/slots/[id]/contact: auth-required; returns phone+contact_viber; 401 for anonymous; detail and list payloads never include contact

**Code intents:**
- `app/api/slots/route.ts` — GET lists parking_slots WHERE status=available using pg, selecting only non-contact columns (no phone/contact_viber). POST creates a slot via pg, setting owner_id from the auth() session userId and status=available; validate body against the location-shape schema. No community_code filter anywhere.  _[DL-001, DL-003, DL-004, DL-005]_
- `app/api/slots/[id]/route.ts` — PATCH and DELETE via pg. First load the slot and verify owner_id equals the session userId; return 403 otherwise. PATCH supports editing slot fields and a mark-taken transition (status=taken). DELETE performs a soft-retire (UPDATE status=expired), not a row delete; drop the old bookings active-check.  _[DL-001, DL-005]_
- `app/api/slots/[id]/contact/route.ts` — New auth-gated GET: require an authenticated session (401 if anonymous), then return the slot owners phone + contact_viber via pg. This is the ONLY endpoint that returns contact fields; list and detail payloads must never include them.  _[DL-004]_

**Acceptance criteria:**
- GET /api/slots returns available slots with no contact fields
- POST /api/slots creates a slot owned by the session user
- PATCH/DELETE by a non-owner returns 403
- DELETE sets status=expired and the slot disappears from browse
- GET /api/slots/[id]/contact returns 401 unauthenticated and phone+viber authenticated
- Mark-taken sets status=taken and removes the slot from available browse

**Tests:**
- unit:jest:GET list omits contact fields;unit:jest:POST sets owner_id from session;unit:jest:PATCH/DELETE non-owner 403;unit:jest:DELETE sets status=expired;unit:jest:contact route 401 anon and 200 authed;e2e:playwright:reveal-contact requires login and shows phone+viber

### M-004 — Slot pages: fetch() API, reveal-contact + mark-taken UI

> **Execution: Light planning (or `frontend-design` skill).** Real UX design exists — reveal-contact interaction, loading/error states, owner-only controls — and frontend is the least-specified surface. Not full planner; a short design pass on the reveal/mark-taken UX before implementing. Client invariant: never request contact pre-auth.

**Files:** app/LMR/slots/page.tsx; app/LMR/slots/new/page.tsx; app/LMR/slots/[slotId]/page.tsx; app/LMR/slots/[slotId]/edit/page.tsx

**Requirements:**
- Convert browse page from Supabase browser client to fetch(/api/slots); remove inline owner phone from the list; add a per-slot Reveal contact button that calls /api/slots/[id]/contact and renders phone+Viber inline
- Convert new-slot page to POST /api/slots via fetch (location shape)
- Rewrite [slotId] detail page from old marketplace shape to location shape; add Reveal contact and Mark-taken (owner-only) actions
- Rewrite [slotId]/edit page to location shape via fetch PATCH; owner-only
- Ensure no useEffect uses object references in dependencies

**Code intents:**
- `app/LMR/slots/page.tsx` — Replace the Supabase browser client with fetch(/api/slots). Render the available-slots list with NO contact fields; add a per-slot Reveal contact button that fetches /api/slots/[id]/contact and shows phone+Viber inline. Use stable primitive useEffect deps.  _[DL-003, DL-004]_
- `app/LMR/slots/new/page.tsx` — Replace Supabase insert with POST /api/slots via fetch using the location shape; on success navigate to the new slot or browse.  _[DL-003]_
- `app/LMR/slots/[slotId]/page.tsx` — Rewrite from the old marketplace shape (slot_number/price_per_hour/bookings) to the location shape via fetch. Add a Reveal contact action and, for the owner only, Mark-taken and Remove(expire) actions.  _[DL-003, DL-004, DL-005]_
- `app/LMR/slots/[slotId]/edit/page.tsx` — Rewrite to the location shape; owner-only edit via fetch PATCH /api/slots/[id]; no Supabase client.  _[DL-003]_

**Acceptance criteria:**
- Browse list shows no contact until Reveal is clicked
- Anonymous visitor never sees phone/viber anywhere
- Owner can create edit mark-taken and remove (expire) a slot through the UI
- Non-owner sees no edit/mark-taken/remove controls
- No Supabase import remains in any app/LMR/slots page

**Tests:**
- e2e:playwright:owner posts slot appears in browse;e2e:playwright:neighbour reveals contact shows phone+viber;e2e:playwright:owner marks slot taken leaves browse;e2e:playwright:non-owner cannot edit/remove

### M-005 — Navigation + landing on NextAuth; strip marketing

> **Execution: Direct execute.** Mechanical — swap Supabase auth → `useSession`/`signOut`, delete testimonials/pricing sections. Low ambiguity, low risk. Implement inline + build verify + CodeRabbit.

**Files:** components/common/Navigation.tsx; components/landing/LandingNav.tsx; app/page.tsx

**Requirements:**
- Rewrite Navigation from supabase.auth getSession/onAuthStateChange/signOut to useSession()/signOut() from next-auth/react (or useAuth/AuthWrapper)
- Rewrite LandingNav the same way
- Replace app/page.tsx Supabase server session read with NextAuth auth(); strip fake testimonials and pricing tiers

**Code intents:**
- `components/common/Navigation.tsx` — Replace supabase.auth getSession/onAuthStateChange/signOut with useSession()/signOut() from next-auth/react (or the AuthWrapper context). Remove any link to bookings. Reflect authed vs anonymous state correctly.  _[DL-006]_
- `components/landing/LandingNav.tsx` — Same NextAuth migration as Navigation: useSession/signOut, no Supabase auth calls.  _[DL-006]_
- `app/page.tsx` — Replace the Supabase server createClient session read with NextAuth auth(). Strip the fake testimonials and pricing tiers sections.  _[DL-006]_

**Acceptance criteria:**
- Sign-out actually clears the session and redirects (no silent no-op)
- Nav reflects authenticated vs anonymous state correctly
- Landing page has no testimonials or pricing tiers and no Supabase import
- npx tsc --noEmit passes

**Tests:**
- e2e:playwright:sign-out from nav clears session and returns to landing;unit:jest:Navigation renders authed vs anon from useSession

### M-006 — Delete dead surface: bookings, OAuth, tenant-access, Supabase libs

> **Execution: Direct execute + HARD VERIFY gate.** Low-concept but cross-cutting — touches many files, high orphaned-import risk. This is where the vestigial `communityCode` type, the `@supabase/*` deps, and `lib/supabase/*` finally die together (the M-001 dep-removal was deliberately deferred here so deps + imports go in one atomic, build-clean step). Gate: grep proves zero `lib/supabase` / `getSessionWithCommunity` / `community_code` refs remain, and `npm run build` passes from a clean `npm ci`.

**Files:** app/api/bookings/route.ts; app/api/bookings/[id]/route.ts; app/LMR/bookings/page.tsx; app/auth/callback/route.ts; app/profile/complete/page.tsx; lib/auth/tenant-access.ts; lib/supabase/client.ts; lib/supabase/server.ts; lib/supabase/admin.ts; app/LMR/page.tsx; app/test-accounts/page.tsx; components/test-accounts/TestAccountList.tsx; components/test-accounts/TestAccountCard.tsx

**Requirements:**
- Delete all booking API routes and the bookings page
- Delete OAuth callback route and profile/complete page; remove the google branch from auth.ts signIn callback
- Delete lib/auth/tenant-access.ts after all API routes migrate to plain auth()+userId
- Delete lib/supabase/client.ts and server.ts and admin.ts
- Remove now-dead imports and links to deleted routes (e.g. nav links to bookings)

**Code intents:**
- `app/api/bookings/route.ts` — Delete: no bookings in v2.  _[DL-005]_
- `app/api/bookings/[id]/route.ts` — Delete: no bookings in v2.  _[DL-005]_
- `app/LMR/bookings/page.tsx` — Delete: no bookings in v2.  _[DL-005]_
- `app/auth/callback/route.ts` — Delete: OAuth callback is out of scope (Supabase-auth based).  _[DL-001]_
- `app/profile/complete/page.tsx` — Delete: OAuth profile-completion flow is out of scope.  _[DL-001]_
- `lib/auth/tenant-access.ts` — Delete getSessionWithCommunity/ensureCommunityAccess once all API routes use plain auth()+userId.  _[DL-001]_
- `lib/supabase/client.ts` — Delete: no Supabase client usage in v2.  _[DL-001]_
- `lib/supabase/server.ts` — Delete: no Supabase server client in v2.  _[DL-001]_
- `lib/supabase/admin.ts` — Delete: no Supabase admin client in v2.  _[DL-001]_
- `app/LMR/page.tsx` — KEEP but edit: remove the `<Link href="/LMR/bookings">` (line ~88) — that route is deleted in this milestone, so the link would 404 silently (Next.js does not validate Link targets at build). Replace with a Browse Slots / My Slots link. (QR finding, 2026-06-17)  _[DL-005]_
- `app/test-accounts/page.tsx` — Delete: dev-only page that fetches a non-existent /api/test-accounts route and is a test-credential exposure surface (conflicts with C-008).  _[DL-001]_
- `components/test-accounts/TestAccountList.tsx` — Delete: only used by the deleted test-accounts page.  _[DL-001]_
- `components/test-accounts/TestAccountCard.tsx` — Delete: only used by the deleted test-accounts page.  _[DL-001]_

**Acceptance criteria:**
- npm run build succeeds with booking/OAuth/Supabase modules removed
- grep for lib/supabase across app+lib+components returns nothing
- grep for getSessionWithCommunity returns nothing
- No route or link points to /LMR/bookings or /auth/callback (incl. the app/LMR/page.tsx dashboard link)
- /test-accounts route no longer exists

**Tests:**
- unit:jest:build-time import check (no lib/supabase no tenant-access);e2e:playwright:smoke nav has no bookings entry and app loads

### M-007 — Test suite cleanup for v2 surface

> **Execution: Direct execute + quality-review.** Moderate — what to assert follows from M-002/M-003 behavior, but the tests *encode* the leak/ownership invariants (contact never in list/detail, non-owner 403, DELETE→expired), so a `quality-reviewer` pass on coverage is worth it. Also resolves the pre-existing `__tests__`/`e2e` tsc errors carried since M-001.

**Files:** __tests__/api/slots; __tests__/api/auth; e2e/user-journeys.spec.ts

**Requirements:**
- Delete tests for removed surface: bookings hybrid-pricing cross-community isolation rotate-community-code and old slot_number/price detail and edit tests
- Add or keep unit tests asserting browse list and detail omit contact and the contact route is auth-gated
- Add unit tests for ownership 403 and DELETE sets expired
- Update e2e user-journeys to the contact-board flow (register post-slot reveal-contact mark-taken) using 2026 dates

**Code intents:**
- `__tests__/api/slots` — Delete tests for removed marketplace surface; add/keep tests asserting list+detail omit contact, the contact route is 401-anon/200-authed, non-owner PATCH/DELETE is 403, and DELETE sets status=expired.  _[DL-004, DL-005]_
- `__tests__/api/auth` — Update auth tests: signup bcrypt+insert+duplicate-email+phone-or-viber; login without communityCode; register->login round-trip.  _[DL-007]_
- `e2e/user-journeys.spec.ts` — Rewrite to the contact-board flow using 2026 dates: register, post a slot, browse, reveal contact (login-gated), mark taken. Remove booking/pricing/cross-community journeys.  _[DL-003, DL-004, DL-005]_

**Acceptance criteria:**
- npm test passes with zero failures
- E2E user-journeys covers post browse reveal mark-taken
- No test references community_code bookings or price_per_hour

**Tests:**
- unit:jest:full suite green;e2e:playwright:user-journeys contact-board flow passes against dev server


---

## Owner-blocked prerequisites (deploy only, not code)
- Rotate 4 leaked secrets — consoles:
  - Neon DB password, Supabase service_role, NEXTAUTH_SECRET.
  - **Google OAuth client_secret** `GOCSPX-…` for GCP project `strange-mariner-474408-r4` — revoke in Google Cloud Console. The on-disk `lib/client_secret_*.json` was deleted 2026-06-17, but the credential is still live until revoked (QR finding). OAuth is out of scope for v2, so revoke rather than reissue.
- `psql "$DATABASE_URL" -f db/schema_v2.sql` against a fresh Neon branch (M-001).
- Authenticate Vercel MCP via `/mcp` (for env vars + deploy).
- Renew parkboard.app before 2026-07-29 if committing to launch.
