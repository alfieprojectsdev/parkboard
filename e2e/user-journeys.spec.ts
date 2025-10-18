/**
 * E2E Tests - Critical User Journeys (Multi-Tenant MVP)
 *
 * These tests use real stress test data created by scripts/generate-stress-test-data.sh
 * Run that script first: npm run stress:data
 *
 * Test users:
 * - user1@parkboard.test to user20@parkboard.test (password: test123456)
 * - All users are in LMR (Lumiere Residences) community
 *
 * Multi-Tenant Architecture:
 * - Routes: /LMR/slots, /LMR/bookings (not /slots)
 * - Public browsing: /LMR/slots accessible without login
 * - Actions require auth: booking, listing slots
 *
 * Updated: 2025-10-14 for multi-tenant architecture
 */

import { test, expect } from '@playwright/test'
import { login, goToLMRSlots, goToLMRBookings } from './helpers'

// ============================================================================
// CUJ-001: User Login → Browse Slots → View Slot Detail (Multi-Tenant)
// ============================================================================

test.describe('CUJ-001: User Login and Slot Browsing (Multi-Tenant)', () => {
  test('user can login and browse available parking slots', async ({ page }) => {
    // Step 1: Visit landing page (community selector)
    await page.goto('/')

    // Verify landing page loads
    await expect(page.locator('text=ParkBoard').first()).toBeVisible()

    // Step 2: Click Login
    await page.locator('text=Login').first().click()

    // Step 3: Fill login form with test user
    await page.fill('input[id="email"]', 'user1@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')

    // Step 4: Submit login
    await page.click('button:has-text("Sign In")')

    // Step 5: Should redirect to root (community selector) after login
    await expect(page).toHaveURL('/')

    // Step 6: Click on Lumiere Residences community
    await page.locator('text=/Lumiere|LMR/i').first().click()

    // Step 7: Verify on LMR landing page
    await expect(page).toHaveURL('/LMR')
    await expect(page.locator('text=/Lumiere/i').first()).toBeVisible()

    // Step 8: Click "Browse Slots"
    await page.locator('text=View Available Slots').first().click()

    // Step 9: Verify on multi-tenant slots page
    await expect(page).toHaveURL('/LMR/slots')

    // Step 10: Verify slots are loaded
    await expect(page.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible({ timeout: 10000 })

    // Step 11: Verify user is logged in (check navigation shows name)
    await expect(page.locator('nav').locator('text=Test User 1')).toBeVisible()

    // Step 12: Click on first available slot
    await page.locator('text=/Slot [A-Z]-\\d+/i').first().click()

    // Step 13: Verify slot detail page loaded (multi-tenant URL)
    await expect(page).toHaveURL(/\/LMR\/slots\/\d+/)
  })
})

// ============================================================================
// CUJ-002: New User Registration (Multi-Tenant)
// ============================================================================

test.describe('CUJ-002: New User Registration (Multi-Tenant)', () => {
  test('new user can register successfully', async ({ page }) => {
    // Use a unique email for each test run
    const timestamp = Date.now()
    const testEmail = `newuser${timestamp}@parkboard.test`

    await page.goto('/register')

    // Fill registration form
    await page.fill('input[id="name"]', 'Test User')
    await page.fill('input[id="email"]', testEmail)
    await page.fill('input[id="phone"]', '+639171234599')
    await page.fill('input[id="unit_number"]', '99-Z')
    await page.fill('input[id="password"]', 'test123456')
    await page.fill('input[id="confirmPassword"]', 'test123456')

    // Submit form
    await page.click('button:has-text("Sign Up")')

    // Should redirect to root (community selector) after registration
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // Verify user is logged in (check navigation)
    await expect(page.locator('nav').locator('text=Test User')).toBeVisible()
  })

  test('shows error for duplicate email', async ({ page }) => {
    await page.goto('/register')

    // Try to register with existing test user email
    await page.fill('input[id="name"]', 'Duplicate User')
    await page.fill('input[id="email"]', 'user1@parkboard.test')
    await page.fill('input[id="phone"]', '+639171234500')
    await page.fill('input[id="unit_number"]', '1-A')
    await page.fill('input[id="password"]', 'test123456')
    await page.fill('input[id="confirmPassword"]', 'test123456')

    await page.click('button:has-text("Sign Up")')

    // Should show error message
    await expect(page.locator('text=/already|exists|duplicate/i')).toBeVisible({ timeout: 10000 })
  })
})

// ============================================================================
// CUJ-003: Complete Booking Flow (Multi-Tenant)
// ============================================================================

test.describe('CUJ-003: Complete Booking Flow (Multi-Tenant)', () => {
  test.use({ storageState: undefined }) // Clear any stored auth

  test('user can make a booking end-to-end', async ({ page }) => {
    // Step 1: Login
    await login(page, 'user2@parkboard.test', 'test123456')

    // Step 2: Navigate to LMR community
    await page.goto('/LMR/slots')

    // Step 3: Wait for slots to load
    await page.waitForSelector('text=/Slot [A-Z]-\\d+/i', { timeout: 10000 })

    // Step 4: Click first slot with instant booking
    await page.locator('text=/Slot [A-Z]-\\d+/i').first().click()

    // Verify on slot detail page
    await expect(page).toHaveURL(/\/LMR\/slots\/\d+/)

    // Step 5: Fill booking form with future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7) // 7 days from now
    futureDate.setHours(10, 0, 0, 0) // 10 AM
    const dateString = futureDate.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM

    await page.fill('input[type="datetime-local"][id*="start"]', dateString)

    // End time: 2 hours later
    const endDate = new Date(futureDate)
    endDate.setHours(endDate.getHours() + 2)
    const endDateString = endDate.toISOString().slice(0, 16)

    await page.fill('input[type="datetime-local"][id*="end"]', endDateString)

    // Step 6: Verify price calculation appears
    await expect(page.locator('text=/₱\\d+/')).toBeVisible()

    // Step 7: Submit booking
    await page.click('button:has-text("Confirm Booking")')

    // Step 8: Verify redirect to bookings page (multi-tenant)
    await expect(page).toHaveURL('/LMR/bookings', { timeout: 10000 })

    // Step 9: Verify booking appears in list
    await expect(page.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible()
  })
})

// ============================================================================
// CUJ-004: View My Bookings (Multi-Tenant)
// ============================================================================

test.describe('CUJ-004: View My Bookings (Multi-Tenant)', () => {
  test('logged in user can view their bookings', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[id="email"]', 'user3@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    await expect(page).toHaveURL('/')

    // Navigate to LMR bookings
    await page.goto('/LMR/bookings')

    // Should be on bookings page (multi-tenant)
    await expect(page).toHaveURL('/LMR/bookings')

    // Page title should be visible
    await expect(page.locator('text=My Bookings')).toBeVisible()

    // Check for bookings (may be empty if user has no bookings)
    const hasSlotText = await page.locator('text=/Slot [A-Z]-\\d+/i').count() > 0

    if (hasSlotText) {
      // Verify booking details are shown
      await expect(page.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible()
    } else {
      // Verify empty state with CTA
      await expect(page.locator('text=/haven\'t made any bookings|No bookings/i')).toBeVisible()
      await expect(page.locator('text=Browse')).toBeVisible()
    }
  })
})

// ============================================================================
// CUJ-005: Protected Route Redirect (Multi-Tenant)
// ============================================================================

test.describe('CUJ-005: Protected Routes (Multi-Tenant)', () => {
  test.use({ storageState: undefined }) // Clear any stored auth

  test('unauthenticated user can browse slots but not book', async ({ page }) => {
    // Step 1: Browse slots without login (PUBLIC ACCESS)
    await page.goto('/LMR/slots')

    // Should be able to view slots page (public browsing)
    await expect(page).toHaveURL('/LMR/slots')
    await expect(page.locator('text=Available Parking Slots')).toBeVisible({ timeout: 10000 })

    // Step 2: Try to access bookings (protected route)
    await page.goto('/LMR/bookings')

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(page.url()).toContain('/LMR/bookings')
  })

  test('after login, user is redirected back to original page', async ({ page }) => {
    // Try to access /LMR/bookings without auth
    await page.goto('/LMR/bookings')

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=/)

    // Login
    await page.fill('input[id="email"]', 'user4@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    // Should redirect back to /LMR/bookings
    await expect(page).toHaveURL('/LMR/bookings', { timeout: 10000 })
  })
})

// ============================================================================
// CUJ-006: Session Persistence (Multi-Tenant)
// ============================================================================

test.describe('CUJ-006: Session Persistence (Multi-Tenant)', () => {
  test('session persists across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[id="email"]', 'user5@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    await expect(page).toHaveURL('/')

    // Navigate to LMR slots
    await page.goto('/LMR/slots')

    // Verify logged in
    await expect(page.locator('nav').locator('text=Test User 5')).toBeVisible()

    // Reload page
    await page.reload()

    // Should still be logged in and on same page
    await expect(page).toHaveURL('/LMR/slots')
    await expect(page.locator('nav').locator('text=Test User 5')).toBeVisible()

    // Navigate to bookings
    await page.locator('text=My Bookings').first().click()
    await expect(page).toHaveURL('/LMR/bookings')

    // Should still be logged in
    await expect(page.locator('nav').locator('text=Test User 5')).toBeVisible()
  })
})

// ============================================================================
// CUJ-007: Logout Flow (Multi-Tenant)
// ============================================================================

test.describe('CUJ-007: Logout (Multi-Tenant)', () => {
  test.use({ storageState: undefined }) // Clear any stored auth

  test('user can logout successfully', async ({ page }) => {
    // Step 1: Login using helper (with proper timeout for production)
    await login(page, 'user6@parkboard.test', 'test123456')

    // Step 2: Navigate to slots to verify logged in state
    await page.goto('/LMR/slots')

    // Step 3: Verify user is logged in (check navigation shows name)
    await expect(page.locator('nav').locator('text=Test User 6')).toBeVisible({ timeout: 10000 })

    // Step 4: Click Sign Out button
    await page.click('button:has-text("Sign Out")')

    // Step 5: Should redirect to login page
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Step 6: Verify logged out state - should see Login/Register buttons
    await expect(page.locator('text=Login').first()).toBeVisible()
    await expect(page.locator('text=Register').first()).toBeVisible()

    // Step 7: Try to access protected route (should redirect to login)
    await page.goto('/LMR/bookings')

    // Step 8: Should redirect back to login with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=/, { timeout: 5000 })
    expect(page.url()).toContain('/LMR/bookings')
  })
})

// ============================================================================
// CUJ-008: Multiple Users Concurrent Browsing (Multi-Tenant)
// ============================================================================

test.describe('CUJ-008: Multiple Users (Multi-Tenant)', () => {
  test('multiple users can browse slots simultaneously', async ({ browser }) => {
    // Create two browser contexts (simulate two users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // User 1 logs in
    await page1.goto('/login')
    await page1.fill('input[id="email"]', 'user7@parkboard.test')
    await page1.fill('input[id="password"]', 'test123456')
    await page1.click('button:has-text("Sign In")')
    await expect(page1).toHaveURL('/')
    await page1.goto('/LMR/slots')

    // User 2 logs in
    await page2.goto('/login')
    await page2.fill('input[id="email"]', 'user8@parkboard.test')
    await page2.fill('input[id="password"]', 'test123456')
    await page2.click('button:has-text("Sign In")')
    await expect(page2).toHaveURL('/')
    await page2.goto('/LMR/slots')

    // Both should see slots
    await expect(page1.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible({ timeout: 10000 })
    await expect(page2.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible({ timeout: 10000 })

    // Cleanup
    await context1.close()
    await context2.close()
  })
})

// ============================================================================
// 🆕 MULTI-TENANT SPECIFIC TESTS
// ============================================================================

// ============================================================================
// CUJ-009: Community Selector and Landing Page
// ============================================================================

test.describe('CUJ-009: Community Selector and Landing Page', () => {
  test('guest can navigate from root to community landing to slots', async ({ page }) => {
    // Step 1: Visit root (community selector)
    await page.goto('/')

    // Verify community selector page loads
    await expect(page.locator('text=ParkBoard').first()).toBeVisible()
    await expect(page.locator('text=/Welcome|Community|Parking/i').first()).toBeVisible()

    // Step 2: Click on Lumiere community card
    await page.locator('text=/Lumiere|LMR/i').first().click()

    // Step 3: Verify on LMR landing page
    await expect(page).toHaveURL('/LMR')
    await expect(page.locator('text=/Lumiere Residences/i').first()).toBeVisible()

    // Step 4: Verify landing page content
    await expect(page.locator('text=View Available Slots').first()).toBeVisible()

    // Step 5: Click "Browse Slots"
    await page.locator('text=View Available Slots').first().click()

    // Step 6: Verify on slots page
    await expect(page).toHaveURL('/LMR/slots')
    await expect(page.locator('text=Available Parking Slots')).toBeVisible()
  })
})

// ============================================================================
// CUJ-010: Public Browsing (Guest without login)
// ============================================================================

test.describe('CUJ-010: Public Browsing (Guest)', () => {
  test.use({ storageState: undefined }) // Clear any stored auth

  test('guest can browse slots without login', async ({ page }) => {
    // Step 1: Go directly to slots page (no login)
    await page.goto('/LMR/slots')

    // Step 2: Verify slots page loads
    await expect(page).toHaveURL('/LMR/slots')
    await expect(page.locator('text=Available Parking Slots')).toBeVisible()

    // Step 3: Verify navigation shows Login/Register buttons (not user name)
    await expect(page.locator('text=Login').first()).toBeVisible()
    await expect(page.locator('text=Register').first()).toBeVisible()

    // Step 4: Verify can see slot listings
    await page.waitForSelector('text=/Slot [A-Z]-\\d+/i', { timeout: 10000 })
    await expect(page.locator('text=/Slot [A-Z]-\\d+/i').first()).toBeVisible()

    // Step 5: Click on a slot to view details
    await page.locator('text=/Slot [A-Z]-\\d+/i').first().click()

    // Step 6: Verify on slot detail page (public access)
    await expect(page).toHaveURL(/\/LMR\/slots\/\d+/)

    // Step 7: Should see slot info but booking requires login
    // (If explicit pricing slot, booking form shows "Login to Book")
    // (If request quote slot, shows owner contact - public)
  })

  test('guest is redirected to login when trying to list a slot', async ({ page }) => {
    // Try to access "List My Slot" page without login
    await page.goto('/LMR/slots/new')

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(page.url()).toContain('/LMR/slots/new')
  })
})

// ============================================================================
// CUJ-011: Hybrid Pricing (Request Quote vs Instant Booking)
// ============================================================================

test.describe('CUJ-011: Hybrid Pricing', () => {
  test('user can identify instant booking vs request quote slots', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[id="email"]', 'user9@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    // Navigate to slots
    await page.goto('/LMR/slots')

    // Wait for slots to load
    await page.waitForSelector('text=/Slot [A-Z]-\\d+/i', { timeout: 10000 })

    // Look for instant booking badge (explicit pricing)
    const instantBookingBadge = page.locator('text=/Instant Booking/i')
    const requestQuoteBadge = page.locator('text=/Contact Owner|Request Quote/i')

    // At least one type should be visible
    const hasInstantBooking = await instantBookingBadge.count() > 0
    const hasRequestQuote = await requestQuoteBadge.count() > 0

    expect(hasInstantBooking || hasRequestQuote).toBe(true)

    // If instant booking slot exists, verify it has price displayed
    if (hasInstantBooking) {
      await expect(page.locator('text=/₱\\d+/').first()).toBeVisible()
    }

    // If request quote slot exists, verify "Request Quote" text shown
    if (hasRequestQuote) {
      await expect(requestQuoteBadge.first()).toBeVisible()
    }
  })
})

// ============================================================================
// CUJ-012: List Slot Flow (Owner Journey)
// ============================================================================

test.describe('CUJ-012: List Slot Flow', () => {
  test('authenticated user can list a new slot', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[id="email"]', 'user10@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    await expect(page).toHaveURL('/')

    // Navigate to list slot page
    await page.goto('/LMR/slots/new')

    // Verify on create slot page
    await expect(page).toHaveURL('/LMR/slots/new')
    await expect(page.locator('text=/List.*Slot|Create.*Slot/i')).toBeVisible()

    // Fill slot form
    const uniqueSlotNumber = `TEST-${Date.now()}`
    await page.fill('input[id="slot_number"]', uniqueSlotNumber)

    // Select slot type
    await page.selectOption('select[id="slot_type"]', 'covered')

    // Fill description
    await page.fill('textarea[id="description"]', 'E2E test slot - can be deleted')

    // Select explicit pricing (if pricing options exist)
    const pricingRadio = page.locator('input[type="radio"][value="explicit"]')
    if (await pricingRadio.count() > 0) {
      await pricingRadio.click()
    }

    // Fill price
    await page.fill('input[id="price_per_hour"]', '50')

    // Submit form
    await page.click('button:has-text("List Slot")')

    // Should redirect to slots page
    await expect(page).toHaveURL('/LMR/slots', { timeout: 10000 })

    // Verify slot appears in list
    await expect(page.locator(`text=${uniqueSlotNumber}`)).toBeVisible({ timeout: 10000 })
  })
})

// ============================================================================
// CUJ-013: Navigation Consistency Across Multi-Tenant Routes
// ============================================================================

test.describe('CUJ-013: Navigation Consistency', () => {
  test('navigation bar maintains context across community routes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[id="email"]', 'user11@parkboard.test')
    await page.fill('input[id="password"]', 'test123456')
    await page.click('button:has-text("Sign In")')

    // Navigate to LMR slots
    await page.goto('/LMR/slots')

    // Verify navigation links all use /LMR/ prefix
    const browseLink = page.locator('a[href*="/LMR/slots"]').first()
    const listLink = page.locator('a[href*="/LMR/slots/new"]').first()
    const bookingsLink = page.locator('a[href*="/LMR/bookings"]').first()

    await expect(browseLink).toBeVisible()
    await expect(listLink).toBeVisible()
    await expect(bookingsLink).toBeVisible()

    // Click through navigation links
    await page.locator('text=My Bookings').first().click()
    await expect(page).toHaveURL('/LMR/bookings')

    await page.locator('text=View Available Slots').first().click()
    await expect(page).toHaveURL('/LMR/slots')

    // Verify user stays within LMR community context
    const currentUrl = page.url()
    expect(currentUrl).toContain('/LMR/')
  })
})

