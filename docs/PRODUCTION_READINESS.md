# ParkBoard: production readiness (September 2026)

## Where things stood on 2026-09-26

- The v2 contact-board plan had M-001 done (June 17); M-002 to M-007 were
  pending and the build was paused until the leaked secrets were rotated.
- 20 files still used the Supabase client while the data lived on Neon, so
  signup, browsing and every data API route were broken.
- `parkboard.app` no longer resolves (DNS returned NXDOMAIN on 2026-09-26). The
  plan noted it expired on 2026-07-29 unless renewed.
- On Windows, cloning the repo left an empty working tree, because
  `docs/actual_deployment-instructions_20251017-08:36.yaml` has a colon in its
  name.

This branch finishes v2 (M-002 to M-007), fixes what the audit found, and
leaves only dashboard work for the owner.

## Findings

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | Four credentials were committed to this public repo (Neon password, Supabase service_role, NEXTAUTH_SECRET, Google OAuth secret). Whether the June 17 rotation happened is unknown. The local `.env.prod` on finch predates the playbook and still holds the Supabase keys. | Checks and steps below. Rotation is the only real fix; the history still has the values. |
| 2 | Critical | `next@14.2.33` had critical/high advisories (Server Components DoS among them) whose only fix is 16.x; `next-auth@5.0.0-beta.30` pulled in an `@auth/core` with a critical advisory. | Next 16.3.6, React 19.3, next-auth 5.0.0-beta.32. `npm audit --omit=dev`: 0. |
| 3 | High | The "edge-safe" `auth.config.ts` ended with `export { auth } from './auth'`, so the middleware bundle loaded `pg` and `bcrypt` anyway (plan constraint C-005). | `proxy.ts` builds its own NextAuth instance from a config that imports nothing database-related; a test fails if that changes. |
| 4 | High | Login rate limiting used an in-memory `Map`. On Vercel each cold start begins empty and instances don't share it. | Postgres-backed limits: 5 logins per email and 20 per IP per 15 minutes, 5 signups per IP per hour, 30 contact reveals per resident per hour, 5 feedback messages per IP per hour. |
| 5 | High | Anyone on the internet could register and reveal residents' phone numbers. | Optional residents' code (`SIGNUP_INVITE_CODE`) for registration, plus the reveal limit above. |
| 6 | Medium | The database pool set `ssl.rejectUnauthorized: false`, turning off certificate checks to Neon. | Removed; `sslmode=require` in the Neon URL verifies the certificate. |
| 7 | Medium | Login answered faster for unknown emails (no bcrypt work), which reveals which emails have accounts. | Unknown emails are compared against a dummy bcrypt hash. |
| 8 | Medium | No way to recover a forgotten password. | Profile page can change the password; `npm run reset-password -- <email>` lets the owner issue a temporary one. |
| 9 | Low | The tracked `.env.example` had a real-looking 16-character `DB_PASSWORD` (not a common default). | Replaced with placeholders. If that password is used for anything (a local Postgres on finch?), change it. |
| 10 | Low | CI and deploy workflows still used Supabase secrets; Playwright reports and scratch files were committed. | Removed; one CI workflow (lint, typecheck, test, build). Vercel's Git integration deploys. |
| 11 | Low | The colon in the file name above broke every Windows checkout. | Renamed to `...-0836.yaml` (content unchanged). |

## What v2 looks like now

- Data: `db/migrations/001_contact_board.sql` (the v2 schema from
  `schema_v2.sql` without its DROPs, plus a database-level "phone or Viber"
  check) and `002_rate_limits_and_feedback.sql`. `npm run db:migrate` applies
  them and refuses to run against a database that still has v1 tables; the
  production build runs it too (runbook step 2). The
  DROPs live in `db/reset_v1_tables.sql` for the case where an old database
  is reused.
- API: `/api/auth/signup`, `/api/profile`, `/api/slots` (list; `?mine=1`;
  create), `/api/slots/:id` (detail, owner edit/mark taken, owner soft
  delete), `/api/slots/:id/contact` (the only source of phone/Viber),
  `/api/feedback`, `/api/health`.
