import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('diagnostic: new slot page loading', async ({ page }) => {
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`)
    if (msg.type() === 'error') consoleErrors.push(text)
  })

  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  console.log('\n🔍 Starting diagnostic test for /LMR/slots/new...\n')

  // Login first
  await login(page, 'user12@parkboard.test', 'test123456')

  // Navigate to new slot page
  await page.goto('http://localhost:3000/LMR/slots/new', {
    waitUntil: 'networkidle',
    timeout: 30000
  })

  await page.waitForTimeout(2000)

  // Check page state
  const slotNumberInput = await page.locator('input[id="slot_number"]').count()
  const formVisible = await page.locator('form').isVisible().catch(() => false)
  const navVisible = await page.locator('nav').isVisible().catch(() => false)
  const alertVisible = await page.locator('[role="alert"]').count()

  // Get page HTML
  const bodyText = await page.locator('body').textContent()

  // Output results
  console.log('\n📊 CONSOLE LOGS:')
  consoleLogs.slice(-20).forEach(log => console.log(log))

  console.log('\n📊 PAGE STATE:')
  console.log(`  - Slot number input count: ${slotNumberInput}`)
  console.log(`  - Form visible: ${formVisible}`)
  console.log(`  - Navigation bar: ${navVisible}`)
  console.log(`  - Alerts present: ${alertVisible}`)
  console.log(`  - Console errors: ${consoleErrors.length}`)
  console.log(`  - Page errors: ${pageErrors.length}`)

  console.log('\n📄 BODY TEXT (first 500 chars):')
  console.log(bodyText?.substring(0, 500))

  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS:')
    consoleErrors.forEach(err => console.log(`  - ${err}`))
  }

  if (pageErrors.length > 0) {
    console.log('\n❌ PAGE ERRORS:')
    pageErrors.forEach(err => console.log(`  - ${err}`))
  }

  // Screenshot
  await page.screenshot({ path: 'test-results/debug-new-slot.png', fullPage: true })
  console.log('\n📸 Screenshot saved: test-results/debug-new-slot.png')

  // Assertions
  expect(slotNumberInput, 'Should have slot number input').toBeGreaterThan(0)
  expect(formVisible, 'Form should be visible').toBe(true)
})
