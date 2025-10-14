# ParkBoard - Multi-Tenant Architecture: Community-Based URLs
**Date:** 2025-10-13
**Use Case:** `/LMR` suffix identifies condo community (Lumiere)
**Future:** `/XYZ` for other communities (e.g., `/SRP` = Serendra, `/BGC` = BGC condos)

---

## Executive Summary

**New Understanding:**
- `/LMR` = Lumiere condo community identifier
- Future: Multiple communities, each with own code
- Example URLs:
  - `parkboard.app/LMR` - Lumiere residents
  - `parkboard.app/SRP` - Serendra residents
  - `parkboard.app/BGC` - BGC residents

**Architecture Required:** Multi-tenant with path-based community routing

---

## Part 1: Multi-Tenant Architecture Options

### Option A: Path-Based Routing (Your Current Plan) ⭐

**URL Structure:**
```
https://parkboard.app/LMR/slots
https://parkboard.app/LMR/bookings
https://parkboard.app/SRP/slots
https://parkboard.app/BGC/slots
```

**Advantages:**
- ✅ Clear community identification
- ✅ Single codebase for all communities
- ✅ Easy to add new communities
- ✅ Users know which community they're in
- ✅ Good for branding (`parkboard.app/[CommunityCode]`)

**Challenges:**
- ⚠️ Requires Next.js basePath configuration per deploy
- ⚠️ OR dynamic routing with community detection
- ⚠️ Database must segregate community data
- ⚠️ Authentication needs community context

**Best For:** Shared infrastructure, many communities

---

### Option B: Subdomain-Based (Alternative)

**URL Structure:**
```
https://lmr.parkboard.app/slots
https://srp.parkboard.app/slots
https://bgc.parkboard.app/slots
```

**Advantages:**
- ✅ Clean URLs (no path prefix)
- ✅ Easy subdomain detection
- ✅ Can deploy separate instances per community
- ✅ Better SSL certificate management

**Challenges:**
- ⚠️ More DNS configuration per community
- ⚠️ Less obvious branding
- ⚠️ Subdomain limits on some DNS providers

**Best For:** Independent communities, separate deployments

---

### Option C: Query Parameter (Not Recommended)

**URL Structure:**
```
https://parkboard.app/slots?community=LMR
https://parkboard.app/slots?community=SRP
```

**Advantages:**
- ✅ Simple to implement

**Challenges:**
- ❌ Easy to manipulate
- ❌ Poor for bookmarking
- ❌ Not good for branding
- ❌ SEO unfriendly

**Verdict:** ❌ Don't use for production

---

## Part 2: Recommended Architecture (Path-Based)

### 🎯 **Multi-Tenant Path-Based Routing**

**Why This Works Best:**
1. `parkboard.app/LMR` is clear branding
2. Easy to explain to users ("Visit parkboard.app/LMR")
3. Single codebase scales to many communities
4. Database can segregate by community_code
5. Matches your vision

---

### Implementation Approach

#### **Option 2A: Dynamic Path Routing (Recommended)**

**URL Pattern:**
```
/[community_code]/[route]
```

**File Structure:**
```
app/
├── [community]/          # Dynamic community segment
│   ├── slots/
│   │   ├── page.tsx     # /LMR/slots
│   │   └── [slotId]/
│   │       └── page.tsx  # /LMR/slots/123
│   ├── bookings/
│   │   └── page.tsx     # /LMR/bookings
│   ├── layout.tsx       # Community-specific layout
│   └── page.tsx         # /LMR (community landing)
├── page.tsx             # / (root - community selector)
└── layout.tsx           # Global layout
```

**How It Works:**
```typescript
// app/[community]/layout.tsx
export default function CommunityLayout({
  params
}: {
  params: { community: string }
}) {
  const community = params.community.toUpperCase() // 'LMR'

  // Validate community exists
  // Set context for all child pages

  return (
    <CommunityProvider value={community}>
      {children}
    </CommunityProvider>
  )
}

// app/[community]/slots/page.tsx
'use client'
export default function SlotsPage() {
  const community = useCommunity() // 'LMR'

  // Fetch slots filtered by community
  const { data } = await supabase
    .from('parking_slots')
    .select('*')
    .eq('community_code', community)
    .eq('status', 'active')
}
```

**Advantages:**
- ✅ No code changes per community
- ✅ Dynamic routing built into Next.js
- ✅ Easy to add communities (just database config)
- ✅ SEO friendly

---

#### **Option 2B: Static basePath per Deployment (Alternative)**

