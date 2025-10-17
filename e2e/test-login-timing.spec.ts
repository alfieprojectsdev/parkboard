// e2e/test-login-timing.spec.ts
// Precise timing measurement for login flow
import { test, expect } from '@playwright/test'

test('measure exact login timing (no artificial waits)', async ({ page }) => {
  console.log('\n🔍 TIMING TEST: Login flow performance\n')

  // Navigate to login
  console.log('Step 1: Navigate to /login')
  const navStart = Date.now()
  await page.goto('/login', {
    waitUntil: 'networkidle',
    timeout: 10000
  })
  const navTime = Date.now() - navStart
  console.log(`  ✅ Navigation complete: ${navTime}ms\n`)

  // Fill form
  console.log('Step 2: Fill login form')
  await page.locator('input[type="email"]').first().fill('user1@parkboard.test')
  await page.locator('input[type="password"]').first().fill('test123456')
  console.log('  ✅ Form filled\n')

  // Click submit and measure redirect time
  console.log('Step 3: Click Sign In button')
  const clickStart = Date.now()
  await page.locator('button[type="submit"]').first().click()

  // Poll for redirect (NO artificial wait)
  let redirectTime = 0
  let redirected = false
  let attempts = 0
  const maxWait = 10000 // 10 seconds max

  while (!redirected && (Date.now() - clickStart) < maxWait) {
    await page.waitForTimeout(100) // Poll every 100ms
    attempts++

    const currentUrl = page.url()
    // Check if redirected away from /login (to root / or /LMR)
    if (!currentUrl.includes('/login')) {
      redirected = true
      redirectTime = Date.now() - clickStart
      console.log(`  ✅ Redirect successful after ${redirectTime}ms (${attempts} checks)`)
      console.log(`  Average polling interval: ${Math.round(redirectTime / attempts)}ms\n`)
    }
  }

  if (!redirected) {
    const finalUrl = page.url()
    const totalWait = Date.now() - clickStart
    console.log(`  ❌ REDIRECT FAILED after ${totalWait}ms`)
    console.log(`  Final URL: ${finalUrl}\n`)
  }

  // Check auth state
  console.log('Step 4: Check authentication state')
  const userVisible = await page.locator('text=Test User 1').first().isVisible().catch(() => false)
  const loginVisible = await page.locator('nav').first().locator('text=Login').isVisible().catch(() => false)

  console.log(`  User profile visible: ${userVisible ? '✅' : '❌'}`)
  console.log(`  Login button visible: ${loginVisible ? '❌ (BAD)' : '✅ (GOOD)'}\n`)

  // Performance analysis
  console.log('📊 PERFORMANCE ANALYSIS:')
  console.log(`  Navigation time: ${navTime}ms`)
  console.log(`  Redirect time: ${redirectTime}ms`)
  console.log(`  Total time: ${navTime + redirectTime}ms`)

  if (redirectTime > 5000) {
    console.log(`  ⚠️  WARNING: Redirect took > 5 seconds - PERFORMANCE ISSUE!`)
  } else if (redirectTime > 2000) {
    console.log(`  ⚠️  NOTICE: Redirect took > 2 seconds - consider optimization`)
  } else {
    console.log(`  ✅ GOOD: Redirect time acceptable (< 2 seconds)`)
  }

  // Screenshot
  await page.screenshot({ path: 'test-results/login-timing-test.png', fullPage: true })
  console.log('\n📸 Screenshot: test-results/login-timing-test.png\n')

  // Assertions
  expect(redirected, 'Should redirect within 10 seconds').toBe(true)
  expect(redirectTime, 'Redirect should be < 5 seconds for production').toBeLessThan(5000)
  expect(userVisible, 'User profile should be visible').toBe(true)
})
