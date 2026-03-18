# Middleware Fix Required for CUJ-021 Test Execution

**Issue:** Middleware fails to build due to PostgreSQL dependencies in Edge runtime
**Impact:** E2E tests cannot run (dev server won't start)
**Priority:** BLOCKER for CUJ-021 test execution

---

## Error Summary

```
Error: The edge runtime does not support Node.js 'crypto' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
```

**Root Cause:** `middleware.ts` imports from `@/lib/auth/auth` which uses `pg` (node-postgres) package. The `pg` package uses Node.js `crypto` module which is incompatible with Next.js Edge Runtime.

---

## Current Problematic Code

**File:** `/home/finch/repos/parkboard/middleware.ts` (Line 11)

```typescript
export { auth as middleware } from '@/lib/auth/auth'
```

**Why this fails:**
- `lib/auth/auth.ts` imports `Pool` from `pg` (PostgreSQL driver)
- `pg` package uses Node.js `crypto` module for authentication
- Next.js middleware runs on Edge Runtime (doesn't support Node.js crypto)
- Result: Build error

---

## Solution: Use Edge-Compatible Auth Config

NextAuth.js v5 requires separating edge-compatible config from full config:

1. **`lib/auth/auth.config.ts`** - Edge-compatible (no DB, no Node.js APIs)
2. **`lib/auth/auth.ts`** - Full config with providers and DB (Server Components, API routes only)

### Option 1: Use NextAuth Middleware Wrapper (Recommended)

Create a new middleware wrapper that uses edge-compatible config:

**File:** `/home/finch/repos/parkboard/lib/auth/middleware.ts` (NEW FILE)

```typescript
// lib/auth/middleware.ts - Edge-compatible NextAuth middleware
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { auth: authMiddleware } = NextAuth(authConfig)
```

**Update:** `/home/finch/repos/parkboard/middleware.ts`

```typescript
export { authMiddleware as middleware } from '@/lib/auth/middleware'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
```

### Option 2: Use authConfig Directly (Alternative)

**Update:** `/home/finch/repos/parkboard/middleware.ts`

```typescript
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
```

---

## Verification Steps

After applying the fix:

1. **Build Check:**
   ```bash
   npm run build
   ```
   - Should complete without errors
   - No "edge runtime" errors
   - Middleware should compile successfully

2. **Dev Server Check:**
   ```bash
   npm run dev
   ```
   - Server should start on port 3000
   - No middleware errors in console
   - Can access http://localhost:3000

3. **E2E Test Execution:**
   ```bash
   npx playwright test e2e/api-cross-community-isolation.spec.ts
   ```
   - All 12 tests should run
   - Expected pass rate: 100%

---

## Why This Architecture Exists

From CLAUDE.md:

> **Important:** Middleware uses `auth.config.ts` (edge-compatible) while API routes and Server Components use `auth.ts` (full config with database access).

**Separation of Concerns:**
- **Edge Runtime (Middleware):** Fast, global, minimal APIs → Use `auth.config.ts`
- **Node.js Runtime (API Routes):** Full Node.js APIs, database access → Use `auth.ts`

**Edge Runtime Limitations:**
- No `fs`, `crypto`, `http`, `net` modules
- No direct database connections (use REST APIs instead)
- Limited to 1MB code size
- Designed for fast authorization checks only

---

## Impact Analysis

### What Works Now
- API routes: Use full `auth.ts` with database (✓ Working)
- Server Components: Use full `auth.ts` with database (✓ Working)
- Client Components: Use NextAuth session hooks (✓ Working)

### What's Broken
- Middleware: Cannot import `auth.ts` due to `pg` dependency (✗ BROKEN)
- Dev Server: Won't start due to middleware build error (✗ BROKEN)
- E2E Tests: Cannot run without dev server (✗ BLOCKED)

### What's Fixed After Applying Solution
- Middleware: Uses edge-compatible `authConfig` (✓ Fixed)
- Dev Server: Starts successfully (✓ Fixed)
- E2E Tests: Can run CUJ-021 test suite (✓ Unblocked)

---

## References

### NextAuth.js v5 Documentation
- [Middleware Documentation](https://authjs.dev/reference/nextjs#middleware)
- [Edge Compatibility](https://authjs.dev/guides/edge-compatibility)

### ParkBoard Documentation
- **CLAUDE.md** (Lines 130-145): Documents auth architecture split
- **lib/auth/auth.config.ts** (Lines 1-15): Edge-compatible config comments
- **lib/auth/auth.ts** (Lines 1-12): Full config comments

### Related Files
- `/home/finch/repos/parkboard/middleware.ts` - Needs fix (line 11)
- `/home/finch/repos/parkboard/lib/auth/auth.config.ts` - Edge-compatible config
- `/home/finch/repos/parkboard/lib/auth/auth.ts` - Full config with DB

---

## Recommended Action

**Immediate (Required for CUJ-021):**
1. Apply Option 1 or Option 2 fix to `middleware.ts`
2. Run `npm run build` to verify no errors
3. Run `npm run dev` to start dev server
4. Execute CUJ-021 test: `npx playwright test e2e/api-cross-community-isolation.spec.ts`

**Long-term (Code Quality):**
1. Update CLAUDE.md to warn about this gotcha
2. Add linting rule to prevent importing `lib/auth/auth.ts` in middleware
3. Add build check in CI/CD to catch edge runtime violations early

---

**Status:** Fix documented, ready to implement
**Test File:** `/home/finch/repos/parkboard/e2e/api-cross-community-isolation.spec.ts` (Complete, waiting for fix)
**Summary:** `/home/finch/repos/parkboard/TEST_CUJ-021_SUMMARY.md`
**This Document:** `/home/finch/repos/parkboard/MIDDLEWARE_FIX_REQUIRED.md`
