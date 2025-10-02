# 🧪 ParkBoard Marketplace - Manual Testing Plan & Debug Guide

## 📊 Testing Coverage Matrix - Viber Migration Focus

| Feature | Priority | Risk Level | Source Files | Database Dependencies | Viber Pain Point |
|---------|----------|------------|--------------|----------------------|------------------|
| **Search Speed** | 🔴 Critical | High | `app/marketplace/page.tsx` | `parking_slots` (read) | 5+ min scrolling |
| **"Available NOW"** | 🔴 Critical | High | `app/owner/setup/page.tsx` | `parking_slots`, timestamps | Urgent postings |
| **Complex Schedule** | 🔴 Critical | High | `app/owner/page.tsx` | `parking_slots`, availability | Mary Lou's nightmare |
| **No PM Needed** | 🔴 Critical | Medium | `app/marketplace/[slotId]/page.tsx` | `bookings` | "PM me" overload |
| Onboarding Flow | 🟡 Important | Medium | `app/onboarding/page.tsx` | `user_profiles` | New user confusion |
| Location Tags | 🟡 Important | Low | `app/marketplace/page.tsx` | `parking_slots.description` | "Near elevator" |
| Viber Migration | 🟢 Nice-to-have | Low | `app/onboarding/page.tsx` | `user_profiles.viber_member` | Trust preservation |

---

## 🚨 Critical Pain Points & Brittle Areas

### **1. Database Migration Dependency** ⚠️ HIGHEST RISK
**File:** `db/migrations/007_marketplace_model.sql`
```sql
-- MUST RUN BEFORE ANY TESTING
-- Common failure: RLS policies not created
```
**Debug Check:**
```sql
-- Verify migration success
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'parking_slots' 
AND column_name = 'is_listed_for_rent';
-- Expected: 1

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('parking_slots', 'slot_earnings', 'slot_rental_settings');
-- Expected: rowsecurity = true for all
```

### **2. User Profile Creation Race Condition** ⚠️ HIGH RISK
**File:** `app/onboarding/page.tsx`
```typescript
// LINE ~45-55 - REVIEW THIS SECTION
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// BRITTLE: Profile might not exist yet
if (!profile) {
  // Need retry logic or create profile here
}
```
**Fix Required:** Add profile creation if missing

### **3. Slot Owner Verification** ⚠️ MEDIUM RISK
**File:** `components/common/Navigation.tsx`
```typescript
// LINE ~30-40 - REVIEW THIS SECTION
const { data: ownedSlots } = await supabase
  .from('parking_slots')
  .select('slot_id')
  .eq('owner_id', user.id);

// BRITTLE: Network timeout = no owner links shown
const isOwner = ownedSlots && ownedSlots.length > 0;
```
**Fix Required:** Add loading state and retry logic

### **4. Complex Availability Windows** ⚠️ HIGH RISK (NEW)
**File:** `app/owner/setup/page.tsx` and `app/owner/page.tsx`
```typescript
// LINE ~120-150 - COMPLEX SCHEDULES LIKE MARY LOU'S
// PROBLEM: "Oct 22, 12am-7am only" type patterns
const availability = {
  recurring: [], // Not implemented
  exceptions: [], // Not implemented
  timeWindows: [] // Single window only
};

// BRITTLE: Can't handle multiple windows per day
```
**Fix Required:** Add recurring patterns, blackout dates, multiple daily windows

### **5. Concurrent Booking Race Condition** ⚠️ CRITICAL
**File:** `app/marketplace/[slotId]/page.tsx`
```typescript
// LINE ~220-250 - REVIEW THIS SECTION
// PROBLEM: Two users booking same slot simultaneously
const { error: bookingError } = await supabase
  .from('bookings')
  .insert({...});

// Database constraint will catch overlap but UX is poor
```
**Fix Required:** Implement optimistic locking or slot reservation

---

## ✅ Manual Testing Checklist - Viber Migration MVP
<!-- priority: 2025103-0812 -->


### **🚀 Test Flow 0: Viber Migration Speed Test (NEW - CRITICAL)**

#### **0.1 Search Speed Comparison**
- [ ] **Baseline:** Time how long to find "P6 North Tower near elevator" in Viber (expect 3-5 min)
- [ ] **Test:** Same search in marketplace
- [ ] **Success Criteria:** < 10 seconds
- [ ] **File:** `app/marketplace/page.tsx`
- [ ] **Metrics to Log:**
  ```sql
  -- Query performance check
  EXPLAIN ANALYZE
  SELECT * FROM parking_slots 
  WHERE description ILIKE '%north%tower%' 
  AND description ILIKE '%elevator%';
  ```

