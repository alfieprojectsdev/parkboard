/**
 * Screenshot scenario definitions
 * Each scenario defines a sequence of pages and actions to capture
 */

export interface ScreenshotAction {
  type: 'wait' | 'click' | 'fill' | 'select' | 'screenshot'
  selector?: string
  value?: string
  timeout?: number
  filename?: string
  description?: string
}

export interface ScreenshotScenario {
  id: string
  sequence: number
  name: string
  url: string
  auth: boolean
  actions: ScreenshotAction[]
}

export const SCREENSHOT_SCENARIOS: ScreenshotScenario[] = [
  {
    id: 'landing-page',
    sequence: 1,
    name: 'Landing Page',
    url: '/',
    auth: false,
    actions: [
      { type: 'wait', timeout: 2000, description: 'Wait for page load' },
      { type: 'screenshot', filename: '01-landing-page', description: 'Full landing page' },
    ],
  },
  {
    id: 'test-accounts-page',
    sequence: 2,
    name: 'Test Accounts Page',
    url: '/LMR/test-accounts',
    auth: false,
    actions: [
      { type: 'wait', timeout: 2000, description: 'Wait for page load' },
      { type: 'screenshot', filename: '02-test-accounts', description: 'Test accounts listing' },
    ],
  },
  {
    id: 'slots-browse-guest',
    sequence: 3,
    name: 'Browse Slots (Guest)',
    url: '/LMR/slots',
    auth: false,
    actions: [
      { type: 'wait', selector: 'text=/Slot [A-Z]-\\d+/i', timeout: 5000, description: 'Wait for slots to load' },
      { type: 'screenshot', filename: '03-slots-guest', description: 'Slots page as guest' },
    ],
  },
  {
    id: 'slot-detail',
    sequence: 4,
    name: 'Slot Detail Page',
    url: '/LMR/slots',
    auth: false,
    actions: [
      { type: 'wait', selector: 'text=/Slot [A-Z]-\\d+/i', timeout: 5000, description: 'Wait for slots to load' },
      { type: 'click', selector: 'a[href*="/slots/"]:first-of-type', description: 'Click first slot' },
      { type: 'wait', timeout: 2000, description: 'Wait for detail page' },
      { type: 'screenshot', filename: '04-slot-detail', description: 'Slot detail page' },
    ],
  },
  {
    id: 'slots-authenticated',
    sequence: 5,
    name: 'Browse Slots (Authenticated)',
    url: '/LMR/slots',
    auth: true,
    actions: [
      { type: 'wait', selector: 'text=/Slot [A-Z]-\\d+/i', timeout: 5000, description: 'Wait for slots to load' },
      { type: 'screenshot', filename: '05-slots-authenticated', description: 'Slots page when logged in' },
    ],
  },
  {
    id: 'list-slot-form',
    sequence: 6,
    name: 'List Slot Form',
    url: '/LMR/list-slot',
    auth: true,
    actions: [
      { type: 'wait', timeout: 2000, description: 'Wait for form to load' },
      { type: 'screenshot', filename: '06-list-slot-form-empty', description: 'Empty list slot form' },
      { type: 'fill', selector: 'input[name="slot_number"]', value: 'A-101', description: 'Fill slot number' },
      { type: 'select', selector: 'select[name="slot_type"]', value: 'covered', description: 'Select covered type' },
      { type: 'fill', selector: 'input[name="price_per_hour"]', value: '5', description: 'Fill price' },
      { type: 'screenshot', filename: '07-list-slot-form-filled', description: 'Filled list slot form' },
    ],
  },
]