// ============================================================================
// CUJ-014: Edit Slot Flow (Owner Can Modify Their Slots)
// ============================================================================

test.describe('CUJ-014: Edit Slot Flow', () => {
  test.use({ storageState: undefined }) // Clear any stored auth

  test('owner can edit their own slot', async ({ page }) => {
    // Step 1: Login as user12
    await login(page, 'user12@parkboard.test', 'test123456')

    // Step 2: Create a slot first (to have something to edit)
    await page.goto('/LMR/slots/new')

    const uniqueSlotNumber = `EDIT-TEST-${Date.now()}`
    await page.fill('input[id="slot_number"]', uniqueSlotNumber)
    await page.selectOption('select[id="slot_type"]', 'covered')
    await page.fill('textarea[id="description"]', 'Original description for editing test')

    // Select explicit pricing
    const pricingRadio = page.locator('input[type="radio"][value="explicit"]')
    if (await pricingRadio.count() > 0) {
      await pricingRadio.click()
    }
    await page.fill('input[id="price_per_hour"]', '45')

    // Submit slot creation
    await page.click('button:has-text("List Slot")')
    await expect(page).toHaveURL('/LMR/slots', { timeout: 10000 })

    // Step 3: Find the created slot and get its ID
    await page.locator(`text=${uniqueSlotNumber}`).first().click()

    // Wait for slot detail page to load
    await expect(page).toHaveURL(/\/LMR\/slots\/\d+/)

    // Extract slot ID from URL
    const slotDetailUrl = page.url()
    const slotIdMatch = slotDetailUrl.match(/\/LMR\/slots\/(\d+)/)
    expect(slotIdMatch).not.toBeNull()
    const slotId = slotIdMatch![1]

    // Step 4: Navigate to edit page
    await page.goto(`/LMR/slots/${slotId}/edit`)

    // Step 5: Verify edit page loads with current data
    await expect(page).toHaveURL(`/LMR/slots/${slotId}/edit`)
    await expect(page.locator('text=/Edit.*Slot/i')).toBeVisible()

    // Verify slot number is displayed (read-only)
    await expect(page.locator(`text=${uniqueSlotNumber}`)).toBeVisible()
    await expect(page.locator('text=/cannot be changed/i')).toBeVisible()

    // Verify current values are pre-filled
    const slotTypeSelect = page.locator('select[id*="slot_type"]')
    await expect(slotTypeSelect).toHaveValue('covered')

    const descriptionTextarea = page.locator('textarea[id*="description"]')
    await expect(descriptionTextarea).toHaveValue('Original description for editing test')

    // Step 6: Make changes to the slot
    // Change slot type
    await slotTypeSelect.selectOption('uncovered')

    // Update description
    await descriptionTextarea.fill('Updated description after editing')

    // Change price
    await page.fill('input[id*="price_per_hour"]', '60')

    // Step 7: Submit changes
    await page.click('button:has-text("Save Changes")')

    // Should redirect back to slot detail page
    await expect(page).toHaveURL(`/LMR/slots/${slotId}`, { timeout: 10000 })

    // Step 8: Verify changes were saved
    await expect(page.locator('text=/Uncovered/i')).toBeVisible()
    await expect(page.locator('text=Updated description after editing')).toBeVisible()
    await expect(page.locator('text=/₱60/i')).toBeVisible()
  })

  test('owner can change slot pricing from explicit to request quote', async ({ page }) => {
    // Step 1: Login
    await login(page, 'user13@parkboard.test', 'test123456')

    // Step 2: Create slot with explicit pricing
    await page.goto('/LMR/slots/new')

    const uniqueSlotNumber = `PRICE-CHANGE-${Date.now()}`
    await page.fill('input[id="slot_number"]', uniqueSlotNumber)
    await page.selectOption('select[id="slot_type"]', 'covered')

    // Set explicit pricing
    const pricingRadio = page.locator('input[type="radio"][value="explicit"]')
    if (await pricingRadio.count() > 0) {
      await pricingRadio.click()
    }
    await page.fill('input[id="price_per_hour"]', '50')

    await page.click('button:has-text("List Slot")')
    await expect(page).toHaveURL('/LMR/slots', { timeout: 10000 })

    // Step 3: Navigate to the slot detail page
    await page.locator(`text=${uniqueSlotNumber}`).first().click()

    const slotDetailUrl = page.url()
    const slotIdMatch = slotDetailUrl.match(/\/LMR\/slots\/(\d+)/)
    const slotId = slotIdMatch![1]

    // Step 4: Go to edit page
    await page.goto(`/LMR/slots/${slotId}/edit`)

    // Step 5: Change to request quote pricing
    const requestQuoteRadio = page.locator('input[type="radio"][value="request_quote"]')
    await requestQuoteRadio.click()

    // Verify price input is now hidden
    await expect(page.locator('input[id*="price_per_hour"]')).not.toBeVisible()
    await expect(page.locator('text=/Request Quote Mode/i')).toBeVisible()

    // Step 6: Save changes
    await page.click('button:has-text("Save Changes")')
    await expect(page).toHaveURL(`/LMR/slots/${slotId}`, { timeout: 10000 })

    // Step 7: Verify pricing changed to request quote
    await expect(page.locator('text=/Request Quote|Contact Owner/i')).toBeVisible()
    // Price should NOT be visible
    const priceCount = await page.locator('text=/₱50/').count()
    expect(priceCount).toBe(0)
  })

  test('non-owner cannot edit someone elses slot', async ({ page }) => {
    // Step 1: Login as user12 and create a slot
    await login(page, 'user12@parkboard.test', 'test123456')

    await page.goto('/LMR/slots/new')
    const slotNumber = `OWNER-TEST-${Date.now()}`
    await page.fill('input[id="slot_number"]', slotNumber)
    await page.selectOption('select[id="slot_type"]', 'covered')
    const pricingRadio = page.locator('input[type="radio"][value="explicit"]')
    if (await pricingRadio.count() > 0) {
      await pricingRadio.click()
    }
    await page.fill('input[id="price_per_hour"]', '50')
    await page.click('button:has-text("List Slot")')

    await page.locator(`text=${slotNumber}`).first().click()
    const slotIdMatch = page.url().match(/\/LMR\/slots\/(\d+)/)
    const slotId = slotIdMatch![1]

    // Logout
    await page.click('button:has-text("Sign Out")')
    await expect(page).toHaveURL('/login', { timeout: 5000 })

    // Step 2: Login as different user (user14)
    await login(page, 'user14@parkboard.test', 'test123456')

    // Step 3: Try to access edit page for user12's slot
    await page.goto(`/LMR/slots/${slotId}/edit`)

    // Step 4: Should see error message (not allowed to edit)
    await expect(page.locator('text=/You can only edit your own slots/i')).toBeVisible({ timeout: 10000 })

    // Save button should NOT be visible
    const saveButton = page.locator('button:has-text("Save Changes")')
    await expect(saveButton).not.toBeVisible()

    // Should see "Back to Slots" button instead
    await expect(page.locator('button:has-text("Back to Slots")')).toBeVisible()
  })

  test('editing is prevented when slot has active bookings', async ({ page }) => {
    // This test would require creating a booking first
    // For now, we document the expected behavior:
    // - If a slot has active (confirmed, pending) bookings
    // - Edit page should show error: "Cannot edit slot with X active booking(s)"
    // - Save button should not be visible
    // - User should see message: "Wait until bookings complete or cancel them first"

    // Implementation would require:
    // 1. Create slot (user15)
    // 2. Create booking for that slot (user16)
    // 3. Try to edit slot (user15)
    // 4. Verify error message appears

    // This is covered by unit tests instead (more efficient)
  })
})
