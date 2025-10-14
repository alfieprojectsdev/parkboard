# CLAUDE.md - ParkBoard Project Guide

**Project:** ParkBoard - Condo Parking Marketplace
**Status:** Production-Ready MVP
**Last Updated:** 2025-10-13
**Developer:** Transitioning from Geodetic Data Analysis to Web Development

---

## Project README

ParkBoard is a TypeScript/Next.js application for booking and managing parking spaces, built using test-driven development practices. The project uses:

- TypeScript + Next.js (App Router)
- Supabase for auth and PostgreSQL
- Tailwind CSS for styling
- Jest + React Testing Library (158 unit/integration tests)
- Playwright (8 end-to-end user journeys)
- TDD workflow with ~85% test coverage

### Current Development Focus
**Multi-tenant architecture is now complete!** Path-based routing enables community-specific deployments (`/LMR/slots`, `/SRP/slots`).

**Next:** Deploy to production at parkboard.app/LMR

### Recent Achievements (2025-10-14)
- ✅ Multi-tenant routing implemented (12-16 hours)
- ✅ Community data isolation via RLS
- ✅ Hybrid pricing model database ready
- ✅ Critical useEffect bugs fixed (3 components)
- ✅ Playwright diagnostic testing workflow established

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14.2.33 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React hooks + Supabase client

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **API:** Next.js API Routes + Supabase RLS (Row Level Security)
- **Server Functions:** PostgreSQL triggers and functions

### Testing
- **Unit/Component:** Jest 30.2.0 + React Testing Library 16.3.0
- **E2E:** Playwright 1.56.0
- **Diagnostic Tests:** Playwright-first debugging (50x faster than manual)
- **Coverage:** ~85% (158 passing tests)

### Test-Driven Development (TDD)

We follow a strict TDD workflow:

#### 1. Write the Test First
```typescript
// Example: New feature in BookingForm
describe('Booking Duration Validation', () => {
  it('prevents bookings longer than 24 hours', () => {
    render(<BookingForm />)
    // ... test code that fails initially
  })
})
```

#### 2. Test Structure (Follow This Pattern)
```typescript
/**
 * TEST-[Type][Number]: Component Name (COMPREHENSIVE)
 * Priority: P0|P1|P2
 * Source: tests_YYYYMMDD.md lines X-Y
 * Updated: YYYY-MM-DD
 */
describe('Feature Group', () => {
  // Setup mocks and beforeEach

  describe('Test Category', () => {
    it('specific behavior', () => {
      // Arrange
      // Act 
      // Assert
    })
  })
})
```

#### 3. TDD Categories We Use
- **Rendering**: Component tree, required elements
- **User Input**: Changes, validation, formatting
- **Form Submit**: Data shape, API calls, loading states
- **Error States**: Network errors, validation errors
- **Success States**: Redirects, UI updates
- **Edge Cases**: Boundary values, empty states

#### 4. Key Test Files to Reference
- Route tests: `__tests__/routes/new-slot.test.tsx`
- Component tests: `__tests__/components/AuthWrapper.test.tsx`
- Utility tests: `__tests__/utils/price-calculation.test.ts`

#### 5. Running Tests While Developing
```bash
# Watch single test file
npm run test:watch __tests__/routes/new-slot.test.tsx

# Watch all tests matching pattern
npm run test:watch -- --testPathPattern=booking

# Run with coverage
npm run test:coverage
```

#### 6. CRITICAL: Playwright-First Debugging Workflow

**⚠️ ALWAYS use Playwright tests for debugging, NOT manual browser inspection!**

**Why:** Playwright diagnostic tests are **50x faster** than manual browser debugging.

**When to Use:**
- Infinite spinner issues
- Page not loading
- Console errors
- Component rendering issues
- Any behavior that "looks broken" in browser

**How to Create Diagnostic Test:**

