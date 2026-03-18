# Pre-Deployment Manual Testing Checklist

**Project:** ParkBoard - Multi-Tenant Parking Marketplace
**Version:** 2.0 (Multi-Tenant)
**Target Deployment:** parkboard.app/LMR
**Date Created:** 2025-10-14
**Status:** Production Readiness Verification

---

## Purpose

This checklist ensures all critical functionality works correctly in your **local development environment** before deploying to Vercel. Complete ALL tests in this document to verify production readiness.

**Time Required:** 45-60 minutes for complete verification

---

## Pre-Testing Setup

### 1. Environment Check
```bash
# Verify dev server is running
npm run dev
# Should see: ✓ Ready on http://localhost:3000

# Verify database connection
# Login to Supabase Dashboard: https://supabase.com/dashboard
# Select project: cgbkknefvggnhkvmuwsa
# Run SQL Editor: SELECT COUNT(*) FROM parking_slots;
# Should see: 10+ slots
```

### 2. Test Data Requirements
- ✅ At least 10 parking slots in database (use `scripts/create-test-slots.sql`)
- ✅ At least 2 test users (use `npm run stress:data`)
- ✅ Test user credentials:
  - Email: `user1@parkboard.test`
  - Password: `test123456`

### 3. Browser Setup
- Open Chrome/Firefox in **Incognito/Private mode** (clean session)
- Open DevTools (F12)
- Monitor Console tab for errors

---

## Critical Page Testing Matrix

### Priority Levels
- **P0 (Blocker):** Must work or deployment fails
- **P1 (Critical):** Must work within 24 hours of deployment
- **P2 (Important):** Should work but can be fixed post-deployment

---

## P0: ABSOLUTELY CRITICAL PAGES

### Test 1: Root Landing Page (Public)
**URL:** `http://localhost:3000/`

**Expected Behavior:**
- ✅ Page loads within 3 seconds
- ✅ No infinite spinner
- ✅ See "ParkBoard" branding
- ✅ See community selector with "Lumiere Residences (LMR)" option
- ✅ Navigation bar visible with "Login" and "Register" buttons
- ✅ Footer displays (if implemented)
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Open `http://localhost:3000/`
2. Check page loads completely
3. Verify all UI elements visible
4. Check F12 Console for errors
5. Take screenshot if any issues

**Failure Signs:**
- ❌ Infinite spinner
- ❌ Blank white page
- ❌ React error boundaries showing
- ❌ Console errors containing "useEffect", "AuthWrapper", or "CommunityContext"

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 2: Community Landing Page (Public) - /LMR
**URL:** `http://localhost:3000/LMR`

**Expected Behavior:**
- ✅ Page loads within 3 seconds
- ✅ See "Welcome to Lumiere Residences" or similar community-specific text
- ✅ Navigation bar shows "Lumiere" branding
- ✅ "Browse Parking Slots" button/link visible
- ✅ "Login" and "Register" buttons visible (unauthenticated state)
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Open `http://localhost:3000/LMR`
2. Verify community-specific branding
3. Check navigation bar
4. Check F12 Console

**Failure Signs:**
- ❌ 404 Not Found
- ❌ Redirect to root page
- ❌ Console error: "useCommunity must be used within CommunityProvider"

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 3: Browse Slots - Public View (CRITICAL)
**URL:** `http://localhost:3000/LMR/slots`

**Expected Behavior:**
- ✅ Page loads within 5 seconds
- ✅ **NO infinite spinner** (critical bug if present)
- ✅ Navigation bar visible with "Lumiere" branding
- ✅ At least 1 parking slot displayed
- ✅ Each slot card shows:
  - Slot number (e.g., "A-101")
  - Slot type (Covered/Uncovered/Tandem)
  - Price per hour OR "Contact Owner" (hybrid pricing)
  - "View Details" button
- ✅ "Login to Create Slot" message visible
- ✅ **Console shows 0 errors**
- ✅ **NO React warning about useEffect dependencies**

