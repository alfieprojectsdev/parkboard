# Remaining P0 Security Work

**Document Date:** 2025-12-14
**Session:** Plan Execution - P0 Security Fixes
**Status:** 3 of 5 P0 Issues Resolved

---

## Completed P0 Issues ✅

### P0-001: RLS Policies - RESOLVED
**Status:** Documented as skipped, application-level tenant isolation implemented

**Solution:**
- Migration 003 (RLS policies) skipped - incompatible with NextAuth.js JWT sessions
- Comprehensive security architecture documented in `docs/SECURITY_ARCHITECTURE.md`
- Application-level tenant isolation via `lib/auth/tenant-access.ts`
- Security patterns added to `CLAUDE.md` with code review checklist

**Files:**
- `docs/SECURITY_ARCHITECTURE.md` - Complete security model (849 lines)
- `db/migrations/003_community_rls_policies_SKIPPED.md` - Skip explanation
- `CLAUDE.md` - Security Architecture section added

### P0-002: Session Missing communityCode - RESOLVED (Earlier Session)
**Status:** Fixed

**Solution:**
- Added `community_code` to `user_metadata` in signup route
- NextAuth.js JWT callback populates `session.user.communityCode`
- All API routes can now access user's community via session

**Files:**
- `app/api/auth/signup/route.ts` - Line 248 (user_metadata)
- `lib/auth/auth.ts` - JWT and session callbacks

### P0-003: Hardcoded /LMR Redirect - RESOLVED
**Status:** Documented as intentional MVP pattern

**Solution:**
- Created ADR-001: Hardcoded Community Routes for MVP
- Documented migration path to dynamic routing
- Explained trade-offs for MVP vs multi-community deployment

**Files:**
- `docs/adr/001-hardcoded-community-routes.md` - Complete ADR
- `docs/adr/README.md` - ADR index

---

## Remaining P0 Issues ❌

### P0-004: Missing Tenant-Isolated API Routes
**Status:** Design complete, implementation pending
**Priority:** HIGH (Security risk - direct Supabase queries in components)
**Estimated Effort:** 4-6 hours

**Current State:**
- Pages use direct Supabase client queries (not secure)
- No centralized API layer with tenant isolation
- Design document created: `docs/API_DESIGN.md`

**Required Implementation:**

#### 1. Parking Slots API (`app/api/slots/route.ts`)
**Files to Create:**
- `app/api/slots/route.ts` - List and create slots
- `app/api/slots/[id]/route.ts` - Update, delete specific slot

**Endpoints:**
```typescript
GET    /api/slots          - List slots (filtered by community)
POST   /api/slots          - Create slot
PATCH  /api/slots/[id]     - Update slot (owner only)
DELETE /api/slots/[id]     - Delete slot (owner only, no active bookings)
```

**Authentication Pattern:**
```typescript
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'

export async function GET(req: NextRequest) {
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { userId, communityCode } = authResult

  const { data } = await supabaseAdmin
    .from('parking_slots')
    .select('*')
    .eq('community_code', communityCode)  // REQUIRED - Tenant isolation
    .eq('status', 'active')

  return NextResponse.json({ data })
}
```

**Validation Requirements:**
- Use Zod schemas for request validation
- Validate ownership (owner_id === userId)
- Prevent changing community_code in updates
- Check no active bookings before delete

#### 2. Bookings API (`app/api/bookings/route.ts`)
**Files to Create:**
- `app/api/bookings/route.ts` - List and create bookings
- `app/api/bookings/[id]/route.ts` - Update (cancel) booking

**Endpoints:**
```typescript
GET    /api/bookings       - List bookings (renter or owner)
POST   /api/bookings       - Create booking
PATCH  /api/bookings/[id]  - Update booking (cancel only)
```

