# ParkBoard - Deployment Execution Plan
**Date:** 2025-10-13
**Status:** ✅ APPROVED - Ready to Execute
**Timeline:** 7-9 hours
**Target:** staging.parkboard.app/LMR

---

## Test Status Summary

### ✅ Current Test Health

```
Unit Tests:       164/181 passing (90.6%)
Failing Tests:    17/181 (all hybrid pricing - expected)
E2E Tests:        Not yet run (requires dev server)
Build Status:     ✅ Succeeds (with 10 ESLint warnings)
TypeScript:       ✅ Clean compilation
```

**Test Failures Explained:**
- 17 failing tests = Hybrid pricing features not yet applied
- These are **TDD RED phase** (tests written before implementation)
- Expected to pass after Step 3 (Complete Hybrid Pricing)

**E2E Tests:**
- 8 scenarios ready in `e2e/user-journeys.spec.ts`
- Not blocking deployment (nice-to-have verification)
- Will run after Vercel deployment for final validation

---

## Execution Plan: 7-9 Hours

### 🎯 Goal
Deploy working MVP with `/LMR` multi-tenant architecture to `staging.parkboard.app/LMR`

### ✅ Success Criteria
```
[ ] All 181 unit tests passing (100%)
[ ] Build succeeds with no errors
[ ] ESLint clean (no warnings)
[ ] /LMR routes working
[ ] Community data isolation verified
[ ] Staging URL accessible: staging.parkboard.app/LMR
[ ] HTTPS enabled
[ ] Core user journeys tested
```

---

## Hour 1: Fix ESLint Warnings (30 min)

### Current Issues
```
Total: 10 ESLint errors
  - 6x @typescript-eslint/no-explicit-any
  - 2x @typescript-eslint/no-unused-vars
  - 2x react/no-unescaped-entities
```

### Fixes

**1. Fix `any` types (6 occurrences)**

```typescript
// File: app/(marketplace)/slots/new/page.tsx
// Line 84: any
// BEFORE:
} catch (err: any) {

// AFTER:
} catch (err: unknown) {
  const error = err as Error
  console.error('Create slot error:', error)
  setError(error.message)
}
```

```typescript
// File: app/(marketplace)/slots/page.tsx
// Line 58: any
// BEFORE:
} catch (err: any) {

// AFTER:
} catch (err: unknown) {
  const error = err as Error
  console.error('Error fetching slots:', error)
  setError(error.message)
}
```

```typescript
// File: app/(marketplace)/slots/page_hybrid_pricing.tsx
// Line 67: any
// Same fix as above
```

```typescript
// File: app/api/auth/signup/route.ts
// Line 333: any
// BEFORE:
} catch (error: any) {

// AFTER:
} catch (error: unknown) {
  const err = error as Error & { code?: string }
  console.error('Registration error:', err)
  // ... existing error handling
}
```

```typescript
// File: app/profile/complete/page.tsx
// Line 40: any
// Same pattern as above
```

**2. Fix unused variables (2 occurrences)**

```typescript
// Files with unused 'e' parameter
// BEFORE:
onChange={(e) => setFormData({ ...formData, slot_type: e.target.value })}

// AFTER:
onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
  setFormData({ ...formData, slot_type: e.target.value })
}
```

**3. Fix unescaped entities (2 occurrences)**

```typescript
// BEFORE:
<p>Don't show pricing publicly.</p>

// AFTER:
<p>Don&apos;t show pricing publicly.</p>
```

### Verification
```bash
npm run lint
# Expected: No errors
```

---

## Hour 2-3: Complete Hybrid Pricing (1-2 hours)

### Step 1: Run Database Migration (15 min)

**File:** `db/migrations/001_hybrid_pricing_model.sql`

**Actions:**
```bash
# 1. Open Supabase Dashboard
# URL: https://supabase.com/dashboard
# Project: cgbkknefvggnhkvmuwsa

# 2. Navigate to SQL Editor

# 3. Copy entire contents of migration file
cat db/migrations/001_hybrid_pricing_model.sql

# 4. Paste into SQL Editor

# 5. Click "Run"

# 6. Verify success (should see "Success. No rows returned")
```

