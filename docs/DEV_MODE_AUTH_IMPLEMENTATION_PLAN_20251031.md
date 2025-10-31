# Dev-Mode Authentication Bypass - Implementation Plan

**Date:** 2025-10-31
**Project:** ParkBoard Minimal MVP
**Status:** Awaiting Root Instance Approval
**Priority:** HIGH (Blocks LMR Beta Testing)

---

## Executive Summary

**Problem:** MVP beta testing blocked by Supabase authentication dependency. Sister Elena needs to test the parking board locally without Supabase connection.

**Solution:** Implement development-mode authentication bypass that lets testers select a test user from a dropdown, bypassing Supabase entirely in local environment.

**Impact:** Zero production code changes. Dev mode only, controlled by environment variable.

**Timeline:** 2-3 hours implementation once approved.

---

## Business Context

### Why This Matters

**Stakeholder:** Sister Elena (LMR Community Admin)
**Use Case:** Test parking board before promoting to LMR residents
**Current Blocker:** Cannot test without Supabase account setup
**Risk if Not Fixed:** Delayed LMR deployment, reduced confidence in MVP

### Success Criteria

1. Elena can test all features locally without Supabase
2. Zero impact on production authentication
3. Clear visual indication when in dev mode
4. Easy to disable for production deployment

---

## Technical Approach

### Architecture Decision: Cookie-Based Dev Session

**Why cookies over localStorage:**
- Works with server-side auth checks (middleware)
- Simpler mental model (like real auth)
- Can be read by both client and server
- Matches production Supabase pattern

**Dev session cookie structure:**
```typescript
{
  user_id: '11111111-1111-1111-1111-111111111111',
  user_email: 'maria.santos@test.local',
  user_name: 'Maria Santos',
  dev_mode: true
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (1 hour)

#### 1.1 Environment Configuration

**File:** `.env.local`
```bash
# Dev Mode Authentication (NEVER set to true in production!)
DEV_MODE_AUTH=true

# Existing Supabase config (still required for client initialization)
NEXT_PUBLIC_SUPABASE_URL=https://cgbkknefvggnhkvmuwsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

#### 1.2 Dev Session Manager

**File:** `lib/auth/dev-session.ts` (NEW)

```typescript
/**
 * Dev-Mode Authentication Session Manager
 *
 * SECURITY: Only works when DEV_MODE_AUTH=true
 * SECURITY: Automatically disabled in production builds
 *
 * Purpose: Allows local testing without Supabase connection
 */

import Cookies from 'js-cookie'

const DEV_SESSION_COOKIE = 'parkboard_dev_session'
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE_AUTH === 'true'

export interface DevUser {
  id: string
  email: string
  name: string
  unit_number: string
  phone: string
}

/**
 * Get available test users from database
 * These users are seeded via scripts/seed-test-data-bypass-rls.sql
 */
export const TEST_USERS: DevUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'maria.santos@test.local',
    name: 'Maria Santos',
    unit_number: '10A',
    phone: '+63 917 123 4567'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'juan.delacruz@test.local',
    name: 'Juan dela Cruz',
    unit_number: '15B',
    phone: '+63 917 234 5678'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'elena.rodriguez@test.local',
    name: 'Elena Rodriguez',
    unit_number: '20C',
    phone: '+63 917 345 6789'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'ben.alvarez@test.local',
    name: 'Ben Alvarez',
    unit_number: '12D',
    phone: '+63 917 456 7890'
  }
]

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return DEV_MODE && process.env.NODE_ENV === 'development'
}

/**
 * Set dev session (select test user)
 */
export function setDevSession(userId: string): void {
  if (!isDevMode()) {
    console.warn('Dev mode not enabled - ignoring setDevSession')
    return
  }

  const user = TEST_USERS.find(u => u.id === userId)
  if (!user) {
    throw new Error(`Test user not found: ${userId}`)
  }

  const session = {
    user_id: user.id,
    user_email: user.email,
    user_name: user.name,
    dev_mode: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  }

  Cookies.set(DEV_SESSION_COOKIE, JSON.stringify(session), {
    expires: 1, // 1 day
    sameSite: 'strict'
  })

  console.log('✅ Dev session set:', user.name)
}

/**
 * Get current dev session
 */
export function getDevSession(): { user_id: string; user_name: string } | null {
  if (!isDevMode()) {
    return null
  }

  const cookie = Cookies.get(DEV_SESSION_COOKIE)
  if (!cookie) {
    return null
  }

  try {
    const session = JSON.parse(cookie)

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      clearDevSession()
      return null
    }

    return {
      user_id: session.user_id,
      user_name: session.user_name
    }
  } catch (error) {
    console.error('Failed to parse dev session:', error)
    return null
  }
}

/**
 * Clear dev session (logout)
 */
export function clearDevSession(): void {
  Cookies.remove(DEV_SESSION_COOKIE)
  console.log('🚪 Dev session cleared')
}

/**
 * Get dev user for middleware (server-side)
 * Returns user object that mimics Supabase user structure
 */
export function getDevUserForMiddleware(cookieValue: string | undefined): { id: string } | null {
  if (!isDevMode() || !cookieValue) {
    return null
  }

  try {
    const session = JSON.parse(cookieValue)

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return { id: session.user_id }
  } catch (error) {
    return null
  }
}
```

