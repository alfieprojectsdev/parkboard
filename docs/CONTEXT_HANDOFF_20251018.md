# Context Handoff Document - AuthWrapper Session Persistence Issue

**Date:** 2025-10-18 23:05 UTC
**Priority:** P0 Critical
**Status:** 🔴 BLOCKED - Layout fix ineffective, unmount issue persists
**Estimated Effort:** 2-4 hours remaining

---

## Executive Summary

**Problem:** AuthWrapper component losing session during navigation, causing 35+ E2E test failures (67% failure rate).

**Attempted Solutions:**
1. ✅ isMounted flag pattern implementation (partial success - diagnostic tests pass)
2. ❌ **Layout-based AuthWrapper** (build passed, but tests still fail with same errors)

**Current Blocker:** Component STILL unmounting mid-initialization despite architectural fix. Layout changes may not be applied, OR there's a different root cause.

**Critical Finding:** Supabase warning about using `getSession()` instead of `getUser()` - this may be the actual root cause.

**Recommended Next Action:** Switch from `supabase.auth.getSession()` to `supabase.auth.getUser()` in AuthWrapper.

---

## Test Results Summary

### CUJ-014: Edit Slot Flow (Latest Run)

**Result:** 6/8 FAILED, 2/8 PASSED (same as before fixes)

**Failed Tests:**
- ❌ [chromium] owner can edit their own slot - Timeout 120s waiting for `input[id="slot_number"]`
- ❌ [chromium] owner can change slot pricing - Timeout 120s
- ❌ [chromium] non-owner cannot edit - Timeout 120s clicking slot
- ❌ [Mobile Chrome] owner can edit - Failed to submit (stayed on `/LMR/slots/new`)
- ❌ [Mobile Chrome] owner can change pricing - Timeout 120s
- ❌ [Mobile Chrome] non-owner cannot edit - Timeout 120s

**Passed Tests:**
- ✅ [chromium] editing prevented with active bookings
- ✅ [Mobile Chrome] editing prevented with active bookings

**Duration:** 11.1 minutes
**Output:** `/tmp/cuj014-with-layout-fix.txt`
**Screenshots:** `test-results/user-journeys-CUJ-014-*`

### Diagnostic Test (auth-wrapper-diagnostic.spec.ts)

**Result:** 2/2 PASSED ✅

**Critical Browser Console Logs Captured:**
```
[AuthWrapper] useEffect running - initializing auth...
[AuthWrapper] 🔥 initializeAuth() CALLED - starting execution
[AuthWrapper] 🔥 Inside try block, about to call getSession()
[AuthWrapper] Component unmounting - cleaning up subscription  ← PROBLEM!
[AuthWrapper] useEffect running - initializing auth...  ← REMOUNTS!
[AuthWrapper] Component render - loading: true user: user12@parkboard.test profile: undefined
```

**Analysis:**
- Component unmounts BEFORE `getSession()` completes
- Component remounts and restarts initialization
- User gets set BUT profile stays `undefined`
- Loading state never completes → form never renders
- **Despite layout fix, unmount/remount cycle persists!**

### Overall E2E Status

**Before Fixes:** 17/52 passing (33%)
**After Layout Fix:** Unknown (only CUJ-014 tested)
**Expected:** ~52/52 passing if AuthWrapper issue resolved

### Unit Test Status

**Current:** 191/210 passing (91%)
**Expected:** 158/158 after cleanup (19 failures are test setup issues, not AuthWrapper-related)

---

## Files Modified This Session

### 1. `components/auth/AuthWrapper.tsx`

**Changes Made:**
- Line 226-228: Added `isMounted` flag pattern
- Lines 257-259, 328-330: isMounted checks before setState
- useEffect dependencies: `[router, supabase]` → `[]`
- Added extensive diagnostic console logging (🔥 emojis)
- Cleanup function sets `isMounted = false` and unsubscribes

