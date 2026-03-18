# Security Architecture

**Document Version:** 1.0
**Date:** 2025-12-14
**Status:** Production Architecture
**Project:** ParkBoard Multi-Tenant Parking Marketplace

---

## Executive Summary

ParkBoard implements a **defense-in-depth security architecture** using application-level tenant isolation combined with NextAuth.js v5 authentication. This document explains the architectural decisions, implementation patterns, and security trade-offs that all developers must understand when working with this codebase.

**Key Security Principles:**
1. **Application-Level Tenant Isolation** - Explicit community code filtering in all database queries
2. **Defense-in-Depth** - Multiple security layers (authentication, authorization, database constraints)
3. **Server-Side Trust Boundary** - Never trust client-provided data (especially prices)
4. **Least Privilege** - Users only access data from their own community
5. **Security by Design** - Reusable helper functions enforce tenant isolation consistently

---

## 1. Authentication & Authorization Model

### Architecture Overview

ParkBoard uses **NextAuth.js v5** as the primary authentication system with a PostgreSQL database (Neon/local). The system previously supported Supabase but has migrated to a pure NextAuth.js architecture for production.

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                         │
└─────────────────────────────────────────────────────────────┘

  User Signup/Login
       │
       ├──> NextAuth.js v5 (lib/auth/auth.ts)
       │       │
       │       ├──> Credentials Provider
       │       │      (Community Code + Email + Password)
       │       │
       │       └──> JWT Session Strategy
       │              (Serverless-optimized)
       │
       ├──> Database Validation (PostgreSQL)
       │      │
       │      ├──> Verify community_code exists (communities table)
       │      ├──> Lookup user (user_profiles table)
       │      └──> Verify bcrypt password hash
       │
       └──> JWT Token Created
              │
              ├──> userId
              ├──> communityCode (CRITICAL for tenant isolation)
              ├──> email
              ├──> name
              ├──> phone
              └──> unitNumber

  Subsequent Requests
       │
       ├──> Middleware (middleware.ts)
       │      Uses: lib/auth/auth.config.ts (edge-compatible)
       │      Enforces: Protected routes require valid session
       │
       ├──> API Routes (app/api/*)
       │      Uses: lib/auth/auth.ts (full config with DB)
       │      Pattern: await getSessionWithCommunity()
       │
       └──> Server Components
              Uses: const session = await auth()
              Access: session.user.communityCode
```

### Why NextAuth.js v5?

**Reasons for Choosing NextAuth.js:**
1. **Serverless-Optimized** - JWT strategy requires no session store (perfect for Neon/Vercel)
2. **Framework Integration** - First-class Next.js 14 App Router support
3. **Flexibility** - Custom credentials provider with community code validation
4. **Session Security** - Signed JWT tokens prevent tampering
5. **Edge Runtime Support** - Middleware auth checks run on Edge (low latency)

**Authentication Flow:**
```typescript
// 3-Field Authentication (Community Code + Email + Password)
async authorize(credentials) {
  // Step 1: Validate all three fields
  if (!credentials?.communityCode || !credentials?.email || !credentials?.password) {
    return null
  }

  // Step 2: Query with BOTH email AND community_code (tenant isolation starts here)
  const result = await db.query(
    `SELECT id, email, name, phone, unit_number, password_hash, community_code
     FROM user_profiles
     WHERE email = $1 AND community_code = $2`,
    [email, communityCode]
  )

  // Step 3: Generic error prevents enumeration attacks
  if (result.rows.length === 0) {
    console.error('[Auth] Invalid credentials or community code')
    return null  // Don't reveal which field failed
  }

  // Step 4: Verify bcrypt password hash
  const passwordValid = await bcrypt.compare(password, user.password_hash)
  if (!passwordValid) {
    return null
  }

  // Step 5: Return user with communityCode for session
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    unitNumber: user.unit_number,
    communityCode: user.community_code,  // CRITICAL: Stored in JWT
  }
}
```

### Session Data Structure

**JWT Token Contents:**
```typescript
{
  userId: string           // User UUID
  communityCode: string    // "lmr_x7k9p2" (CRITICAL for tenant isolation)
  email: string
  name: string
  phone: string | null
  unitNumber: string | null
}
```

**Exposed to Client via Session:**
```typescript
// Accessible in client components via useSession()
{
  user: {
    id: string
    communityCode: string    // Available in client code
    email: string
    name: string
    phone: string | null
    unitNumber: string | null
  }
}
```

---

## 2. Why Not Database RLS?

### Context: Migration 003 is Skipped

**Current Status:** Migration `003_community_rls_policies_idempotent.sql` exists but is **NOT applied** to production databases.

**Why?** There is an architectural mismatch between NextAuth.js JWT sessions and Supabase Auth's RLS `auth.uid()` function.

### Technical Reason: Authentication System Mismatch

**The Problem:**

Supabase Row Level Security (RLS) policies rely on `auth.uid()` to identify the current user:
```sql
-- Example RLS policy (from migration 003 - NOT USED)
CREATE POLICY "community_read_slots" ON parking_slots
  FOR SELECT
  USING (
    status = 'active' AND
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );
```

**Why This Doesn't Work with NextAuth.js:**

1. **NextAuth.js uses JWT tokens** - User identity stored in signed JWT cookie
2. **Supabase Auth uses session cookies** - Session stored in database, `auth.uid()` available
3. **`auth.uid()` returns NULL** - NextAuth JWT tokens don't populate Supabase's auth schema
4. **RLS policies fail open** - When `auth.uid()` is NULL, policies can't enforce user-based rules

**Attempted Workarounds (All Rejected):**

| Approach | Why It Doesn't Work |
|----------|---------------------|
| **Set session variable `app.current_user`** | Edge runtime (middleware) can't set database session variables |
| **Dual auth (NextAuth + Supabase Auth)** | Maintaining two auth systems is complex and error-prone |
| **Custom Postgres extension** | Neon serverless doesn't support custom extensions |
| **Service role bypass RLS** | Defeats the purpose of RLS entirely |

### Trade-Off Analysis

| Approach | Security | Performance | Complexity | Maintainability | Verdict |
|----------|----------|-------------|------------|-----------------|---------|
| **Application-Level Filtering** | ✅ High (explicit checks) | ✅ Fast (indexed queries) | ✅ Low (simple WHERE clauses) | ✅ High (visible in code) | **✅ CHOSEN** |
| **Database RLS (Supabase Auth)** | ⚠️ Medium (requires `auth.uid()`) | ✅ Fast (database-enforced) | ⚠️ Medium (implicit policies) | ⚠️ Medium (policy debugging hard) | ❌ Not compatible with NextAuth |
| **Hybrid (App + RLS)** | ✅ High (defense-in-depth) | ⚠️ Medium (double checks) | ❌ High (two systems) | ❌ Low (confusing architecture) | ❌ Over-engineered for MVP |

**Decision: Application-Level Tenant Isolation**

**Rationale:**
- ✅ **Compatible** with NextAuth.js JWT sessions
- ✅ **Explicit** - Developer sees tenant filtering in every query
- ✅ **Testable** - Unit tests can verify filtering logic
- ✅ **Debuggable** - SQL queries visible in logs
- ✅ **Portable** - Works with any PostgreSQL provider (Neon, Supabase, local)
- ⚠️ **Trade-off** - Requires developer discipline (but enforced by helper functions)

---

## 3. Tenant Isolation Implementation

### Required Pattern for ALL Database Queries

**RULE 0:** Every database query that accesses tenant-scoped data MUST filter by `community_code`.

**Helper Functions (lib/auth/tenant-access.ts):**

```typescript
// ============================================================================
// HELPER 1: Get session with community context
// ============================================================================
export async function getSessionWithCommunity(): Promise<
  SessionWithCommunity | TenantAccessError
> {
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
    communityCode: session.user.communityCode,  // CRITICAL: Use this in queries
  }
}

// ============================================================================
// HELPER 2: Ensure user has access to requested community
// ============================================================================
export function ensureCommunityAccess(
  requestedCommunity: string,
  userCommunity: string
): { error?: string; status?: number } {
  if (requestedCommunity !== userCommunity) {
    return {
      error: 'Access denied to other communities',
      status: 403,
    }
  }
  return {}
}
```

### CORRECT Example: API Route with Tenant Isolation

```typescript
// app/api/LMR/slots/route.ts (or any community-scoped API route)
import { NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { Pool } from 'pg'

export async function GET(request: Request) {
  // STEP 1: Get session with community context
  const authResult = await getSessionWithCommunity()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { communityCode } = authResult

  // STEP 2: Query database with community_code filter
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const result = await pool.query(
    `SELECT slot_id, slot_number, slot_type, price_per_hour, description
     FROM parking_slots
     WHERE community_code = $1 AND status = 'active'
     ORDER BY slot_number`,
    [communityCode]  // ✅ CRITICAL: Always filter by communityCode
  )

  return NextResponse.json({ slots: result.rows })
}
```

### WRONG Example: Missing Community Filter (SECURITY VULNERABILITY)

```typescript
// ❌ WRONG: This allows cross-community data access!
export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ❌ BUG: No community_code filter - returns ALL communities' slots!
  const result = await pool.query(
    `SELECT slot_id, slot_number, slot_type, price_per_hour, description
     FROM parking_slots
     WHERE status = 'active'
     ORDER BY slot_number`
  )

  return NextResponse.json({ slots: result.rows })
}
```

**Why This is Dangerous:**
- User from `lmr_x7k9p2` can see slots from `srp_m4n8q1`
- Violates tenant isolation
- GDPR/privacy violation (data leak)
- Fails security audit

### CORRECT Example: Client-Side Data Fetching

```typescript
// app/LMR/slots/page.tsx (or any community page)
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function SlotsPage() {
  const { data: session } = useSession()
  const [slots, setSlots] = useState([])

  useEffect(() => {
    async function fetchSlots() {
      // ✅ CORRECT: Session contains communityCode, API validates it server-side
      const response = await fetch('/api/LMR/slots')  // API enforces tenant isolation
      const data = await response.json()
      setSlots(data.slots)
    }

    if (session?.user?.id) {
      fetchSlots()
    }
  }, [session])

  return (
    <div>
      <h1>Parking Slots in {session?.user?.communityCode}</h1>
      {/* Render slots */}
    </div>
  )
}
```

### Code Review Checklist

Use this checklist when reviewing database queries:

**For API Routes:**
- [ ] Does the route call `getSessionWithCommunity()`?
- [ ] Does the route check for `'error' in authResult`?
- [ ] Do ALL database queries include `WHERE community_code = $1`?
- [ ] Is `communityCode` from the session passed as a parameter (not from request body)?
- [ ] Are URL parameters validated against session `communityCode` (e.g., `/LMR/` routes)?

**For Database Queries:**
- [ ] Does the SELECT query filter by `community_code`?
- [ ] Does the INSERT query set `community_code` from the session?
- [ ] Does the UPDATE query include `WHERE community_code = $1 AND {other conditions}`?
- [ ] Does the DELETE query include `WHERE community_code = $1 AND {other conditions}`?

**For Foreign Key Relationships:**
- [ ] When joining tables, does the query filter ALL tables by `community_code`?
- [ ] Example: `FROM parking_slots ps JOIN bookings b ON ps.slot_id = b.slot_id WHERE ps.community_code = $1`

---

## 4. Testing Requirements

### Unit Test Requirements

**File:** `__tests__/lib/auth/tenant-access.test.ts`

```typescript
import { getSessionWithCommunity, ensureCommunityAccess } from '@/lib/auth/tenant-access'
import { auth } from '@/lib/auth/auth'

