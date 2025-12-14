/**
 * Screenshot Capture Script for ParkBoard
 *
 * Generates portfolio-ready screenshots of key user workflows.
 * Saves to docs/screenshots/ directory
 *
 * Usage:
 *   npm run screenshots
 *
 * Environment Variables:
 *   BASE_URL: Base URL of the application (default: http://localhost:3000)
 */

import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import { resolve } from 'path'
import { mkdir } from 'fs/promises'

const SCREENSHOTS_DIR = resolve(__dirname, '../docs/screenshots')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const VIEWPORT = { width: 1280, height: 720 }

/**
 * Waits for network to be idle to ensure page is fully loaded
 */
async function waitForLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // Extra buffer for animations
}

/**
 * Captures a screenshot with consistent styling
 */
async function captureScreenshot(
  page: Page,
  name: string,
  description: string
): Promise<void> {
  console.log(`Capturing: ${description}...`)
  await page.screenshot({
    path: `${SCREENSHOTS_DIR}/${name}`,
    fullPage: true,
  })
  console.log(`✓ ${name}`)
}

/**
 * Main screenshot capture function
 */
async function captureScreenshots(): Promise<void> {
  const browser = await chromium.launch()
  let page: Page | null = null

  try {
    // Ensure screenshots directory exists
    await mkdir(SCREENSHOTS_DIR, { recursive: true })
    console.log(`Screenshots directory: ${SCREENSHOTS_DIR}\n`)

    // Create a new page with consistent viewport
    page = await browser.newPage({
      viewport: VIEWPORT,
      colorScheme: 'light', // Ensure consistent appearance
    })

    // 1. Login Page (Unauthenticated)
    console.log('\n1. Capturing authentication pages...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await waitForLoad(page)
    await captureScreenshot(page, '01-login.png', 'Login Page')

    // 2. Registration Page
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' })
    await waitForLoad(page)
    await captureScreenshot(page, '02-register.png', 'Registration Page')

    // 3. Dashboard/Home Page (After Login)
    console.log('\n2. Capturing authenticated pages...')
    console.log('Note: Using test credentials to login...')

    // Navigate to login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await waitForLoad(page)

    // Fill in login form with test credentials
    await page.fill('[id="communityCode"]', 'LMR')
    await page.fill('[id="email"]', 'user1@parkboard.test')
    await page.fill('[id="password"]', 'test123456')

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for navigation to complete
    await page.waitForURL('**/LMR/slots**', { timeout: 10000 })
    await waitForLoad(page)

    await captureScreenshot(page, '03-dashboard.png', 'Dashboard (Slots Listing)')

    // 4. Create Slot Form
    console.log('\n3. Capturing slot creation...')
    await page.goto(`${BASE_URL}/LMR/slots/new`, { waitUntil: 'networkidle' })
    await waitForLoad(page)
    await captureScreenshot(page, '04-create-slot.png', 'Create Slot Form')

    // 5. Individual Slot Detail Page
    console.log('\n4. Capturing slot details...')
    // Try to navigate to a slot detail page
    // First, go back to listing to find a slot
    await page.goto(`${BASE_URL}/LMR/slots`, { waitUntil: 'networkidle' })
    await waitForLoad(page)

    // Try to find and click on the first slot link
    const firstSlotLink = await page.$('a[href*="/LMR/slots/"]')
    if (firstSlotLink) {
      await firstSlotLink.click()
      await page.waitForLoadState('networkidle')
      await waitForLoad(page)
      await captureScreenshot(page, '05-slot-detail.png', 'Slot Detail Page')
    } else {
      console.log(
        '⚠ No slots available to capture detail page (this is expected if no slots exist)'
      )
    }

    console.log('\n✅ Screenshot capture complete!')
    console.log(`All screenshots saved to: ${SCREENSHOTS_DIR}`)
    console.log(
      '\nScreenshots captured:\n' +
      '  01-login.png              - Login page with test credentials info\n' +
      '  02-register.png           - User registration form\n' +
      '  03-dashboard.png          - Slots listing (after login)\n' +
      '  04-create-slot.png        - Create new parking slot form\n' +
      '  05-slot-detail.png        - Individual slot details (if slots exist)\n'
    )
  } catch (error) {
    const err = error as Error
    console.error('\n✗ Screenshot capture failed!')
    console.error(`Error: ${err.message}`)

    // Provide helpful debugging information
    if (err.message.includes('ECONNREFUSED')) {
      console.error(
        '\nTroubleshooting: The development server might not be running.'
      )
      console.error(`Make sure to run: npm run dev (on port 3000 or set BASE_URL)`
      )
    }

    process.exit(1)
  } finally {
    if (page) {
      await page.close()
    }
    await browser.close()
  }
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
