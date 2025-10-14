# ParkBoard - End-to-End Test Plan
**Date:** 2025-10-12
**Status:** Ready for Implementation
**Framework:** Playwright

---

## Executive Summary

ParkBoard currently has **excellent unit and component test coverage** (158 tests, 100% passing, ~85% code coverage). However, **E2E tests are missing**. This plan adds comprehensive end-to-end testing to validate complete user journeys from browser interaction through to database persistence.

### Current Test Coverage Gap

| Test Type | Current Status | Coverage |
|-----------|---------------|----------|
| **Unit Tests** | ✅ 158 tests passing | ~85% |
| **Component Tests** | ✅ 19 tests passing | ~90% |
| **Integration Tests** | ⚠️ Mocked, not real | Limited |
| **E2E Tests** | ❌ None | 0% |

### Why E2E Tests Matter

**Unit/Component tests validate:**
- ✅ Component rendering
- ✅ Mock interactions
- ✅ Isolated logic

**E2E tests validate:**
- 🔄 Real user flows (browser → server → database)
- 🔄 Authentication state persistence
- 🔄 Database transactions
- 🔄 Cross-page navigation
- 🔄 Real API responses
- 🔄 Error scenarios with actual server responses

### Goals

1. **Validate critical user journeys** end-to-end
2. **Test with real database** (test instance)
3. **Catch integration issues** unit tests can't find
4. **Ensure production-ready** behavior
5. **Support CI/CD pipeline** automation

---

## Test Framework: Playwright

### Why Playwright?

✅ **Multi-browser support** (Chrome, Firefox, Safari)
✅ **Auto-wait** for elements (no flaky tests)
✅ **Parallel execution** (fast test runs)
✅ **Built-in debugging** (trace viewer, screenshots)
✅ **Next.js integration** (first-class support)
✅ **TypeScript support** (type-safe tests)
✅ **Mobile viewport testing** (responsive validation)

### Alternatives Considered

| Framework | Pros | Cons | Decision |
|-----------|------|------|----------|
| **Playwright** | Fast, reliable, TypeScript | Newer ecosystem | ✅ **Selected** |
| Cypress | Popular, great DX | Slower, no multi-browser | ❌ Pass |
| Selenium | Mature, flexible | Complex setup, flaky | ❌ Pass |
| Puppeteer | Fast, Google-backed | Chrome-only | ❌ Pass |

---

## E2E Test Categories

### 1. Critical User Journeys (P0)
**Priority:** Highest
**Est. Time:** 4-6 hours
**Tests:** 8-10 scenarios

These tests validate the **core business flows** that must work for the app to be functional.

### 2. Authentication & Authorization (P0)
**Priority:** High
**Est. Time:** 2-3 hours
**Tests:** 5-7 scenarios

Validate login, registration, session persistence, and protected route access.

### 3. Booking Lifecycle (P0)
**Priority:** High
**Est. Time:** 3-4 hours
**Tests:** 6-8 scenarios

Complete booking flow from browsing → booking → viewing → cancellation.

### 4. Slot Management (P1)
**Priority:** Medium
**Est. Time:** 2-3 hours
**Tests:** 4-6 scenarios

Slot owner creating, editing, and managing their parking slots.

### 5. Error Scenarios & Edge Cases (P1)
**Priority:** Medium
**Est. Time:** 2-3 hours
**Tests:** 6-8 scenarios

Network failures, invalid data, concurrent bookings, etc.

### 6. Cross-Browser & Responsive (P2)
**Priority:** Low
**Est. Time:** 1-2 hours
**Tests:** 3-5 scenarios

Validate on Chrome, Firefox, Safari, and mobile viewports.

---

## Test Environment Setup

### Test Database Strategy

**Approach:** Separate test database instance

```bash
# Create test Supabase project or use separate schema
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-key-here
```