**Test Steps:**
1. Open `http://localhost:3000/LMR/slots`
2. Wait for page to load (max 5 seconds)
3. Count visible slot cards
4. Check F12 Console for errors/warnings
5. Verify navigation bar present
6. Scroll page to check all slots render

**Critical Failure Signs:**
- ❌ **BLOCKER:** Infinite spinner (useEffect bug)
- ❌ **BLOCKER:** No navigation bar (CommunityContext issue)
- ❌ **BLOCKER:** 0 slots displayed when database has slots
- ❌ Console error: "Warning: React has detected a change in the order of Hooks"
- ❌ Console error: "Maximum update depth exceeded"

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 4: Slot Detail Page - Public View
**URL:** `http://localhost:3000/LMR/slots/1` (use actual slot_id from database)

**Expected Behavior:**
- ✅ Page loads within 3 seconds
- ✅ Slot details displayed:
  - Slot number
  - Description
  - Price per hour OR "Contact Owner for Quote"
  - Owner information (name, unit number)
- ✅ "Login to Book" button/message visible
- ✅ Clicking "Book" redirects to `/login?redirect=/LMR/slots/1`
- ✅ Navigation bar visible
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Get a valid slot_id from database:
   ```sql
   SELECT slot_id FROM parking_slots LIMIT 1;
   ```
2. Open `http://localhost:3000/LMR/slots/{slot_id}`
3. Verify slot details
4. Click "Book" button (should redirect to login)
5. Check F12 Console

**Failure Signs:**
- ❌ 404 Not Found
- ❌ "Slot not found" when slot exists
- ❌ Booking form visible without login (security issue)

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 5: User Registration
**URL:** `http://localhost:3000/register`

**Expected Behavior:**
- ✅ Registration form displays with fields:
  - Name
  - Email
  - Password
  - Phone
  - Unit Number
- ✅ Form validation works:
  - Empty fields show error
  - Invalid email format rejected
  - Weak password rejected
- ✅ Successful registration:
  - Creates user in auth.users
  - Creates profile in user_profiles
  - Sets `community_code: 'LMR'` automatically
  - Redirects to `/profile/complete` or dashboard
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Open `http://localhost:3000/register`
2. Fill form with NEW test data:
   - Name: Test User PreDeploy
   - Email: predeploy@parkboard.test
   - Password: SecurePass123!
   - Phone: +639171234567
   - Unit: 99Z
3. Submit form
4. Verify success redirect
5. Check Supabase Dashboard:
   ```sql
   SELECT * FROM user_profiles WHERE email = 'predeploy@parkboard.test';
   -- Verify community_code = 'LMR'
   ```

**Failure Signs:**
- ❌ Form submission fails
- ❌ Redirect to error page
- ❌ Console error: "null value in column community_code"
- ❌ User created but profile missing

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 6: User Login
**URL:** `http://localhost:3000/login`

**Expected Behavior:**
- ✅ Login form displays with fields:
  - Email
  - Password
- ✅ Successful login with test credentials:
  - Email: `user1@parkboard.test`
  - Password: `test123456`
- ✅ After login:
  - Redirects to `/LMR` (default community)
  - Navigation bar shows user name and unit number
  - "Sign Out" button visible
  - "Login" button no longer visible
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Open `http://localhost:3000/login`
2. Enter credentials:
   - Email: user1@parkboard.test
   - Password: test123456
3. Click "Sign In"
4. Verify redirect to `/LMR`
5. Check navigation bar for user info

**Failure Signs:**
- ❌ Login fails with valid credentials
- ❌ Redirect to `/slots` (404 - old single-tenant route)
- ❌ Navigation still shows "Login" after successful login

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

## P0: AUTHENTICATED USER TESTS (Login Required)

**Pre-requisite:** Complete Test 6 (User Login) successfully

---

### Test 7: Browse Slots - Authenticated View
**URL:** `http://localhost:3000/LMR/slots` (while logged in)

**Expected Behavior:**
- ✅ All public view features work (from Test 3)
- ✅ Navigation bar shows:
  - User name and unit number
  - "Sign Out" button
  - No "Login" button