```typescript
// e2e/debug-feature.spec.ts
import { test, expect } from '@playwright/test'

test('diagnostic: feature name', async ({ page }) => {
  // Capture ALL console logs automatically
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

  console.log('\n🔍 Starting diagnostic test...\n')

  // Navigate to problem page
  await page.goto('http://localhost:3000/feature', {
    waitUntil: 'networkidle',
    timeout: 30000
  })

  await page.waitForTimeout(2000)

  // Check page state
  const spinnerVisible = await page.locator('.animate-spin').isVisible().catch(() => false)
  const expectedElement = await page.locator('.expected-class').count()
  const navVisible = await page.locator('nav').isVisible().catch(() => false)

  // Output results
  console.log('\n📊 CONSOLE LOGS:')
  consoleLogs.forEach(log => console.log(log))

  console.log('\n📊 PAGE STATE:')
  console.log(`  - Spinner visible: ${spinnerVisible ? '❌ (BAD)' : '✅ (GOOD)'}`)
  console.log(`  - Expected elements: ${expectedElement} ${expectedElement > 0 ? '✅' : '❌'}`)
  console.log(`  - Navigation bar: ${navVisible ? '✅' : '❌'}`)
  console.log(`  - Console errors: ${consoleErrors.length} ${consoleErrors.length === 0 ? '✅' : '❌'}`)

  // Screenshot for visual inspection
  await page.screenshot({ path: 'test-results/debug-feature.png', fullPage: true })
  console.log('\n📸 Screenshot saved: test-results/debug-feature.png')

  // Assertions
  expect(spinnerVisible, 'Spinner should NOT be visible').toBe(false)
  expect(expectedElement, 'Should see expected elements').toBeGreaterThan(0)
  expect(navVisible, 'Navigation bar should be visible').toBe(true)
  expect(consoleErrors.length, 'Should have no console errors').toBe(0)
})
```

