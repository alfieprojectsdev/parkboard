# CLAUDE.md

Guidance for Claude Code in this repository. Rewritten 2026-09-29 for v2; the
v1 guidance (multi-tenant `community_code` filtering, RLS, Supabase, bookings,
pricing) no longer applies and must not be reintroduced.

## What this is

ParkBoard v2: a parking-slot contact board for one condo, Lumiere Residences
(routes under `/LMR`). Residents post when their slot is free; logged-in
neighbours reveal the owner's phone/Viber and arrange it offline.

- Roadmap and decisions: `docs/V2_CONTACT_BOARD_PLAN_20260617.md`
- Audit, deploy runbook, tradeoffs: `docs/PRODUCTION_READINESS.md`
- Secret rotation: `plans/SECRET_ROTATION_PLAYBOOK_20260617.md`

## Commands

```bash
npm run dev          # dev server
npm test             # Vitest + PGlite (no database server needed)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . (flat config; `next lint` no longer exists in Next 16)
npm run build
DATABASE_URL=... npm run db:migrate [-- --status]
DATABASE_URL=... npm run reset-password -- someone@example.com
```

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Tailwind 3 + shadcn/ui,
NextAuth v5 beta (credentials + JWT), `pg` against Neon, zod 4, Vitest.

## Invariants (tests enforce these; keep them green)

1. **Contact privacy.** `phone` and `contact_viber` of other residents are
   returned only by `app/api/slots/[id]/contact/route.ts` (login required,
   30/hour). List and detail payloads never include them;
   `lib/slots.ts` never selects them. `test/invariants.test.ts` fails if another
   file starts reading them.
2. **Ownership in app code.** Every slot write loads the row and checks
   `owner_id === session user id` before writing (403 otherwise). `owner_id`
   on create comes from the session, never the body.
3. **Soft delete.** DELETE sets `status = 'expired'`; browse shows
   `status = 'available' AND available_until > NOW()`.
4. **Signup/login contract.** Signup stores `bcrypt(password, 12)` in
   `user_profiles.password_hash`, email lowercased; `lib/auth/credentials.ts`
   compares against it.
5. **Proxy stays database-free.** `proxy.ts` (Next 16's middleware) builds its
   own NextAuth instance from `lib/auth/auth.config.ts`. That file must not
   import or re-export `lib/auth/auth.ts`, `pg` or `bcrypt`.
6. **Single community.** No `community_code`, no tenant helper.

## Patterns

- Route handlers use `currentUserId()`, `json()`, `error()`, `readJson()` from
  `lib/api.ts`, and validate bodies with the zod schemas in
  `lib/validation/api-schemas.ts`.
- Rate limits are `allow(key, max, windowMs)` from `lib/rate-limit.ts`, stored
  in Postgres (in-memory counters don't survive serverless cold starts).
- Route params are user input: check UUIDs with `isUuid()` before querying.
- Schema changes: add `db/migrations/00N_name.sql`, written to be re-runnable
  (`IF NOT EXISTS`, `DROP ... IF EXISTS`). Production builds apply them:
  `npm run build` runs `scripts/migrate.mjs --vercel` first, which only acts
  when `VERCEL_ENV=production`. Tests apply every migration to
  PGlite and re-run them.
- Client pages fetch the API routes; never talk to the database from the
  browser.

## Gotchas

- `useEffect` dependencies must be primitives (strings, numbers, booleans).
  Object dependencies caused render loops in v1.
- In route handlers `params` is a Promise: `const { id } = await params`.
- Datetimes: forms use `datetime-local` (resident's local time, Manila) and
  send ISO strings; helpers in `components/slots/format.ts`.
- Changing `lib/auth/auth.config.ts` in dev sometimes needs a dev-server
  restart; NextAuth builds its instance once at import.
- Tests: `vitest.config.mts` aliases `@/lib/db/client` to
  `test/helpers/test-db.ts` and tests mock `@/lib/auth/auth`. PGlite has one
  connection; inside a `getClient()` transaction use only that client.

## Using Gemini CLI for large reads

For whole-repo questions that would overflow context, `gemini -p` with `@`
paths (relative to where you run it) reads files into Gemini's context:

```bash
gemini -p "@app/api/ @lib/ Does every slot write check owner_id against the session?"
gemini -p "@db/migrations/ @types/database.ts Do the TypeScript types match the schema?"
```