- ✅ "Create New Slot" button visible
- ✅ Each slot card shows:
  - "Book Now" button (clickable)
  - Owner's own slots show "Edit" or different styling
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Ensure logged in (from Test 6)
2. Navigate to `http://localhost:3000/LMR/slots`
3. Verify authenticated UI elements
4. Check navigation bar user info
5. Verify "Create New Slot" button

**Failure Signs:**
- ❌ Still shows "Login" button when logged in
- ❌ No "Create New Slot" button
- ❌ Session lost (redirected to login)

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 8: Create New Slot
**URL:** `http://localhost:3000/LMR/slots/new`

**Expected Behavior:**
- ✅ Form displays with fields:
  - Slot number
  - Slot type (dropdown: Covered/Uncovered/Tandem)
  - Description
  - **Pricing type:** Radio buttons for "Set Price" or "Contact for Quote"
  - Price per hour (if "Set Price" selected)
- ✅ Form validation works:
  - Empty required fields show error
  - Price must be positive number
- ✅ Successful submission:
  - Slot created in database
  - Redirects to `/LMR/slots` or slot detail page
  - New slot visible in listing
- ✅ **Console shows 0 errors**

**Test Steps:**
1. While logged in, navigate to `http://localhost:3000/LMR/slots/new`
2. Fill form:
   - Slot Number: Z-999
   - Type: Covered
   - Description: Pre-deployment test slot
   - Pricing: Set Price
   - Price: 50
3. Submit form
4. Verify redirect and slot appears in listing
5. Check database:
   ```sql
   SELECT * FROM parking_slots WHERE slot_number = 'Z-999';
   ```

**Failure Signs:**
- ❌ Form not accessible (404 or redirect)
- ❌ Submission fails
- ❌ Slot created but not visible in listing
- ❌ `community_code` is NULL in database

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 9: Book a Slot (Complete Booking Flow)
**URL:** `http://localhost:3000/LMR/slots/{slot_id}` (choose slot owned by different user)

**Expected Behavior:**
- ✅ Slot detail page shows booking form
- ✅ Date/time picker works:
  - Can select future dates
  - Cannot select past dates
  - End time must be after start time
- ✅ Price calculation:
  - Total price updates as dates change
  - Formula: `duration_hours × price_per_hour`
- ✅ Successful booking:
  - Booking created in database
  - Redirects to `/LMR/bookings` or confirmation page
  - Booking visible in "My Bookings"
- ✅ **Console shows 0 errors**

**Test Steps:**
1. While logged in, go to `http://localhost:3000/LMR/slots`
2. Click on a slot you DON'T own
3. Fill booking form:
   - Start: Tomorrow 9:00 AM
   - End: Tomorrow 5:00 PM
4. Verify price calculation (8 hours × slot price)
5. Submit booking
6. Verify booking appears in bookings list
7. Check database:
   ```sql
   SELECT * FROM bookings WHERE renter_id = '{your_user_id}' ORDER BY created_at DESC LIMIT 1;
   ```

**Failure Signs:**
- ❌ Can book past dates
- ❌ Price calculation incorrect or missing
- ❌ Booking fails with error
- ❌ `slot_owner_id` is NULL (trigger failed)
- ❌ `total_price` is NULL (trigger failed)

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 10: View My Bookings
**URL:** `http://localhost:3000/LMR/bookings`

**Expected Behavior:**
- ✅ Page loads within 3 seconds
- ✅ Shows bookings list with:
  - Slot number
  - Start/end times
  - Total price
  - Status (pending/confirmed/completed/cancelled)
- ✅ At least 1 booking visible (from Test 9)
- ✅ Empty state if no bookings: "You have no bookings yet"
- ✅ Navigation bar visible
- ✅ **Console shows 0 errors**

**Test Steps:**
1. While logged in, navigate to `http://localhost:3000/LMR/bookings`
2. Verify booking from Test 9 appears
3. Check booking details accuracy
4. Check F12 Console

