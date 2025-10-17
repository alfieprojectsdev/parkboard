/**
 * E2E Test Helpers
 * Reusable functions for Playwright tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Login helper with proper wait conditions for production
 * Handles slower response times on production vs localhost
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)

  // Click and wait for navigation to complete (15s timeout for production)
  await Promise.all([
    page.waitForURL('/', { timeout: 15000 }),
    page.click('button:has-text("Sign In")')
  ])

  // Verify we're on home page
  await expect(page).toHaveURL('/')
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