**Database Seeding:**
```sql
-- Test users (pre-created)
INSERT INTO auth.users VALUES
  ('test-renter-id', 'renter@test.com', ...),
  ('test-owner-id', 'owner@test.com', ...);

-- Test profiles
INSERT INTO user_profiles VALUES
  ('test-renter-id', 'Test Renter', ...),
  ('test-owner-id', 'Test Owner', ...);

-- Test parking slots
INSERT INTO parking_slots VALUES
  ('slot-1', 'test-owner-id', 'A-10', 'covered', ...),
  ('slot-2', 'test-owner-id', 'B-05', 'open', ...);
```

### Test User Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `renter@test.com` | `test123456` | Renter | Booking slots |
| `owner@test.com` | `test123456` | Owner | Listing slots |
| `admin@test.com` | `test123456` | Admin | Future admin tests |
| `new-user@test.com` | `test123456` | None | Registration tests |

### Environment Variables

**File:** `.env.test.local`
```bash
# Test database
NEXT_PUBLIC_SUPABASE_URL=https://test-cgbkknef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Test mode flag
NODE_ENV=test
E2E_TEST_MODE=true

# Base URL for tests
BASE_URL=http://localhost:3000
```

---

## Detailed Test Scenarios

## Category 1: Critical User Journeys (P0)

### CUJ-001: New User Registration → First Booking
**Priority:** P0
**Time Estimate:** 30-40 min
**Success Criteria:** User can register and make their first booking

**Steps:**
1. Visit landing page
2. Click "Sign Up"
3. Fill registration form:
   - Email: `newuser@test.com`
   - Password: `test123456`
   - Name: `New User`
   - Phone: `+639171234567`
   - Unit: `10A`
4. Submit form
5. **Verify:** Redirected to `/slots`
6. **Verify:** Session cookie exists
7. **Verify:** Database has new user + profile
8. Browse available slots
9. Click "Book" on first slot
10. Select date: Tomorrow
11. Select time: 9:00 AM - 5:00 PM
12. **Verify:** Price calculated (8 hours × rate)
13. Click "Confirm Booking"
14. **Verify:** Success message
15. **Verify:** Redirected to `/bookings`
16. **Verify:** Booking appears in database
17. **Verify:** Booking status = "pending"

**Expected Results:**
- ✅ User account created in `auth.users`
- ✅ Profile created in `user_profiles`
- ✅ User logged in (session valid)
- ✅ Booking created in `bookings` table
- ✅ Booking linked to user (`renter_id`)
- ✅ Booking linked to slot (`slot_id`)

**Test Code:**
```typescript
test('CUJ-001: New user registration → first booking', async ({ page }) => {
  // Step 1-5: Registration
  await page.goto('/')
  await page.click('text=Sign Up')
  await page.fill('input[name="email"]', 'newuser@test.com')
  await page.fill('input[name="password"]', 'test123456')
  await page.fill('input[name="name"]', 'New User')
  await page.fill('input[name="phone"]', '+639171234567')
  await page.fill('input[name="unit_number"]', '10A')
  await page.click('button:has-text("Sign Up")')

  // Verify redirect and session
  await expect(page).toHaveURL('/slots')
  const cookies = await page.context().cookies()
  expect(cookies.some(c => c.name.includes('supabase'))).toBeTruthy()

  // Step 8-13: Make booking
  await page.click('text=Book Now').first()
  await page.click('text=Tomorrow')
  await page.fill('input[type="time"][name="start"]', '09:00')
  await page.fill('input[type="time"][name="end"]', '17:00')

  // Verify price calculation
  await expect(page.locator('text=/₱\\d+/')).toBeVisible()

  await page.click('button:has-text("Confirm Booking")')

  // Verify success
  await expect(page).toHaveURL('/bookings')
  await expect(page.locator('text=Slot')).toBeVisible()
})
```

---

### CUJ-002: Returning User Login → Cancel Booking
**Priority:** P0
**Time Estimate:** 20-30 min
**Success Criteria:** Existing user can log in and cancel a booking