**Verification Queries:**
```sql
-- Check constraint updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parking_slots'::regclass
  AND conname = 'parking_slots_price_check';
-- Expected: CHECK (price_per_hour IS NULL OR price_per_hour > 0)

-- Check trigger updated
SELECT prosrc FROM pg_proc WHERE proname = 'calculate_booking_price';
-- Expected: Contains "IF v_price_per_hour IS NULL THEN RAISE EXCEPTION"

-- Check existing data
SELECT COUNT(*) FROM parking_slots WHERE price_per_hour IS NULL;
-- Expected: 0 (no NULL prices yet)
```

---

### Step 2: Replace Frontend Pages (30 min)

**Create backups first:**
```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp app/\(marketplace\)/slots/new/page.tsx backups/$(date +%Y%m%d_%H%M%S)/
cp app/\(marketplace\)/slots/page.tsx backups/$(date +%Y%m%d_%H%M%S)/
cp app/\(marketplace\)/slots/\[slotId\]/page.tsx backups/$(date +%Y%m%d_%H%M%S)/
```

**Replace pages:**
```bash
# Page 1: Slot Creation (with pricing type selector)
cp app/\(marketplace\)/slots/new/page_hybrid_pricing.tsx \
   app/\(marketplace\)/slots/new/page.tsx

# Page 2: Slot Listing (with badges)
cp app/\(marketplace\)/slots/page_hybrid_pricing.tsx \
   app/\(marketplace\)/slots/page.tsx

# Page 3: Slot Detail (with contact flow)
cp app/\(marketplace\)/slots/\[slotId\]/page_hybrid_pricing.tsx \
   app/\(marketplace\)/slots/\[slotId\]/page.tsx
```

---

### Step 3: Verify Tests Pass (15 min)

```bash
# Run full test suite
npm test

# Expected output:
# Tests:       181 passed, 181 total
# Test Suites: 12 passed, 12 total
# Time:        ~10s
```

**If tests still fail:**
- Check file replacements completed
- Verify database migration ran
- Check for TypeScript errors: `npx tsc --noEmit`

---

## Hour 4-5: Multi-Tenant Architecture (2-3 hours)

### Step 1: Create Communities Database Schema (30 min)

**File:** Create `db/migrations/002_multi_tenant_communities.sql`

```sql
-- ============================================================================
-- MIGRATION: Multi-Tenant Communities Support
-- ============================================================================
-- Purpose: Enable /LMR, /SRP, /BGC path-based community routing
-- Date: 2025-10-13
-- ============================================================================

-- Step 1: Create communities table
CREATE TABLE communities (
  community_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'Asia/Manila',
  settings JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE communities IS 'Multi-tenant communities (condos) using ParkBoard';
COMMENT ON COLUMN communities.community_code IS 'URL path identifier (LMR, SRP, etc.)';
COMMENT ON COLUMN communities.settings IS 'Branding, rules, contact info (JSONB)';

-- Step 2: Add community_code to existing tables
ALTER TABLE user_profiles
  ADD COLUMN community_code TEXT;

ALTER TABLE parking_slots
  ADD COLUMN community_code TEXT;

-- Step 3: Insert LMR community
INSERT INTO communities (community_code, name, display_name, address, city, settings) VALUES (
  'LMR',
  'Lumiere',
  'Lumiere Residences',
  'Pasig Blvd, Pasig City',
  'Metro Manila',
  '{
    "branding": {
      "primaryColor": "#1a56db",
      "tagline": "Park smarter at Lumiere"
    },
    "features": {
      "requestQuote": true,
      "instantBooking": true
    },
    "rules": {
      "maxBookingDays": 30,
      "cancellationHours": 24
    }
  }'::jsonb
);

-- Step 4: Backfill existing data to LMR
UPDATE user_profiles
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

UPDATE parking_slots
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

-- Step 5: Make community_code NOT NULL
ALTER TABLE user_profiles
  ALTER COLUMN community_code SET NOT NULL;

ALTER TABLE parking_slots
  ALTER COLUMN community_code SET NOT NULL;

-- Step 6: Add foreign keys
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_community
  FOREIGN KEY (community_code)
  REFERENCES communities(community_code)
  ON DELETE RESTRICT;

ALTER TABLE parking_slots
  ADD CONSTRAINT fk_slot_community
  FOREIGN KEY (community_code)
  REFERENCES communities(community_code)
  ON DELETE RESTRICT;

-- Step 7: Add indexes
CREATE INDEX idx_user_community ON user_profiles(community_code);
CREATE INDEX idx_slot_community ON parking_slots(community_code);

-- Step 8: Update triggers for updated_at
CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check LMR community exists
SELECT * FROM communities WHERE community_code = 'LMR';

-- Check all users assigned to LMR
SELECT COUNT(*) as total_users,
       COUNT(CASE WHEN community_code = 'LMR' THEN 1 END) as lmr_users
FROM user_profiles;

-- Check all slots assigned to LMR
SELECT COUNT(*) as total_slots,
       COUNT(CASE WHEN community_code = 'LMR' THEN 1 END) as lmr_slots
FROM parking_slots;

-- Verify foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname LIKE 'fk_%community';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ALTER TABLE user_profiles DROP CONSTRAINT fk_user_community;
ALTER TABLE parking_slots DROP CONSTRAINT fk_slot_community;
ALTER TABLE user_profiles DROP COLUMN community_code;
ALTER TABLE parking_slots DROP COLUMN community_code;
DROP TABLE communities CASCADE;
*/
```