**Deployment Structure:**
```
Deployment 1 (LMR):
  basePath: '/LMR'
  URL: parkboard.app/LMR

Deployment 2 (SRP):
  basePath: '/SRP'
  URL: parkboard.app/SRP
```

**Configuration:**
```javascript
// next.config.js
module.exports = {
  basePath: process.env.COMMUNITY_BASE_PATH, // '/LMR'
  // ... other config
}
```

**Advantages:**
- ✅ Simple to implement
- ✅ Separate deployments per community

**Disadvantages:**
- ❌ Requires separate Vercel project per community
- ❌ More deployment overhead
- ❌ Harder to manage as you scale

**Verdict:** Use Option 2A (Dynamic Routing) instead

---

## Part 3: Database Schema for Multi-Tenancy

### Required Changes

#### **Add Community Context**

```sql
-- New table: communities
CREATE TABLE communities (
  community_code TEXT PRIMARY KEY,  -- 'LMR', 'SRP', 'BGC'
  name TEXT NOT NULL,               -- 'Lumiere', 'Serendra'
  display_name TEXT NOT NULL,       -- 'Lumiere Residences'
  address TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'Asia/Manila',
  settings JSONB DEFAULT '{}',      -- Community-specific config
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update user_profiles
ALTER TABLE user_profiles
  ADD COLUMN community_code TEXT REFERENCES communities(community_code);

-- Update parking_slots
ALTER TABLE parking_slots
  ADD COLUMN community_code TEXT REFERENCES communities(community_code);

-- Bookings inherit community from slots (no change needed)

-- Sample data
INSERT INTO communities (community_code, name, display_name, address) VALUES
  ('LMR', 'Lumiere', 'Lumiere Residences', 'Pasig City, Metro Manila');
```

---

### Row Level Security (RLS) Updates

```sql
-- Users only see data from their community
CREATE POLICY "community_isolation_users" ON user_profiles
  FOR SELECT
  USING (community_code = current_setting('app.current_community')::TEXT);

-- Slots filtered by community
CREATE POLICY "community_isolation_slots" ON parking_slots
  FOR SELECT
  USING (community_code = current_setting('app.current_community')::TEXT);

-- Bookings inherit community context
CREATE POLICY "community_isolation_bookings" ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parking_slots
      WHERE parking_slots.slot_id = bookings.slot_id
        AND parking_slots.community_code = current_setting('app.current_community')::TEXT
    )
  );
```

---

### Setting Community Context

```typescript
// lib/supabase/community.ts
export async function setCommunityContext(
  supabase: SupabaseClient,
  communityCode: string
) {
  await supabase.rpc('set_community_context', {
    p_community_code: communityCode
  })
}

// SQL function
CREATE OR REPLACE FUNCTION set_community_context(p_community_code TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_community', p_community_code, false);
END;
$$ LANGUAGE plpgsql;
```

---

## Part 4: Implementation Plan

### Phase 1: Single Community (LMR) - 3-4 hours

**Goal:** Get `/LMR` working with existing features

**Steps:**
```bash
# 1. Create dynamic routing structure (30 min)
mkdir -p app/\[community\]
mv app/\(marketplace\)/* app/\[community\]/
# Move slots, bookings to [community] folder

# 2. Add community context (45 min)
# Create CommunityProvider
# Update all queries to filter by community

# 3. Create community selector (30 min)
# app/page.tsx - redirect to /LMR for now

# 4. Update middleware (30 min)
# Validate community code
# Redirect invalid communities

# 5. Test (60 min)
# Visit /LMR/slots
# Verify data isolation
# Test all features
```

**Deliverable:** `parkboard.app/LMR` works, ready for Lumiere testing

---

### Phase 2: Database Multi-Tenancy - 2-3 hours

**Goal:** Prepare database for multiple communities

**Steps:**
```bash
# 1. Create communities table (15 min)
# 2. Add community_code columns (30 min)
# 3. Migrate existing data to LMR (30 min)
# 4. Update RLS policies (45 min)
# 5. Test data isolation (30 min)
```

**Deliverable:** Database ready for multi-community

---

### Phase 3: Add Second Community - 1 hour

**Goal:** Validate multi-tenant architecture

**Steps:**
```bash
# 1. Add SRP to communities table (5 min)
# 2. Create test user in SRP (10 min)
# 3. Test /SRP/slots (15 min)
# 4. Verify data isolation (30 min)
```

**Deliverable:** Proof of concept for multiple communities

---