#### **0.2 "Available NOW" Quick Post**
- [ ] **Test:** Owner posts immediate availability
- [ ] **Input:** Click "Available NOW" → Set end time "10 PM"
- [ ] **Verify:** Appears at top of marketplace instantly
- [ ] **File:** `app/owner/setup/page.tsx` (quick actions)
- [ ] **Auto-expire:** Check listing disappears after 10 PM

#### **0.3 Complex Schedule (Mary Lou Scenario)**
- [ ] **Test:** Create availability:
  ```
  Oct 13: 1pm onwards
  Oct 14: until 2pm only
  Oct 22: 12am-7am only
  Oct 25-31: whole day
  ```
- [ ] **Verify:** Each window displays correctly
- [ ] **File:** `app/owner/page.tsx` (schedule management)
- [ ] **Known Issue:** System may not support all patterns yet

#### **0.4 Zero PM Burden Test**
- [ ] **Test:** Complete booking without any PM
- [ ] **Verify:** All info visible in listing (price, location, availability)
- [ ] **Verify:** Booking confirmation immediate
- [ ] **Verify:** Owner sees booking in dashboard (no PM needed)
- [ ] **Success:** Zero private messages required

### **🔄 Test Flow 1: Viber Member Quick Migration (REVISED)**

#### **1.1 Recognition for Existing Viber Members**
- [ ] **Test:** Sign up with known Viber member email
- [ ] **Verify:** Shows "Welcome back from LMR Parking!"
- [ ] **File:** `app/onboarding/page.tsx` (lines 30-40)
- [ ] **SQL Check:**
  ```sql
  -- Pre-seed known Viber members
  UPDATE user_profiles 
  SET viber_member = true, 
      viber_nickname = 'KC' 
  WHERE email = 'kc@gmail.com';
  ```

#### **1.2 Slot Naming Fix**
- [ ] **Test:** Create slot with DMCI's confusing "P6"
- [ ] **System:** Auto-suggests "P6-NT-001" format
- [ ] **Verify:** Location tags added ("North Tower, near elevator")
- [ ] **File:** `app/owner/setup/page.tsx`
- [ ] **Value:** Solves "which P6?" confusion

#### **1.2 Owner Selection**
- [ ] **Test:** Click "Yes, I own a parking slot"
- [ ] **Verify:** Updates profile with `user_type = 'owner'`
- [ ] **File:** `app/onboarding/page.tsx` (lines 60-80)
- [ ] **Debug SQL:**
  ```sql
  SELECT user_type FROM user_profiles WHERE email = 'test@example.com';
  -- Expected: 'owner'
  ```

#### **1.3 Slot Setup**
- [ ] **Test:** Click "List my parking slot"
- [ ] **Verify:** Form loads with all fields
- [ ] **File:** `app/owner/setup/page.tsx`
- [ ] **Test Data:**
  ```
  Slot Number: A-101
  Type: covered
  Hourly Rate: 50
  Daily Rate: 400
  Description: Test slot near entrance
  ```
- [ ] **Debug SQL:**
  ```sql
  SELECT * FROM parking_slots WHERE slot_number = 'A-101';
  ```

#### **1.4 Owner Dashboard**
- [ ] **Test:** View owner dashboard after setup
- [ ] **Verify:** Shows created slot with toggle
- [ ] **File:** `app/owner/page.tsx`
- [ ] **Test:** Toggle listing on/off
- [ ] **Debug SQL:**
  ```sql
  SELECT slot_id, is_listed_for_rent FROM parking_slots WHERE owner_id = '...';
  ```

#### **1.5 Edit Slot**
- [ ] **Test:** Click edit icon on slot
- [ ] **Verify:** Form pre-fills with current data
- [ ] **File:** `app/owner/slots/[slotId]/edit/page.tsx`
- [ ] **Test:** Change price to 60/hour
- [ ] **Debug SQL:**
  ```sql
  SELECT rental_rate_hourly FROM parking_slots WHERE slot_id = X;
  -- Expected: 60.00
  ```

### **🔄 Test Flow 2: Renter Journey**

#### **2.1 Sign Up & Onboarding**
- [ ] **Test:** Sign up with different email
- [ ] **Verify:** Redirects to `/onboarding`
- [ ] **File:** `app/onboarding/page.tsx`