**Current Issues:**
- Component still unmounts mid-initialization
- Using `getSession()` instead of `getUser()` (Supabase security warning)
- Profile fetch never completes
- Diagnostic logs still present (need cleanup after fix)

**Location:** `components/auth/AuthWrapper.tsx:226-330`

### 2. `app/[community]/layout.tsx`

**Changes Made:**
- Added `import AuthWrapper from '@/components/auth/AuthWrapper'`
- Wrapped children with `<AuthWrapper>` at layout level

**Architecture:**
```typescript
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommunityProvider>
      <AuthWrapper>
        {children}
      </AuthWrapper>
    </CommunityProvider>
  )
}
```

**Verification Status:** ⚠️ UNCERTAIN - May not be applied (hot reload issue suspected)

### 3. Page Components (AuthWrapper removed)

**Modified:**
- `app/[community]/slots/new/page.tsx`
- `app/[community]/slots/[slotId]/edit/page.tsx`
- `app/[community]/slots/[slotId]/page.tsx`
- `app/[community]/bookings/page.tsx`

**Changes:** Removed `<AuthWrapper>` wrapper, kept `useAuth()` hook usage

**NOT Modified:**
- `app/profile/complete/page.tsx` - KEPT AuthWrapper (outside community routes)

### 4. Diagnostic Test Files Created

**Files:**
- `e2e/auth-wrapper-diagnostic.spec.ts` - Basic auth flow with console log capture
- `docs/scratchpad-authwrapper-fix-20251018.md` - Session tracking document
- `docs/CONTEXT_HANDOFF_20251018.md` - This document

---

## Running Processes

### Dev Server (Bash 644b55)

**Status:** Running ✅
**Port:** 3000
**Command:** `for port in 3000 3001 3002 3003 3004 3005; do lsof -ti:$port | xargs -r kill -9 2>/dev/null; done && sleep 2 && npm run dev`

**Logs Show:**
- Multiple `/[community]/slots/new` compilations
- Fast Refresh full reloads (layout changes triggered recompilation)
- **WARNING (CRITICAL):** Supabase security warning:
  ```
  Using the user object as returned from supabase.auth.getSession() or from some
  supabase.auth.onAuthStateChange() events could be insecure! This value comes
  directly from the storage medium (usually cookies on the server) and may not
  be authentic. Use supabase.auth.getUser() instead which authenticates the data
  by contacting the Supabase Auth server.
  ```

**Action Required:** Switch to `getUser()` for proper authentication

### Test Processes

**All tests completed:**
- Bash 589786: CUJ-014 tests (completed, results in `/tmp/cuj014-with-layout-fix.txt`)
- Bash 16235a: Diagnostic test (completed, 2/2 passed)

**Cleanup Needed:** ~20+ stale background test processes from earlier debugging

---

## Root Cause Analysis

### Hypothesis 1: getSession() vs getUser() (MOST LIKELY) ⭐

**Evidence:**
- Supabase explicitly warns against using `getSession()` in server environments
- `getSession()` reads directly from cookies (may be stale/invalid)
- `getUser()` validates with Supabase Auth server
- Profile fetch depends on valid session - invalid session = no profile

**Solution:**
```typescript
// CURRENT (INCORRECT):
const { data: { session } } = await supabase.auth.getSession()

// RECOMMENDED (CORRECT):
const { data: { user }, error } = await supabase.auth.getUser()
```

**Implementation:**
- File: `components/auth/AuthWrapper.tsx`
- Lines: ~257 (getSession call)
- Also check: `onAuthStateChange` callback usage
- Estimate: 30 minutes (includes testing)

### Hypothesis 2: Layout Changes Not Applied

**Evidence:**
- Component still unmounting despite layout architecture
- Hot reload may have failed to apply changes
- Dev server shows "Fast Refresh full reload" warnings

**Verification Steps:**
1. Add console.log to `app/[community]/layout.tsx`:
   ```typescript
   console.log('[CommunityLayout] Rendering, wrapping with AuthWrapper')
   ```