---

### Phase 2: UI Components (45 minutes)

#### 2.1 Dev User Selector

**File:** `components/auth/DevUserSelector.tsx` (NEW)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  TEST_USERS,
  setDevSession,
  getDevSession,
  clearDevSession,
  isDevMode
} from '@/lib/auth/dev-session'

/**
 * Dev-Mode User Selector
 *
 * Shows dropdown to select test user for local testing.
 * Only renders when DEV_MODE_AUTH=true
 */
export default function DevUserSelector() {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [currentSession, setCurrentSession] = useState<{ user_id: string; user_name: string } | null>(null)

  useEffect(() => {
    if (isDevMode()) {
      setCurrentSession(getDevSession())
    }
  }, [])

  // Don't render in production
  if (!isDevMode()) {
    return null
  }

  function handleLogin() {
    if (!selectedUserId) return

    setDevSession(selectedUserId)
    setCurrentSession(getDevSession())
    router.refresh() // Refresh to update server-side state
  }

  function handleLogout() {
    clearDevSession()
    setCurrentSession(null)
    router.refresh()
  }

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🚧</span>
          Dev Mode: Test User Selector
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentSession ? (
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Logged in as:</strong> {currentSession.user_name}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            </Alert>
            <p className="text-sm text-gray-600">
              You can now post slots, browse listings, and test all features as this user.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              Select a test user to simulate authentication. This only works in development mode.
            </p>

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Test User --</option>
              {TEST_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.unit_number}) - {user.email}
                </option>
              ))}
            </select>

            <Button
              onClick={handleLogin}
              disabled={!selectedUserId}
              className="w-full"
            >
              Login as Selected User
            </Button>

            <Alert className="bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Test users are created by <code>scripts/seed-test-data-bypass-rls.sql</code>
              </p>
            </Alert>
          </div>
        )}

        <Alert className="mt-4 bg-red-50 border-red-200">
          <p className="text-xs text-red-800">
            ⚠️ <strong>Production Safety:</strong> This component automatically hides when <code>DEV_MODE_AUTH=false</code> or in production builds.
          </p>
        </Alert>
      </CardContent>
    </Card>
  )
}
```

#### 2.2 Dev Mode Banner

**File:** `components/auth/DevModeBanner.tsx` (NEW)

```typescript
'use client'

import { isDevMode } from '@/lib/auth/dev-session'

/**
 * Dev Mode Warning Banner
 *
 * Shows prominent warning when in dev mode.
 * Helps prevent confusion if accidentally deployed.
 */
export default function DevModeBanner() {
  if (!isDevMode()) {
    return null
  }

  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      🚧 <strong>DEV MODE</strong> - Authentication bypass enabled. Not for production use!
    </div>
  )
}
```

---

### Phase 3: Integration (45 minutes)

#### 3.1 Update Middleware

**File:** `middleware.ts` (MODIFY)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserForMiddleware, isDevMode } from '@/lib/auth/dev-session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes (no auth required)
  const publicRoutes = ['/', '/login', '/register', '/auth/callback']
  if (publicRoutes.includes(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Dev mode authentication
  if (isDevMode()) {
    const devSessionCookie = req.cookies.get('parkboard_dev_session')?.value
    const devUser = getDevUserForMiddleware(devSessionCookie)

    if (devUser) {
      console.log('✅ Dev mode auth: User ID', devUser.id)

      // Set app.current_user_id for RLS policies
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', devUser.id)

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
    }

    // No dev session - redirect to home with selector
    console.log('❌ Dev mode: No session, redirecting to home')
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Production Supabase authentication
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

#### 3.2 Update Slot Form

**File:** `app/LMR/slots/new/page.tsx` (MODIFY)

```typescript
// Add dev mode support to auth check
import { getDevSession, isDevMode } from '@/lib/auth/dev-session'