## Part 5: Updated Deployment Strategy

### For LMR Launch Today (5-9 hours)

**Timeline Adjustment:**

```
Hour 1-2: Multi-Tenant Setup (3-4 hours total)
  [45 min] Create [community] dynamic routing
  [45 min] Add CommunityProvider & context
  [30 min] Update all queries for community filter
  [30 min] Update middleware for community validation
  [60 min] Test /LMR routes

Hour 3: Database Changes (1 hour)
  [15 min] Create communities table
  [30 min] Add community_code columns
  [15 min] Seed LMR data

Hour 4-5: Fix ESLint + Hybrid Pricing (1-2 hours)
  [30 min] ESLint warnings
  [60 min] Complete hybrid pricing

Hour 6: Vercel Setup (1 hour)
  [same as before]

Hour 7: Testing (1 hour)
  [30 min] Test /LMR/slots, /LMR/bookings
  [30 min] Verify community isolation

Total: 7-9 hours (adjusted for multi-tenancy)
```

---

### URL Structure for Testing

**Staging:**
```
https://staging.parkboard.app/LMR/slots
https://staging.parkboard.app/LMR/bookings
```

**Production (Future):**
```
https://parkboard.app/LMR/slots        (Lumiere)
https://parkboard.app/SRP/slots        (Serendra)
https://parkboard.app/BGC/slots        (BGC)
https://parkboard.app/                 (Community selector)
```

---

## Part 6: Community Branding Features

### Per-Community Customization

**What Can Be Customized:**
```typescript
// communities.settings JSONB
{
  "branding": {
    "primaryColor": "#1a56db",
    "logo": "/assets/lmr-logo.png",
    "tagline": "Park smarter at Lumiere"
  },
  "features": {
    "requestQuote": true,
    "instantBooking": true,
    "guestParking": false
  },
  "contact": {
    "email": "parking@lumiere.com",
    "phone": "+63 2 1234 5678"
  },
  "rules": {
    "maxBookingDays": 30,
    "cancellationHours": 24,
    "requiresApproval": false
  }
}
```

**Usage in UI:**
```typescript
// app/[community]/layout.tsx
const community = await getCommunitySettings('LMR')

<div style={{
  '--primary-color': community.settings.branding.primaryColor
}}>
  <Logo src={community.settings.branding.logo} />
  <h1>{community.settings.branding.tagline}</h1>
</div>
```

---

### Community Landing Page

**URL:** `parkboard.app/LMR`

**Content:**
```
┌─────────────────────────────────────┐
│  [Lumiere Logo]                     │
│                                     │
│  Welcome to Lumiere Parking         │
│  Share parking with your neighbors  │
│                                     │
│  [Browse Available Slots]           │
│  [List Your Slot]                   │
│  [My Bookings]                      │
│                                     │
│  Active Slots: 12                   │
│  Available Now: 5                   │
└─────────────────────────────────────┘
```

---

## Part 7: Revised Architecture Diagram

### Current Structure (Before)
```
parkboard.app
├── /slots              (all communities mixed)
├── /bookings           (all communities mixed)
└── /slots/new          (all communities mixed)
```

### New Structure (After)
```
parkboard.app
├── /                   (Community selector / Landing)
│
├── /LMR                (Lumiere community)
│   ├── /slots          (Lumiere slots only)
│   ├── /bookings       (Lumiere bookings only)
│   ├── /slots/new      (List in Lumiere)
│   └── /slots/[id]     (Lumiere slot detail)
│
├── /SRP                (Serendra community)
│   ├── /slots          (Serendra slots only)
│   ├── /bookings       (Serendra bookings only)
│   └── ...
│
└── /BGC                (BGC community)
    └── ...
```

---

## Part 8: Migration Strategy

### Existing Data Migration

**Current Database:**
- Users have no community
- Slots have no community
- Bookings are global

**Migration Plan:**
```sql
-- Step 1: Create communities table
-- (Already shown above)

-- Step 2: Add columns (nullable initially)
ALTER TABLE user_profiles
  ADD COLUMN community_code TEXT;

ALTER TABLE parking_slots
  ADD COLUMN community_code TEXT;

-- Step 3: Backfill LMR for existing data
UPDATE user_profiles
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

UPDATE parking_slots
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

-- Step 4: Make NOT NULL after backfill
ALTER TABLE user_profiles
  ALTER COLUMN community_code SET NOT NULL;

ALTER TABLE parking_slots
  ALTER COLUMN community_code SET NOT NULL;

-- Step 5: Add foreign keys
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_community
  FOREIGN KEY (community_code)
  REFERENCES communities(community_code);

ALTER TABLE parking_slots
  ADD CONSTRAINT fk_slot_community
  FOREIGN KEY (community_code)
  REFERENCES communities(community_code);
```