2. Check browser DevTools → Sources → verify AuthWrapper location
3. Hard restart: `rm -rf .next && npm run dev`

**Estimate:** 15 minutes

### Hypothesis 3: CommunityProvider Causing Remounts

**Evidence:**
- AuthWrapper wrapped inside `<CommunityProvider>`
- Provider changes could trigger AuthWrapper remount
- Community context may reset during navigation

**Investigation:**
- Check `lib/context/CommunityContext.tsx` for state changes
- Review if community code changes on navigation
- Consider moving AuthWrapper OUTSIDE CommunityProvider

**Estimate:** 30 minutes

### Hypothesis 4: React Strict Mode Double-Mounting

**Evidence:**
- Diagnostic logs show unmount → remount pattern
- Consistent with React 18 Strict Mode behavior
- Development-only issue (production may work)

**Solution:**
- Temporarily disable Strict Mode to test
- File: `app/layout.tsx` (remove `<React.StrictMode>` wrapper)
- NOT recommended for production (defeats purpose of Strict Mode)

**Estimate:** 10 minutes (testing only)

---

## Recommended Action Plan (Priority Order)

### Priority 1: Switch to getUser() (30 min) ⭐

**Why:** Supabase official recommendation, most likely root cause

**Steps:**
1. Open `components/auth/AuthWrapper.tsx`
2. Replace `getSession()` with `getUser()`:
   ```typescript
   // Line ~257
   const { data: { user }, error } = await supabase.auth.getUser()

   if (error) {
     console.error('[AuthWrapper] Auth error:', error)
     if (!isMounted) return
     setUser(null)
     setProfile(null)
     setLoading(false)
     return
   }

   if (!isMounted) return
   setUser(user || null)

   if (user) {
     const { data: profileData, error: profileError } = await supabase
       .from('user_profiles')
       .select('*')
       .eq('id', user.id)
       .single()

     if (profileError) {
       console.error('[AuthWrapper] Profile fetch error:', profileError)
     }

     if (!isMounted) return
     setProfile(profileData)
   }

   if (!isMounted) return
   setLoading(false)
   ```
3. Build: `npm run build` (verify no errors)
4. Test: `npm run test:e2e -- --grep "CUJ-014" --timeout 120000 --workers 1`
5. If passes: Run full E2E suite

**Expected Result:** Profile fetch succeeds, forms render, tests pass

### Priority 2: Verify Layout Applied (15 min)

**Why:** Confirm architectural fix is actually running

**Steps:**
1. Add debug log to `app/[community]/layout.tsx`:
   ```typescript
   console.log('[CommunityLayout] 🏗️ RENDERING - AuthWrapper is at LAYOUT level')
   ```
2. Add debug log to AuthWrapper mount:
   ```typescript
   console.log('[AuthWrapper] 🏗️ COMPONENT MOUNTED at:', new Date().toISOString())
   ```
3. Run diagnostic test: `npm run test:e2e -- e2e/auth-wrapper-diagnostic.spec.ts`
4. Check output for log order:
   - Should see `[CommunityLayout]` ONCE
   - Should see `[AuthWrapper] MOUNTED` ONCE
   - Should NOT see repeated unmount/remount

**Expected Result:** Logs confirm AuthWrapper mounts once at layout level

### Priority 3: Hard Cache Clear (10 min)

**Why:** Eliminate possibility of stale build artifacts

**Steps:**
1. Kill all processes: `pkill -9 -f "npm|node|next|playwright"`
2. Clear cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Wait for full compilation (~30s)
5. Re-run CUJ-014 tests

**Expected Result:** Same behavior (rules out cache issue) OR different behavior (confirms cache was problem)

### Priority 4: Investigate CommunityProvider (30 min)

**Why:** If above steps don't resolve, this may be the culprit

**Steps:**
1. Read `lib/context/CommunityContext.tsx` (check for state changes)
2. Add logging to CommunityProvider mount/unmount
3. Review if community code from URL changes during navigation
4. Test moving AuthWrapper OUTSIDE CommunityProvider in layout

