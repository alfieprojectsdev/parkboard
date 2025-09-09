import { test, expect } from '@playwright/test';

/**
 * ParkBoard E2E Tests
 * 
 * These tests simulate the most critical user journeys
 * in a real browser environment:
 * - Authentication (login / logout)
 * - Resident booking flow (time → slot → confirm)
 * - Booking management (view, cancel)
 * - Admin dashboard access (stats, slot management)
 * 
 * Notes:
 * - Run app locally first: `npm run dev`
 * - Run Playwright: `npx playwright test`
 * - Use environment variables for test credentials
 */

test.describe('ParkBoard - Resident Flows', () => {
  test('User can log in and log out', async ({ page }) => {
    // Go to local app
    await page.goto('http://localhost:3000/');

    // Fill login form
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');

    // Expect dashboard visible
    await expect(page.locator('text=My Bookings')).toBeVisible();

    // Sign out from nav menu
    await page.click('text=Sign out');

    // Expect login form visible again
    await expect(page.locator('text=ParkBoard Login')).toBeVisible();
  });

  test('Resident can book and cancel a slot', async ({ page }) => {
    // Login first (reuse helper ideally, but inline for clarity here)
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');

    // Navigate to "New Booking"
    await page.click('text=New Booking');

    // Step 1: Select time range
    await page.fill('input[type="date"]', '2030-01-01'); // future date
    await page.fill('input[type="time"]', '10:00');
    await page.selectOption('select', '2'); // 2 hours
    await page.click('button:has-text("Find Available Slots")');

    // Step 2: Select slot
    await page.click('.cursor-pointer >> nth=0'); // first available slot

    // Step 3: Submit booking form
    await page.click('button:has-text("Book Slot")');

    // Expect confirmation visible
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible();

    // Step 4: Cancel booking
    await page.click('text=View My Bookings');
    await page.click('button:has-text("Cancel Booking")');

    // Verify cancellation state
    await expect(page.locator('text=cancelled')).toBeVisible();
  });

  test('Resident can view bookings list', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.click('text=My Bookings');
    await expect(page.locator('.border.rounded')).toBeVisible(); // booking card
  });

  test('Resident cannot double-book same slot/time', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.click('text=New Booking');
    // Select time/slot already booked
    await page.fill('input[type="date"]', '2030-01-01');
    await page.fill('input[type="time"]', '10:00');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Find Available Slots")');
    await page.click('.cursor-pointer >> nth=0');
    await page.click('button:has-text("Book Slot")');
    // Try to book again
    await page.click('text=New Booking');
    await page.fill('input[type="date"]', '2030-01-01');
    await page.fill('input[type="time"]', '10:00');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Find Available Slots")');
    await page.click('.cursor-pointer >> nth=0');
    await page.click('button:has-text("Book Slot")');
    await expect(page.locator('text=Time slot conflicts')).toBeVisible();
  });

  test('Resident cannot book in the past', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.click('text=New Booking');
    await page.fill('input[type="date"]', '2000-01-01'); // past date
    await page.fill('input[type="time"]', '10:00');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Find Available Slots")');
    await page.click('.cursor-pointer >> nth=0');
    await page.click('button:has-text("Book Slot")');
    await expect(page.locator('text=Cannot book in the past')).toBeVisible();
  });
});

test.describe('ParkBoard - Admin Flows', () => {
  test('Admin can view dashboard stats', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // Login as admin
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');

    // Switch to admin view
    await page.click('button:has-text("Admin View")');

    // Expect dashboard cards
    await expect(page.locator('text=Total Slots')).toBeVisible();
    await expect(page.locator('text=Available')).toBeVisible();
    await expect(page.locator('text=Today\'s Bookings')).toBeVisible();
  });

  test('Admin can change slot status', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');
    await page.click('button:has-text("Admin View")');
    await page.click('text=Slots');
    await page.selectOption('select', 'maintenance');
    await expect(page.locator('text=maintenance')).toBeVisible();
  });

  test('Admin can change user role', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');
    await page.click('button:has-text("Admin View")');
    await page.click('text=Users');
    await page.selectOption('select', 'resident');
    await expect(page.locator('text=resident')).toBeVisible();
  });

  test('Non-admin cannot access admin dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/admin');
    await expect(page.locator('text=Forbidden')).toBeVisible();
  });
});