---

## Part 9: Testing Multi-Tenancy

### Data Isolation Tests

**Test Scenario 1: User sees only their community**
```typescript
// User in LMR should NOT see SRP slots
const lmrUser = await login('lmr-user@test.com')
const slots = await getSlots('LMR')
// Assert: All slots have community_code = 'LMR'
```

**Test Scenario 2: URL manipulation protection**
```typescript
// LMR user tries to access /SRP/slots
const response = await fetch('/SRP/slots')
// Assert: Redirected or 403 Forbidden
```

**Test Scenario 3: Bookings isolated**
```typescript
// Create booking in LMR
// Try to view from SRP user
// Assert: Booking not visible
```

---

## Part 10: Revised Deployment Checklist

### Multi-Tenant Specific Items

```bash
PRE-DEPLOYMENT
[ ] Community code decided (LMR confirmed)
[ ] Community branding prepared (logo, colors)
[ ] Database migration script tested
[ ] Multi-tenant routing implemented
[ ] Community context provider created
[ ] RLS policies updated for communities
[ ] Data isolation tested

DEPLOYMENT
[ ] Run communities table creation
[ ] Migrate existing data to LMR
[ ] Deploy with [community] routing
[ ] Test /LMR/slots
[ ] Test /LMR/bookings
[ ] Verify other communities blocked
[ ] Test community selector page

POST-DEPLOYMENT
[ ] Document how to add new communities
[ ] Create admin guide for community setup
[ ] Test with LMR users
[ ] Prepare for second community (SRP?)
```

---

## Part 11: Future Roadmap

### Adding New Communities (After LMR Success)

**Per-Community Setup (15 minutes):**
```sql
-- 1. Add to database
INSERT INTO communities VALUES ('SRP', 'Serendra', ...);

-- 2. Create test user
-- Via registration or SQL

-- 3. Test URL
Visit: parkboard.app/SRP

-- Done! No code changes needed.
```

---

### Advanced Features (Future)

**Community Admin Dashboard:**
- Manage community settings
- View analytics
- Approve new members
- Configure rules

**Cross-Community Features:**
- Guest parking (LMR user parks in SRP)
- Community partnerships
- Shared pricing models

**White-Label Option:**
- Each community gets own domain
- `parking.lumiere.com` → parkboard.app/LMR
- Full branding control

---

## Conclusion & Recommendations

### 🎯 **REVISED RECOMMENDATION**

**For LMR Launch (7-9 hours today):**

1. ✅ **Use `/LMR` path** (correct for branding)
2. ✅ **Implement dynamic routing** (`app/[community]`)
3. ✅ **Add community database fields**
4. ✅ **Deploy to staging.parkboard.app/LMR**
5. ✅ **Test thoroughly with LMR context**

**URL Structure:**
```
Staging:     https://staging.parkboard.app/LMR
Production:  https://parkboard.app/LMR (when ready)
```

**Why This Works:**
- Matches your branding vision
- Scales to multiple communities
- Clean implementation
- Future-proof architecture

---

### 📊 **Updated Timeline**

**Original Estimate:** 5-7 hours
**With Multi-Tenancy:** 7-9 hours

**Additional Time:**
- Dynamic routing setup: +1 hour
- Database community fields: +1 hour
- Community context provider: +30 min
- Testing data isolation: +30 min

**Total:** 7-9 hours (still fits your timeline)

---

### ✅ **Approval Request (Updated)**

Confirming understanding:

```
URL STRUCTURE
[ ] Approved: parkboard.app/LMR (with /LMR path)
[ ] Approved: Dynamic [community] routing
[ ] Approved: staging.parkboard.app/LMR for testing
[ ] Understood: /LMR = Lumiere branding

ARCHITECTURE
[ ] Approved: Multi-tenant with community_code
[ ] Approved: Database changes for communities
[ ] Approved: RLS for data isolation
[ ] Understood: Scales to /SRP, /BGC, etc.

TIMELINE
[ ] Confirmed: 7-9 hours for LMR + multi-tenant
[ ] Confirmed: Can add more communities later (15 min each)
```

---

**Ready to implement multi-tenant architecture with `/LMR` path?** Say "approved" to proceed with revised plan.