async function handleSubmit(e: FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  try {
    let userId: string

    // Dev mode authentication
    if (isDevMode()) {
      const devSession = getDevSession()
      if (!devSession) {
        throw new Error('Please select a test user from the dev mode selector')
      }
      userId = devSession.user_id
    } else {
      // Production Supabase authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to post a slot')
      }
      userId = user.id
    }

    // Rest of the form submission logic...
    const { data, error: insertError } = await supabase
      .from('parking_slots')
      .insert({
        owner_id: userId,
        // ... other fields
      })

    // ...
  } catch (err) {
    // ...
  }
}
```

#### 3.3 Update Landing Page

**File:** `app/page.tsx` (MODIFY)

Add dev user selector for testing:

```typescript
import DevUserSelector from '@/components/auth/DevUserSelector'
import DevModeBanner from '@/components/auth/DevModeBanner'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DevModeBanner />

      <header className="bg-white shadow-sm">
        {/* ... existing header ... */}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Dev mode selector (only shows in dev) */}
        <div className="mb-8">
          <DevUserSelector />
        </div>

        {/* ... existing content ... */}
      </main>
    </div>
  )
}
```

---

## Security Considerations

### ✅ Safe

1. **Environment-gated:** Only works when `DEV_MODE_AUTH=true` AND `NODE_ENV=development`
2. **No production impact:** Automatically disabled in production builds
3. **Visual warnings:** Yellow banners clearly indicate dev mode
4. **Cookie-based:** Mimics production auth pattern
5. **No database changes:** Uses existing test users

### ⚠️ Risks (Mitigated)

| Risk | Mitigation |
|------|------------|
| Accidentally deploy to production | `.env.example` documents `DEV_MODE_AUTH=false` for production |
| Test users in production DB | Seed script clearly marks test data with `%TEST DATA%` in notes |
| Confusion between dev/prod auth | Dev mode banner always visible when active |

### 🚫 Do NOT

- **DO NOT** set `DEV_MODE_AUTH=true` in production `.env`
- **DO NOT** commit test user credentials to production database
- **DO NOT** remove the `isDevMode()` checks

---

## Testing Plan

### Manual Testing Checklist

**Setup:**
```bash
# 1. Set environment variable
echo "NEXT_PUBLIC_DEV_MODE_AUTH=true" >> .env.local

# 2. Ensure test data exists
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data-bypass-rls.sql

# 3. Restart dev server
npm run dev -- -p 3001
```

**Test Scenarios:**

1. **Dev Mode Selector Visible**
   - [ ] Go to `http://localhost:3001`
   - [ ] See yellow dev mode banner at top
   - [ ] See "Dev Mode: Test User Selector" card

2. **Login as Test User**
   - [ ] Select "Maria Santos (10A)" from dropdown
   - [ ] Click "Login as Selected User"
   - [ ] See "Logged in as: Maria Santos" message
   - [ ] Page refreshes with session active

3. **Post Slot (Authenticated)**
   - [ ] Go to `/LMR/slots/new`
   - [ ] Fill out slot form
   - [ ] Submit successfully
   - [ ] See slot in `/LMR/slots` listing

4. **Browse Slots (Public)**
   - [ ] Go to `/LMR/slots`
   - [ ] See all test slots (4 available)
   - [ ] Click on slot to view details

5. **Logout**
   - [ ] Click "Logout" button in dev selector
   - [ ] Session cleared
   - [ ] Try to access `/LMR/slots/new` → redirected to home

6. **Production Mode Verification**
   - [ ] Set `DEV_MODE_AUTH=false` in `.env.local`
   - [ ] Restart server
   - [ ] Verify dev selector does NOT appear
   - [ ] Verify dev banner does NOT appear
   - [ ] Verify Supabase auth required for protected routes

---

## Rollback Plan

If dev mode causes issues:

1. **Immediate Disable:**
   ```bash
   # Set in .env.local
   DEV_MODE_AUTH=false

   # Restart server
   ```

2. **Remove Files:**
   ```bash
   rm lib/auth/dev-session.ts
   rm components/auth/DevUserSelector.tsx
   rm components/auth/DevModeBanner.tsx
   ```