**Failure Signs:**
- ❌ 404 Not Found
- ❌ Infinite spinner
- ❌ Booking created but not visible
- ❌ Shows other users' bookings (RLS policy failure)

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

## P1: CRITICAL POST-AUTHENTICATION TESTS

### Test 11: User Sign Out
**URL:** Any page while logged in

**Expected Behavior:**
- ✅ Click "Sign Out" button in navigation
- ✅ Session cleared
- ✅ Redirected to `/` (root page)
- ✅ Navigation bar shows "Login" and "Register" buttons
- ✅ Attempting to access `/LMR/slots/new` redirects to login
- ✅ **Console shows 0 errors**

**Test Steps:**
1. While logged in, click "Sign Out" in navigation
2. Verify redirect to root page
3. Verify navigation shows public state
4. Try accessing protected route: `http://localhost:3000/LMR/slots/new`
5. Should redirect to login

**Failure Signs:**
- ❌ Sign Out button doesn't work
- ❌ Session persists after sign out
- ❌ Can still access protected routes

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 12: Invalid Community Code (404 Handling)
**URL:** `http://localhost:3000/INVALID/slots`

**Expected Behavior:**
- ✅ Shows 404 page
- ✅ Does NOT crash app
- ✅ Can navigate back to home
- ✅ **Console shows 0 errors** (404 is expected, not error)

**Test Steps:**
1. Open `http://localhost:3000/INVALID/slots`
2. Verify 404 page appears
3. Click "Go Home" or navigate to root
4. Verify app still works

**Failure Signs:**
- ❌ App crashes with white screen
- ❌ Console errors about CommunityContext
- ❌ Infinite spinner

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

### Test 13: Direct URL Access (Deep Linking)
**URL:** `http://localhost:3000/LMR/slots/1` (while logged out)

**Expected Behavior:**
- ✅ Redirects to `/login?redirect=/LMR/slots/1`
- ✅ After login, returns to original URL (`/LMR/slots/1`)
- ✅ Page loads correctly after redirect
- ✅ **Console shows 0 errors**

**Test Steps:**
1. Sign out if logged in
2. Directly access `http://localhost:3000/LMR/slots/new` (protected route)
3. Should redirect to login with query param
4. Log in
5. Verify redirected back to `/LMR/slots/new`

**Failure Signs:**
- ❌ No redirect to login
- ❌ After login, goes to wrong page
- ❌ Redirect parameter malformed

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_____________________________________________________

---

## P2: IMPORTANT BUT NOT BLOCKING

### Test 14: Mobile Responsiveness
**URL:** `http://localhost:3000/LMR/slots`

**Expected Behavior:**
- ✅ Navigation collapses to mobile view
- ✅ Slot cards stack vertically
- ✅ Forms remain usable
- ✅ No horizontal scrolling

**Test Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate through key pages
5. Check form usability

**Status:** [ ] PASS  [ ] FAIL  [ ] SKIP (Not blocking)

**Notes:**
_____________________________________________________

---

### Test 15: Browser Compatibility
**Browsers to Test:** Chrome, Firefox, Safari (if available)

**Expected Behavior:**
- ✅ All P0 tests pass in each browser
- ✅ UI looks consistent
- ✅ No browser-specific errors

**Test Steps:**
1. Repeat P0 tests in each browser
2. Note any browser-specific issues

**Status:** [ ] PASS  [ ] FAIL  [ ] SKIP (Not blocking)

**Notes:**
_____________________________________________________

---

## Automated Test Verification

### Run Automated Tests Before Deployment

```bash
# 1. Unit/Component Tests (MUST PASS)
npm test
# Expected: All 158+ tests passing

# 2. TypeScript Check (MUST PASS)
npx tsc --noEmit
# Expected: 0 errors

# 3. Linting (MUST PASS)
npm run lint
# Expected: 0 errors, warnings acceptable

# 4. Build Check (MUST PASS)
npm run build
# Expected: Successful production build

# 5. E2E Tests (HIGHLY RECOMMENDED)
npm run test:e2e
# Expected: 8 user journey tests passing
```

