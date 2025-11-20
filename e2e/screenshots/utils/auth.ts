/**
 * Authentication utilities for screenshot capture
 * Handles login/logout for authenticated scenarios
 */

import { Page } from '@playwright/test'

/**
 * Clear all authentication state
 * Ensures clean unauthenticated state for guest scenarios
 * @param page Playwright page instance
 */
export async function ensureUnauthenticated(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Login using dev-mode test account
 * NOTE: This assumes dev-mode login is available at /api/test-accounts/[id]
 * Adapt based on actual implementation when available
 *
 * @param page Playwright page instance
 * @param testAccount Test account identifier (e.g., 'alice', 'bob')
 */
export async function loginDevMode(page: Page, testAccount: string = 'alice'): Promise<void> {
  // Navigate to test accounts page
  await page.goto('/LMR/test-accounts')

  // Wait for test accounts to load
  await page.waitForSelector(`button:has-text("${testAccount}")`, { timeout: 5000 })

  // Click the test account button to trigger dev-mode login
  await page.click(`button:has-text("${testAccount}")`)

  // Wait for authentication to complete
  await page.waitForLoadState('networkidle')

  // Verify authentication by checking for Sign Out button
  await page.waitForSelector('button:has-text("Sign Out")', { timeout: 10000 })

  console.log(`✓ Logged in as ${testAccount}`)
}
