// e2e/debug-login-redirect.spec.ts
// Quick diagnostic test to verify login redirect bug fix
import { test, expect } from '@playwright/test'

test('diagnostic: login redirect after router.refresh() fix', async ({ page }) => {
  // Capture console logs
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`)
    if (msg.type() === 'error') consoleErrors.push(text)
  })

  // Capture page errors
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  console.log('\n🔍 DIAGNOSTIC: Testing login redirect fix...\n')

  // Step 1: Navigate to login page
  console.log('Step 1: Navigating to /login')
  await page.goto('http://localhost:3000/login', {
    waitUntil: 'networkidle',
    timeout: 10000
  })

  // Step 2: Verify login form is visible
  console.log('Step 2: Verifying login form is visible')
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 })

  // Step 3: Fill in test credentials
  console.log('Step 3: Filling in test credentials (user1@parkboard.test)')
  await page.locator('input[type="email"]').first().fill('user1@parkboard.test')
  await page.locator('input[type="password"]').first().fill('test123456')

  // Step 4: Submit login form
  console.log('Step 4: Submitting login form')
  await page.locator('button[type="submit"]').first().click()

  // Step 5: Wait for navigation (should redirect)
  console.log('Step 5: Waiting for redirect...')
  await page.waitForTimeout(3000) // Give time for router.refresh() + router.push()

  // Step 6: Check current URL
  const currentUrl = page.url()
  console.log(`Step 6: Current URL after login: ${currentUrl}`)

  // Step 7: Check if navigation shows user name
  console.log('Step 7: Checking navigation for user authentication state')
  const testUser1Visible = await page.locator('text=Test User 1').first().isVisible().catch(() => false)
  // Check for Login button specifically in the navigation bar (not footer)
  const navBar = page.locator('nav').first()
  const loginButtonVisible = await navBar.locator('text=Login').isVisible().catch(() => false)

  // Step 8: Take screenshot
  await page.screenshot({ path: 'test-results/debug-login-redirect.png', fullPage: true })

  // Output results
  console.log('\n📊 TEST RESULTS:')
  console.log(`  - Final URL: ${currentUrl}`)
  console.log(`  - Expected: / or /LMR or /LMR/slots`)
  console.log(`  - User name visible: ${testUser1Visible ? '✅ YES' : '❌ NO'}`)
  console.log(`  - Login button visible: ${loginButtonVisible ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`)
  console.log(`  - Console errors: ${consoleErrors.length} ${consoleErrors.length === 0 ? '✅' : '❌'}`)
  console.log(`  - Page errors: ${pageErrors.length} ${pageErrors.length === 0 ? '✅' : '❌'}`)

  if (consoleErrors.length > 0) {
    console.log('\n⚠️ CONSOLE ERRORS:')
    consoleErrors.forEach(err => console.log(`  - ${err}`))
  }

  if (pageErrors.length > 0) {
    console.log('\n⚠️ PAGE ERRORS:')
    pageErrors.forEach(err => console.log(`  - ${err}`))
  }

  console.log('\n📸 Screenshot saved: test-results/debug-login-redirect.png')

  // Assertions
  expect(currentUrl, 'Should redirect away from /login').not.toContain('/login')
  expect(testUser1Visible || currentUrl.includes('/LMR'), 'Should show authenticated state OR be on community page').toBe(true)
  expect(loginButtonVisible, 'Login button should NOT be visible after successful login').toBe(false)
  expect(consoleErrors.length, 'Should have no console errors').toBe(0)
  expect(pageErrors.length, 'Should have no page errors').toBe(0)
})