**Steps:**
1. Visit landing page
2. Click "Login"
3. Enter email: `renter@test.com`
4. Enter password: `test123456`
5. Click "Sign In"
6. **Verify:** Redirected to `/slots`
7. Navigate to "My Bookings"
8. **Verify:** See existing booking
9. Click "Cancel" on a pending booking
10. Confirm cancellation dialog
11. **Verify:** Booking status changes to "cancelled"
12. **Verify:** Database updated (`status = 'cancelled'`)

**Expected Results:**
- ✅ User authenticated successfully
- ✅ Session persists across navigation
- ✅ Booking status updated in database
- ✅ UI reflects cancellation immediately

---

### CUJ-003: Slot Owner Lists New Slot → Gets Booked
**Priority:** P0
**Time Estimate:** 30-40 min
**Success Criteria:** Owner can list a slot and another user can book it

**Steps:**
1. Login as owner (`owner@test.com`)
2. Navigate to "List Slot"
3. Fill form:
   - Slot Number: `C-15`
   - Type: Covered
   - Price: `₱55/hour`
   - Description: `Near elevator`
4. Submit form
5. **Verify:** Slot appears in browse slots
6. **Verify:** Database has new slot
7. Logout
8. Login as renter (`renter@test.com`)
9. Browse slots
10. **Verify:** New slot `C-15` visible
11. Book the slot
12. **Verify:** Booking created
13. Logout
14. Login as owner again
15. Navigate to "My Bookings" → "As Owner" tab
16. **Verify:** See renter's booking for slot `C-15`

**Expected Results:**
- ✅ Slot created by owner
- ✅ Slot visible to all users
- ✅ Renter can book owner's slot
- ✅ Owner sees booking in their dashboard
- ✅ Database relationships correct

---

### CUJ-004: OAuth Login (Google) → Browse Slots
**Priority:** P0
**Time Estimate:** 20-30 min
**Success Criteria:** User can log in via Google OAuth

**Steps:**
1. Visit landing page
2. Click "Login"
3. Click "Continue with Google"
4. **Mock/Stub:** Google OAuth flow (return valid token)
5. **Verify:** Redirected to `/slots`
6. **Verify:** User profile created/fetched
7. Browse slots
8. **Verify:** Navigation shows user name

**Expected Results:**
- ✅ OAuth flow completes successfully
- ✅ User authenticated via Google
- ✅ Profile auto-created if first login
- ✅ Session valid and persistent

**Note:** May require OAuth mocking/stubbing in test environment

---

## Category 2: Authentication & Authorization (P0)

### AUTH-001: Registration Form Validation
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Empty email → Error message
2. Invalid email format → Error message
3. Password too short → Error message
4. Missing required fields → Form doesn't submit
5. Duplicate email → Server error displayed

---

### AUTH-002: Login Form Validation
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Wrong password → Error message
2. Non-existent email → Error message
3. Empty fields → Form doesn't submit
4. SQL injection attempt → Safely handled

---

### AUTH-003: Protected Route Access
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Unauthenticated user visits `/slots` → Redirect to `/login`
2. Unauthenticated user visits `/bookings` → Redirect to `/login`
3. Unauthenticated user visits `/slots/new` → Redirect to `/login`
4. Authenticated user can access all protected routes
5. After logout, protected routes redirect again

**Test Code:**
```typescript
test('AUTH-003: Protected routes redirect when not logged in', async ({ page }) => {
  // Try to access protected route without login
  await page.goto('/slots')

  // Should redirect to login with return path
  await expect(page).toHaveURL(/\/login\?redirect=/)

  // Login
  await page.fill('input[name="email"]', 'renter@test.com')
  await page.fill('input[name="password"]', 'test123456')
  await page.click('button:has-text("Sign In")')

  // Should redirect back to original destination
  await expect(page).toHaveURL('/slots')
})
```

---

### AUTH-004: Session Persistence
**Priority:** P0
**Time Estimate:** 10-15 min