**Running Diagnostic Tests:**

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Run diagnostic test
npm run test:e2e -- e2e/debug-feature.spec.ts
```

**Benefits:**
- ✅ Captures ALL console logs (no manual copy/paste)
- ✅ Detects errors humans miss
- ✅ Repeatable and consistent
- ✅ Screenshots for visual verification
- ✅ 50x faster than manual F12 inspection
- ✅ CI/CD ready

**Reference Implementation:** `e2e/debug-lmr-slots.spec.ts`

### Test Coverage

- **P0 (Critical) Test Categories**:
  - Authentication flows
  - Booking creation and validation
  - Slot management
  - Payment processing

- **Test Location Guide**:
  - Unit tests: `__tests__/`
  - E2E tests: `e2e/user-journeys.spec.ts`
  - Test utilities: `__tests__/utils/`

### Quick commands (for agents)
- Install dependencies: `npm install`
- Start dev server: `npm run dev` (http://localhost:3000)
- Run unit tests: `npm test`
- Run E2E tests: `npm run test:e2e` (requires dev server + Supabase credentials)

### Deployment
- **Platform:** Vercel (planned)
- **Domain:** parkboard.app (Porkbun DNS)
- **CI/CD:** GitHub Actions (configured, not yet deployed)

---

## Project Structure

```
parkboard/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Landing page with community selector
│   ├── (auth)/                  # Auth routes (login, register)
│   │   ├── login/              # Login form
│   │   └── register/           # Registration form
│   │
│   ├── [community]/            # 🆕 Multi-tenant routes (dynamic community)
│   │   ├── layout.tsx          # Community context provider + validation
│   │   ├── page.tsx            # Community landing page
│   │   ├── slots/              # Browse and book slots (community-specific)
│   │   │   ├── page.tsx       # Slot listing
│   │   │   ├── [slotId]/      # Slot detail & booking
│   │   │   └── new/           # Create new slot
│   │   └── bookings/           # View bookings
│   │
│   ├── api/                     # API Routes
│   │   └── auth/
│   │       └── signup/         # Registration endpoint
│   │
│   └── layout.tsx              # Root layout with AuthWrapper
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── common/                 # Shared components
│   │   ├── Navigation.tsx     # Top navigation (community-aware)
│   │   └── AuthWrapper.tsx    # Session management
│   └── slots/                  # Slot-specific components
│
├── lib/
│   ├── context/
│   │   └── CommunityContext.tsx  # 🆕 Multi-tenant context provider
│   ├── supabase/
│   │   ├── client.ts           # Supabase client
│   │   └── server.ts           # Supabase server
│   └── utils/                  # Utility functions
│
├── db/
│   ├── schema_optimized.sql    # 🔥 USE THIS (latest, optimized)
│   ├── schema_refined.sql      # ⚠️ Outdated (for reference only)
│   └── migrations/             # 🆕 Database migrations
│       ├── README.md          # Migration execution guide
│       ├── 001_hybrid_pricing_model.sql
│       ├── 002_multi_tenant_communities.sql
│       ├── 002_multi_tenant_communities_idempotent.sql
│       ├── 003_community_rls_policies.sql
│       └── 003_community_rls_policies_idempotent.sql
│
├── docs/                       # 📚 Project documentation
│   ├── MULTI_TENANT_IMPLEMENTATION_20251014.md    # 🆕 Multi-tenant architecture
│   ├── HYBRID_PRICING_ANALYSIS_20251013.md        # Phase 1 analysis
│   ├── HYBRID_PRICING_IMPLEMENTATION_20251013.md  # Phase 2 implementation
│   ├── AUDIT_REPORT_20251007.md                   # Security & architecture audit
│   ├── SQL_AND_API_TESTING_GUIDE_20251013.md     # Testing infrastructure
│   ├── CICD_IMMEDIATE_ACTIONS_20251013.md        # CI/CD beginner's guide
│   ├── EXECUTABLE_TESTS_NOW_20251013.md          # What can run immediately
│   ├── SESSION_SUMMARY_20251012.md               # Recent work summary
│   ├── DEPLOYMENT_GUIDE_20251012.md              # Vercel + Porkbun setup
│   ├── TESTING_COMPLETE_SUMMARY_20251012.md      # Test coverage overview
│   ├── E2E_TEST_PLAN_20251012.md                 # E2E testing strategy
│   └── UI_UX_IMPROVEMENT_PLAN_20251009.md        # UI enhancement roadmap
│
├── __tests__/                  # Jest unit & component tests
│   ├── routes/                # Page tests (154 tests)
│   ├── components/            # Component tests (19 tests)
│   └── utils/                 # Utility tests (5 tests)
│
├── e2e/                        # Playwright E2E tests
│   ├── user-journeys.spec.ts  # 8 user journey tests
│   └── debug-lmr-slots.spec.ts  # 🆕 Diagnostic test template
│
├── scripts/
│   ├── generate-stress-test-data.sh  # Create test users
│   ├── create-test-slots.sql        # 🆕 Create test parking slots
│   └── verify-test-user.sql         # 🆕 Verify test user setup
│
├── middleware.ts              # Auth middleware (route protection + community validation)
├── jest.config.js             # Jest configuration
├── playwright.config.ts       # Playwright configuration
└── package.json               # Dependencies & scripts
```

---

## Database Architecture

### Tables

#### `communities` 🆕
```sql
- community_code (TEXT, PK) -- 'LMR', 'SRP', 'BGC'
- name (TEXT) -- 'Lumiere'
- display_name (TEXT) -- 'Lumiere Residences'
- address (TEXT)
- city (TEXT)
- timezone (TEXT) -- Default: 'Asia/Manila'
- settings (JSONB) -- Branding, features, rules
- status (TEXT) -- 'active', 'inactive'
- created_at, updated_at
```

#### `user_profiles`
```sql
- id (UUID, FK to auth.users)
- email (TEXT, UNIQUE)
- name (TEXT)
- phone (TEXT)
- unit_number (TEXT, UNIQUE) -- e.g., "10A"
- community_code (TEXT, FK to communities) -- 🆕 Multi-tenant
- created_at, updated_at
```

#### `parking_slots`
```sql
- slot_id (SERIAL, PK)
- owner_id (UUID, FK to user_profiles)
- slot_number (TEXT, UNIQUE) -- e.g., "A-101"
- slot_type (ENUM: 'covered', 'uncovered', 'tandem')
- description (TEXT)
- price_per_hour (DECIMAL) -- ⚠️ NOW NULL-able (hybrid pricing)
- status (ENUM: 'active', 'maintenance', 'disabled')
- community_code (TEXT, FK to communities) -- 🆕 Multi-tenant
- created_at, updated_at
```

#### `bookings`
```sql
- booking_id (SERIAL, PK)
- slot_id (INT, FK to parking_slots)
- renter_id (UUID, FK to user_profiles)
- slot_owner_id (UUID) -- Denormalized for performance
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ)
- total_price (DECIMAL) -- Calculated by trigger
- status (ENUM: 'pending', 'confirmed', 'cancelled', 'completed')
- created_at, updated_at
```

### Key Database Features

1. **Price Calculation Trigger:**
   - `calculate_booking_price()` automatically computes `total_price`
   - Formula: `duration_hours × price_per_hour`
   - **NEW:** Rejects bookings for slots with NULL price

2. **Owner Denormalization Trigger:**
   - `auto_populate_slot_owner()` copies `slot.owner_id` to `booking.slot_owner_id`
   - Avoids JOIN in most queries (40-60% faster)

3. **Optimized Indexes:**
   - `idx_bookings_renter_status_time` (composite for "My Bookings" queries)
   - `idx_slots_listing` (covering index for browse slots)
   - `idx_bookings_time_gist` (GiST index for time-range conflicts)

4. **Row Level Security (RLS):**
   - Optimized policies using denormalized fields
   - No subqueries (performance boost)

---

## AI agent checklist (short)
- Read `.github/copilot-instructions.md` first — it contains an up-to-date agent playbook and quick start commands.
- Open these files in order when changing booking or auth logic:
   1. `app/api/bookings/route.ts`
   2. `components/booking/BookingForm.tsx`
   3. `components/booking/SlotGrid.tsx`
   4. `lib/constants.ts` and `lib/supabase/server.ts`
- Always verify database expectations against `db/schema_optimized.sql` and `db/rls_policies.sql`.
- Run `npm test` locally before proposing code changes; E2E requires a running dev server and real Supabase credentials.

---

## Database Migrations: Industry Standards

### Idempotent Migrations (REQUIRED)

**All ParkBoard migrations MUST be idempotent** - safe to run multiple times without errors.

**Why Idempotent?**
1. **CI/CD Safety:** Automated pipelines can retry failed deployments
2. **Team Collaboration:** Multiple developers can run migrations independently
3. **Disaster Recovery:** Migrations can be replayed during recovery
4. **Testing:** Test environments can be reset reliably
5. **Human Error Protection:** Accidental double-execution won't break production

**Industry Standard Pattern:**
```sql
-- ✅ GOOD - Idempotent (safe to run twice)
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
DROP TABLE IF EXISTS old_table CASCADE;
CREATE OR REPLACE FUNCTION calculate_price();
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- ❌ BAD - Non-idempotent (fails on second run)
CREATE TABLE users (...);          -- ERROR: relation already exists
CREATE INDEX idx_email ON users(email);  -- ERROR: index already exists
DROP TABLE old_table;              -- ERROR: table does not exist
CREATE FUNCTION calculate_price(); -- ERROR: function already exists
```

###Usage

**For Hybrid Pricing:**
- Use: `db/migrations/001_hybrid_pricing_model_idempotent.sql` ✅
- Archive: `db/migrations/archive/001_hybrid_pricing_model.sql` (original, non-idempotent)

**For Multi-Tenant:**
- Use: `db/migrations/002_multi_tenant_communities_idempotent.sql` ✅
- Use: `db/migrations/003_community_rls_policies_idempotent.sql` ✅
- Archive: Non-idempotent versions in `db/migrations/archive/`

**Run via Supabase CLI:**
```bash
supabase db execute --file db/migrations/001_hybrid_pricing_model_idempotent.sql
```

**Or paste into Supabase SQL Editor** (Dashboard → SQL Editor)

---

## Current Development: Hybrid Pricing Model

### What's Being Implemented

We're adding flexibility to pricing:
- **Explicit Pricing:** Current behavior - show price, enable instant booking
- **Request Quote:** New option - hide price, show "Contact Owner" instead

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database schema | ✅ Analyzed | Allow NULL in `price_per_hour` |
| Database trigger | ✅ Analyzed | Add NULL check in `calculate_booking_price()` |
| Create slot form | 📝 Design ready | Add pricing type radio buttons |
| Slot listing page | 📝 Design ready | Conditional rendering for price display |
| Slot detail page | 📝 Design ready | Show "Contact Owner" UI when price is NULL |
| Tests | ⏳ Planned | Add hybrid pricing test scenarios |

### Key Files for Hybrid Pricing Work

1. **Database Migration:** `db/migrations/001_hybrid_pricing_model.sql`
2. **Analysis Document:** `docs/HYBRID_PRICING_ANALYSIS_20251013.md`
3. **Implementation Guide:** `docs/HYBRID_PRICING_IMPLEMENTATION_20251013.md`

### Implementation Approach

**Recommended:** Use "Option A" from analysis (Simple NULL support)
- Minimal schema changes
- Backward compatible
- Easy to rollback

**Steps:**
1. Run database migration (15 min)
2. Update slot creation page (30 min)
3. Update slot listing cards (15 min)
4. Update slot detail page (30 min)
5. Test with both pricing types (30 min)

---

## Testing Infrastructure

### What Can Run RIGHT NOW (No Setup)

```bash
# Unit tests (158 tests, ~10 seconds)
npm test

