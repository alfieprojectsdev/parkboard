# Session Summary — March 18, 2026

**Status:** Analysis Complete — No Code Changes
**Branch:** `main`
**Session Focus:** Deep codebase analysis + authentication flow mapping
**Interruption:** LightDM crash mid-session; state fully restored from `/home/finch/repos/backup/claude-1000/` (session `f5b61a2f-4c97-4d1c-b828-41a6dd463554`)

---

## Session Goals

1. Run `/init` — review CLAUDE.md and suggest improvements
2. Run `codebase-analysis` skill — extract data models, hybrid pricing logic, multi-tenant requirements
3. Run `deepthink` skill — map the Supabase/NextAuth auth flow and its troubleshooting history

---

## Work Completed

### 1. CLAUDE.md Review (`/init`)

Analyzed existing CLAUDE.md against codebase and `.github/copilot-instructions.md`.

**Suggested improvements (not yet applied):**
- **Add:** Timezone convention — DB stores `TIMESTAMPTZ` as UTC; convert only when rendering in UI
- **Add:** `parking_slots.owner_id` nullable semantics — `NULL` = shared slot (anyone can book); non-null = owned slot (only owner can book)
- **Remove/Trim:** Gemini CLI section (~80 lines) — operational guide, not architecture context
- **Remove:** "Notes for Future Claude Instances" section — redundant with rest of file
- **Trim:** Security Checklist — mostly repeats the Security Architecture section
- **Trim:** Agent Workflow Example — verbose, adds little over the agent table
- **Update:** `.github/copilot-instructions.md` references outdated Supabase Auth model (pre-NextAuth migration)

### 2. Codebase Analysis — Artifacts Generated

Six documentation files were produced and written to the repo root:
- `DATAMODEL_INDEX.md` — Navigation guide
- `DATAMODEL_SUMMARY.txt` — Executive overview: 6 tables, 13 indexes, 4 triggers
- `DATAMODEL_REFERENCE.md` — Developer quick reference with query patterns
- `DATAMODEL_ANALYSIS.md` — Full technical reference (59 columns documented)
- `DATAMODEL_SCHEMA_VISUAL.md` — ASCII diagrams, ER relationships, trigger flows
- `DATAMODEL_DELIVERABLES.txt` — Coverage inventory

Auth analysis artifact:
- `docs/AUTHENTICATION_ARCHITECTURE_ANALYSIS.md` — 1,100+ line auth flow doc

### 3. DeepThink — Auth Flow Analysis

