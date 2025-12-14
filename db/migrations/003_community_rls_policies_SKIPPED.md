# Migration 003: Community RLS Policies (SKIPPED)

**Status:** SKIPPED - Not applicable to current architecture

**Date Skipped:** 2025-12-14

**Reason:** ParkBoard uses NextAuth.js v5 for session management (JWT tokens), not Supabase session cookies. RLS policies in this migration use `auth.uid()` which requires Supabase Auth sessions, which we don't maintain.

## Architecture Context

**Current Auth Stack:**
- **User Management:** Supabase Auth (`auth.users` table)
- **Session Management:** NextAuth.js v5 (JWT tokens, not database sessions)
- **Tenant Isolation:** Application-level filtering via `lib/auth/tenant-access.ts`

**Why Skip RLS:**
- NextAuth.js provides `session.user.id` and `session.user.communityCode` in JWT tokens
- Supabase RLS policies use `auth.uid()` which reads from Supabase session cookies
- These two session systems don't communicate (JWT ≠ session cookies)
- Implementing RLS would require syncing NextAuth sessions → Supabase sessions (complex)

## Alternative Security Model

Instead of database-level RLS, ParkBoard implements **application-level tenant isolation**:

```typescript
// lib/auth/tenant-access.ts
export async function getSessionWithCommunity() {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (!session.user.communityCode) {
    return { error: 'No community assigned', status: 403 }
  }

  return {
    session,
    userId: session.user.id,
    communityCode: session.user.communityCode,
  }
}
```

**Usage in API routes:**
```typescript
const authResult = await getSessionWithCommunity()
if ('error' in authResult) {
  return NextResponse.json({ error: authResult.error }, { status: authResult.status })
}

const { communityCode } = authResult

const { data } = await supabaseAdmin
  .from('parking_slots')
  .select('*')
  .eq('community_code', communityCode)  // Application-level filtering
```

## Security Documentation

For complete security architecture details, see:
- **`docs/SECURITY_ARCHITECTURE.md`** - Comprehensive security model explanation
- **`lib/auth/tenant-access.ts`** - Tenant isolation helper functions
- **`CLAUDE.md`** - Security patterns and code review checklist

## Future Migration Path

If switching to database-level RLS in the future:

**Option 1: Full Supabase Auth Migration**
- Remove NextAuth.js v5 entirely
- Use Supabase Auth for session management
- Apply this migration (003) as-is
- **Effort:** 3-5 days
- **Trade-off:** Lose NextAuth features (custom JWT claims, flexible OAuth)

**Option 2: NextAuth Session Sync**
- Keep NextAuth.js v5
- Sync JWT sessions → PostgreSQL session variables
- Modify RLS policies to use `current_setting('app.user_id')` instead of `auth.uid()`
- **Effort:** 5-7 days
- **Trade-off:** Complex session synchronization, performance overhead

**Option 3: Keep Application-Level (Recommended)**
- Continue using application-level filtering
- Add monitoring and automated tests for tenant isolation
- Implement ESLint rules to detect missing `community_code` filters
- **Effort:** 1-2 days
- **Trade-off:** No defense-in-depth at database layer

## Decision Approval

**Approved By:** Engineering Lead
**Date:** 2025-12-14
**Review Date:** After production deployment or 6 months

**Risk Acceptance:**
- We accept the risk of developer error bypassing tenant filters
- We mitigate through code review, unit tests, E2E tests, and monitoring
- We will re-evaluate if scale (>10k users) or compliance requirements change

## Related Migrations

- **Migration 002:** Added multi-tenant schema (community_code column) - ✅ **APPLIED**
- **Migration 003:** RLS policies for multi-tenant isolation - ❌ **SKIPPED** (this migration)
- **Migration 004:** Removed multi-tenant (Oct 2025, later reversed) - ⏭️ **SKIP** (superseded)
- **Migration 005:** Neon compatibility fixes - ✅ **APPLY**
- **Migration 006:** NextAuth.js session tables - ✅ **APPLY**

## Migration Execution Notes

When running migrations:
```bash
npx tsx scripts/run-migrations.ts
```

The migration runner will:
1. Skip this migration (003) automatically if it contains `auth.uid()` references
2. Execute migration 005 (Neon compatibility)
3. Execute migration 006 (NextAuth tables)

**Manual Override (if needed):**
If you need to force-skip this migration without errors:
```bash
# Mark migration as executed without running it
psql $DATABASE_URL -c "INSERT INTO schema_migrations (migration_name) VALUES ('003_community_rls_policies_idempotent.sql') ON CONFLICT DO NOTHING;"
```

---

**Last Updated:** 2025-12-14
**Next Review:** After production deployment