3. **Revert Middleware:**
   ```bash
   git checkout middleware.ts
   ```

4. **Revert Pages:**
   ```bash
   git checkout app/page.tsx
   git checkout app/LMR/slots/new/page.tsx
   ```

---

## Dependencies

### New NPM Packages

```bash
npm install js-cookie
npm install --save-dev @types/js-cookie
```

**Why js-cookie:**
- Lightweight (2.5KB)
- Simple API
- Works client-side
- Industry standard

---

## Documentation Updates

### Files to Update

1. **`.env.example`**
   ```bash
   # Add dev mode section
   # Development Mode Authentication (local testing only)
   # NEVER set to true in production!
   NEXT_PUBLIC_DEV_MODE_AUTH=false
   ```

2. **`README.md`**
   Add "Local Testing Without Supabase" section

3. **`docs/PHASE_3_MINIMAL_FEATURES_20251030.md`**
   Add dev mode auth section

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Infrastructure** | 1 hour | Dev session manager, environment setup |
| **Phase 2: UI Components** | 45 min | User selector, dev banner |
| **Phase 3: Integration** | 45 min | Middleware, slot form, landing page |
| **Testing** | 30 min | Manual test scenarios |
| **Documentation** | 30 min | Update docs, README |
| **TOTAL** | **3.5 hours** | End-to-end implementation |

---

## Approval Required

### Questions for Root Instance

1. **Scope:** Should this be parkboard-specific or extracted to a generic `@parkboard/dev-auth` package for reuse in other projects (pipetgo, carpool-app)?

2. **Security:** Any additional security concerns for dev mode authentication?

3. **Testing:** Should we add automated tests for dev mode (Playwright)?

4. **Naming:** Is "dev mode" the right terminology, or prefer "local testing mode"?

5. **Deployment:** Should we add a pre-deployment check that fails if `DEV_MODE_AUTH=true`?

---

## Success Metrics

### Post-Implementation

- [ ] Elena can test locally without Supabase setup
- [ ] All 4 test users can be selected and used
- [ ] Post slot works with dev auth
- [ ] Browse slots works (public + authenticated views)
- [ ] Dev mode visually obvious (yellow banner)
- [ ] Production deployment unaffected (auto-disabled)
- [ ] Zero Supabase API calls in dev mode

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental production deployment | Low | Critical | Environment checks, visual warnings, `.env.example` docs |
| Test data in production DB | Low | Medium | Clear naming (`%TEST DATA%`), separate cleanup script |
| Confusion between modes | Medium | Low | Prominent dev banner, different styling |
| Broken production auth | Low | Critical | Conditional logic, extensive testing |

---

## Alternative Approaches Considered

### 1. Mock Supabase Client (Rejected)

**Why not:** More complex, requires mocking entire Supabase API

### 2. Local Supabase Instance (Rejected)

**Why not:** Too much setup overhead for Elena, defeats "simple testing" goal

### 3. Basic Auth (Username/Password) (Rejected)

**Why not:** Still requires authentication flow, doesn't match real usage

### 4. **Selected: Cookie-Based Dev Session** ✅

**Why:** Simplest, mimics real auth, no external dependencies

---

## Next Steps After Approval

1. Get root instance decision (this document)
2. Install dependencies (`js-cookie`)
3. Implement Phase 1 (infrastructure)
4. Implement Phase 2 (UI)
5. Implement Phase 3 (integration)
6. Manual testing (30 min)
7. Update documentation
8. Demo to Elena
9. Deploy to LMR

---

**Document Status:** DRAFT - Awaiting Root Instance Review
**Author:** claude-minimal-mvp
**Reviewer:** (pending - root instance)
**Approval Date:** (pending)

---

## Appendix: Code File Locations

All new files will be created in minimal-mvp worktree:

```
/home/ltpt420/repos/parkboard/.trees/minimal-mvp/
├── lib/auth/
│   └── dev-session.ts (NEW - 200 lines)
├── components/auth/
│   ├── DevUserSelector.tsx (NEW - 150 lines)
│   └── DevModeBanner.tsx (NEW - 30 lines)
├── middleware.ts (MODIFY - add 20 lines)
├── app/page.tsx (MODIFY - add 10 lines)
└── app/LMR/slots/new/page.tsx (MODIFY - add 15 lines)
```

**Total New Code:** ~400 lines
**Modified Code:** ~45 lines
**Files Created:** 3
**Files Modified:** 3

---

**END OF IMPLEMENTATION PLAN**