**Test Cases:**
1. Login → Close browser → Reopen → Still logged in
2. Login → Refresh page → Still logged in
3. Login → Navigate between pages → Still logged in
4. Logout → Session cookie cleared
5. Logout → Protected routes redirect again

---

### AUTH-005: Password Reset Flow
**Priority:** P1
**Time Estimate:** 20-30 min

**Test Cases:**
1. Click "Forgot Password"
2. Enter email
3. **Verify:** Email sent (check test email inbox)
4. Click reset link
5. Enter new password
6. **Verify:** Password updated
7. Login with new password → Success

---

## Category 3: Booking Lifecycle (P0)

### BOOK-001: Browse Available Slots
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Page loads with slot grid
2. Only "active" slots shown
3. Slot cards display correct info (number, type, price)
4. "Available" badge shown
5. Empty state when no slots
6. Filter by slot type (if implemented)

---

### BOOK-002: Slot Detail View
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Click slot card → Navigate to `/slots/[id]`
2. Slot details displayed correctly
3. Owner info shown
4. Booking form rendered
5. Date/time pickers work
6. Price calculates dynamically

---

### BOOK-003: Create Booking
**Priority:** P0
**Time Estimate:** 20-25 min

**Test Cases:**
1. Select valid date/time
2. **Verify:** Price calculated correctly
3. Submit booking
4. **Verify:** Success message
5. **Verify:** Database entry created
6. **Verify:** Status = "pending"
7. **Verify:** User redirected to bookings

---

### BOOK-004: View My Bookings
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Navigate to `/bookings`
2. **Verify:** List of user's bookings
3. **Verify:** Correct booking details (slot, date, time, price)
4. **Verify:** Status badges correct (pending/confirmed/cancelled)
5. **Verify:** Contact info shown
6. **Verify:** Empty state when no bookings

---

### BOOK-005: Cancel Booking
**Priority:** P0
**Time Estimate:** 15-20 min

