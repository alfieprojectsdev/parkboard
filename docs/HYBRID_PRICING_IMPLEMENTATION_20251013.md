# ParkBoard - Hybrid Pricing Model: Implementation Guide
**Date:** 2025-10-13
**Phase:** 2 - Implementation Planning
**Status:** ✅ Ready to Deploy

---

## Quick Start

**Estimated Time:** 2-3 hours
**Skill Level:** Intermediate
**Risk Level:** Low (fully reversible)

---

## Table of Contents

1. [Pre-Implementation Checklist](#pre-implementation-checklist)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [File Replacement Guide](#file-replacement-guide)
4. [Testing Instructions](#testing-instructions)
5. [Deployment Process](#deployment-process)
6. [Rollback Instructions](#rollback-instructions)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Implementation Checklist

### Before You Start

- [ ] Read `HYBRID_PRICING_ANALYSIS_20251013.md` (Phase 1 analysis)
- [ ] Backup current database (run in Supabase Dashboard):
  ```sql
  -- Save current schema
  SELECT * FROM parking_slots LIMIT 1;
  ```
- [ ] Verify you have access to:
  - Supabase Dashboard (SQL Editor)
  - Local development environment
  - Git repository
- [ ] Current test status: `npm test` (should show 158/158 passing)
- [ ] No uncommitted changes in working directory

### Environment Requirements

- Node.js 20.x
- npm 10.x
- Supabase project with existing schema
- Local `.env.local` with Supabase credentials

---

## Step-by-Step Implementation

### Phase 1: Database Migration (15 minutes)

#### 1.1 Run Migration Script

**Location:** `db/migrations/001_hybrid_pricing_model.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `001_hybrid_pricing_model.sql`
3. Paste into SQL Editor
4. Review the changes (it's safe - no data deletion)
5. Click "Run"

**What this does:**
- Allows `price_per_hour` to be NULL
- Updates trigger to reject booking attempts on NULL-price slots
- Adds helper function `slot_allows_instant_booking()`

**Verification:**
```sql
-- Check constraint was updated (run in SQL Editor)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parking_slots'::regclass
  AND conname = 'parking_slots_price_check';

-- Should return: CHECK (price_per_hour IS NULL OR price_per_hour > 0)
```

**Expected Result:** ✅ Query succeeds, no errors

#### 1.2 Verify Existing Data Unchanged

```sql
-- All existing slots should still have prices
SELECT COUNT(*) as total_slots,
       COUNT(price_per_hour) as slots_with_price,
       COUNT(*) - COUNT(price_per_hour) as slots_without_price
FROM parking_slots;

-- slots_without_price should be 0
```

---

### Phase 2: Frontend Implementation (60 minutes)

#### 2.1 Update Slot Creation Page

**File:** `app/(marketplace)/slots/new/page.tsx`

**Option A: Replace Entire File (Recommended)**
```bash
# Backup current file
cp app/\(marketplace\)/slots/new/page.tsx app/\(marketplace\)/slots/new/page.tsx.backup

# Replace with new version
cp app/\(marketplace\)/slots/new/page_hybrid_pricing.tsx app/\(marketplace\)/slots/new/page.tsx
```

**Option B: Manual Merge**
See `page_hybrid_pricing.tsx` and apply changes:
1. Add `pricing_type` to formData state
2. Add pricing type radio buttons (lines 148-208)
3. Conditional price input display (lines 211-224)
4. Update submit logic to allow NULL price (lines 46-62)

#### 2.2 Update Slot Listing Page

**File:** `app/(marketplace)/slots/page.tsx`

**Option A: Replace Entire File (Recommended)**
```bash
# Backup
cp app/\(marketplace\)/slots/page.tsx app/\(marketplace\)/slots/page.tsx.backup

# Replace
cp app/\(marketplace\)/slots/page_hybrid_pricing.tsx app/\(marketplace\)/slots/page.tsx
```

**Changes:**
- Add `price_per_hour: number | null` to Slot interface
- Conditional price display in card header (lines 119-140)
- Conditional button text (lines 155-163)
- Optional: Client-side ranking (lines 67-72)

#### 2.3 Update Slot Detail Page

**File:** `app/(marketplace)/slots/[slotId]/page.tsx`

**Option A: Replace Entire File (Recommended)**
```bash
# Backup
cp app/\(marketplace\)/slots/[slotId]/page.tsx app/\(marketplace\)/slots/[slotId]/page.tsx.backup

# Replace
cp app/\(marketplace\)/slots/[slotId]/page_hybrid_pricing.tsx app/\(marketplace\)/slots/[slotId]/page.tsx
```

**Changes:**
- Add `price_per_hour: number | null` to SlotDetails interface
- Conditional pricing display in header (lines 228-248)
- Separate rendering paths:
  - Instant booking form (lines 277-328) for explicit pricing
  - Contact owner UI (lines 330-374) for request quote

---

### Phase 3: Testing (45 minutes)

#### 3.1 Add New Test Files

**Files Created:**
- `__tests__/routes/new-slot-hybrid-pricing.test.tsx` (32 test cases)
- `__tests__/routes/slots-hybrid-pricing.test.tsx` (18 test cases)

**Installation:**
```bash
# Tests are already created in __tests__/routes/
# No action needed - they exist in the repo
```

#### 3.2 Run Tests

```bash
# Run all tests
npm test

# Run only hybrid pricing tests
npm test -- new-slot-hybrid-pricing
npm test -- slots-hybrid-pricing

# Run with coverage
npm run test:coverage
```

**Expected Results:**
- All existing tests pass (158/158)
- New hybrid pricing tests pass (50/50)
- **Total: 208 passing tests**

#### 3.3 Manual Testing Checklist

**Test Case 1: Create Slot with Explicit Pricing**
1. Navigate to `/slots/new`
2. Fill slot number: `TEST-100`
3. Select slot type: `Covered`
4. Select pricing type: "Set Fixed Price"
5. Enter price: `75`
6. Click "List Slot"
7. ✅ Should redirect to `/slots`
8. ✅ New slot should show `₱75/hr` and "Instant Booking" badge

**Test Case 2: Create Slot with Request Quote**
1. Navigate to `/slots/new`
2. Fill slot number: `TEST-200`
3. Select slot type: `Covered`
4. Select pricing type: "Request Quote"
5. Click "List Slot" (no price needed)
6. ✅ Should redirect to `/slots`
7. ✅ New slot should show "Request Quote" and "Contact Owner" badge

**Test Case 3: View Request Quote Slot Details**
1. Click on TEST-200 slot card
2. ✅ Should show "Price on Request"
3. ✅ Should show "Contact Owner" section with phone
4. ✅ Should show "Call Owner" and "Send SMS" buttons
5. ✅ Should NOT show booking form

**Test Case 4: Book Explicit Pricing Slot**
1. Click on TEST-100 slot card
2. ✅ Should show booking form with price `₱75/hr`
3. Fill start time (future date)
4. Fill end time (after start)
5. ✅ Should calculate and display total price
6. Click "Confirm Booking"
7. ✅ Should create booking successfully

**Test Case 5: Attempt to Book Request Quote Slot**
1. Try to manually book TEST-200 via API/database
2. ✅ Database trigger should reject with error:
   ```
   Cannot create instant booking for this slot.
   Please contact the owner to request a quote.
   ```

---

### Phase 4: Deployment (30 minutes)

#### 4.1 Commit Changes

```bash
# Stage all changes
git add db/migrations/
git add app/\(marketplace\)/slots/
git add __tests__/routes/
git add docs/

# Commit
git commit -m "feat: implement hybrid pricing model

- Allow NULL prices for Request Quote slots
- Add pricing type selector in slot creation form
- Update slot listings to show Request Quote badges
- Add Contact Owner flow for request quote slots
- Include database migration and rollback scripts
- Add 50 new test cases for hybrid pricing

Closes #[issue-number]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 4.2 Deploy to Staging

```bash
# Push to staging branch
git push origin parkboard-mvp-optimized

# If using Vercel:
# - Vercel will auto-deploy
# - Wait for deployment to complete
# - Verify at: https://parkboard-staging.vercel.app
```

#### 4.3 Run Database Migration on Production

**⚠️ IMPORTANT: Only after staging testing passes**

1. Open Production Supabase Dashboard → SQL Editor
2. Run `db/migrations/001_hybrid_pricing_model.sql`
3. Verify with verification queries (included in migration file)

#### 4.4 Deploy to Production

```bash
# Merge to main
git checkout main
git merge parkboard-mvp-optimized

# Push to production
git push origin main

# Vercel will auto-deploy to parkboard.app
```

---

## File Replacement Guide

### Quick Reference

| Original File | Hybrid Pricing Version | Action |
|--------------|------------------------|---------|
| `app/(marketplace)/slots/new/page.tsx` | `page_hybrid_pricing.tsx` | Replace |
| `app/(marketplace)/slots/page.tsx` | `page_hybrid_pricing.tsx` | Replace |
| `app/(marketplace)/slots/[slotId]/page.tsx` | `page_hybrid_pricing.tsx` | Replace |
| `db/schema_optimized.sql` | N/A | Run migration |
| N/A | `__tests__/routes/new-slot-hybrid-pricing.test.tsx` | Add |
| N/A | `__tests__/routes/slots-hybrid-pricing.test.tsx` | Add |

### Batch Replacement Script

```bash
#!/bin/bash
# File: scripts/apply-hybrid-pricing.sh

echo "🔧 Applying Hybrid Pricing Model..."

# Backup original files
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp app/\(marketplace\)/slots/new/page.tsx backups/$(date +%Y%m%d_%H%M%S)/
cp app/\(marketplace\)/slots/page.tsx backups/$(date +%Y%m%d_%H%M%S)/
cp app/\(marketplace\)/slots/\[slotId\]/page.tsx backups/$(date +%Y%m%d_%H%M%S)/

# Replace files
cp app/\(marketplace\)/slots/new/page_hybrid_pricing.tsx app/\(marketplace\)/slots/new/page.tsx
cp app/\(marketplace\)/slots/page_hybrid_pricing.tsx app/\(marketplace\)/slots/page.tsx
cp app/\(marketplace\)/slots/\[slotId\]/page_hybrid_pricing.tsx app/\(marketplace\)/slots/\[slotId\]/page.tsx

echo "✅ Files replaced successfully"
echo "📦 Backups saved to: backups/$(date +%Y%m%d_%H%M%S)/"
echo ""
echo "Next steps:"
echo "1. Run database migration in Supabase Dashboard"
echo "2. Run: npm test"
echo "3. Run: npm run dev"
echo "4. Test manually in browser"
```

---

## Testing Instructions

### Automated Tests

```bash
# Full test suite
npm test

# Watch mode (for development)
npm test -- --watch

# Coverage report
npm run test:coverage

# E2E tests (requires dev server)
npm run dev  # Terminal 1
npm run test:e2e  # Terminal 2
```

### Manual Testing Scenarios

#### Scenario 1: New User Creates Request Quote Slot
1. Login as new user
2. Go to "List Your Slot"
3. Choose "Request Quote" pricing
4. Submit form
5. **Expected:** Slot created with NULL price
6. **Expected:** Slot appears in listings with "Request Quote" badge

#### Scenario 2: Existing User Sees Mixed Listings
1. Login
2. Go to "Available Parking Slots"
3. **Expected:** See both explicit pricing and request quote slots
4. **Expected:** Explicit pricing slots appear first (ranking boost)
5. **Expected:** Different badges for each type

#### Scenario 3: User Tries to Book Request Quote Slot
1. Click on request quote slot
2. **Expected:** See "Contact Owner" section
3. **Expected:** No booking form visible
4. **Expected:** "Call Owner" button works
5. **Expected:** Phone number displayed correctly

#### Scenario 4: User Books Explicit Pricing Slot
1. Click on explicit pricing slot
2. Fill booking form
3. **Expected:** Price calculation works
4. Submit booking
5. **Expected:** Booking created successfully
6. **Expected:** Total price matches calculation

---

## Deployment Process

### Environment-Specific Steps

#### Development Environment
```bash
# 1. Run migration locally (if using local Supabase)
supabase db push

# 2. Start dev server
npm run dev

# 3. Test at http://localhost:3000
```

#### Staging Environment
```bash
# 1. Run migration in Staging Supabase Dashboard
# 2. Push code to staging branch
git push origin develop

# 3. Verify deployment
# 4. Run smoke tests
```

#### Production Environment
```bash
# 1. Run migration in Production Supabase Dashboard
# 2. Merge to main branch
git checkout main
git merge develop

# 3. Push to production
git push origin main

# 4. Monitor deployment
# 5. Run production smoke tests
```

### Smoke Tests (Post-Deployment)

```bash
# Test 1: Create explicit pricing slot
curl -X POST https://parkboard.app/api/slots \
  -H "Content-Type: application/json" \
  -d '{"slot_number":"SMOKE-1","price_per_hour":50}'

# Test 2: Create request quote slot
curl -X POST https://parkboard.app/api/slots \
  -H "Content-Type: application/json" \
  -d '{"slot_number":"SMOKE-2","price_per_hour":null}'

# Test 3: List slots (should show both)
curl https://parkboard.app/api/slots
```

---

## Rollback Instructions

### Emergency Rollback (If Something Goes Wrong)

#### Option A: Database Rollback Only (Quick)

**Time:** 5 minutes

```sql
-- Run in Supabase SQL Editor
-- File: db/migrations/001_hybrid_pricing_model_rollback.sql

-- Step 1: Delete any Request Quote slots (if any)
DELETE FROM parking_slots WHERE price_per_hour IS NULL;

-- Step 2: Restore NOT NULL constraint
ALTER TABLE parking_slots
  ALTER COLUMN price_per_hour SET NOT NULL;

-- Step 3: Restore original CHECK constraint
ALTER TABLE parking_slots
  DROP CONSTRAINT IF EXISTS parking_slots_price_check;

ALTER TABLE parking_slots
  ADD CONSTRAINT parking_slots_price_per_hour_check
  CHECK (price_per_hour > 0);

-- Step 4: Restore original trigger
CREATE OR REPLACE FUNCTION calculate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_price_per_hour DECIMAL(10,2);
  v_duration_hours DECIMAL(10,2);
BEGIN
  SELECT price_per_hour INTO v_price_per_hour
  FROM parking_slots WHERE slot_id = NEW.slot_id;

  v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  NEW.total_price := v_price_per_hour * v_duration_hours;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT COUNT(*) FROM parking_slots WHERE price_per_hour IS NULL;
-- Should return 0
```

#### Option B: Full Rollback (Database + Code)

**Time:** 15 minutes

```bash
# 1. Restore backed up files
cp backups/[timestamp]/page.tsx app/\(marketplace\)/slots/new/page.tsx
cp backups/[timestamp]/page.tsx app/\(marketplace\)/slots/page.tsx
cp backups/[timestamp]/page.tsx app/\(marketplace\)/slots/\[slotId\]/page.tsx

# 2. Run database rollback (see Option A above)

# 3. Remove new test files
rm __tests__/routes/new-slot-hybrid-pricing.test.tsx
rm __tests__/routes/slots-hybrid-pricing.test.tsx

# 4. Commit and deploy
git add .
git commit -m "revert: rollback hybrid pricing model"
git push origin main
```

#### Option C: Git Revert (Nuclear Option)

```bash
# Find the commit hash
git log --oneline | grep "hybrid pricing"

# Revert the commit
git revert [commit-hash]

# Push
git push origin main

# Still need to run database rollback (Option A)
```

---

## Troubleshooting

### Issue 1: Migration Fails with "constraint already exists"

**Symptom:**
```
ERROR: constraint "parking_slots_price_check" already exists
```

**Solution:**
```sql
-- Drop existing constraint first
ALTER TABLE parking_slots
  DROP CONSTRAINT IF EXISTS parking_slots_price_check;

-- Then re-run migration
```

---

### Issue 2: Tests Fail After File Replacement

**Symptom:**
```
TypeError: Cannot read property 'price_per_hour' of undefined
```

**Solution:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install

# Run tests again
npm test
```

---

### Issue 3: UI Shows "undefined" Instead of "Request Quote"

**Symptom:**
Slot cards show "undefined/hr" for request quote slots

**Solution:**
Check conditional rendering in slot card:
```tsx
{slot.price_per_hour ? (
  <span>₱{slot.price_per_hour}/hr</span>
) : (
  <span>Request Quote</span>  // This line must exist
)}
```

---

### Issue 4: Booking Fails with "Cannot read property 'price_per_hour' of null"

**Symptom:**
```
Error: Cannot multiply NULL
```

**Solution:**
Verify trigger was updated:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'calculate_booking_price';

-- Should contain: IF v_price_per_hour IS NULL THEN
```

If not, re-run migration step 2.

---

### Issue 5: Price Input Always Visible (Doesn't Hide)

**Symptom:**
Selecting "Request Quote" doesn't hide price input

**Solution:**
Check conditional rendering in create form:
```tsx
{formData.pricing_type === 'explicit' && (
  <div>
    <label>Price Per Hour</label>
    <Input ... />
  </div>
)}
```

Ensure `pricing_type` state is being updated:
```tsx
onChange={(e) => setFormData({ ...formData, pricing_type: 'request_quote' })}
```

---

### Issue 6: "Contact Owner" Button Doesn't Work

**Symptom:**
Clicking "Call Owner" or "Send SMS" does nothing

**Solution:**
Check button onClick handlers:
```tsx
onClick={() => window.location.href = `tel:${slot.user_profiles?.phone}`}
onClick={() => window.location.href = `sms:${slot.user_profiles?.phone}`}
```

Verify phone number exists:
```tsx
{slot.user_profiles?.phone}  // Use optional chaining
```

---

## Success Criteria

### Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] All 208 tests passing (158 existing + 50 new)
- [ ] Can create slot with explicit pricing
- [ ] Can create slot with request quote
- [ ] Explicit pricing slots show price and "Book Now" button
- [ ] Request quote slots show "Request Quote" and "Contact Owner"
- [ ] Booking works for explicit pricing slots
- [ ] Booking blocked for request quote slots (trigger error)
- [ ] Contact owner buttons work (tel: and sms: links)
- [ ] No console errors in browser
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Existing slots still show prices correctly
- [ ] Rollback script tested and works

---

## Support and Next Steps

### If You Need Help

1. **Check logs:**
   ```bash
   # Browser console (F12)
   # Supabase Dashboard → Logs
   # Vercel Dashboard → Logs
   ```

2. **Review documentation:**
   - `HYBRID_PRICING_ANALYSIS_20251013.md` - Original analysis
   - `HYBRID_PRICING_IMPLEMENTATION_20251013.md` - This file

3. **Test in isolation:**
   ```bash
   # Test specific component
   npm test -- new-slot-hybrid-pricing --verbose
   ```

### Optional Enhancements (Post-MVP)

After successful deployment, consider:

1. **Analytics tracking:**
   - Track % of request quote vs explicit pricing
   - Track conversion rates

2. **Search ranking improvements:**
   - Add database view for pre-computed ranking
   - Add filter: "Instant Booking Only"

3. **Enhanced UI:**
   - Add "Verified Listing" badge for explicit pricing
   - Add hover tooltips explaining pricing types

4. **Admin dashboard:**
   - Metrics on pricing type adoption
   - Revenue tracking (explicit pricing only)

---

**Last Updated:** 2025-10-13
**Version:** 1.0.0
**Status:** ✅ Ready for Deployment