jest.mock('@/lib/auth/auth')

describe('getSessionWithCommunity', () => {
  it('returns error when session is null', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const result = await getSessionWithCommunity()

    expect(result).toEqual({ error: 'Unauthorized', status: 401 })
  })

  it('returns error when user has no community code', async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    })

    const result = await getSessionWithCommunity()

    expect(result).toEqual({ error: 'No community assigned', status: 403 })
  })

  it('returns session data when valid', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        communityCode: 'lmr_x7k9p2'
      }
    }
    ;(auth as jest.Mock).mockResolvedValue(mockSession)

    const result = await getSessionWithCommunity()

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.userId).toBe('user-123')
      expect(result.communityCode).toBe('lmr_x7k9p2')
      expect(result.session).toEqual(mockSession)
    }
  })
})

describe('ensureCommunityAccess', () => {
  it('allows access when communities match', () => {
    const result = ensureCommunityAccess('lmr_x7k9p2', 'lmr_x7k9p2')
    expect(result).toEqual({})
  })

  it('denies access when communities do not match', () => {
    const result = ensureCommunityAccess('srp_m4n8q1', 'lmr_x7k9p2')
    expect(result).toEqual({
      error: 'Access denied to other communities',
      status: 403
    })
  })
})
```

### E2E Test Requirements

**Critical User Journey: CUJ-020 - Cross-Community Isolation**

**Test File:** `e2e/security/tenant-isolation.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Cross-Community Tenant Isolation', () => {
  test('CUJ-020: Users cannot access other communities data', async ({ page, context }) => {
    // SETUP: Create two users in different communities
    const lmrUser = {
      communityCode: 'lmr_x7k9p2',
      email: 'lmr.user@example.com',
      password: 'TestPassword123',
      name: 'LMR User',
      phone: '09171111111',
      unitNumber: '12-A'
    }

    const srpUser = {
      communityCode: 'srp_m4n8q1',
      email: 'srp.user@example.com',
      password: 'TestPassword456',
      name: 'SRP User',
      phone: '09172222222',
      unitNumber: '15-B'
    }

    // Register both users (assuming signup API works)
    await page.goto('/register')
    await page.fill('[name="communityCode"]', lmrUser.communityCode)
    await page.fill('[name="email"]', lmrUser.email)
    await page.fill('[name="password"]', lmrUser.password)
    await page.fill('[name="name"]', lmrUser.name)
    await page.fill('[name="phone"]', lmrUser.phone)
    await page.fill('[name="unitNumber"]', lmrUser.unitNumber)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/LMR/)

    // Create a parking slot as LMR user
    await page.goto('/LMR/slots/new')
    await page.fill('[name="slotNumber"]', 'A-101')
    await page.fill('[name="pricePerHour"]', '50')
    await page.click('button[type="submit"]')
    const lmrSlotCreated = await page.textContent('.success-message')
    expect(lmrSlotCreated).toContain('Slot created')

    // Logout LMR user
    await page.click('[data-testid="logout-button"]')

    // Login as SRP user in new context (prevent session contamination)
    const srpPage = await context.newPage()
    await srpPage.goto('/login')
    await srpPage.fill('[name="communityCode"]', srpUser.communityCode)
    await srpPage.fill('[name="email"]', srpUser.email)
    await srpPage.fill('[name="password"]', srpUser.password)
    await srpPage.click('button[type="submit"]')
    await expect(srpPage).toHaveURL(/\/SRP/)

    // SECURITY TEST 1: Browse slots - should NOT see LMR's slot
    await srpPage.goto('/SRP/slots')
    const slotList = await srpPage.textContent('.slot-list')
    expect(slotList).not.toContain('A-101')  // LMR's slot should be invisible

    // SECURITY TEST 2: Direct API access - should return 403
    const apiResponse = await srpPage.request.get('/api/LMR/slots')
    expect(apiResponse.status()).toBe(403)  // Access denied to other communities

    // SECURITY TEST 3: URL manipulation - navigate to LMR page should redirect
    await srpPage.goto('/LMR/slots')
    await expect(srpPage).toHaveURL(/\/SRP/)  // Should redirect to own community

    // SECURITY TEST 4: Create booking for LMR slot - should fail
    const bookingResponse = await srpPage.request.post('/api/bookings', {
      data: {
        slotId: 1,  // Assume this is LMR's slot
        startTime: '2026-01-15T10:00:00Z',
        endTime: '2026-01-15T12:00:00Z'
      }
    })
    expect(bookingResponse.status()).toBe(403)  // Cross-community booking denied
  })
})
```

**Test Coverage Requirements:**
- ✅ Verify API routes return 403 for cross-community access
- ✅ Verify UI shows only own community's data
- ✅ Verify URL manipulation (e.g., `/LMR/` → `/SRP/`) redirects or returns 403
- ✅ Verify database queries exclude other communities' records
- ✅ Verify foreign key relationships respect tenant boundaries

---

## 5. Future Considerations

### When to Implement Database RLS

**Scenarios Where Database RLS Becomes Necessary:**

1. **Regulatory Compliance Requirements**
   - GDPR Article 25 (Data Protection by Design)
   - HIPAA Security Rule (if handling health data)
   - PCI DSS Level 1 (if processing payments directly)

2. **Scale and Complexity**
   - 50+ communities (manual review of application-level checks becomes impractical)
   - Multiple development teams (need database-level guardrails)
   - High-value data (financial transactions, personal health records)

3. **Audit and Certification**
   - SOC 2 Type II compliance
   - ISO 27001 certification
   - Industry-specific certifications (e.g., FedRAMP for government)

4. **Technical Indicators**
   - Frequent tenant isolation bugs in code reviews
   - Complex query patterns (many joins, subqueries)
   - Multiple database access layers (ORM, raw SQL, stored procedures)

### Migration Path to Database RLS

**Option 1: Migrate to Supabase Auth (Full Migration)**

**Steps:**
1. Replace NextAuth.js with Supabase Auth client
2. Migrate user authentication to Supabase Auth (`auth.users` table)
3. Update RLS policies to use `auth.uid()` instead of session variables
4. Apply migration `003_community_rls_policies_idempotent.sql`
5. Remove `lib/auth/tenant-access.ts` (no longer needed)
6. Update all API routes to use Supabase client instead of `getSessionWithCommunity()`

**Trade-offs:**
- ✅ Database-enforced security (cannot be bypassed)
- ✅ Less application code (RLS handles filtering)
- ❌ Vendor lock-in to Supabase
- ❌ Requires re-authentication of all users
- ❌ Migration complexity (NextAuth → Supabase Auth)

**Effort Estimate:** 2-3 weeks (medium complexity)

---

**Option 2: Implement Custom RLS with Session Variables (Hybrid)**

**Steps:**
1. Create database function to set session variable: `set_current_user(user_id UUID, community_code TEXT)`
2. Call this function at the start of every API request (after NextAuth validation)
3. Update RLS policies to use `current_setting('app.current_user_community', true)`
4. Keep NextAuth.js for authentication, add RLS as secondary enforcement
5. Apply modified version of migration `003_community_rls_policies_idempotent.sql`

**Example:**
```typescript
// Middleware or API route wrapper
async function withRLS(handler) {
  return async (req, res) => {
    const session = await auth()
    if (session?.user?.id && session?.user?.communityCode) {
      // Set session variable for RLS policies
      await db.query(
        `SELECT set_current_user($1, $2)`,
        [session.user.id, session.user.communityCode]
      )
    }
    return handler(req, res)
  }
}
```

**Trade-offs:**
- ✅ Keep NextAuth.js (no re-authentication)
- ✅ Defense-in-depth (app-level + DB-level)
- ⚠️ Session variable overhead (every request)
- ⚠️ Edge runtime incompatibility (can't set DB session vars from middleware)
- ❌ Added complexity (two security layers)

**Effort Estimate:** 1-2 weeks (medium-low complexity)

---

**Option 3: Keep Application-Level, Add Monitoring (Recommended for MVP)**

**Steps:**
1. Keep current architecture (no changes)
2. Add automated testing for tenant isolation (E2E test CUJ-020)
3. Add database query logging and monitoring (detect queries without `community_code`)
4. Implement code linting rule to enforce `getSessionWithCommunity()` usage
5. Add security audit checklist to PR template

**Trade-offs:**
- ✅ No migration effort
- ✅ No breaking changes
- ✅ Proven architecture (already in production)
- ⚠️ Requires developer discipline
- ⚠️ Manual code review required

**Effort Estimate:** 2-3 days (low complexity)

**Recommendation:** Start with Option 3, migrate to Option 1 or 2 only if regulatory requirements demand it.

---

## 6. Security Incident Response

### How to Detect Tenant Isolation Breach

**Indicators of a Breach:**

1. **User Report:** "I can see parking slots from another building"
2. **Data Anomaly:** User from `lmr_x7k9p2` has booking for slot with `community_code = 'srp_m4n8q1'`
3. **Audit Log:** API request returned data from multiple communities in single response
4. **Automated Test Failure:** E2E test CUJ-020 fails (cross-community isolation)

**Monitoring Queries (Run Regularly):**

```sql
-- Detect cross-community bookings (should return 0 rows)
SELECT
  b.booking_id,
  b.renter_id,
  u.community_code AS renter_community,
  ps.community_code AS slot_community