**Run in Supabase Dashboard:**
```bash
# Same process as migration 001
# SQL Editor → Paste → Run → Verify
```

---

### Step 2: Update RLS Policies (30 min)

**File:** Create `db/migrations/003_community_rls_policies.sql`

```sql
-- ============================================================================
-- MIGRATION: Community-Based Row Level Security
-- ============================================================================
-- Purpose: Isolate data by community_code
-- ============================================================================

-- Drop existing policies (will recreate with community filter)
DROP POLICY IF EXISTS "public_read_slots" ON parking_slots;
DROP POLICY IF EXISTS "owners_manage_own_slots" ON parking_slots;
DROP POLICY IF EXISTS "users_create_slots" ON parking_slots;

-- Recreate with community context
-- Note: Using session variable for community context
-- Set via: SELECT set_config('app.current_community', 'LMR', false);

-- Slots: Anyone can read, but only their community
CREATE POLICY "community_read_slots" ON parking_slots
  FOR SELECT
  USING (
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code  -- Fallback to allow admin access
    )
  );

-- Slots: Owners manage their own slots in their community
CREATE POLICY "community_owners_manage_slots" ON parking_slots
  FOR ALL
  USING (
    auth.uid() = owner_id
    AND community_code = current_setting('app.current_community', true)
  );

-- Slots: Users create slots in their community
CREATE POLICY "community_users_create_slots" ON parking_slots
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND community_code = current_setting('app.current_community', true)
  );

-- Users: Can read profiles in their community
DROP POLICY IF EXISTS "public_read_profiles" ON user_profiles;
CREATE POLICY "community_read_profiles" ON user_profiles
  FOR SELECT
  USING (
    community_code = current_setting('app.current_community', true)
  );

-- Bookings: Inherit community from slots (no policy change needed)
-- Community context is enforced via slot queries

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to set community context (called from app)
CREATE OR REPLACE FUNCTION set_community_context(p_community_code TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_community', p_community_code, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_community_context IS 'Sets community context for RLS policies';

-- Function to get current community
CREATE OR REPLACE FUNCTION get_community_context()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_community', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test setting context
SELECT set_community_context('LMR');
SELECT get_community_context();
-- Expected: 'LMR'

-- Test slot filtering
SELECT set_community_context('LMR');
SELECT COUNT(*) FROM parking_slots;
-- Should return only LMR slots

-- Test user filtering
SELECT set_community_context('LMR');
SELECT COUNT(*) FROM user_profiles;
-- Should return only LMR users
```

---

### Step 3: Implement Dynamic [community] Routing (60 min)

**File Structure to Create:**
```
app/
├── [community]/              # NEW
│   ├── layout.tsx           # NEW - Community context
│   ├── page.tsx             # NEW - Community landing
│   ├── slots/               # MOVE from (marketplace)
│   ├── bookings/            # MOVE from (marketplace)
│   └── profile/             # MOVE from (marketplace)
├── page.tsx                 # UPDATE - Community selector
└── layout.tsx               # Keep existing
```