**Critical: Server-Side Price Calculation**
```typescript
// ❌ WRONG: Never trust client-provided price
const { total_price } = await req.json()

// ✅ CORRECT: Database trigger calculates price
const { data: slot } = await supabaseAdmin
  .from('parking_slots')
  .select('price_per_hour')
  .eq('id', slotId)
  .single()

// Let database trigger calculate total_price from:
// - slot.price_per_hour
// - booking.start_time
// - booking.end_time
```

**Validation Requirements:**
- Check slot exists in user's community
- Validate no booking overlap (database EXCLUDE constraint handles this)
- Only allow status changes to 'cancelled'
- Verify user is renter OR slot owner

#### 3. Profile API (`app/api/profile/route.ts`)
**Files to Create:**
- `app/api/profile/route.ts` - Get and update user profile

**Endpoints:**
```typescript
GET    /api/profile        - Get current user profile
PATCH  /api/profile        - Update profile (name, phone only)
```

**Security Requirements:**
- User can only access their own profile (userId from session)
- PREVENT changing: email, unit_number, community_code
- ALLOW changing: name, phone

**Implementation Checklist:**

- [ ] Create Zod validation schemas (`lib/validation/api-schemas.ts`)
- [ ] Implement `app/api/slots/route.ts` (GET, POST)
- [ ] Implement `app/api/slots/[id]/route.ts` (PATCH, DELETE)
- [ ] Implement `app/api/bookings/route.ts` (GET, POST)
- [ ] Implement `app/api/bookings/[id]/route.ts` (PATCH)
- [ ] Implement `app/api/profile/route.ts` (GET, PATCH)
- [ ] Write unit tests for each endpoint (tenant isolation)
- [ ] Write E2E test: CUJ-021 (API cross-community isolation)
- [ ] Update page components to use new APIs instead of direct Supabase

**Testing Requirements:**

**Unit Tests:**
```typescript
// __tests__/api/slots/route.test.ts
describe('GET /api/slots', () => {
  it('should filter slots by user community', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', communityCode: 'lmr_x7k9p2' }
    })

    await GET(mockRequest)

    expect(supabaseAdmin.from).toHaveBeenCalledWith('parking_slots')
    expect(query.eq).toHaveBeenCalledWith('community_code', 'lmr_x7k9p2')
  })

  it('should return 401 for unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(mockRequest)

    expect(response.status).toBe(401)
  })
})
```

**E2E Tests:**
```typescript
// __tests__/e2e/api-isolation.spec.ts
test('CUJ-021: API cross-community isolation', async ({ request }) => {
  // Login as LMR user
  const lmrUser = await loginUser('lmr_x7k9p2', 'lmr-user@test.com')

  // Attempt to access SRP slot via API
  const response = await request.get('/api/slots', {
    headers: { Cookie: lmrUser.cookies },
    params: { id: 'srp-slot-123' }  // Slot from different community
  })

  expect(response.status()).toBe(403)
  expect(await response.json()).toEqual({
    error: 'Access denied to other communities'
  })
})
```

---

### P0-005: Rate Limiting on Login Endpoint
**Status:** Not implemented
**Priority:** MEDIUM (Prevents brute-force attacks)
**Estimated Effort:** 2-3 hours

**Current State:**
- No rate limiting on `/api/auth/signin` endpoint
- Vulnerable to brute-force password attacks
- Vulnerable to community code enumeration attacks

**Required Implementation:**

#### Option A: Vercel Edge Middleware Rate Limiting
**Recommended:** Use Vercel's built-in rate limiting

**Files to Create:**
- Update `middleware.ts` to add rate limiting

**Implementation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
})

export async function middleware(req: NextRequest) {
  // Only rate limit auth endpoints
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    const ip = req.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      )
    }
  }

  // Continue to auth logic
  return NextAuth(req)
}
```

**Dependencies Required:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Upstash Setup:**
1. Create free Upstash account (https://upstash.com)
2. Create Redis database
3. Add to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

#### Option B: In-Memory Rate Limiting (Simpler, No External Dependency)
**Files to Create:**
- `lib/rate-limit.ts` - In-memory rate limiter

**Implementation:**
```typescript
// lib/rate-limit.ts
const rateLimit = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimit.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