# Linting (ESLint, ~5 seconds)
npm run lint

# Type checking (TypeScript, ~8 seconds)
npx tsc --noEmit

# Build verification (~60 seconds)
npm run build
```

### What Requires Setup

```bash
# E2E tests (requires dev server + database)
npm run dev              # Terminal 1: Start server
npm run stress:data      # Terminal 2: Generate test users (one-time)
npm run test:e2e         # Terminal 2: Run E2E tests (8 scenarios)

# E2E with UI (interactive mode)
npm run test:e2e:ui
```

### Test Coverage

- **Unit/Component Tests:** 158 tests (100% passing)
  - Route tests: 154
  - Component tests: 19
  - Utility tests: 5
- **E2E Tests:** 8 user journey tests (ready, needs dev server)
- **Coverage:** ~85% (target: 80%)

---

## Common Development Tasks

### Start Development Server

```bash
npm run dev
# Opens on http://localhost:3000
```

### Run Tests

```bash
# Quick validation (30 seconds)
npm test

# Full validation with coverage (3 minutes)
npm run test:coverage

# E2E tests (60 seconds, requires dev server)
npm run test:e2e
```

### Database Operations

**Option 1: Supabase Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. SQL Editor → Run queries

**Option 2: Supabase CLI (Recommended for Automation)**
```bash
# Install (one-time)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref cgbkknefvggnhkvmuwsa