Six sub-questions answered (see full output in this session's chat). Key findings recorded below.

---

## Key Findings: Authentication Flow

### The Edge Runtime Split (Q1, Q4, Q5)

`auth.ts` imports `pg` (line 17) and `bcryptjs` (line 18) — Node.js-only modules that fail in Vercel's Edge Runtime (V8 isolate, no Node.js APIs). When `middleware.ts` originally imported from `auth.ts`, the build failed.

**Fix:** Split into two files:
- `auth.config.ts` — edge-safe: only `NextAuthConfig` type, route rules, `authorized` callback. No DB imports.
- `auth.ts` — full config: providers, bcrypt, pg pool, JWT/session callbacks. Node.js runtime only.

**5-commit debugging sequence (Jan 7, 2026):**
| Commit | Change |
|--------|--------|
| `f033d35` | Initial split: middleware imports from auth.config |
| `43ea289` | Removed wrapper, direct import path |
| `98193e1` | Fixed duplicate export in auth.config.ts |
| `786d2c3` | Updated import path references |
| `360dd55` | Final cleanup, removed dead code |

**Why auth.config.ts:84 re-export is safe:** `auth.config.ts` re-exports `{ auth }` from `auth.ts`. This looks dangerous (auth.ts imports pg/bcrypt) but is safe because `auth()` has two operational modes:
1. **Session verification** (middleware) — decodes/validates JWT using `jose` (Web Crypto API, edge-compatible). pg and bcrypt are never called.
2. **Provider authentication** (sign-in API route) — runs Credentials `authorize()`, calls bcrypt and pg. Only runs in Node.js runtime.

Middleware only ever triggers mode 1. Additionally, Next.js may tree-shake the unreachable Node.js imports from the edge bundle.

### JWT Token Lifecycle (Q2, Q3)

**5-hop chain:**

```
HOP 1 — authorize() [auth.ts:94-152]
  Returns: { id, email, name, phone, unitNumber, communityCode }
  (password_hash explicitly excluded)

HOP 2 — jwt() callback [auth.ts:182-201]
  if (user) { ... }  ← only runs on INITIAL sign-in
  Writes to token:
    token.userId        = user.id          [line 185]
    token.name          = user.name        [line 186]
    token.email         = user.email       [line 187]
    token.phone         = user.phone       [lines 190-192]
    token.unitNumber    = user.unitNumber  [lines 193-195]
    token.communityCode = user.communityCode [lines 196-198]
  Signed with NEXTAUTH_SECRET → HttpOnly cookie (30-day maxAge)

HOP 3 — middleware authorized() [auth.config.ts:41-75]
  Checks: !!auth?.user  [line 42]  ← boolean presence ONLY
  Does NOT check: communityCode, userId, or any payload field
  Community authorization is deferred to API routes (intentional design)

HOP 4 — API routes: getSessionWithCommunity() [tenant-access.ts:79-99]
  Calls auth() → triggers session() callback [auth.ts:208-219]
  session() maps token → session.user:
    session.user.id            = token.userId
    session.user.communityCode = token.communityCode  [line 216]
  Validates: session.user.id [line 84], session.user.communityCode [line 90]
  Returns: { userId, communityCode }

HOP 5 — Client components
  Via useSession(): all session.user fields available including communityCode
  Via useAuth() [AuthWrapper.tsx:20-26]: communityCode IS NOT AVAILABLE
    AuthUser interface = { id, email, name, phone, unitNumber } only
    communityCode is stripped — client components needing it must call useSession() directly
```

**Critical nuance:** `communityCode` is frozen in the JWT for up to 30 days. If a user's community assignment changes in `user_profiles`, the stale value persists until re-authentication.

**OAuth gap:** Google sign-in users have no path to get `communityCode` into their JWT. The `signIn()` callback redirects incomplete OAuth profiles to `/profile/complete` but does not set `communityCode` in the token. This is a gap in the current OAuth implementation.

### RLS vs NextAuth JWT — Architectural Tension (Q6)

**The incompatibility is a trust-domain mismatch, not a configuration issue.**

Supabase RLS's `auth.uid()` is resolved by Supabase's PostgREST gateway, which validates the Bearer token against Supabase's own JWT secret. NextAuth JWTs are signed with `NEXTAUTH_SECRET` — a completely separate key. PostgREST cannot validate the NextAuth token, so `auth.uid()` evaluates to `NULL`. Migration 003's 7 RLS policies all use `auth.uid()` — all would fail silently.

**Three bridging options (all rejected):**

| Option | Cost | Verdict |
|--------|------|---------|
| Session variable bridge (`set_config()`) | 1-2 weeks; connection pool scope bug in migration 003's implementation (`is_local=false` leaks across pooled connections in Neon) | Viable with fixes, but adds transaction overhead per request |
| Full Supabase Auth migration | 2-4 weeks; vendor lock-in; re-authenticate all users | Overkill for current scale |
| Dual session systems | Highest complexity; session drift risk | Correctly rejected |

**Current approach: service role + app-level filtering** via `getSessionWithCommunity()` is the correct trade-off because:
- Compatible with both Neon and Supabase providers (no vendor lock-in)
- `communityCode` is server-validated from the JWT (not trusted from client)
- Single auditable choke point, testable with unit tests
- Security is visible in code and detectable in review

**Accepted risk:** Unlike RLS, there is no database-layer backstop. A developer forgetting a `WHERE community_code = ?` clause creates a cross-tenant data leak. Mitigation: code review, CUJ-020 E2E test, automated audits.

**Single point of failure:** The entire tenant isolation model depends on `NEXTAUTH_SECRET` integrity. A weak or leaked secret enables full cross-community access with no database-layer protection.

---

## Open Action Items (Not Completed This Session)

- [ ] Apply CLAUDE.md improvements (see section 1 above)
- [ ] Add `communityCode` to `AuthWrapper.tsx` `AuthUser` interface OR document that `useSession()` must be used directly
- [ ] Verify `npm run build` produces no edge runtime warnings for `auth.config.ts:84` re-export chain
- [ ] Implement OAuth `communityCode` population path (currently missing for Google sign-in)
- [ ] Consider ESLint rule enforcing `getSessionWithCommunity()` usage in all API routes
- [ ] Validate `NEXTAUTH_SECRET` entropy (≥ 32 bytes random) and confirm it was never committed to git

---

## State Restoration Notes

- LightDM crash caused unresponsive screen; forced reboot
- All subagent outputs backed up to `/home/finch/repos/backup/claude-1000/-home-finch-repos-parkboard/f5b61a2f-4c97-4d1c-b828-41a6dd463554/tasks/`
- 8 agent outputs preserved: codebase analysis agents (×4), auth analysis agent (×1), deepthink subagents (×3)
- Session fully continued from backup — no work lost
- Agents whose results were lost mid-session: `aab7bd22e21ccbf35` (EdgeRuntime) and `a600750bc503ec39c` (JWT Lifecycle) — both recovered from backup files
