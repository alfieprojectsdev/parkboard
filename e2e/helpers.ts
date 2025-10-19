/**
 * E2E Test Helpers
 * Reusable functions for Playwright tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Login helper with proper wait conditions for production
 * Handles slower response times on production vs localhost
 *
 * FIXED: Improved session persistence and navigation handling
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')

  // Fill credentials
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)

  // Click sign in button
  await page.click('button:has-text("Sign In")')

  // Wait for navigation to complete (login uses window.location.href)
  // This causes a full page reload, so we wait for load state
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // Verify we're on home page (may take a moment)
  await page.waitForURL('/', { timeout: 15000 })

  // CRITICAL: Wait for Supabase session to be saved to localStorage
  // The session is written asynchronously after navigation
  await page.waitForFunction(
    () => {
      const session = localStorage.getItem('sb-cgbkknefvggnhkvmuwsa-auth-token')
      return session !== null
    },
    { timeout: 10000 }
  )

  // Additional wait for any state updates
  await page.waitForTimeout(1000)

  // Verify auth is actually working by checking for Sign Out button
  await page.waitForSelector('button:has-text("Sign Out")', { timeout: 10000 })
}

/**
 * Navigate to community slots page
 */
export async function goToLMRSlots(page: Page) {
  await page.goto('/LMR/slots')
  await page.waitForSelector('text=/Slot [A-Z]-\\d+/i', { timeout: 10000 })
}

/**
 * Navigate to community bookings page
 */
export async function goToLMRBookings(page: Page) {
  await page.goto('/LMR/bookings')
  await expect(page).toHaveURL('/LMR/bookings')
}