- Pages: landing, browse (Available / Mine), post, detail with Show contact
  and owner actions, edit, login, register, profile.
- Deleted: bookings, OAuth callback and profile completion, the test-accounts
  page, the tenant helper, all Supabase code and dependencies, the ad banner,
  v1 migrations, schemas, scripts, tests and e2e specs (117 files).

Where this departs from the plan:

- Next 16 wasn't in the plan; the advisories in finding 2 forced it, and
  M-002 to M-004 rewrote those pages anyway. `middleware.ts` became
  `proxy.ts` (Next 16's name).
- Tests use Vitest with PGlite (real Postgres in WASM) instead of Jest, the
  same setup as washboard and carpool. 36 tests cover the plan's acceptance
  criteria, including the static checks for R-004 and C-005.
- M-003 was marked "full planner". It was built directly, with the invariants
  written as tests first, because the plan's spec for it was already
  complete.
- The end-to-end flow (register, post, reveal as a second resident, non-owner
  403s, mark taken, edit, remove, sign out, profile) was checked by hand in a
  browser on 2026-09-29 rather than as a Playwright spec.
- Added beyond the plan: profile page with password change, the "Mine" view,
  residents' code, feedback, health endpoint.

## Feedback

A "Feedback" button on every page opens a short form (problem / idea /
other, message, optional contact). Messages go to the `feedback` table and,
if `FEEDBACK_WEBHOOK_URL` is set, to a Discord channel. Read them in the Neon
SQL editor:

```sql
SELECT created_at, kind, message, contact, page FROM feedback ORDER BY created_at DESC;
```

Hosted form services (Tally, Web3Forms 250/month free, Formspree 50/month
free) were passed over: the data already lives in Neon's free tier, and the
in-app form knows which page and resident it came from.

## Deploy runbook

### 1. Check and finish the secret rotation

The June 17 playbook listed four secrets. For each, check first:

| Secret | How to check | If not done |
|--------|--------------|-------------|
| Neon `neondb_owner` password | From WSL on finch or reese, try the old `DATABASE_URL` from `.env.prod`: `psql "<old url>" -c 'select 1'`. "password authentication failed" means it was rotated. | Neon Console → project → Roles → `neondb_owner` → Reset password. |
| `NEXTAUTH_SECRET` | Vercel → project → Settings → Environment Variables shows when each variable was last updated. | Generate a new one (`openssl rand -base64 32`) and set it as `AUTH_SECRET`. Existing sessions end, which is fine. |
| Supabase `service_role` | Is the ParkBoard project still listed in the Supabase dashboard? | Settings → General → Delete project. Nothing in the code uses Supabase any more. |
| Google OAuth secret | Google Cloud Console → project `strange-mariner-474408-r4` → APIs & Services → Credentials: does client `362366995353-…` still exist? | Delete the client. OAuth is not used. |

Also look at GitHub → repo → Security → Secret scanning alerts.

### 2. Database

Create a new Neon branch for v2 (or a new project) and copy its pooled
connection string. You don't need to migrate it by hand: `npm run build`
runs `scripts/migrate.mjs --vercel` first, which applies pending migrations
when Vercel builds Production (`VERCEL_ENV=production`) and skips them in
preview and local builds. To see what a database has, or to migrate it
yourself:

```bash
DATABASE_URL="<pooled string>" npm run db:migrate -- --status
DATABASE_URL="<pooled string>" npm run db:migrate
```

Note: on finch, `.env.local`'s `NEON_CONNECTION_STRING` is the same as
`.env.prod`'s `DATABASE_URL`, so local development was pointed at the
production database. Point local work at the new dev branch instead.

### 3. Domain

`parkboard.app` has lapsed. The free option is a subdomain of a domain you
already have, e.g. `parkboard.ithinkandicode.space` (washboard runs on
`washboard.ithinkandicode.space`): add it in Vercel → Domains and create the
CNAME it shows. Re-registering `parkboard.app` is the paid alternative, if it
is still available.

### 4. Vercel

Project → Settings → Environment Variables (Production and Preview):

- `DATABASE_URL`: the v2 branch's pooled string
- `AUTH_SECRET`: new random value
- `SIGNUP_INVITE_CODE`: the residents' code (recommended)
- `FEEDBACK_WEBHOOK_URL`: optional Discord webhook
- delete every `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*` and `GOOGLE_*`
  variable, and `NEXTAUTH_URL` if it still says `parkboard.app` (the app
  trusts Vercel's host header)

Check Settings → Build and Deployment: the Build Command must be the default
(`npm run build`), because that is what applies migrations.

Then merge the PR. The production build migrates the database, then Vercel
deploys `main`. If `DATABASE_URL` still points at the v1 database, the
build fails with "This database still has the v1 marketplace schema" and the
current deployment stays up; fix the variable and redeploy.

### 5. Smoke test on a phone

`/api/health` → `{"ok":true}`; `/api/health?db=1` → `"db":"ok"`. Register
with the residents' code, post a slot, open it in a private window (no
contact shown, "Log in to see contact"), register a second account, reveal
the contact, mark the slot taken from the first account, send a feedback
message and find it in the table.

### 6. Uptime

UptimeRobot's free plan (50 monitors, 5-minute checks, email alerts) on
`/api/health`. Don't monitor `?db=1`; checking the database every 5 minutes
keeps Neon's compute awake and uses up the free 100 compute-hours a month.

### 7. Local copies of secrets

`.env.dev` / `.env.local` / `.env.prod` on finch (copied to reese on
2026-09-28) are hand-maintained reference files; no code reads `.env.dev` or
`.env.prod`. After rotating, update or delete them. The v2 app needs only
the variables in `.env.example`.

## Changing the schema after launch

`npm test` runs every migration on an empty database, twice, and
`test/migrate.test.ts` checks the runner itself. None of that sees
production's rows, and some migrations only fail on real data: a new unique
index fails if two rows already share the value, and a new `NOT NULL` column
without a default fails if the table has rows. On Vercel that failure stops
the build (the old deployment stays up), so you would find out at deploy
time.

Before merging a pull request that adds a file to `db/migrations/`, try it on
a copy of production:

1. Neon Console → project → Branches → Create branch, with the production
   branch as parent, at the current point in time. Branches are
   copy-on-write, so it is ready in seconds and production is untouched.
2. Copy the new branch's pooled connection string and run:
   ```bash
   DATABASE_URL="<branch string>" npm run db:migrate
   ```
   Each pending file should print `ran`. A `FAILED` line names the file and
   the Postgres error; fix the migration, or the rows it trips over, before
   merging.
3. Delete the branch, so copies of residents' data don't pile up.

Migrations run before the new code goes live, and if `next build` fails
after them, the old code keeps running on the new schema. So add tables and
columns freely, but drop or rename something only in a later migration, once
no deployed code uses it.

## Tradeoffs

- Registration is open unless `SIGNUP_INVITE_CODE` is set. With it, anyone
  in the building chat can pass the code on; there is no check that a person
  lives in the unit they type.
- Contact reveals are limited to 30 per resident per hour, not blocked. A
  registered resident can still collect numbers slowly; there is no log of
  who revealed whose number.
- Sessions are JWTs (plan C-003). Logging out ends the session in that
  browser, but a stolen token stays valid until it expires (30 days) or
  `AUTH_SECRET` changes. Washboard's database sessions can be revoked
  individually; moving parkboard to them would contradict the plan and was
  not done.
- Password reset is manual (owner runs a script). Email reset needs an email
  provider and a verified sending domain.
- Rate limits fail open: if the database errors during the check, the
  request goes through rather than locking everyone out.
- Preview deployments don't migrate, because they may share the production
  database. A preview of a branch that adds a migration runs against the old
  schema until it is merged.
- Slot times are entered in the resident's own time zone (the building is in
  Manila) and stored as UTC.
- Vercel Hobby terms say "non-commercial, personal use"; a free community
  board fits that.

## Not done

- Notifications (plan C-009 keeps v2 without them).
- Automated browser tests in CI.
- Git history scrub (playbook step 6), optional once rotation is done.
