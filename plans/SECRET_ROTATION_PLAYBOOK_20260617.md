# Secret Rotation Playbook — ParkBoard

**Date:** 2026-06-17
**Owner action required** — these are console/dashboard operations Claude cannot perform.
**This document contains NO secret values** (the repo is public; writing secrets back in is the exact bug being fixed). It references each secret by *location*, not value.

Companion runbook: [`plans/rotate-secrets.sh`](./rotate-secrets.sh) — automates the parts that can be scripted (generate `NEXTAUTH_SECRET`, set Vercel env, verify Neon, scan for leftover leaks, optional history scrub).

---

## Why

Four live credentials were committed to a **public** repo (`github.com/alfieprojectsdev/parkboard`) and remain in git history. The working tree was redacted (commit `7458854`) but **redaction does not neutralize an already-scraped secret — only rotation does.** Assume all four are compromised.

| # | Secret | Lives in (current) | Blast radius if abused |
|---|--------|--------------------|------------------------|
| 1 | Neon DB password (`neondb_owner` role) | `.env.dev`/`.env.prod` (local, gitignored) + git history | Full read/write to the database |
| 2 | Supabase `service_role` key (JWT) | git history; docs (now redacted) | Master key — bypasses all RLS on the Supabase project |
| 3 | `NEXTAUTH_SECRET` | git history; deploy docs (now redacted) | Forge any user's session JWT → impersonate anyone |
| 4 | Google OAuth `client_secret` | on-disk file (deleted 2026-06-17) + git history | Impersonate the OAuth app for GCP project `strange-mariner-474408-r4` |

**Priority order:** 1 (Neon) and 3 (NEXTAUTH_SECRET) gate the live app → do first. 2 and 4 belong to services v2 abandons → simplest fix is to **delete/revoke** them.

---

## 1. Neon DB password

- [ ] Neon Console → your ParkBoard project → **Branches → Roles** → `neondb_owner` → **Reset password**.
- [ ] Copy the new connection string (pooled, `?sslmode=require`).
- [ ] Update it **everywhere it's used** (see [§5](#5-update-env-everywhere)): Vercel env + local `.env.dev`/`.env.prod` (`DATABASE_URL` / `NEON_CONNECTION_STRING`).
- [ ] Verify: `bash plans/rotate-secrets.sh verify-neon "<new-connection-string>"` → expects `select 1` → `1`.

The moment the password is reset, the old leaked value is dead — including the copy in git history. **This single step is the most important in the playbook.**

> v2 plan applies `db/schema_v2.sql` to a **fresh Neon branch** (DL-002). Reset the password on the parent first, then branch — the branch inherits the rotated credential.

## 2. Supabase service_role key

v2 drops Supabase entirely, so **delete, don't rotate**:

- [ ] Supabase Dashboard → your project → **Settings → General → Delete project**.
  - This permanently kills the `service_role` key **and** the orphaned Supabase-Auth users from the old signup flow.
- [ ] (If you'd rather keep the project temporarily) Settings → **API → roll the JWT secret** instead — rotates `anon` + `service_role`.
- [ ] Remove `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` vars from Vercel env (M-006/M-001 also strip them from code).

## 3. NEXTAUTH_SECRET

- [ ] Generate a fresh value: `bash plans/rotate-secrets.sh gen-nextauth` (runs `openssl rand -base64 32`).
- [ ] Set it as `NEXTAUTH_SECRET` in Vercel env (Production **and** Preview) and local `.env.dev`/`.env.prod`.
- [ ] Do **not** commit it anywhere.
- [ ] Effect: all existing JWT sessions are invalidated (acceptable — ~no real users yet).

## 4. Google OAuth client_secret

OAuth is out of scope for v2 → **revoke, don't reissue**:

- [ ] Google Cloud Console → project `strange-mariner-474408-r4` → **APIs & Services → Credentials**.
- [ ] Find the OAuth 2.0 Client ID `362366995353-…apps.googleusercontent.com` → **delete the client secret** (or delete the whole OAuth client).
- [ ] On-disk `lib/client_secret_*.json` was already deleted (2026-06-17); confirm it's gone: `bash plans/rotate-secrets.sh scan`.
- [ ] Remove any `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from Vercel env.

---

## 5. Update env everywhere

After rotating, the new values must land in exactly two places (never git):

- [ ] **Vercel** (Project → Settings → Environment Variables), Production + Preview:
  - `DATABASE_URL` (and/or `NEON_CONNECTION_STRING`) ← new Neon string
  - `NEXTAUTH_SECRET` ← new value
  - `NEXTAUTH_URL` ← `https://parkboard.app` (unchanged)
  - Remove: `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`, `GOOGLE_*`
  - CLI option: `bash plans/rotate-secrets.sh set-vercel-env NEXTAUTH_SECRET` (needs `vercel login`).
- [ ] **Local** gitignored `.env.dev` / `.env.prod`: same `DATABASE_URL` + `NEXTAUTH_SECRET`.
- [ ] Confirm `.env.example` / `.env.vercel.example` hold **placeholders only** (already redacted).

---

## 6. (Optional) Scrub git history

Rotation makes the historical copies inert, so this is **hygiene, not urgency** — do it any time after rotating.

- [ ] Put the now-dead leaked strings (one per line, `OLD==>REDACTED`) in a **gitignored** file, e.g. `/tmp/secret-replacements.txt`.
- [ ] `bash plans/rotate-secrets.sh scrub-history /tmp/secret-replacements.txt`
  - Runs `git filter-repo --replace-text`. **Destructive:** rewrites every commit SHA, requires `git push --force`, breaks existing clones/PRs (incl. PR #1).
  - Coordinate before force-pushing if anyone else has the repo.

---

## 7. Done checklist

- [ ] Neon password reset + new string in Vercel + local + `verify-neon` passes
- [ ] Supabase project deleted (or JWT rolled)
- [ ] `NEXTAUTH_SECRET` regenerated + set in Vercel + local
- [ ] Google OAuth client secret revoked; on-disk file gone
- [ ] Supabase/Google vars removed from Vercel
- [ ] `bash plans/rotate-secrets.sh scan` reports **clean** working tree
- [ ] (optional) history scrubbed + force-pushed
- [ ] GitHub → repo **Security → Secret scanning alerts** reviewed/resolved

Once 1–5 are done, the leaked credentials are worthless and v2 code work can deploy safely.