FROM bookings b
JOIN user_profiles u ON b.renter_id = u.id
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE u.community_code != ps.community_code;

-- Detect users without community assignment (should return 0 rows)
SELECT id, email, community_code
FROM user_profiles
WHERE community_code IS NULL;

-- Detect slots without community assignment (should return 0 rows)
SELECT slot_id, slot_number, owner_id, community_code
FROM parking_slots
WHERE community_code IS NULL;
```

### Immediate Actions Checklist

**Within 1 Hour of Detection:**

- [ ] **Isolate the Vulnerability**
  - Identify affected API route(s)
  - Deploy hotfix to add `WHERE community_code = $1` filter
  - Restart application (clear any cached data)

- [ ] **Assess Impact**
  - Run monitoring queries to identify affected records
  - Determine how many users/communities were exposed
  - Check if any sensitive data was accessed (PII, payment info)

- [ ] **Contain the Breach**
  - Temporarily disable affected API endpoint (return 503)
  - Revoke API keys if third-party access is compromised
  - Force logout all users (invalidate JWT tokens by rotating `NEXTAUTH_SECRET`)

**Within 24 Hours:**

- [ ] **Deploy Permanent Fix**
  - Add missing `community_code` filter to query
  - Add unit tests to prevent regression
  - Update E2E tests to cover this scenario

- [ ] **Audit All Similar Code**
  - Search codebase for similar patterns: `grep -r "FROM parking_slots" --include="*.ts"`
  - Review all API routes for tenant isolation
  - Run security checklist on all database queries

- [ ] **Notify Affected Users (if required)**
  - Determine legal notification requirements (GDPR, CCPA, etc.)
  - Draft incident notification email
  - Send to affected users within 72 hours (GDPR requirement)

**Within 1 Week:**

- [ ] **Root Cause Analysis** (see next section)
- [ ] **Update Security Documentation**
- [ ] **Conduct Team Training**
  - Review tenant isolation patterns
  - Walk through incident timeline
  - Update code review checklist

### Root Cause Analysis Steps

**5 Whys Technique:**

1. **Why did the breach occur?**
   - API route did not filter by `community_code`

2. **Why was the filter missing?**
   - Developer was unaware of tenant isolation requirement
   - OR: Code review did not catch the omission

3. **Why was the developer unaware?**
   - Insufficient onboarding documentation
   - OR: No linting rule to enforce `getSessionWithCommunity()` usage

4. **Why was there no linting rule?**
   - Security architecture documentation did not specify enforcement mechanisms
   - OR: Team prioritized feature velocity over security tooling

5. **Why did the team prioritize velocity?**
   - MVP mindset (ship fast, iterate later)
   - OR: Insufficient understanding of multi-tenant security risks

**Corrective Actions:**

Based on root cause, implement one or more:
- Add ESLint rule to enforce `getSessionWithCommunity()` in API routes
- Add pre-commit hook to run tenant isolation tests
- Update PR template with security checklist
- Conduct mandatory security training for all developers
- Implement pair programming for API route development

---

## Appendix A: Security Review Checklist

Use this checklist for all pull requests that touch API routes or database queries:

### Authentication
- [ ] Does the route require authentication?
- [ ] If yes, does it call `getSessionWithCommunity()` or `await auth()`?
- [ ] Is the error response correct (`401 Unauthorized` or `403 Forbidden`)?

### Tenant Isolation
- [ ] Do all SELECT queries include `WHERE community_code = $1`?
- [ ] Do all INSERT queries set `community_code` from session (not request body)?
- [ ] Do all UPDATE queries include `WHERE community_code = $1 AND {condition}`?
- [ ] Do all DELETE queries include `WHERE community_code = $1 AND {condition}`?
- [ ] Are foreign key joins filtered by `community_code` on all tables?

### Input Validation
- [ ] Are request parameters validated (type, format, range)?
- [ ] Is user input sanitized (prevent SQL injection)?
- [ ] Are uploaded files validated (type, size, content)?

### Price Integrity
- [ ] Is `total_price` calculated server-side (never from client)?
- [ ] Are database triggers used for price calculation?
- [ ] Is the booking price verified against slot `price_per_hour`?

### Error Handling
- [ ] Do error messages avoid leaking sensitive information?
- [ ] Are database errors caught and logged (not exposed to client)?
- [ ] Are generic error messages used for authentication failures?

### Testing
- [ ] Are there unit tests for tenant isolation logic?
- [ ] Are there E2E tests covering this user journey?
- [ ] Does the test suite include cross-community access attempts (negative tests)?

---

## Appendix B: Related Documentation

### Architecture Documents
- **`docs/MULTI_TENANCY_IMPLEMENTATION_SUMMARY.md`** - Multi-tenant architecture overview
- **`docs/MULTI_TENANCY_IMPROVEMENTS.md`** - Design decisions and architecture spec
- **`CLAUDE.md`** - Project conventions and development guidelines

### Database Documentation
- **`db/schema_optimized.sql`** - Current database schema (single source of truth)
- **`db/migrations/002_multi_tenant_communities_idempotent.sql`** - Multi-tenant schema migration
- **`db/migrations/003_community_rls_policies_idempotent.sql`** - RLS policies (NOT APPLIED)
- **`db/migrations/004_remove_multi_tenant_idempotent.sql`** - RLS removal (APPLIED)

### Authentication Code
- **`lib/auth/auth.ts`** - NextAuth.js v5 configuration (full config with database)
- **`lib/auth/auth.config.ts`** - Edge-compatible auth config (for middleware)
- **`lib/auth/tenant-access.ts`** - Tenant isolation helper functions

### Testing
- **`e2e/security/tenant-isolation.spec.ts`** - E2E test for cross-community isolation (create this)
- **`__tests__/lib/auth/tenant-access.test.ts`** - Unit tests for tenant helpers (create this)

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-14 | @agent-developer | Initial comprehensive security architecture documentation |

---

**Review Status:** ✅ Ready for Technical Review
**Next Review:** Before production deployment or after security incident
**Owner:** Engineering Team
**Approvers:** Security Lead, Database Administrator, CTO