# Run SQL file
supabase db execute --file db/schema_optimized.sql

# Run query
supabase db execute "SELECT COUNT(*) FROM parking_slots;"
```

### Generate Test Data

```bash
# Creates 20 test users + SQL for 10 slots
npm run stress:data

# Test user credentials:
# Emails: user1@parkboard.test through user20@parkboard.test
# Password: test123456 (all users)
```

---

## Critical Files & Their Purposes

### Database
- **`db/schema_optimized.sql`** - 🔥 **USE THIS!** Latest optimized schema
- `db/schema_refined.sql` - ⚠️ Outdated, keep for reference only

### Configuration
- `.env.local` - Environment variables (Supabase credentials)
- `middleware.ts` - Route protection logic
- `jest.config.js` - Test configuration
- `playwright.config.ts` - E2E test configuration

### Core Application Files
- `app/layout.tsx` - Root layout with AuthWrapper
- `components/common/AuthWrapper.tsx` - Session management
- `components/common/Navigation.tsx` - Top navigation bar

### Key Route Files (Multi-Tenant) 🆕
- `app/[community]/layout.tsx` - Community validation & context
- `app/[community]/page.tsx` - Community landing page
- `app/[community]/slots/page.tsx` - Browse slots (community-specific)
- `app/[community]/slots/[slotId]/page.tsx` - Slot detail & booking
- `app/[community]/slots/new/page.tsx` - Create new slot
- `app/[community]/bookings/page.tsx` - View bookings
- `lib/context/CommunityContext.tsx` - Multi-tenant context provider

---

## Known Issues & Gotchas

### 1. Schema Files
- **ALWAYS use `schema_optimized.sql`** (not `schema_refined.sql`)
- Optimized version has triggers, indexes, and RLS improvements

### 2. Test Dates
- Unit tests use dates in 2026 (to avoid "past date" validation errors)
- If tests fail with "cannot book in the past," check test dates

### 3. Database Connection
- Direct `psql` connection is blocked by Supabase firewall
- Use Supabase Dashboard or Supabase CLI instead

### 4. Environment Variables
- Tests DON'T need real Supabase credentials (fully mocked)
- E2E tests DO need real credentials
- Build needs dummy env vars (can be fake)

### 5. Booking Price Calculation
- **Server-side only** via database trigger
- Client NEVER sends `total_price` to database
- If trigger fails, entire booking insert fails (by design)

### 6. useEffect Dependencies 🆕
- **NEVER use object references** in useEffect dependencies
- Objects (like `supabase` client) change every render → infinite loops
- Use empty `[]` for mount-only effects
- Use primitive values (strings, numbers) for conditional re-runs
- Example: `useEffect(() => fetchData(), [])` NOT `[supabase]`
- **Reference:** `docs/MULTI_TENANT_IMPLEMENTATION_20251014.md` lines 163-186

### 7. Multi-Tenant Routing 🆕
- All marketplace routes are now under `/[community]/*`
- Community codes: 2-4 uppercase letters (LMR, SRP, BGC)
- Invalid community codes return 404
- Public browsing allowed, auth required for actions
- **Reference:** `docs/MULTI_TENANT_IMPLEMENTATION_20251014.md`

---

## Development Workflow

### Before Making Changes
```bash
# 1. Ensure clean state
git status

# 2. Run tests to establish baseline
npm test

# 3. Create feature branch
git checkout -b feature/hybrid-pricing
```

### While Developing
```bash
# Keep tests running in watch mode
npm run test:watch

# Start dev server in another terminal
npm run dev
```

### Before Committing
```bash
# 1. Run full test suite
npm test

# 2. Check linting
npm run lint

# 3. Type check
npx tsc --noEmit

# 4. If all pass, commit
git add .
git commit -m "feat: implement hybrid pricing model"
```

### When Adding New Features
1. Write or update tests FIRST
2. Implement feature
3. Verify tests pass
4. Update documentation (if needed)
5. Create PR

---

## CI/CD Status

### Current State
- **GitHub Actions workflows:** ✅ Configured (not yet deployed)
- **Vercel deployment:** ⏳ Account needed
- **Domain (parkboard.app):** ✅ Registered on Porkbun
- **SSL/HTTPS:** ⏳ Will be automatic via Vercel

### Workflows Created
1. **`ci.yml`** - Runs on every push (linting, tests, build)
2. **`deploy-production.yml`** - Deploys main branch to parkboard.app
3. **`deploy-staging.yml`** - Deploys develop branch to staging

### To Enable CI/CD
1. Set up Vercel account
2. Add GitHub Secrets (Vercel tokens)
3. Configure Porkbun DNS
4. Push to GitHub → auto-deploy

**Full guide:** `docs/DEPLOYMENT_GUIDE_20251012.md`

---

## Documentation Guide

### For New Feature Planning
1. **Analysis Phase:** Create `docs/FEATURE_ANALYSIS_YYYYMMDD.md`
2. **Implementation Phase:** Create `docs/FEATURE_IMPLEMENTATION_YYYYMMDD.md`
3. **Reference existing:** `HYBRID_PRICING_*.md` files as templates

### For Bug Fixes
- Check `docs/AUDIT_REPORT_20251007.md` for known issues
- Update relevant docs if fix changes behavior

### For Testing
- **Unit tests:** See `docs/TESTING_COMPLETE_SUMMARY_20251012.md`
- **E2E tests:** See `docs/E2E_TEST_PLAN_20251012.md`
- **Test execution:** See `docs/EXECUTABLE_TESTS_NOW_20251013.md`

### For Deployment
- **Complete guide:** `docs/DEPLOYMENT_GUIDE_20251012.md`
- **CI/CD overview:** `docs/CICD_IMMEDIATE_ACTIONS_20251013.md`
- **Quick reference:** `docs/SESSION_SUMMARY_20251012.md`

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user

### Supabase Client Queries
Most operations use Supabase client directly (not API routes):
- Browse slots: `supabase.from('parking_slots').select(...)`
- Create booking: `supabase.from('bookings').insert(...)`
- View bookings: `supabase.from('bookings').select(...)`

### Future API Routes (Planned)
- `GET /api/slots` - Browse slots (for external integrations)
- `POST /api/bookings` - Create booking (for external integrations)
- `GET /api/health` - Health check endpoint

---

## Environment Variables

### Required for Development

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://cgbkknefvggnhkvmuwsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Where to Find Credentials
1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. Settings → API
4. Copy `Project URL` and `anon public` key

**⚠️ NEVER commit `.env.local` to Git!**

---

## Quick Start for New Developers

### 1. Clone and Setup (10 minutes)
```bash
# Clone repository
git clone https://github.com/alfieprojectsdev/parkboard.git
cd parkboard

# Install dependencies
npm install

# Create .env.local with Supabase credentials
# (get credentials from team or Supabase dashboard)
```

### 2. Verify Setup (2 minutes)
```bash
# Run tests (should see 158 passing)
npm test

# Start dev server
npm run dev

# Open http://localhost:3000
```

### 3. Read Documentation (30 minutes)
1. This file (CLAUDE.md)
2. `docs/AUDIT_REPORT_20251007.md` - Architecture overview
3. `docs/TESTING_COMPLETE_SUMMARY_20251012.md` - Testing guide

### 4. Try Test Login
- Email: `user1@parkboard.test`
- Password: `test123456`
- (After running `npm run stress:data`)

---

## Important Dates & Milestones

- **2025-10-07:** Security audit completed, all critical issues resolved
- **2025-10-09:** UI/UX improvement plan created
- **2025-10-12:** E2E testing implemented (8 user journey tests), CI/CD workflows created
- **2025-10-13:** Test coverage reached 85% (158 tests), hybrid pricing model analysis completed
- **2025-10-14:** ✅ Multi-tenant architecture implemented (12-16 hours)
  - Path-based routing (`/LMR/slots`, `/SRP/slots`)
  - Community data isolation via RLS
  - Fixed critical useEffect bugs (3 components)
  - Established Playwright-first debugging workflow (50x faster)
  - Database migrations 002 & 003 (idempotent)
- **Current focus:** Deploy to parkboard.app/LMR

---

## Contact & Support

### Project Owner
- **GitHub:** alfieprojectsdev/parkboard
- **Branch:** parkboard-mvp-optimized (main development branch)

### Key Resources
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard (when set up)
- **GitHub Actions:** https://github.com/alfieprojectsdev/parkboard/actions

### Getting Help
1. Check relevant documentation in `docs/`
2. Review existing tests for examples
3. Check GitHub Issues
4. Review audit report for architectural decisions

---

## Next Steps (Immediate Priorities)

### 1. Deploy to Production (2-3 hours) ⬆️ TOP PRIORITY
- [ ] Run production migrations (002 & 003)
- [ ] Set up Vercel account
- [ ] Configure parkboard.app/LMR domain
- [ ] Add environment variables
- [ ] Deploy and verify
- **Guide:** `docs/DEPLOYMENT_GUIDE_20251012.md`

### 2. Hybrid Pricing UI Implementation (2-3 hours)
- [x] Database migration complete
- [ ] Update create slot form
- [ ] Update slot listing display
- [ ] Update slot detail page (already supports NULL prices)
- [ ] Add tests for hybrid pricing
- **Guide:** `docs/HYBRID_PRICING_IMPLEMENTATION_20251013.md`

### 3. UI/UX Improvements (13-16 hours)
- [ ] Install shadcn/ui components
- [ ] Implement mobile bottom navigation
- [ ] Add booking modal
- [ ] Implement tabbed bookings view
- **Guide:** `docs/UI_UX_IMPROVEMENT_PLAN_20251009.md`

---

## Tips for Working with This Codebase

### For Claude Code
- **Schema:** Always reference `db/schema_optimized.sql`
- **Tests:** Run `npm test` before suggesting changes
- **Debugging:** Use Playwright diagnostic tests, NOT manual browser inspection (50x faster)
- **Documentation:** Check `docs/` for context before implementing
- **Patterns:** Follow existing patterns in `app/[community]/` routes (multi-tenant)
- **useEffect:** Never use object references in dependencies (causes infinite loops)

### For Developers Transitioning from Other Fields
- **Start simple:** Run tests, read passing test files to understand patterns
- **Use docs:** Comprehensive guides exist for every major feature
- **Ask questions:** Documentation includes "why" decisions were made
- **Test often:** `npm test` gives instant feedback (10 seconds)

### For ADHD/Autism-Friendly Development
- **Clear checkboxes:** All guides have step-by-step checklists
- **Time estimates:** Most tasks have estimated durations
- **Scaffolding:** Guides build from simple to complex
- **Validation:** Tests confirm each step works before moving on

---

## Status Summary

### ✅ Production-Ready
- Authentication system
- Booking workflow
- Database architecture (optimized + multi-tenant)
- Test coverage (158 tests, 85%)
- Security audit (all critical issues resolved)
- Multi-tenant routing (`/LMR`, `/SRP`, `/BGC`)
- Community data isolation via RLS
- Hybrid pricing database layer

### 📝 In Progress
- Deployment to parkboard.app/LMR (workflows ready, Vercel setup pending)
- Hybrid pricing UI implementation (database complete, UI pending)

### ⏳ Planned
- UI/UX improvements (shadcn/ui integration)
- Mobile bottom navigation
- Advanced search/filtering
- Admin dashboard
- Additional communities (SRP, BGC)

---

## Success Criteria

**Before Production Launch:**
- ✅ All tests passing (158/158)
- ✅ Security audit clean
- ✅ E2E tests implemented
- ✅ Multi-tenant architecture complete
- ✅ Database migrations idempotent
- ⏳ Deployed to parkboard.app/LMR
- ⏳ SSL/HTTPS enabled
- ⏳ Monitoring configured

**Current Progress:** ~95% ready for launch

---

**Last Updated:** 2025-10-14
**Maintained By:** Development Team
**Status:** 🚀 **Production-Ready** (pending Vercel deployment only)