**Action 1: Create Community Context Provider**

File: `lib/context/CommunityContext.tsx`
```typescript
'use client'

import { createContext, useContext, ReactNode } from 'react'

interface CommunityContextType {
  code: string          // 'LMR'
  name: string          // 'Lumiere'
  displayName: string   // 'Lumiere Residences'
}

const CommunityContext = createContext<CommunityContextType | null>(null)

export function CommunityProvider({
  children,
  value
}: {
  children: ReactNode
  value: CommunityContextType
}) {
  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) {
    throw new Error('useCommunity must be used within CommunityProvider')
  }
  return context
}
```

**Action 2: Create Community Layout**

File: `app/[community]/layout.tsx`
```typescript
import { notFound } from 'next/navigation'
import { CommunityProvider } from '@/lib/context/CommunityContext'
import { createClient } from '@/lib/supabase/server'

// Valid communities (later: fetch from database)
const VALID_COMMUNITIES = ['LMR', 'SRP', 'BGC']

export default async function CommunityLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { community: string }
}) {
  const communityCode = params.community.toUpperCase()

  // Validate community exists
  if (!VALID_COMMUNITIES.includes(communityCode)) {
    notFound()
  }

  // Fetch community details
  const supabase = createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('community_code', communityCode)
    .eq('status', 'active')
    .single()

  if (!community) {
    notFound()
  }

  // Set community context for RLS
  await supabase.rpc('set_community_context', {
    p_community_code: communityCode
  })

  return (
    <CommunityProvider
      value={{
        code: community.community_code,
        name: community.name,
        displayName: community.display_name
      }}
    >
      {children}
    </CommunityProvider>
  )
}
```

**Action 3: Move Marketplace Routes**

```bash
# Create [community] directory
mkdir -p app/\[community\]

# Move routes from (marketplace) to [community]
mv app/\(marketplace\)/slots app/\[community\]/
mv app/\(marketplace\)/bookings app/\[community\]/

# Remove old (marketplace) directory
rmdir app/\(marketplace\)
```

**Action 4: Update Route Files to Use Community Context**

Example: `app/[community]/slots/page.tsx`
```typescript
'use client'

import { useCommunity } from '@/lib/context/CommunityContext'

export default function SlotsPage() {
  const community = useCommunity()

  // Fetch slots - community context already set by layout
  const { data: slots } = await supabase
    .from('parking_slots')
    .select('*')
    .eq('status', 'active')
    // community_code filter applied by RLS automatically

  return (
    <div>
      <h1>Available Parking at {community.displayName}</h1>
      {/* Rest of component */}
    </div>
  )
}
```

---

### Step 4: Create Community Landing Page (15 min)

File: `app/[community]/page.tsx`
```typescript
import { useCommunity } from '@/lib/context/CommunityContext'
import Link from 'next/link'

export default function CommunityHome() {
  const community = useCommunity()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to {community.displayName}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Share parking with your neighbors
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/${community.code}/slots`}>
            <button className="w-full p-6 bg-blue-600 text-white rounded-lg">
              Browse Available Slots
            </button>
          </Link>

          <Link href={`/${community.code}/slots/new`}>
            <button className="w-full p-6 bg-green-600 text-white rounded-lg">
              List Your Slot
            </button>
          </Link>

          <Link href={`/${community.code}/bookings`}>
            <button className="w-full p-6 bg-purple-600 text-white rounded-lg">
              My Bookings
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

### Step 5: Update Root Page (Community Selector) (15 min)

File: `app/page.tsx`
```typescript
import Link from 'next/link'

export default function RootPage() {
  const communities = [
    { code: 'LMR', name: 'Lumiere Residences', city: 'Pasig' }
    // Will fetch from database in future
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">ParkBoard</h1>
        <p className="text-xl text-gray-600">
          Condo parking marketplace for communities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map(community => (
          <Link
            key={community.code}
            href={`/${community.code}`}
            className="p-8 border-2 rounded-lg hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-bold mb-2">{community.name}</h2>
            <p className="text-gray-600">{community.city}</p>
            <p className="mt-4 text-blue-600">Visit →</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

### Step 6: Update Middleware (15 min)

File: `middleware.ts`
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const VALID_COMMUNITIES = ['LMR', 'SRP', 'BGC']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes
  if (pathname.startsWith('/api/') ||
      pathname.startsWith('/_next') ||
      pathname === '/') {
    return NextResponse.next()
  }

  // Check for community in path
  const communityMatch = pathname.match(/^\/([A-Z]{3})\//)
  if (communityMatch) {
    const community = communityMatch[1]

    // Validate community
    if (!VALID_COMMUNITIES.includes(community)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Continue with existing auth logic
  // ... (keep existing middleware code)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

---

## Hour 6: Build & Test Locally (45 min)

### Build Verification
```bash
# Clean build
rm -rf .next
npm run build

