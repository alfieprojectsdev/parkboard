// e2e/debug-edit-slot.spec.ts - Diagnostic test for CUJ-014 timeout issue
import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('DIAGNOSTIC: Edit Slot Flow Timeout Investigation', () => {
  test('diagnose create slot page loading issue', async ({ page }) => {
    // Capture ALL console logs and errors
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

    console.log('\n🔍 DIAGNOSTIC: Testing create slot page loading...\n')

    // Step 1: Login
    console.log('Step 1: Attempting login...')
    try {
      await login(page, 'user12@parkboard.test', 'test123456')
      console.log('✅ Login successful')
    } catch (error) {
      console.log('❌ Login failed:', error)
      console.log('Current URL:', page.url())
      await page.screenshot({ path: 'test-results/debug-login-failed.png', fullPage: true })
    }

    await page.waitForTimeout(2000)

    // Step 2: Navigate to create slot page
    console.log('\nStep 2: Navigating to /LMR/slots/new...')
    await page.goto('/LMR/slots/new', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    await page.waitForTimeout(3000)

    console.log('Current URL:', page.url())
    console.log('Page title:', await page.title())

    // Step 3: Check page state
    console.log('\n📊 PAGE STATE ANALYSIS:')

    // Check for loading spinner
    const spinnerVisible = await page.locator('.animate-spin').isVisible().catch(() => false)
    console.log(`  - Loading spinner visible: ${spinnerVisible ? '❌ (STUCK)' : '✅ (LOADED)'}`)

    // Check for navigation
    const navVisible = await page.locator('nav').isVisible().catch(() => false)
    console.log(`  - Navigation bar visible: ${navVisible ? '✅' : '❌'}`)

    // Check for page title
    const pageTitleVisible = await page.locator('text=/List.*Slot|Create.*Slot/i').isVisible().catch(() => false)
    console.log(`  - Page title visible: ${pageTitleVisible ? '✅' : '❌'}`)

    // Check for form fields
    const slotNumberField = await page.locator('input[id="slot_number"]').count()
    console.log(`  - slot_number field present: ${slotNumberField > 0 ? '✅' : '❌'} (count: ${slotNumberField})`)

    const slotTypeField = await page.locator('select[id="slot_type"]').count()
    console.log(`  - slot_type field present: ${slotTypeField > 0 ? '✅' : '❌'} (count: ${slotTypeField})`)

    const descriptionField = await page.locator('textarea[id="description"]').count()
    console.log(`  - description field present: ${descriptionField > 0 ? '✅' : '❌'} (count: ${descriptionField})`)

    const priceField = await page.locator('input[id="price_per_hour"]').count()
    console.log(`  - price_per_hour field present: ${priceField > 0 ? '✅' : '❌'} (count: ${priceField})`)

    // Check for error messages
    const errorAlerts = await page.locator('[role="alert"]').count()
    console.log(`  - Error alerts: ${errorAlerts} ${errorAlerts > 0 ? '⚠️' : '✅'}`)

    if (errorAlerts > 0) {
      const alertText = await page.locator('[role="alert"]').first().textContent()
      console.log(`    Alert text: "${alertText}"`)
    }

    // Step 4: Check authentication state
    console.log('\n🔐 AUTHENTICATION STATE:')
    const signOutButton = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false)
    console.log(`  - Sign Out button visible: ${signOutButton ? '✅ (LOGGED IN)' : '❌ (NOT LOGGED IN)'}`)

    const loginButton = await page.locator('text=Login').first().isVisible().catch(() => false)
    console.log(`  - Login button visible: ${loginButton ? '❌ (NOT LOGGED IN)' : '✅ (LOGGED IN)'}`)

    // Step 5: Console logs
    console.log('\n📝 CONSOLE LOGS (last 20):')
    consoleLogs.slice(-20).forEach(log => console.log(`  ${log}`))

    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:')
      consoleErrors.forEach(error => console.log(`  ${error}`))
    }

    if (pageErrors.length > 0) {
      console.log('\n❌ PAGE ERRORS:')
      pageErrors.forEach(error => console.log(`  ${error}`))
    }

    // Step 6: Take screenshots
    await page.screenshot({ path: 'test-results/debug-create-slot-page.png', fullPage: true })
    console.log('\n📸 Screenshot saved: test-results/debug-create-slot-page.png')

    // Step 7: Get page HTML for inspection
    const bodyHTML = await page.locator('body').innerHTML()
    const bodyPreview = bodyHTML.substring(0, 500)
    console.log('\n📄 BODY HTML (first 500 chars):')
    console.log(bodyPreview)

    // Step 8: Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY:')
    console.log(`  - URL: ${page.url()}`)
    console.log(`  - Logged in: ${signOutButton ? 'YES' : 'NO'}`)
    console.log(`  - Spinner active: ${spinnerVisible ? 'YES' : 'NO'}`)
    console.log(`  - Form visible: ${slotNumberField > 0 && slotTypeField > 0 ? 'YES' : 'NO'}`)
    console.log(`  - Console errors: ${consoleErrors.length}`)
    console.log(`  - Page errors: ${pageErrors.length}`)

    // Assertions for CI
    expect(page.url()).toContain('/LMR/slots/new')
    expect(signOutButton, 'User should be logged in').toBe(true)
    expect(spinnerVisible, 'Loading spinner should NOT be visible').toBe(false)
    expect(consoleErrors.length, 'Should have no console errors').toBe(0)
    expect(pageErrors.length, 'Should have no page errors').toBe(0)
    expect(slotNumberField, 'slot_number field should be present').toBeGreaterThan(0)
  })

  test('diagnose field selector matching', async ({ page }) => {
    console.log('\n🔍 DIAGNOSTIC: Testing field selector patterns...\n')

    await login(page, 'user12@parkboard.test', 'test123456')
    await page.goto('/LMR/slots/new', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Try different selector patterns
    const patterns = [
      'input[id="slot_number"]',
      'input[id*="slot_number"]',
      'input[id*="slotNumber"]',
      'input[name="slot_number"]',
      'input[placeholder*="123"]',
      '#slot_number',
    ]

    console.log('Testing selector patterns:')
    for (const pattern of patterns) {
      const count = await page.locator(pattern).count()
      const visible = count > 0 ? await page.locator(pattern).first().isVisible().catch(() => false) : false
      console.log(`  - "${pattern}": ${count} found, visible: ${visible ? '✅' : '❌'}`)
    }

    // Get all input fields
    const allInputs = await page.locator('input').count()
    console.log(`\nTotal input fields on page: ${allInputs}`)

    // List all input IDs
    console.log('\nAll input field IDs:')
    for (let i = 0; i < allInputs; i++) {
      const id = await page.locator('input').nth(i).getAttribute('id')
      const type = await page.locator('input').nth(i).getAttribute('type')
      const placeholder = await page.locator('input').nth(i).getAttribute('placeholder')
      console.log(`  ${i + 1}. id="${id}" type="${type}" placeholder="${placeholder}"`)
    }
  })
})
