/**
 * Screenshot capture utilities
 * Handles viewport setup, screenshot capture, and content waiting
 */

import { Page } from '@playwright/test'
import type { ViewportConfig } from '../config/viewports'
import * as path from 'path'

/**
 * Setup page with viewport configuration
 * @param page Playwright page instance
 * @param viewport Viewport configuration
 */
export async function setupPage(page: Page, viewport: ViewportConfig): Promise<void> {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  })

  // Set device scale factor and touch support
  await page.emulateMedia({ colorScheme: 'light' })
}

/**
 * Capture screenshot with standardized path and options
 * @param page Playwright page instance
 * @param viewport Viewport name (mobile, tablet, desktop)
 * @param filename Screenshot filename (without extension)
 */
export async function captureScreenshot(
  page: Page,
  viewport: string,
  filename: string
): Promise<void> {
  const outputDir = path.join(process.cwd(), 'e2e', 'screenshots-output', viewport)
  const filepath = path.join(outputDir, `${filename}.png`)

  await page.screenshot({
    path: filepath,
    fullPage: true,
  })

  console.log(`✓ Captured: ${viewport}/${filename}.png`)
}

/**
 * Wait for content to be visible on page
 * @param page Playwright page instance
 * @param selector CSS selector to wait for
 * @param timeout Maximum wait time in milliseconds (default: 10000)
 */
export async function waitForContent(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { timeout, state: 'visible' })
}