# Expected: Build succeeds with no errors
```

### Local Testing
```bash
# Start dev server
npm run dev

# Open browser
# Test: http://localhost:3000
# Test: http://localhost:3000/LMR
# Test: http://localhost:3000/LMR/slots
# Test: http://localhost:3000/LMR/bookings
```

### Test Checklist
```
[ ] Root page (/) shows community selector
[ ] /LMR redirects to community landing
[ ] /LMR/slots shows slots (if any exist)
[ ] /LMR/slots/new allows slot creation
[ ] /LMR/bookings shows bookings
[ ] Invalid community (/XYZ) redirects to /
[ ] Login/register works
[ ] Community context visible in UI
```

---

## Hour 7: Deploy to Vercel (60 min)

[Continue with Vercel setup from previous deployment guide...]

---

## Hour 8-9: Final Testing & Documentation (1-2 hours)

### Comprehensive Testing
```
[ ] All 181 unit tests passing
[ ] Build succeeds
[ ] ESLint clean
[ ] /LMR routes accessible
[ ] Community data isolation verified
[ ] staging.parkboard.app/LMR accessible
[ ] HTTPS enabled
[ ] Mobile responsive
[ ] User registration in LMR works
[ ] Slot creation in LMR works
[ ] Booking in LMR works
```

### E2E Test Execution (Optional - 30 min)
```bash
# In one terminal
npm run dev

# In another terminal
npm run test:e2e

# Expected: 8/8 E2E tests passing
```

---

## Test Strategy Summary

### ✅ TDD Approach Applied

**Phase 1 (RED) - Already Complete:**
- 17 hybrid pricing tests written
- Tests failing as expected
- Clear failure messages

**Phase 2 (GREEN) - Hour 2-3:**
- Apply hybrid pricing implementation
- Tests turn green: 164 → 181 passing

**Phase 3 (REFACTOR) - Optional:**
- Code cleanup after all tests pass
- Documentation updates

### ✅ Test Pyramid

```
E2E Tests (8)          ← Nice-to-have verification
  ↑
Unit Tests (181)       ← Must pass before deploy
  ↑
ESLint/TypeScript      ← Must be clean
```

### ✅ Deployment Gates

```
Required (Blocking):
  ✅ 181/181 unit tests passing
  ✅ Build succeeds
  ✅ ESLint clean
  ✅ TypeScript clean

Optional (Non-Blocking):
  ⭐ E2E tests passing (run after Vercel deploy)
  ⭐ Manual smoke tests
  ⭐ Performance benchmarks
```

---

## Success Verification Checklist

### After Hour 9, Verify:

```bash
CODE QUALITY
[✓] npm test → 181/181 passing
[✓] npm run build → Success
[✓] npm run lint → No errors
[✓] npx tsc --noEmit → No errors

DEPLOYMENT
[✓] Vercel deployment succeeded
[✓] staging.parkboard.app/LMR accessible
[✓] HTTPS enabled (auto)
[✓] Environment variables set

FUNCTIONALITY
[✓] User can register at /LMR
[✓] User can login
[✓] User can browse /LMR/slots
[✓] User can create slot in LMR
[✓] User can book slot in LMR
[✓] User can view /LMR/bookings

DATA ISOLATION
[✓] LMR users only see LMR data
[✓] Invalid community (/XYZ) blocked
[✓] Database has community_code fields
[✓] RLS policies enforce community isolation

DOCUMENTATION
[✓] Deployment documented
[✓] Known issues listed
[✓] User testing guide created
[✓] Next steps defined
```

---

**Ready to execute? Confirm and we'll start with Hour 1 (Fix ESLint warnings).**

