import { test, expect } from '@playwright/test'

/**
 * DEBUG TEST: LMR Slots Page Loading
 *
 * This test checks if /LMR/slots loads correctly and captures all console logs
 */
test.describe('Debug: LMR Slots Page', () => {
  test('should load /LMR/slots and display slots without infinite spinner', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    const consoleErrors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`)

      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })

    // Capture page errors
    const pageErrors: string[] = []
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })

    console.log('\n🔍 Starting debug test for /LMR/slots...\n')

    // Navigate to LMR slots
    await page.goto('http://localhost:3000/LMR/slots', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Wait a bit for React to render
    await page.waitForTimeout(2000)

    // Check for debug messages in console
    const hasDebugFetch = consoleLogs.some(log => log.includes('[DEBUG] Starting fetchSlots'))
    const hasDebugResult = consoleLogs.some(log => log.includes('[DEBUG] Query completed'))

    console.log('\n📊 CONSOLE LOGS:')
    consoleLogs.forEach(log => console.log(log))

    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:')
      consoleErrors.forEach(error => console.log(error))
    }

    if (pageErrors.length > 0) {
      console.log('\n❌ PAGE ERRORS:')
      pageErrors.forEach(error => console.log(error))
    }

    // Check if spinner is still visible (should NOT be after loading)
    const spinnerVisible = await page.locator('.animate-spin').isVisible().catch(() => false)

    // Check if slots are visible
    const slotsVisible = await page.locator('text=/Slot [A-D]-[0-9]+/').count()

    // Check if navigation bar is present
    const navVisible = await page.locator('nav').isVisible().catch(() => false)

    console.log('\n📊 PAGE STATE:')
    console.log(`  - Debug fetch message: ${hasDebugFetch ? '✅' : '❌'}`)
    console.log(`  - Debug result message: ${hasDebugResult ? '✅' : '❌'}`)
    console.log(`  - Spinner visible: ${spinnerVisible ? '❌ (BAD - still loading)' : '✅ (GOOD)'}`)
    console.log(`  - Slots count: ${slotsVisible} ${slotsVisible > 0 ? '✅' : '❌'}`)
    console.log(`  - Navigation bar: ${navVisible ? '✅' : '❌'}`)
    console.log(`  - Console errors: ${consoleErrors.length} ${consoleErrors.length === 0 ? '✅' : '❌'}`)
    console.log(`  - Page errors: ${pageErrors.length} ${pageErrors.length === 0 ? '✅' : '❌'}`)

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'test-results/lmr-slots-debug.png', fullPage: true })
    console.log('\n📸 Screenshot saved: test-results/lmr-slots-debug.png')

    // Assertions
    expect(hasDebugFetch, 'Should see debug fetch message').toBe(true)
    expect(hasDebugResult, 'Should see debug result message').toBe(true)
    expect(spinnerVisible, 'Spinner should NOT be visible').toBe(false)
    expect(slotsVisible, 'Should see at least 1 slot').toBeGreaterThan(0)
    expect(navVisible, 'Navigation bar should be visible').toBe(true)
    expect(consoleErrors.length, 'Should have no console errors').toBe(0)
    expect(pageErrors.length, 'Should have no page errors').toBe(0)

    console.log('\n✅ All checks passed!\n')
  })

  test('should navigate between pages without errors', async ({ page }) => {
    console.log('\n🔍 Testing navigation flow...\n')

    // Start at root
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
    console.log('✅ Root page loaded')

    // Click Lumiere card
    await page.click('text=Lumiere Residences')
    await page.waitForURL('**/LMR**')
    console.log('✅ LMR landing page loaded')

    // Click Browse Slots
    await page.click('text=Browse Slots')
    await page.waitForURL('**/LMR/slots**')
    await page.waitForTimeout(2000)

    const slotsCount = await page.locator('text=/Slot [A-D]-[0-9]+/').count()
    console.log(`✅ Slots page loaded with ${slotsCount} slots`)

    // Check if nav links work
    const navLinks = await page.locator('nav a').count()
    console.log(`✅ Navigation has ${navLinks} links`)

    expect(slotsCount).toBeGreaterThan(0)
    expect(navLinks).toBeGreaterThan(0)

    console.log('\n✅ Navigation flow test passed!\n')
  })
})