**Expected Result:** Identify if CommunityProvider is causing remounts

---

## Technical Background

### AuthWrapper Architecture (Current)

```
app/[community]/layout.tsx (NEW)
  └── <CommunityProvider>
        └── <AuthWrapper>  ← MOVED HERE (session-wide)
              └── {children}  ← Individual pages

Previous (BROKEN):
app/[community]/slots/new/page.tsx
  └── <Navigation>
  └── <AuthWrapper>  ← WAS HERE (remounted on every navigation)
        └── Form content
```

### React useEffect Pattern (Current)

```typescript
useEffect(() => {
  let isMounted = true

  async function initializeAuth() {
    try {
      // Auth initialization...
      if (!isMounted) return  // ← Prevents setState on unmounted component
      setUser(...)

      if (session?.user) {
        // Profile fetch...
        if (!isMounted) return  // ← Prevents setState on unmounted component
        setProfile(...)
      }
    } catch (err) {
      console.error(err)
    }
  }

  initializeAuth()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(...)

  return () => {
    isMounted = false  // ← Cleanup flag
    subscription.unsubscribe()
  }
}, [])  // ← Empty deps array (mount-only)
```

### Why getUser() Over getSession()

**getSession():**
- Reads from browser storage (cookies/localStorage)
- No server validation
- May return stale/invalid session
- Fast but insecure

**getUser():**
- Validates with Supabase Auth server
- Confirms session is still valid
- Slower but secure
- **Recommended for auth-critical flows**