**Automated Test Results:**

- [ ] Unit tests: _____ / _____ passing
- [ ] TypeScript: _____ errors
- [ ] Linting: _____ errors
- [ ] Build: [ ] SUCCESS  [ ] FAIL
- [ ] E2E tests: _____ / _____ passing

---

## Final Pre-Deployment Checklist

### Code & Configuration
- [ ] All `.env.local` variables documented
- [ ] No hardcoded secrets in code
- [ ] No `console.log()` statements with sensitive data
- [ ] All test/debug code removed or commented out
- [ ] `.gitignore` includes `.env.local`

### Database
- [ ] All migrations run successfully
- [ ] At least 10 real/production-ready slots exist (or remove test slots)
- [ ] Test users identified (delete or keep?)
- [ ] RLS policies verified working

### Documentation
- [ ] CLAUDE.md updated with latest changes
- [ ] DEPLOYMENT_GUIDE read and understood
- [ ] Known issues documented

### Environment Readiness
- [ ] Local tests: ALL P0 tests passing
- [ ] Automated tests: ALL passing
- [ ] No console errors in any P0 test
- [ ] Performance acceptable (pages load < 5 seconds)

---

## Deployment Readiness Assessment

### Overall Status

**Total P0 Tests:** 13
**P0 Tests Passing:** _____ / 13

**Deployment Decision:**
- ✅ **READY:** 13/13 P0 tests passing, all automated tests passing
- ⚠️ **NEEDS WORK:** 11-12/13 P0 tests passing, review failures
- ❌ **NOT READY:** < 11/13 P0 tests passing, fix critical issues

**Critical Issues Found:**
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

**Deployment Recommendation:**
- [ ] **PROCEED** with deployment (all P0 tests passing)
- [ ] **FIX THEN DEPLOY** (minor issues, < 2 hours to fix)
- [ ] **BLOCK DEPLOYMENT** (critical bugs, needs significant work)

---

## Post-Deployment Verification

**After deploying to Vercel, repeat these tests at `parkboard.app/LMR`:**

1. Test 3: Browse Slots (public)
2. Test 6: User Login
3. Test 7: Browse Slots (authenticated)
4. Test 9: Book a Slot

**Production-Specific Checks:**
- [ ] HTTPS enabled (SSL certificate)
- [ ] Custom domain working (`parkboard.app/LMR`)
- [ ] Environment variables applied
- [ ] Database migrations applied in production
- [ ] No CORS errors
- [ ] API routes accessible

---

## Troubleshooting Common Issues

### Infinite Spinner on Browse Slots
**Cause:** useEffect dependency bug
**Fix:** Check `app/[community]/slots/page.tsx` line ~45
**Verify:** `useEffect(() => { fetchSlots() }, [])` NOT `[supabase]`

### No Navigation Bar
**Cause:** CommunityContext not available
**Fix:** Check `app/[community]/layout.tsx` wraps children in `<CommunityProvider>`

### 0 Slots Displayed When Database Has Slots
**Cause:** AuthWrapper blocking public page
**Fix:** Remove `<AuthWrapper>` from slots listing page
**Verify:** `app/[community]/slots/page.tsx` does NOT wrap content in AuthWrapper

### "community_code" NULL Constraint Violation
**Cause:** Signup API not providing community_code
**Fix:** Check `app/api/auth/signup/route.ts` includes `community_code: 'LMR'`

### React Hooks Order Warning
**Cause:** useEffect called conditionally
**Fix:** Move all useEffect hooks before any conditional returns

---

## Testing Log

**Tester Name:** _____________________
**Date:** _____________________
**Testing Duration:** _____ minutes
**Environment:** Local Development (http://localhost:3000)

**Final Approval:**

- [ ] All P0 tests completed and passing
- [ ] All automated tests passing
- [ ] Documentation reviewed
- [ ] Ready for deployment

**Signature:** _____________________
**Date:** _____________________

---

**Next Step:** Proceed to `DEPLOYMENT_GUIDE_VERCEL_FIRST_TIME_20251014.md`