#### **2.2 Renter Selection**
- [ ] **Test:** Click "No, I want to rent"
- [ ] **Verify:** Updates profile with `user_type = 'renter'`
- [ ] **Debug SQL:**
  ```sql
  SELECT user_type FROM user_profiles WHERE email = 'renter@example.com';
  -- Expected: 'renter'
  ```

#### **2.3 Browse Marketplace**
- [ ] **Test:** View marketplace page
- [ ] **Verify:** Shows slot A-101 from owner test
- [ ] **File:** `app/marketplace/page.tsx`
- [ ] **Test Filters:**
  - [ ] Filter by "Covered" only
  - [ ] Sort by "Price: Low to High"
  - [ ] Search for "A-101"

#### **2.4 View Slot Details**
- [ ] **Test:** Click on slot A-101
- [ ] **Verify:** Shows owner info, price, description
- [ ] **File:** `app/marketplace/[slotId]/page.tsx`
- [ ] **Check:** Instructions section visible

#### **2.5 Create Booking**
- [ ] **Test:** Book slot for tomorrow, 2 hours
- [ ] **Input:**
  ```
  Start: Tomorrow 10:00 AM
  End: Tomorrow 12:00 PM
  ```
- [ ] **Verify:** Cost shows ₱120 (2 × ₱60)
- [ ] **File:** `app/marketplace/[slotId]/page.tsx` (lines 180-250)
- [ ] **Debug SQL:**
  ```sql
  SELECT * FROM bookings WHERE renter_id = '...' ORDER BY created_at DESC LIMIT 1;
  SELECT * FROM slot_earnings WHERE slot_id = X ORDER BY created_at DESC LIMIT 1;
  ```

### **🔄 Test Flow 3: Edge Cases**

### **🔄 Test Flow 3: Viber-Specific Edge Cases (REVISED)**

#### **3.1 Multiple Same-Name Slots (P6 Problem)**
- [ ] **Test:** Create multiple "P6" slots
- [ ] **Expected:** System enforces unique naming
- [ ] **Suggested format:** "P6-NT-001", "P6-ST-001"
- [ ] **File:** `app/owner/setup/page.tsx` validation

#### **3.2 Language Mix Support**
- [ ] **Test:** Use "LF parking" in search
- [ ] **Verify:** Recognizes "LF" = "Looking For"
- [ ] **Test:** Add "po" in messages
- [ ] **Verify:** Preserves respectful tone

#### **3.3 Time Ambiguity Prevention**
- [ ] **Test:** Try posting "available now"
- [ ] **System:** Forces specific end time
- [ ] **Test:** Try "until next week"
- [ ] **System:** Shows date picker

#### **3.4 PM Overload Metric**
- [ ] **Test:** Track PM reduction
- [ ] **Before:** 3-5 PMs per booking (Viber)
- [ ] **After:** 0 PMs needed
- [ ] **Success Metric:** 100% PM elimination

#### **3.5 Trust Signal Preservation**
- [ ] **Test:** Viber member badge visible
- [ ] **Shows:** "LMR Parking member"
- [ ] **Test:** Phone number field (optional)
- [ ] **Purpose:** Fallback trust for first-timers

---

## 🔍 Database Debug Queries

### **Quick Health Check**
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parking_slots', 'bookings', 'slot_earnings', 'slot_rental_settings', 'user_profiles')
ORDER BY table_name;
-- Expected: 5 rows

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('parking_slots', 'bookings', 'slot_earnings')
ORDER BY tablename;
-- Expected: rowsecurity = true for all

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'calculate_booking_cost';
-- Expected: 1 row
```

### **User State Inspection**
```sql
-- Get user overview
WITH user_data AS (
  SELECT id, email FROM auth.users WHERE email = 'test@example.com'
)
SELECT 
  u.email,
  p.user_type,
  p.full_name,
  COUNT(DISTINCT s.slot_id) as owned_slots,
  COUNT(DISTINCT b.booking_id) as total_bookings
FROM user_data u
LEFT JOIN user_profiles p ON p.id = u.id
LEFT JOIN parking_slots s ON s.owner_id = u.id
LEFT JOIN bookings b ON b.renter_id = u.id
GROUP BY u.email, p.user_type, p.full_name;
```

### **Marketplace State**
```sql
-- Check marketplace inventory
SELECT 
  slot_number,
  is_listed_for_rent,
  status,
  rental_rate_hourly,
  rental_rate_daily,
  owner_id IS NOT NULL as has_owner
FROM parking_slots
ORDER BY is_listed_for_rent DESC, slot_number;