**Test Cases:**
1. Navigate to bookings
2. Click "Cancel" on pending booking
3. Confirm dialog appears
4. Click "Yes, Cancel"
5. **Verify:** Status changes to "cancelled"
6. **Verify:** Database updated
7. **Verify:** UI updates immediately
8. **Verify:** Cancel button disappears (can't cancel twice)

---

### BOOK-006: Concurrent Booking Prevention
**Priority:** P0
**Time Estimate:** 25-30 min

**Test Cases:**
1. Two users open same slot simultaneously
2. User A books slot for time X
3. User B tries to book same slot for overlapping time
4. **Verify:** User B gets error message
5. **Verify:** Database constraint prevents duplicate booking
6. **Verify:** User B can book different time slot

**Test Code:**
```typescript
test('BOOK-006: Prevent concurrent bookings', async ({ browser }) => {
  // Create two browser contexts (two users)
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()

  // Both users login
  await loginAs(page1, 'renter1@test.com')
  await loginAs(page2, 'renter2@test.com')

  // Both navigate to same slot
  await page1.goto('/slots/slot-1')
  await page2.goto('/slots/slot-1')

  // Both select same time
  await page1.fill('input[name="start"]', '2025-10-15T09:00')
  await page1.fill('input[name="end"]', '2025-10-15T17:00')
  await page2.fill('input[name="start"]', '2025-10-15T09:00')
  await page2.fill('input[name="end"]', '2025-10-15T17:00')

  // User 1 books first
  await page1.click('button:has-text("Confirm Booking")')
  await expect(page1.locator('text=Booking confirmed')).toBeVisible()

  // User 2 tries to book (should fail)
  await page2.click('button:has-text("Confirm Booking")')
  await expect(page2.locator('text=already booked')).toBeVisible()
})
```

---

## Category 4: Slot Management (P1)

### SLOT-001: Create New Slot Listing
**Priority:** P1
**Time Estimate:** 20-25 min

**Test Cases:**
1. Navigate to `/slots/new`
2. Fill form with valid data
3. Submit
4. **Verify:** Slot created in database
5. **Verify:** Slot appears in browse slots
6. **Verify:** Owner sees slot in their listings

---

### SLOT-002: Form Validation
**Priority:** P1
**Time Estimate:** 15-20 min

**Test Cases:**
1. Empty slot number → Error
2. Negative price → Error
3. Missing description → Still submits (optional)
4. Duplicate slot number → Server error
5. HTML injection in description → Sanitized

---

### SLOT-003: Edit Existing Slot
**Priority:** P2 (Future feature)
**Time Estimate:** 20-25 min

**Test Cases:**
1. Navigate to slot settings
2. Update price
3. Update description
4. **Verify:** Changes saved
5. **Verify:** Database updated
6. **Verify:** Browse slots shows new info

---

### SLOT-004: Delete/Deactivate Slot
**Priority:** P2 (Future feature)
**Time Estimate:** 15-20 min

**Test Cases:**
1. Navigate to slot settings
2. Click "Deactivate"
3. Confirm
4. **Verify:** Slot hidden from browse slots
5. **Verify:** Status = "inactive" in database
6. **Verify:** Existing bookings unaffected

---

## Category 5: Error Scenarios & Edge Cases (P1)

### ERR-001: Network Failure Handling
**Priority:** P1
**Time Estimate:** 20-25 min

**Test Cases:**
1. Disconnect network
2. Try to submit booking
3. **Verify:** Error message shown
4. **Verify:** Form data preserved
5. Reconnect network
6. Retry submission → Success

---

### ERR-002: Invalid Date/Time Selection
**Priority:** P1
**Time Estimate:** 15-20 min

**Test Cases:**
1. Select end time before start time → Error
2. Select past date → Error
3. Select date too far in future → Warning
4. Start time = end time → Error

---

### ERR-003: API Error Responses
**Priority:** P1
**Time Estimate:** 20-25 min

**Test Cases:**
1. Mock 500 server error → User-friendly message
2. Mock 401 unauthorized → Redirect to login
3. Mock 409 conflict → Specific error message
4. Mock timeout → Retry option

---

### ERR-004: Database Constraint Violations
**Priority:** P1
**Time Estimate:** 20-25 min

**Test Cases:**
1. Duplicate slot number → Clear error
2. Foreign key violation → Error message
3. Check constraint violation → Form validation error

---

### ERR-005: XSS and SQL Injection
**Priority:** P0
**Time Estimate:** 20-30 min

**Test Cases:**
1. Enter `<script>alert('xss')</script>` in description → Sanitized
2. Enter SQL injection in search → No effect
3. Enter malicious HTML in all text fields → Safe handling

---

## Category 6: Cross-Browser & Responsive (P2)

### RESP-001: Mobile Viewport (375px)
**Priority:** P2
**Time Estimate:** 15-20 min

**Test Cases:**
1. Bottom navigation visible
2. Slot cards stack vertically
3. Forms are usable
4. Buttons are tappable (44px min)

---

### RESP-002: Tablet Viewport (768px)
**Priority:** P2
**Time Estimate:** 10-15 min

**Test Cases:**
1. Slot grid shows 2 columns
2. Navigation switches to top bar
3. Forms have better layout

---

### RESP-003: Desktop Viewport (1920px)
**Priority:** P2
**Time Estimate:** 10-15 min

**Test Cases:**
1. Slot grid shows 3+ columns
2. Top navigation visible
3. Sidebar (if implemented)

---

### RESP-004: Cross-Browser Compatibility
**Priority:** P2
**Time Estimate:** 30-40 min

**Browsers to Test:**
- Chrome (Chromium)
- Firefox
- Safari (WebKit)

**Test:** Run full CUJ-001 on all three browsers

---

## Test Data Management

### Seed Data Strategy

**Before Each Test Suite:**
```sql
-- Reset test database
TRUNCATE bookings, parking_slots, user_profiles CASCADE;

-- Seed test users
INSERT INTO auth.users ...

-- Seed test profiles
INSERT INTO user_profiles ...

-- Seed test slots
INSERT INTO parking_slots ...
```

### Cleanup Strategy

**After Each Test:**
```typescript
test.afterEach(async ({ page }) => {
  // Logout
  await page.goto('/logout')

  // Clear cookies
  await page.context().clearCookies()

  // Clear local storage
  await page.evaluate(() => localStorage.clear())
})
```

**After All Tests:**
```sql
-- Clean up test data
DELETE FROM bookings WHERE renter_id LIKE 'test-%';
DELETE FROM parking_slots WHERE owner_id LIKE 'test-%';
DELETE FROM user_profiles WHERE id LIKE 'test-%';
```

---

## Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Test Utilities

### Helper Functions

**File:** `e2e/helpers/auth.ts`

```typescript
import { Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password: string = 'test123456') {
  await page.goto('/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign In")')
  await page.waitForURL('/slots')
}

export async function logout(page: Page) {
  await page.click('button:has-text("Sign Out")')
  await page.waitForURL('/login')
}

export async function registerUser(page: Page, userData: UserData) {
  await page.goto('/register')
  await page.fill('input[name="email"]', userData.email)
  await page.fill('input[name="password"]', userData.password)
  await page.fill('input[name="name"]', userData.name)
  await page.fill('input[name="phone"]', userData.phone)
  await page.fill('input[name="unit_number"]', userData.unitNumber)
  await page.click('button:has-text("Sign Up")')
  await page.waitForURL('/slots')
}
```

**File:** `e2e/helpers/booking.ts`

```typescript
export async function createBooking(page: Page, slotId: string, date: string, startTime: string, endTime: string) {
  await page.goto(`/slots/${slotId}`)
  await page.fill('input[name="date"]', date)
  await page.fill('input[name="start"]', startTime)
  await page.fill('input[name="end"]', endTime)
  await page.click('button:has-text("Confirm Booking")')
  await page.waitForURL('/bookings')
}

export async function cancelBooking(page: Page, bookingId: string) {
  await page.goto('/bookings')
  await page.click(`[data-booking-id="${bookingId}"] button:has-text("Cancel")`)
  await page.click('button:has-text("Yes")')
  await page.waitForSelector('text=cancelled')
}
```

**File:** `e2e/helpers/database.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function seedTestData() {
  // Seed users, profiles, slots
  await supabase.from('user_profiles').insert([...])
  await supabase.from('parking_slots').insert([...])
}

export async function cleanupTestData() {
  // Remove test data
  await supabase.from('bookings').delete().like('renter_id', 'test-%')
  await supabase.from('parking_slots').delete().like('owner_id', 'test-%')
}

export async function getBookingById(id: string) {
  const { data } = await supabase.from('bookings').select('*').eq('id', id).single()
  return data
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Implementation Timeline

### Week 1: Setup & Critical Journeys

**Day 1-2: Setup (4-6 hours)**
- [ ] Install Playwright
- [ ] Configure `playwright.config.ts`
- [ ] Set up test database
- [ ] Create seed data scripts
- [ ] Create helper utilities

**Day 3-4: Critical User Journeys (6-8 hours)**
- [ ] CUJ-001: Registration → First Booking
- [ ] CUJ-002: Login → Cancel Booking
- [ ] CUJ-003: List Slot → Get Booked
- [ ] CUJ-004: OAuth Login

**Day 5: Authentication Tests (4-5 hours)**
- [ ] AUTH-001: Registration validation
- [ ] AUTH-002: Login validation
- [ ] AUTH-003: Protected routes
- [ ] AUTH-004: Session persistence

### Week 2: Booking & Error Scenarios

**Day 1-2: Booking Lifecycle (6-8 hours)**
- [ ] BOOK-001: Browse slots
- [ ] BOOK-002: Slot detail
- [ ] BOOK-003: Create booking
- [ ] BOOK-004: View bookings
- [ ] BOOK-005: Cancel booking
- [ ] BOOK-006: Concurrent booking prevention

**Day 3-4: Error Scenarios (6-7 hours)**
- [ ] ERR-001: Network failures
- [ ] ERR-002: Invalid date/time
- [ ] ERR-003: API errors
- [ ] ERR-004: Database constraints
- [ ] ERR-005: XSS/SQL injection

**Day 5: Cross-Browser & Polish (3-4 hours)**
- [ ] RESP-001: Mobile viewport
- [ ] RESP-002: Tablet viewport
- [ ] RESP-003: Desktop viewport
- [ ] Run all tests on Chrome/Firefox/Safari

### Week 3: CI/CD & Documentation

**Day 1-2: CI/CD Integration (4-5 hours)**
- [ ] Set up GitHub Actions
- [ ] Configure test environment
- [ ] Add test badges to README
- [ ] Set up test result reporting

**Day 3: Documentation (2-3 hours)**
- [ ] Update README with E2E test instructions
- [ ] Document test data setup
- [ ] Create troubleshooting guide
- [ ] Record demo videos

---

## Success Metrics

### Coverage Goals

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Critical User Journeys | 4 tests | 0 | ❌ TODO |
| Authentication | 5 tests | 0 | ❌ TODO |
| Booking Lifecycle | 6 tests | 0 | ❌ TODO |
| Slot Management | 4 tests | 0 | ❌ TODO |
| Error Scenarios | 5 tests | 0 | ❌ TODO |
| Responsive | 4 tests | 0 | ❌ TODO |
| **Total** | **28 tests** | **0** | ❌ TODO |

### Quality Metrics

- **Flakiness Rate:** <5% (tests should pass consistently)
- **Execution Time:** <10 minutes for full suite
- **Browser Coverage:** Chrome, Firefox, Safari
- **Viewport Coverage:** Mobile (375px), Tablet (768px), Desktop (1920px)

---

## Risks & Mitigation

### Risk 1: Flaky Tests
**Cause:** Network delays, timing issues
**Mitigation:** Use Playwright's auto-wait, explicit waits, retries

### Risk 2: Test Database Pollution
**Cause:** Tests not cleaning up properly
**Mitigation:** Use `beforeEach`/`afterEach` hooks, seed data before each test

### Risk 3: OAuth Testing Complexity
**Cause:** Real OAuth requires external services
**Mitigation:** Mock OAuth responses or use test OAuth provider

### Risk 4: Slow Test Execution
**Cause:** Too many tests, serial execution
**Mitigation:** Run tests in parallel, use test sharding

### Risk 5: CI/CD Environment Differences
**Cause:** Different Node/browser versions
**Mitigation:** Use containerized testing (Docker), lock dependencies

---

## Test Maintenance

### Regular Tasks

**Weekly:**
- Review failed test reports
- Update test data if schema changes
- Check for flaky tests

**Monthly:**
- Update Playwright version
- Review test coverage gaps
- Optimize slow tests

**Per Release:**
- Run full regression suite
- Update tests for new features
- Archive obsolete tests

---

## Next Steps

1. **Review this plan** with team (30 min)
2. **Install Playwright** (10 min)
3. **Set up test database** (1 hour)
4. **Create first test** (CUJ-001) (2 hours)
5. **Run and validate** (30 min)
6. **Continue with remaining tests** (20-25 hours total)

---

## Estimated Total Time

- **Setup:** 4-6 hours
- **Critical Tests (P0):** 16-20 hours
- **Medium Priority (P1):** 12-15 hours
- **Low Priority (P2):** 6-8 hours
- **CI/CD & Docs:** 6-8 hours

**Total:** 44-57 hours (approximately 6-7 days of focused work)

---

**Status:** ✅ Ready to implement
**Next Action:** Install Playwright and set up test environment
**Priority:** High (fills critical testing gap)
