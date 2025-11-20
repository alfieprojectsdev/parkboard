/**
 * Screenshot capture test suite
 * Main runner for capturing screenshots across viewports and scenarios
 *
 * Usage:
 *   npx playwright test e2e/screenshots/
 *   PLAYWRIGHT_BASE_URL=https://parkboard.app npx playwright test e2e/screenshots/
 */

import { test } from '@playwright/test'
import { VIEWPORTS } from './config/viewports'
import { SCREENSHOT_SCENARIOS } from './config/scenarios'
import { setupPage } from './utils/capture'
import { navigateToPage, executeActions } from './utils/navigation'
import { ensureUnauthenticated, loginDevMode } from './utils/auth'

// Use environment variable or default to production
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://parkboard.app'

test.describe('Screenshot Capture', () => {
  for (const [viewportName, viewportConfig] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewportName} viewport`, () => {
      for (const scenario of SCREENSHOT_SCENARIOS) {
        test(`${scenario.sequence}. ${scenario.name}`, async ({ page }) => {
          console.log(`\n📸 Capturing: ${scenario.name} (${viewportName})`)

          // Setup viewport
          await setupPage(page, viewportConfig)

          // Handle authentication
          if (scenario.auth) {
            await loginDevMode(page, 'alice')
          } else {
            await ensureUnauthenticated(page)
          }

          // Navigate to page
          const fullUrl = BASE_URL + scenario.url
          console.log(`  → Navigating to ${fullUrl}`)
          await navigateToPage(page, fullUrl)

          // Execute scenario actions
          await executeActions(page, scenario.actions, viewportName, scenario.sequence)

          console.log(`✓ Completed: ${scenario.name} (${viewportName})\n`)
        })
      }
    })
  }
})