**Reference:** [Supabase Auth Docs](https://supabase.com/docs/reference/javascript/auth-getuser)

---

## Evidence Files and Logs

### Test Result Files

- `/tmp/cuj014-with-layout-fix.txt` - Complete CUJ-014 test output (6/8 failed)
- `/tmp/e2e-test-results.txt` - Full E2E suite results (if available)
- `/tmp/unit-test-results.txt` - Unit test results (191/210 passing)

### Test Screenshots

- `test-results/user-journeys-CUJ-014-Edit-d9472-ner-can-edit-their-own-slot-chromium/` - Chromium screenshots
- `test-results/user-journeys-CUJ-014-Edit-d9472-ner-can-edit-their-own-slot-Mobile-Chrome/` - Mobile screenshots
- Look for `test-failed-1.png` in each directory

### Diagnostic Test Output

**Bash 16235a output** (completed):
```
===== DIAGNOSTIC TEST STARTED =====
Step 1: Logging in as user12@parkboard.test...
✅ Login complete
Step 2: Navigating to /LMR/slots/new...
🔍 BROWSER: [AuthWrapper] Component render - loading: true user: undefined profile: undefined
🔍 BROWSER: [AuthWrapper] useEffect running - initializing auth...
🔍 BROWSER: [AuthWrapper] 🔥 initializeAuth() CALLED - starting execution
🔍 BROWSER: [AuthWrapper] 🔥 Inside try block, about to call getSession()
🔍 BROWSER: [AuthWrapper] Component unmounting - cleaning up subscription
🔍 BROWSER: [AuthWrapper] useEffect running - initializing auth...
🔍 BROWSER: [AuthWrapper] Component render - loading: true user: user12@parkboard.test profile: undefined
✅ Navigation complete
  2 passed (40.8s)
```

**Key Observation:** Profile never gets set, stays `undefined`

### Dev Server Logs

**Bash 644b55 output** (running):
```
▲ Next.js 14.2.33
- Local: http://localhost:3000

✓ Compiled /[community]/slots/new in 1449ms (832 modules)
[AuthWrapper] Component render - loading: true user: undefined profile: undefined
GET /LMR/slots/new 200 in 2417ms

⚠ Fast Refresh had to perform a full reload.
Using the user object as returned from supabase.auth.getSession() or from some
supabase.auth.onAuthStateChange() events could be insecure! This value comes
directly from the storage medium (usually cookies on the server) and may not
be authentic. Use supabase.auth.getUser() instead which authenticates the data
by contacting the Supabase Auth server.
```

**Key Observation:** Supabase warning about `getSession()` usage

---

## Code References

### AuthWrapper Implementation

**File:** `components/auth/AuthWrapper.tsx`

**Key Lines:**
- Line 226-228: `isMounted` flag initialization
- Line 257: `getSession()` call ← **NEEDS CHANGE TO getUser()**
- Line 257-259: User setState with isMounted check
- Line 328-330: Profile setState with isMounted check
- Line 191+: Diagnostic console.log statements ← **TODO: Remove after fix**

**Full useEffect (simplified):**
```typescript
useEffect(() => {
  let isMounted = true

  async function initializeAuth() {
    console.log('[AuthWrapper] useEffect running - initializing auth...')
    console.log('[AuthWrapper] 🔥 initializeAuth() CALLED - starting execution')

    try {
      console.log('[AuthWrapper] 🔥 Inside try block, about to call getSession()')
      const { data: { session } } = await supabase.auth.getSession()  // ← PROBLEM!

      if (!isMounted) {
        console.log('[AuthWrapper] Component unmounted, skipping setState')
        return
      }

      setUser(session?.user || null)

      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('[AuthWrapper] Profile fetch error:', profileError)
        }

        if (!isMounted) {
          console.log('[AuthWrapper] Component unmounted, skipping profile setState')
          return
        }

        setProfile(profileData)
      }

      if (!isMounted) return
      setLoading(false)
    } catch (err) {
      console.error('[AuthWrapper] Auth initialization error:', err)
    }
  }

  initializeAuth()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user)
      }
    }
  )

  return () => {
    console.log('[AuthWrapper] Component unmounting - cleaning up subscription')
    isMounted = false
    subscription.unsubscribe()
  }
}, [])  // Empty deps array
```

### Community Layout

**File:** `app/[community]/layout.tsx`

**Current Implementation:**
```typescript
import { ReactNode } from 'react'
import CommunityProvider from '@/lib/context/CommunityContext'
import AuthWrapper from '@/components/auth/AuthWrapper'

export default function CommunityLayout({
  children,
  params
}: {
  children: ReactNode
  params: { community: string }
}) {
  return (
    <CommunityProvider community={params.community}>
      <AuthWrapper>
        {children}
      </AuthWrapper>
    </CommunityProvider>
  )
}
```

**Lines to Check:** Entire file (verify no additional wrappers causing issues)

### Diagnostic Test

**File:** `e2e/auth-wrapper-diagnostic.spec.ts`

**Purpose:** Capture browser console logs to observe AuthWrapper lifecycle

**Key Code:**
```typescript
test('login and navigate to create slot page - observe console logs', async ({ page }) => {
  // Capture ALL console logs from browser
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[AuthWrapper]')) {
      console.log('🔍 BROWSER:', text)
    }
  })

  console.log('\n===== DIAGNOSTIC TEST STARTED =====\n')

  // Step 1: Login
  console.log('Step 1: Logging in as user12@parkboard.test...')
  await login(page, 'user12@parkboard.test', 'test123456')
  console.log('✅ Login complete\n')

  await page.waitForTimeout(2000)

  // Step 2: Navigate to create slot page
  console.log('Step 2: Navigating to /LMR/slots/new...')
  await page.goto('/LMR/slots/new', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('✅ Navigation complete\n')

  await page.waitForTimeout(5000) // Give time to see all logs

  console.log('\n===== DIAGNOSTIC TEST COMPLETE =====\n')
})
```

**Usage:** `npm run test:e2e -- e2e/auth-wrapper-diagnostic.spec.ts`

---

## Known Issues and Gotchas

### 1. React Strict Mode Double-Mounting

**Issue:** In development, React 18 Strict Mode mounts components twice to detect side effects.

**Impact:** AuthWrapper mounts → unmounts → remounts, interrupting async operations.

**Evidence:** Diagnostic logs show unmount → remount pattern.

**Workaround:** `isMounted` flag pattern prevents setState on first unmount.

**NOT a Solution:** Disabling Strict Mode (defeats purpose, production may differ).

### 2. Supabase getSession() Security Warning

**Issue:** `getSession()` reads from cookies without server validation.

**Impact:** May return stale/invalid session, causing downstream auth failures.

**Evidence:** Dev server shows explicit Supabase warning.

**Solution:** Switch to `getUser()` for server-validated auth.

### 3. useEffect Dependency Arrays

**Issue:** Using object references (router, supabase) in deps causes infinite re-runs.

**Impact:** useEffect fires on every render, component never stabilizes.

**Solution:** Empty array `[]` for mount-only effects.

**Reference:** CLAUDE.md lines 163-186 (useEffect object dependency anti-pattern).

### 4. Profile Stays Undefined

**Issue:** Profile fetch never completes, loading state never resolves.

**Evidence:** Diagnostic logs show `user: user12@parkboard.test profile: undefined`.

**Possible Causes:**
- Invalid session from `getSession()` → profile query fails silently
- Component unmounts before profile fetch completes
- RLS policies blocking profile access (unlikely, works elsewhere)

**Solution:** Fix session validity FIRST (switch to `getUser()`), then investigate if persists.

### 5. Hot Reload vs Full Restart

**Issue:** Next.js hot reload may not apply layout-level changes correctly.

**Evidence:** Dev server shows "Fast Refresh had to perform a full reload" warnings.

**Impact:** Layout changes may not be active despite file modifications.

**Solution:** Hard restart with `.next` cache clear when changing layouts.

---

## Success Criteria

### Immediate (Fix Complete)

- [ ] CUJ-014: 8/8 tests passing (0 failures)
- [ ] Diagnostic test: AuthWrapper mounts ONCE, no unmount/remount
- [ ] Browser console: Profile gets set (not undefined)
- [ ] Forms render immediately (no timeout errors)
- [ ] Loading spinner completes within 2-3 seconds

### Short-Term (Verification)

- [ ] Full E2E suite: 52/52 passing (up from 17/52)
- [ ] Unit tests: 158/158 passing (after cleanup)
- [ ] Build succeeds with no warnings
- [ ] Diagnostic logging removed from AuthWrapper
- [ ] No Supabase security warnings in dev server logs

### Long-Term (Production Ready)

- [ ] AuthWrapper documented in CLAUDE.md
- [ ] Layout architecture documented in MULTI_TENANT_IMPLEMENTATION guide
- [ ] E2E test suite runs in CI/CD
- [ ] Production deployment verified
- [ ] Session persistence works across all routes

---

## Environment Details

### Development Server

**Node Version:** (check with `node --version`)
**Next.js Version:** 14.2.33
**React Version:** 18.x (Strict Mode enabled)
**Playwright Version:** 1.56.0
**Port:** 3000

### Database

**Provider:** Supabase
**Project:** cgbkknefvggnhkvmuwsa
**Region:** (check Supabase dashboard)
**Connection:** Via Supabase client library

### Test Users

**Diagnostic Test User:**
- Email: `user12@parkboard.test`
- Password: `test123456`
- Community: LMR
- Profile: Should exist in `user_profiles` table

**Other Test Users:**
- `user1@parkboard.test` through `user20@parkboard.test`
- All password: `test123456`
- Generated by: `npm run stress:data`

---

## Pending Todo Items

**From Previous Session:**

✅ Completed:
- [x] Implement layout-based AuthWrapper architecture
- [x] Remove AuthWrapper from 5 page components
- [x] Build verification passed
- [x] Start fresh dev server with layout fix
- [x] Run CUJ-014 tests with layout-based AuthWrapper
- [x] Analyze test results and root cause
- [x] Update scratchpad with final results
- [x] Create context handoff document

⏳ Pending (PRIORITY ORDER):
1. **[NEXT]** Switch `getSession()` to `getUser()` in AuthWrapper (~30 min)
   - File: `components/auth/AuthWrapper.tsx:257`
   - Critical: Supabase security warning + likely root cause
   - See "Priority 1" in action plan below

2. **[THEN]** Verify layout changes actually applied (~15 min)
   - Add console logging to layout and AuthWrapper
   - Check browser DevTools sources
   - See "Priority 2" in action plan below

3. **[IF NEEDED]** Run CUJ-014 tests after getUser() fix (~5 min)
   - Command: `npm run test:e2e -- --grep "CUJ-014" --timeout 120000 --workers 1`
   - Expected: 8/8 passing (if fix works)

4. **[IF PASS]** Run full E2E test suite (~10 min)
   - Command: `npm run test:e2e`
   - Expected: 52/52 passing (up from 17/52)

5. **[CLEANUP]** Remove diagnostic logging from AuthWrapper (~10 min)
   - Remove all `console.log` statements added this session
   - Look for `[AuthWrapper]` and 🔥 emoji markers

6. **[DOCUMENT]** Update CLAUDE.md with architectural fix (~15 min)
   - Document layout-based AuthWrapper pattern
   - Add `getUser()` vs `getSession()` gotcha
   - Update useEffect best practices section

---

## Quick Start for Next Instance

### 1. Read These Files First (10 min)

**Priority Order:**
1. This document (`docs/CONTEXT_HANDOFF_20251018.md`) - Current status
2. `docs/scratchpad-authwrapper-fix-20251018.md` - Session notes
3. `CLAUDE.md` - Project documentation (lines 163-186 for useEffect gotchas)
4. **Pending Todo Items** section above ⬆️

### 2. Verify Environment (5 min)

```bash
# Check dev server running
curl http://localhost:3000  # Should return HTML

# Check test results available
cat /tmp/cuj014-with-layout-fix.txt  # Should show 6/8 failed

# Check code modifications present
grep -n "getSession" components/auth/AuthWrapper.tsx  # Should see line ~257
```

### 3. Implement Priority 1 Fix (30 min)

**File:** `components/auth/AuthWrapper.tsx`

**Change:** Line ~257

**From:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
```

**To:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser()

if (error) {
  console.error('[AuthWrapper] Auth error:', error)
  if (!isMounted) return
  setUser(null)
  setProfile(null)
  setLoading(false)
  return
}

if (!isMounted) return
setUser(user || null)

if (user) {
  // Profile fetch logic...
}
```

### 4. Test the Fix (5 min)

```bash
# Build verification
npm run build

# Run CUJ-014 tests
npm run test:e2e -- --grep "CUJ-014" --timeout 120000 --workers 1
```

### 5. If Tests Pass (30 min)

```bash
# Run full E2E suite
npm run test:e2e

# Clean up diagnostic logging from AuthWrapper
# (remove console.log statements added this session)

# Update CLAUDE.md with fix details
# Update scratchpad with resolution
```

### 6. If Tests Still Fail (60 min)

**Follow Priority 2-4 in action plan:**
1. Verify layout applied (15 min)
2. Hard cache clear (10 min)
3. Investigate CommunityProvider (30 min)
4. Create new diagnostic tests (as needed)

---

## Questions and Answers

### Q: Why did the layout fix not work?

**A:** Two possibilities:
1. **Most Likely:** The unmount issue is NOT due to layout placement, but due to invalid session from `getSession()`. Switch to `getUser()` first.
2. **Less Likely:** Layout changes not actually applied (hot reload failure). Verify with logging + hard restart.

### Q: Should I disable React Strict Mode?

**A:** NO. Strict Mode is intentional and helps find bugs. The `isMounted` pattern already handles double-mounting correctly. Focus on the `getSession()` → `getUser()` fix instead.

### Q: Why does the diagnostic test pass but CUJ-014 fails?

**A:** Diagnostic test only checks if AuthWrapper mounts/unmounts - it doesn't test actual form submission. The diagnostic shows the profile stays `undefined`, which causes forms not to render, which causes CUJ-014 to timeout.

### Q: Can I just remove the AuthWrapper entirely?

**A:** NO. AuthWrapper provides critical session management and auth context to all pages. Without it, the entire app breaks. We need to FIX it, not remove it.

### Q: How long will this take to fix?

**A:**
- **Optimistic (getUser fix works):** 30-60 minutes
- **Moderate (layout verification needed):** 1-2 hours
- **Pessimistic (alternative root cause):** 2-4 hours

---

## Contact and Escalation

### Instance Coordination

**Current Instance:** Main conversation (ltpt420) - HALTED
**Other Instances:** Auth expert and test supervisor (mentioned by user as running in parallel)
**Coordination File:** `docs/scratchpad-authwrapper-fix-20251018.md`

**Before starting work:**
1. Check scratchpad for latest status
2. Verify no other instance is actively working on this
3. Update scratchpad when you start working
4. Update scratchpad with any findings

### If You Get Stuck

**Resources:**
1. Supabase Auth Docs: https://supabase.com/docs/reference/javascript/auth-getuser
2. Next.js App Router Layouts: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
3. React useEffect Best Practices: https://react.dev/reference/react/useEffect
4. ParkBoard CLAUDE.md: Lines 163-186 (useEffect gotchas)

**Escalation Path:**
1. Create diagnostic test to isolate issue
2. Document findings in scratchpad
3. Try alternative approaches from action plan
4. If all else fails, document blockers and request human review

---

## Appendix: Full Error Messages

### CUJ-014 Test 1 Error (Chromium)

```
Test timeout of 120000ms exceeded.

Error: page.fill: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('input[id="slot_number"]')

  583 |
  584 |     const uniqueSlotNumber = `EDIT-TEST-${Date.now()}`
> 585 |     await page.fill('input[id="slot_number"]', uniqueSlotNumber)
      |                ^
  586 |     await page.selectOption('select[id="slot_type"]', 'covered')

at /home/ltpt420/repos/parkboard/e2e/user-journeys.spec.ts:585:16

attachment #1: screenshot (image/png)
test-results/user-journeys-CUJ-014-Edit-d9472-ner-can-edit-their-own-slot-chromium/test-failed-1.png
```

### CUJ-014 Test 4 Error (Mobile Chrome)

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/LMR/slots"
Received: "http://localhost:3000/LMR/slots/new"
Timeout:  10000ms

  596 |     // Submit slot creation
  597 |     await page.click('button:has-text("List Slot")')
> 598 |     await expect(page).toHaveURL('/LMR/slots', { timeout: 10000 })
      |                        ^

at /home/ltpt420/repos/parkboard/e2e/user-journeys.spec.ts:598:24
```

**Interpretation:** Form submission failed because form never rendered (AuthWrapper loading never completed).

### Supabase Security Warning

```
Using the user object as returned from supabase.auth.getSession() or from some
supabase.auth.onAuthStateChange() events could be insecure! This value comes
directly from the storage medium (usually cookies on the server) and may not
be authentic. Use supabase.auth.getUser() instead which authenticates the data
by contacting the Supabase Auth server.
```

**Source:** Dev server stderr (Bash 644b55)
**Impact:** High - session may be invalid/stale
**Action:** Switch to `getUser()` immediately

---

## Changelog

### 2025-10-18 23:05 UTC - Document Created

**Status:** Layout fix failed, tests still failing
**Completed:**
- isMounted flag pattern ✅
- Layout-based AuthWrapper ✅
- Diagnostic test implementation ✅
- Build verification ✅
- CUJ-014 test run ✅

**In Progress:**
- Root cause investigation
- getSession() → getUser() migration (recommended)

**Next Action:** Switch to `getUser()` and retest

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18 23:05 UTC
**Maintained By:** Main conversation instance
**Status:** 🔴 ACTIVE - Issue not yet resolved

**For Questions:** Check scratchpad (`docs/scratchpad-authwrapper-fix-20251018.md`) first, then review CLAUDE.md.
