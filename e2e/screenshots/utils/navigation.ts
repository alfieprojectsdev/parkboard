/**
 * Navigation and action execution utilities
 * Handles page navigation and executing scenario actions
 */

import { Page } from '@playwright/test'
import type { ScreenshotAction } from '../config/scenarios'
import { captureScreenshot, waitForContent } from './capture'

/**
 * Navigate to a page with proper wait conditions
 * @param page Playwright page instance
 * @param url URL to navigate to (relative or absolute)
 */
export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' })
}

/**
 * Execute a sequence of actions for screenshot capture
 * @param page Playwright page instance
 * @param actions Array of actions to execute
 * @param viewport Viewport name (for screenshot filenames)
 * @param sequence Scenario sequence number
 */
export async function executeActions(
  page: Page,
  actions: ScreenshotAction[],
  viewport: string,
  sequence: number
): Promise<void> {
  for (const action of actions) {
    console.log(`  → ${action.description || action.type}`)

    switch (action.type) {
      case 'wait':
        if (action.selector) {
          await waitForContent(page, action.selector, action.timeout)
        } else {
          await page.waitForTimeout(action.timeout || 1000)
        }
        break

      case 'click':
        if (!action.selector) {
          throw new Error('Click action requires selector')
        }
        await page.click(action.selector)
        // Brief wait after click for UI updates
        await page.waitForTimeout(500)
        break

      case 'fill':
        if (!action.selector || action.value === undefined) {
          throw new Error('Fill action requires selector and value')
        }
        await page.fill(action.selector, action.value)
        break

      case 'select':
        if (!action.selector || action.value === undefined) {
          throw new Error('Select action requires selector and value')
        }
        await page.selectOption(action.selector, action.value)
        break

      case 'screenshot':
        if (!action.filename) {
          throw new Error('Screenshot action requires filename')
        }
        await captureScreenshot(page, viewport, action.filename)
        break

      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }
}
