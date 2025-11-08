// auth-wrapper-diagnostic.spec.ts - Minimal test to see AuthWrapper console logs
import { test } from '@playwright/test'
import { login } from './helpers'

test.describe('AuthWrapper Diagnostic', () => {
  test('login and navigate to create slot page - observe console logs', async ({ page }) => {
    // Enable console logging from browser to test output
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[AuthWrapper]')) {
        console.log('🔍 BROWSER:', text)
      }
    })

    console.log('\n===== DIAGNOSTIC TEST STARTED =====\n')

    // Step 1: Login
    console.log('Step 1: Logging in as user12@parkboard.test...')
    await login(page, 'user12@parkboard.test', 'test123456')
    console.log('✅ Login complete\n')

    await page.waitForTimeout(2000)

    // Step 2: Navigate to create slot page
    console.log('Step 2: Navigating to /LMR/slots/new...')
    await page.goto('/LMR/slots/new', { waitUntil: 'networkidle', timeout: 30000 })
    console.log('✅ Navigation complete\n')

    await page.waitForTimeout(5000) // Give time to see all logs

    console.log('\n===== DIAGNOSTIC TEST COMPLETE =====\n')
    console.log('Check the browser console logs above (marked with 🔍 BROWSER)')
  })
})