// app/api/auth/signin - Add rate limiting
export async function POST(req: NextRequest) {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? '127.0.0.1'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    )
  }

  // Continue with authentication...
}
```

**Limitations:**
- Resets on server restart
- Doesn't work across multiple server instances
- Use Option A (Upstash) for production

**Testing Requirements:**
```typescript
test('Rate limiting blocks after 5 failed attempts', async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
  }

  // 6th attempt should be rate limited
  await page.fill('[name="password"]', 'wrongpassword')
  await page.click('button[type="submit"]')

  await expect(page.locator('.error')).toContainText('Too many login attempts')
})
```

---

## Additional Improvements (P1 Priority)

### P1-001: Add E2E Test for Cross-Community Isolation
**File:** `__tests__/e2e/cross-community-isolation.spec.ts`
**Status:** Not implemented
**Priority:** MEDIUM (Validates security model)

See `docs/SECURITY_ARCHITECTURE.md` for test specification.

### P1-003: Add ESLint Rule for Missing community_code Filter
**File:** `.eslintrc.js` - Custom rule
**Status:** Not implemented
**Priority:** LOW (Developer experience improvement)

**Goal:** Detect queries without `.eq('community_code', ...)` filter

---

## Deployment Readiness

**Current Status:** NOT production-ready

**Blockers:**
- ❌ P0-004: No tenant-isolated API routes (security risk)
- ❌ P0-005: No rate limiting (brute-force risk)

**Ready for Production When:**
- ✅ All P0 issues resolved
- ✅ E2E test CUJ-021 (API isolation) passes
- ✅ Rate limiting tested and verified
- ✅ Security checklist (CLAUDE.md) completed

**Estimated Time to Production-Ready:** 6-9 hours of implementation work

---

## Next Session Recommendations

### High Priority (Do First)
1. **Implement P0-004 API routes** (4-6 hours)
   - Start with GET /api/slots (simplest)
   - Then POST /api/bookings (most critical - price calculation)
   - Write unit tests as you go (TDD)

2. **Add rate limiting** (2-3 hours)
   - Use Option B (in-memory) for quick win
   - Upgrade to Option A (Upstash) before production

3. **Write E2E tests** (1-2 hours)
   - CUJ-021: API cross-community isolation
   - Rate limiting verification

### Medium Priority (Before Launch)
4. **Update page components** (2-3 hours)
   - Replace direct Supabase queries with API calls
   - Add error handling for API responses

5. **Run full security audit** (1 hour)
   - Verify security checklist (CLAUDE.md)
   - Manual testing of tenant isolation
   - Review all database queries for community_code filter

### Low Priority (Nice to Have)
6. **Add API documentation** (1 hour)
   - OpenAPI/Swagger spec
   - Example requests/responses

7. **Performance testing** (2 hours)
   - Load test API endpoints
   - Verify database query performance
   - Add indexes if needed

---

## Resources

**Documentation:**
- `docs/SECURITY_ARCHITECTURE.md` - Complete security model
- `docs/API_DESIGN.md` - REST API specification
- `docs/adr/001-hardcoded-community-routes.md` - Routing decision
- `CLAUDE.md` - Security Architecture section

**Helper Functions:**
- `lib/auth/tenant-access.ts` - getSessionWithCommunity(), ensureCommunityAccess()

**Testing:**
- `__tests__/e2e/` - Playwright E2E tests
- `npm run test:e2e` - Run E2E tests
- `npm test` - Run unit tests

**Tools:**
- `scripts/run-migrations.ts` - Database migration runner
- `scripts/capture-screenshots.ts` - Portfolio screenshots

---

**Last Updated:** 2025-12-14
**Next Review:** After P0-004 and P0-005 implementation