-- Active bookings check
SELECT 
  b.booking_id,
  ps.slot_number,
  b.start_time,
  b.end_time,
  b.total_cost,
  b.status
FROM bookings b
JOIN parking_slots ps ON ps.slot_id = b.slot_id
WHERE b.end_time > NOW()
ORDER BY b.start_time;
```

---

## 🛠️ Code Review Checklist

### **Priority 1: Security Reviews**
- [ ] **File:** `app/owner/setup/page.tsx`
  - [ ] Line 80-100: SQL injection prevention in slot creation
  - [ ] Line 120-130: Rate limiting on form submission

- [ ] **File:** `app/marketplace/[slotId]/page.tsx`
  - [ ] Line 200-220: Booking cost validation (no negative values)
  - [ ] Line 240-250: User authorization check before booking

### **Priority 2: Data Integrity**
- [ ] **File:** `app/owner/page.tsx`
  - [ ] Line 60-70: Ensure slot owner matches current user
  - [ ] Line 100-110: Prevent deletion of slots with active bookings

- [ ] **File:** `app/owner/settings/page.tsx`
  - [ ] Line 80-90: Validate min/max booking duration logic

### **Priority 3: UX Improvements**
- [ ] **All Files:** Add loading states during data fetches
- [ ] **All Forms:** Add client-side validation before submission
- [ ] **All Lists:** Add empty states with clear CTAs

---

## 🎯 Success Metrics - Viber Migration

### **Primary KPIs (Week 1)**
```markdown
METRIC: Search Time Reduction
- Viber Baseline: 3-5 minutes scrolling
- ParkBoard Target: < 10 seconds
- Success: 95% reduction in discovery time

METRIC: PM Elimination  
- Viber Baseline: 3-5 PMs per booking
- ParkBoard Target: 0 PMs
- Success: 100% PM reduction

METRIC: Booking Completion Rate
- Viber Baseline: ~60% (lost in chat/gave up)
- ParkBoard Target: > 90%
- Success: 50% improvement

METRIC: Active Migration
- Week 1: 10+ owners list slots
- Week 2: 50+ active bookings
- Month 1: 50% of Viber members joined
```

### **Revenue Validation**
```sql
-- Verify owners make more than DMCI's ₱3,000/month
SELECT 
  owner_id,
  COUNT(*) * 150 as estimated_daily_revenue, -- ₱150/day average
  COUNT(*) * 150 * 30 as estimated_monthly -- Should be > ₱3,000
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.created_at > NOW() - INTERVAL '30 days'
GROUP BY owner_id
HAVING COUNT(*) * 150 * 30 > 3000;
```

### **Viber Pain Point Resolution**
| Pain Point | Test Validation | Success Criteria |
|------------|----------------|------------------|
| "Which P6?" | Unique slot naming | 0 confusion |
| "PM me" spam | In-app booking | 0 PMs needed |
| Lost messages | Persistent listings | 100% visible |
| Complex schedules | Time windows | All patterns supported |
| "Available NOW" | Quick post feature | < 30 seconds to list |

---

## 📝 Test Execution Checklist

### **Pre-Launch (Before Viber Announcement)**
- [ ] Seed 10 known Viber members as test users
- [ ] Create realistic slot inventory (P1-P6, NT/ST)
- [ ] Test "Available NOW" quick posting
- [ ] Verify 10-second search performance
- [ ] Confirm zero-PM booking flow

### **Soft Launch Week 1**
- [ ] Monitor first 10 real bookings
- [ ] Track search time metrics
- [ ] Count PM reduction
- [ ] Get owner feedback on time saved
- [ ] Document any "Mary Lou" complex schedules

### **Scale-up Week 2-4**
- [ ] Performance test with 100+ active slots
- [ ] Monitor database query times
- [ ] Track mobile loading speed
- [ ] Measure Viber chat volume reduction
- [ ] First "buy coffee" conversion

---

## ⚡ Quick Debug Commands - Viber Migration

```bash
# Check Viber member migration status
psql -c "SELECT COUNT(*) FROM user_profiles WHERE viber_member = true"

# Verify search performance
psql -c "EXPLAIN ANALYZE SELECT * FROM parking_slots WHERE description ILIKE '%elevator%'"

# Check booking success rate
psql -c "SELECT 
  DATE(created_at) as day,
  COUNT(*) as bookings,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM bookings 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)"

# PM burden check (should be 0)
psql -c "SELECT COUNT(*) FROM messages WHERE type = 'private_message'" 
# Expected: Table doesn't exist - we don't do PMs!
```