# ParkBoard Minimal MVP Redesign

**Created:** 2025-10-26
**Created By:** Root Instance (claude-config)
**For:** Parkboard Instance Execution
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

**Problem:** Current ParkBoard production build is over-engineered for an MVP targeting a single community (Lumiere Residences, 1,655 members). The UI contains corporate marketing fluff (fake testimonials, pricing cards, multi-community selector) that doesn't match the simple, community-focused use case.

**Original User Request (Sister - Elen Peli, 2024-10-11):**
> "Can you make a simple use app for a small community for booking available parking space within the building? Right now dito sa lumiere we're just relying sa Viber group."

**Key Context:**
- **Community:** Lumiere Residences (LMR Parking Viber group)
- **Members:** 1,655 (not all will use simultaneously)
- **Current Method:** Manual Viber group messages (chaotic, inefficient)
- **User Expectation:** Simple replacement for Viber chaos
- **Developer Decision:** No payment integration (too complex for MVP)
- **Developer Decision:** Keep it simple, not corporate
- **Scale:** Small community, not multi-tenant SaaS platform

---

## Real User Needs from Chat Logs

### What Users Actually Post in Viber (Evidence from Screenshots)

**Pattern 1: Availability Announcements**
```
"Parking slot for rent P3, East Tower
Available dates
Oct. 13, 1:00 pm onwards
Oct. 14, until 2:00 pm only
Oct. 16, 12:00 nn onwards
..."

"Parking available tomorrow 2am to 6pm
P6 - North Tower, PM 🙂"

"🚗 Parking available
Now until until next week Wednesday Oct 16
P6 NT near elevator"
```

**Pattern 2: Seeking Requests**
```
"Looking for parking Oct 12 (Sat) 12:30pm until Oct 14 (Mon) 6:30am"
```

**Pattern 3: Status Updates**
```
"3pm fri to 3am sat - TAKEN
3PM sat to 10am sun = AVAILABLE"

"My parking is available pm me 🙂 p6 near west elevator"
```

**Pattern 4: Location Information**
- Parking level (P1, P3, P6)
- Tower (East Tower, North Tower, West Tower)
- Landmark ("near elevator", "Easy Access")

### Core Features Needed (From Real Usage)

1. **Post Availability** - "My slot is available [dates/times]"
2. **View Available Slots** - Browse what neighbors posted
3. **Claim/Book** - "I'll take it" (direct contact via PM)
4. **Update Status** - "TAKEN" or "AVAILABLE"
5. **Location Info** - Level + Tower + Optional landmark

### What Users DON'T Need

❌ Multi-community selector (only LMR exists)
❌ Fake testimonials (community already knows each other)
❌ Calendar UI integration (too complex - your design decision)
❌ Advanced booking workflows (Viber = simple post + PM)

### What Developer Decided Against

❌ Payment processing (too complex for MVP - your design decision)
❌ Corporate marketing UI (keep it simple - your design decision)
❌ Google Calendar integration (rejected during planning)

---

## Current Production Build Analysis

### Over-Engineering Identified

**File:** `app/page.tsx` (476 lines)

**Lines 323-401: Fake Testimonials Section**
```tsx
{/* Testimonials Section */}
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div className="text-center mb-12">
    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
      What Our Community Says
    </h3>
    <p className="text-gray-600 dark:text-gray-300">
      Real feedback from condo residents using ParkBoard
    </p>
  </div>

  <div className="grid md:grid-cols-3 gap-8">
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 ...">👨</div>
          <div>
            <CardTitle className="text-base">Mark T.</CardTitle>
            <CardDescription>Unit 12A • Renter</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          "I work from home most days, so I only need parking occasionally.
          ParkBoard lets me book a slot for meetings without paying monthly.
          Saved me ₱3,000 this month!"
        </p>
        <div className="text-yellow-500 mt-2">⭐⭐⭐⭐⭐</div>
      </CardContent>
    </Card>
    <!-- 2 more fake testimonials -->
  </div>
</section>
```

**PROBLEM:** These are fabricated testimonials. "Mark T.", "Lisa R.", "Santos Family" don't exist. This is corporate marketing BS for an app meant to help a small community.

**Lines 212-321: Pricing Section**
```tsx
{/* Pricing Section */}
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white dark:bg-gray-800">
  <div className="text-center mb-12">
    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
      Simple, Transparent Pricing
    </h3>
    ...
  </div>

  <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
    <Card><!-- For Renters --></Card>
    <Card><!-- For Owners - 100% Free --></Card>
    <Card><!-- Community - Win-Win --></Card>
  </div>
</section>
```

**PROBLEM:** Pricing cards imply a commercial product. The app is meant to be simple/community-run. Rates are peer-to-peer negotiated (as seen in Viber: owners just post availability, renters PM).

**Lines 52-118: Multi-Community Selector**
```tsx
<div className="grid md:grid-cols-2 gap-6">
  {/* Lumiere (LMR) - Active */}
  <Link href="/LMR">
    <Card className="hover:shadow-2xl transition-all hover:scale-105 ...">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Lumiere Residences</CardTitle>
            <CardDescription className="text-base mt-1">Pasig Blvd, Pasig City</CardDescription>
          </div>
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            ✓ Active
          </span>
        </div>
      </CardHeader>
      ...
    </Card>
  </Link>

  {/* Coming Soon - Placeholder */}
  <Card className="opacity-60 border-2 border-dashed">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-2xl text-gray-500">Your Community</CardTitle>
          <CardDescription className="text-base mt-1">Coming Soon</CardDescription>
        </div>
        ...
      </div>
    </CardHeader>
  </Card>
</div>
```

**PROBLEM:** Only ONE community exists (LMR). The "Your Community - Coming Soon" placeholder is premature scaling. Sister asked for "simple app for a small community" - not multi-tenant SaaS.

**Lines 40-49: Corporate Hero Text**
```tsx
<h2 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
  Your Condo's Parking Marketplace
</h2>
<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
  Rent parking slots in your community. Turn your unused parking space into passive income,
  or find convenient parking by the hour.
</p>
```

**PROBLEM:** "Marketplace", "passive income", "by the hour" - sounds like Airbnb for parking. Reality: neighbors helping neighbors avoid Viber chaos.

### Technology Stack Over-Engineering

**Current Stack:**
- Next.js 14 (App Router, RSC, Server Actions)
- Supabase (managed PostgreSQL + Auth)
- shadcn/ui (Radix + Tailwind components)
- 158 unit tests, 8 E2E tests
- TypeScript strict mode
- Jest + Playwright

**Problems:**
1. **Supabase Lock-In** - Violates your requirement for DB flexibility (local Postgres, Neon, or Supabase)
2. **Complex Auth** - Over-engineered for 1,655 community members
3. **Component Library** - shadcn/ui adds unnecessary abstraction for simple CRUD
4. **Test Suite** - 158 tests for MVP? Premature optimization

---

## Minimal Architecture Redesign

### Core Principle: Match Viber Group Behavior

**Viber Flow:**
1. User posts: "Parking available P6 NT, Oct 15-17"
2. Others see it in group chat
3. Interested person PMs: "I'll take it"
4. Poster confirms: "TAKEN" or edits original message

**ParkBoard Flow Should Be:**
1. User posts slot: "P6 NT available Oct 15-17"
2. Others browse available slots
3. Click "Contact Owner" → Opens Viber/Telegram/SMS
4. Poster marks "TAKEN" when confirmed

### Minimal Feature Set

**Phase 1: Core Features Only (MVP)**

1. **Slot Listing**
   - Location (Level + Tower)
   - Available dates/times (simple text input, NOT calendar picker)
   - Optional: Landmark ("near elevator")
   - Contact method (Viber/Telegram username or phone)

2. **Browse Slots**
   - Simple list/table view (NOT calendar grid)
   - Filter by date range
   - Filter by location (P1/P3/P6, East/North/West)

3. **Claim/Contact**
   - "Contact Owner" button → Opens Viber/Telegram/SMS
   - NO in-app messaging (too complex)
   - NO booking approval workflow (direct contact only)

4. **Status Updates**
   - Owner can mark "TAKEN" or "AVAILABLE"
   - Auto-expire after end date

5. **User Profiles**
   - Name
   - Unit number
   - Contact (Viber/Telegram/Phone)
   - THAT'S IT. No bio, no ratings, no verification.

**Phase 2: Real-Time Notifications (Post-MVP Enhancement)**

Using PostgreSQL LISTEN/NOTIFY pattern from carpool-app:

1. **New Slot Posted**
   - User posts P6 NT slot → Database trigger fires
   - WebSocket broadcast → Toast notification for all users
   - "🅿️ New P6 NT slot available tomorrow!"

2. **Slot Status Changed**
   - Owner marks TAKEN → Trigger fires
   - All browsers auto-refresh, remove from "Available" list

3. **Preference-Based Notifications**
   - User sets: "Notify me when P6 NT available"
   - New P6 NT slot posted → User gets targeted notification

4. **Expiry Warnings**
   - Slot expires in 2 hours → Reminder to owner
   - Prevents stale listings (unlike Viber)

**Phase 3: Nice-to-Have (Future)**
- Recurring availability (every weekday 8am-5pm)
- Historical logs (who rented from whom)
- Basic analytics (slot utilization rates)

**Out of Scope (Forever):**
- ❌ Payment processing (your design decision: too complex)
- ❌ Reviews/ratings
- ❌ Calendar sync (Google Calendar)
- ❌ Multi-community support
- ❌ Admin panel (community self-moderates)

### UI Redesign Requirements

**Landing Page (app/page.tsx) - STRIP OUT:**

❌ **Remove Entirely:**
- Testimonials section (lines 323-401)
- Pricing section (lines 212-321)
- Multi-community selector (lines 52-118)
- "Coming Soon" placeholder card
- Corporate hero text

✅ **Keep/Simplify:**
- Simple header: "LMR Parking - Neighbor-to-Neighbor Slot Sharing"
- Tagline: "Simple alternative to the Viber chaos. Post your slot, find a slot, done."
- Two buttons: "Browse Slots" | "Post My Slot"
- Footer with contact email only

**New Landing Page Structure:**
```tsx
// app/page.tsx - Simplified (40 lines vs 476)
export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">LMR Parking</h1>
          <p className="text-gray-600">Lumiere Residences community parking board</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Stop the Viber chaos. Post slots here instead.
        </h2>
        <p className="text-gray-600 mb-8">
          Simple parking slot sharing for LMR neighbors.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/LMR/slots">
            <Button size="lg">Browse Available Slots</Button>
          </Link>
          {session && (
            <Link href="/LMR/slots/new">
              <Button size="lg" variant="outline">Post My Slot</Button>
            </Link>
          )}
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>Built for LMR residents, by an LMR resident.</p>
          <p className="mt-2">Questions? Email alfieprojects.dev@gmail.com</p>
        </div>
      </main>
    </div>
  )
}
```

**Total lines:** ~40 lines (vs current 476 lines) - **92% reduction**

---

## Platform-Independent Database Strategy

### Technical Requirement

**Current:** Supabase-only (managed PostgreSQL)
**Required:** Works with local Postgres, Neon, OR Supabase (your technical requirement)

### Solution: Database Adapter Pattern

**Core Schema (Platform-Independent SQL):**

```sql
-- db/migrations/001_core_schema.sql
-- Platform-independent PostgreSQL (works everywhere)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  contact_viber TEXT,
  contact_telegram TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location_level TEXT NOT NULL CHECK (location_level IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')),
  location_tower TEXT NOT NULL CHECK (location_tower IN ('East Tower', 'North Tower', 'West Tower')),
  location_landmark TEXT,
  available_from TIMESTAMPTZ NOT NULL,
  available_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'taken', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_dates ON parking_slots(available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_slots_location ON parking_slots(location_level, location_tower);

-- Auto-expire slots after available_until date
CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS trigger AS $$
BEGIN
  UPDATE parking_slots
  SET status = 'expired'
  WHERE available_until < NOW() AND status = 'available';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_expire_slots
  AFTER INSERT OR UPDATE ON parking_slots
  EXECUTE FUNCTION expire_old_slots();
```

**Key Changes from Current Production:**

1. **NO `community_code` field** - Single community only (LMR)
2. **NO RLS policies** - Single community = no multi-tenant isolation needed
3. **NO complex auth tables** - Simple `users` table, no `user_profiles` + `communities` joins
4. **Standard PostgreSQL** - Works on local, Neon, or Supabase without changes

### Database Connection Abstraction

**File:** `lib/db/connection.ts`

```typescript
// Auto-detect database type from environment
export type DatabaseType = 'supabase' | 'neon' | 'local';

export function getDatabaseType(): DatabaseType {
  if (process.env.SUPABASE_URL) return 'supabase';
  if (process.env.DATABASE_URL?.includes('neon.tech')) return 'neon';
  return 'local';
}

export async function getDbClient() {
  const dbType = getDatabaseType();

  switch (dbType) {
    case 'supabase':
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

    case 'neon':
    case 'local':
      const { Pool } = await import('pg');
      return new Pool({
        connectionString: process.env.DATABASE_URL,
      });
  }
}
```

**API Route Pattern:**

```typescript
// app/api/slots/route.ts
import { getDbClient, getDatabaseType } from '@/lib/db/connection';

export async function GET() {
  const db = await getDbClient();
  const dbType = getDatabaseType();

  if (dbType === 'supabase') {
    // Supabase client API
    const { data, error } = await db
      .from('parking_slots')
      .select('*, users!owner_id(name, unit_number, contact_viber)')
      .eq('status', 'available')
      .order('available_from', { ascending: true });

    if (error) return Response.json({ error }, { status: 500 });
    return Response.json({ slots: data });
  } else {
    // Standard pg client (Neon or local)
    const result = await db.query(`
      SELECT
        ps.*,
        u.name as owner_name,
        u.unit_number as owner_unit,
        u.contact_viber as owner_contact
      FROM parking_slots ps
      JOIN users u ON ps.owner_id = u.id
      WHERE ps.status = $1
      ORDER BY ps.available_from ASC
    `, ['available']);

    return Response.json({ slots: result.rows });
  }
}
```

### Migration Script

**File:** `scripts/migrate.sh`

```bash
#!/bin/bash
# Auto-detect DB and run migrations (idempotent)

if [ -n "$SUPABASE_URL" ]; then
  echo "Detected Supabase - using Supabase CLI"
  supabase db push
elif [[ "$DATABASE_URL" == *"neon.tech"* ]]; then
  echo "Detected Neon - using psql"
  psql $DATABASE_URL -f db/migrations/001_core_schema.sql
else
  echo "Detected local Postgres - using psql"
  psql $DATABASE_URL -f db/migrations/001_core_schema.sql
fi

echo "✅ Database migrations complete"
```

---

## Real-Time Notifications (Phase 2)

### Pattern: PostgreSQL LISTEN/NOTIFY from Carpool-App

**Why this pattern:**
- ✅ Platform-independent (works on local Postgres, Neon, Supabase)
- ✅ No vendor lock-in (standard PostgreSQL feature)
- ✅ Efficient (database-native pub/sub)
- ✅ Already proven in carpool-app
- ✅ Educational value (learn PostgreSQL triggers)

### Database Trigger for Notifications

```sql
-- db/migrations/002_notifications.sql
CREATE OR REPLACE FUNCTION notify_slot_change()
RETURNS trigger AS $$
DECLARE
  slot_data json;
BEGIN
  -- Build JSON with slot details
  SELECT row_to_json(s) INTO slot_data
  FROM (
    SELECT
      ps.id,
      ps.location_level,
      ps.location_tower,
      ps.location_landmark,
      ps.available_from,
      ps.available_until,
      ps.status,
      u.name as owner_name,
      u.unit_number as owner_unit
    FROM parking_slots ps
    JOIN users u ON ps.owner_id = u.id
    WHERE ps.id = NEW.id
  ) s;

  -- Send notification on 'slots_channel'
  PERFORM pg_notify(
    'slots_channel',
    json_build_object(
      'operation', TG_OP,
      'slot', slot_data
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slot_posts_notify
AFTER INSERT OR UPDATE ON parking_slots
FOR EACH ROW
WHEN (NEW.status = 'available' OR OLD.status != NEW.status)
EXECUTE FUNCTION notify_slot_change();
```

### WebSocket Server (Next.js API Route)

**File:** `app/api/realtime/route.ts`

```typescript
import { getDatabaseType } from '@/lib/db/connection';
import { Pool } from 'pg';

// Next.js doesn't support WebSockets directly in API routes
// Use this for Server-Sent Events (SSE) instead

export async function GET(request: Request) {
  const dbType = getDatabaseType();

  if (dbType === 'supabase') {
    // Use Supabase Realtime
    return new Response('Use Supabase Realtime client', { status: 200 });
  }

  // For Neon/local: Use PostgreSQL LISTEN + SSE
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  await client.query('LISTEN slots_channel');

  const stream = new ReadableStream({
    start(controller) {
      client.on('notification', (msg) => {
        if (msg.channel === 'slots_channel') {
          const data = `data: ${msg.payload}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        }
      });
    },
    cancel() {
      client.query('UNLISTEN slots_channel');
      client.release();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Frontend Integration

**File:** `app/LMR/slots/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react';

export default function SlotsPage() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/realtime');

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);

      if (notification.operation === 'INSERT') {
        // New slot posted - show toast
        showToast(`🅿️ New ${notification.slot.location_level} ${notification.slot.location_tower} slot available!`);
        // Refresh slots list
        fetchSlots();
      } else if (notification.operation === 'UPDATE') {
        // Status changed - update UI
        setSlots(prev =>
          prev.filter(s =>
            s.id !== notification.slot.id || notification.slot.status === 'available'
          )
        );
      }
    };

    return () => eventSource.close();
  }, []);

  // ... rest of component
}

function showToast(message: string) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
```

### Notification Use Cases

**1. New Slot Posted**
```
User A: Posts P6 NT slot for tomorrow
Database: INSERT → Trigger fires → pg_notify('slots_channel')
All Browsers: Toast "🅿️ New P6 NT slot available tomorrow!"
```

**2. Slot Marked TAKEN**
```
Owner: Marks slot as TAKEN
Database: UPDATE → Trigger fires
All Browsers: Remove slot from list (auto-refresh)
```

**3. Preference-Based (Advanced)**
```
User: Sets preference "Notify me for P6 NT only"
New P6 NT: Targeted notification
Other slots: Silent (no notification)
```

---

## Database Performance Analysis

### Scale Expectations

**Community Size:** 1,655 members (LMR Parking Viber group)

**Realistic Usage (Worst Case):**
- Active users: 10% = ~165 users
- Slots posted/week: ~50 slots
- Bookings/week: ~100 bookings
- Total DB records/year: ~5,000 slots + ~10,000 bookings

**Query Performance:**
- Simple SELECT with 3 indexes → <10ms
- JOIN (slots + users) → <20ms
- No complex aggregations needed

**Conclusion:** Even on cheapest Postgres hosting (Neon free tier, local dev), this will fly. NO optimization needed for years.

---

## Implementation Plan for Parkboard Instance

### CRITICAL: Use Git Worktree for This Redesign

**This is a major architectural change** - current production has 476-line landing page, new MVP will be 40 lines. Use a worktree to keep production safe.

**Setup (5 minutes):**
```bash
cd /home/ltpt420/repos/parkboard

# Create worktree for MVP redesign
git worktree add .trees/minimal-mvp -b feature/minimal-mvp

# Work in the worktree
cd .trees/minimal-mvp

# Current production stays safe in main branch
# /home/ltpt420/repos/parkboard/ (untouched)
```

**Why this matters:**
- ✅ Main branch stays safe (476-line production)
- ✅ Can compare old vs new side-by-side
- ✅ Easy rollback if something breaks
- ✅ Deploy from worktree, merge when stable
- ✅ Sister can test MVP without touching production

**Worktree Resources:**
- Full guide: `parkboard/docs/GIT_WORKTREE_IMPLEMENTATION_GUIDE.md`
- Multi-instance coordination: `parkboard/docs/MULTI_INSTANCE_COORDINATION.md`
- Quick setup script: `parkboard/docs/scripts/quickstart-worktrees.sh`

**Port Assignment:**
```bash
# Main branch (production)
npm run dev              # Port 3000

# Worktree (MVP redesign)
cd .trees/minimal-mvp
npm run dev -- -p 3001   # Port 3001
```

---

### Phase 1: Strip Out Over-Engineering (2 hours)

**Task 1.1: Landing Page Simplification**
- File: `app/page.tsx`
- Remove lines 323-401 (Testimonials)
- Remove lines 212-321 (Pricing cards)
- Remove lines 52-118 (Multi-community selector)
- Replace with minimal 40-line version (see UI Redesign section above)

**Task 1.2: Remove Multi-Tenant Architecture**
- Remove `community_code` from all tables
- Remove RLS policies (single community = no need)
- Simplify auth (just email/password, no OAuth)
- Remove `communities` table
- Merge `user_profiles` into `users` table

**Task 1.3: Simplify Database Schema**
- Create `db/migrations/001_core_schema.sql` (platform-independent)
- Remove Supabase-specific functions (use standard PostgreSQL)
- Test on local Postgres first

### Phase 2: Platform-Independent Database (3 hours)

**Task 2.1: Database Connection Abstraction**
- Create `lib/db/connection.ts` (auto-detect Supabase/Neon/local)
- Update all API routes to use abstraction
- Test with local Postgres

**Task 2.2: Migration Scripts**
- Create `scripts/migrate.sh` (auto-detect DB type)
- Make idempotent (CREATE IF NOT EXISTS everywhere)
- Test against all three targets (local, Neon, Supabase)

**Task 2.3: Environment Probing**
- Add DB type detection to startup
- Log which DB is being used
- Validate schema on startup

### Phase 3: Minimal Feature Implementation (4 hours)

**Task 3.1: Slot Posting**
- Simple form: location (dropdowns), dates (text inputs), contact
- NO calendar picker (too complex)
- Validate and insert into `parking_slots`

**Task 3.2: Slot Browsing**
- Simple list/table view (NOT calendar grid)
- Filter by date range, location
- Show contact button (opens Viber/Telegram/SMS)

**Task 3.3: Status Updates**
- Owner can mark "TAKEN" or "AVAILABLE"
- Auto-expire trigger (already in schema)

### Phase 4: Real-Time Notifications (2 hours) - POST-MVP

**Task 4.1: Database Trigger**
- Create `002_notifications.sql` migration
- Implement `notify_slot_change()` function
- Test with `psql LISTEN slots_channel`

**Task 4.2: SSE Endpoint**
- Create `/api/realtime` route
- PostgreSQL LISTEN for Neon/local
- Fallback to Supabase Realtime if Supabase detected

**Task 4.3: Frontend Integration**
- Add EventSource connection
- Toast notifications
- Auto-refresh on slot changes

### Phase 5: Testing & Deployment (1 hour)

**Task 5.1: Test on Local Postgres**
- Run migrations
- Test CRUD operations
- Verify triggers work

**Task 5.2: Test on Neon**
- Create Neon project
- Run migrations
- Test same operations
- Test real-time notifications

**Task 5.3: Deploy to Vercel**
- Point to Neon database
- Deploy
- Share link with sister for feedback

---

## Success Criteria

**Technical:**
- ✅ Works on local Postgres, Neon, AND Supabase (your requirement)
- ✅ Landing page <50 lines (vs current 476 lines)
- ✅ No fake testimonials or corporate BS (your design decision)
- ✅ Database queries <50ms (even on free tier)
- ✅ Idempotent migrations (can run multiple times safely)

**User Experience:**
- ✅ Sister (Elen) can post her slot in <1 minute
- ✅ Neighbors can browse slots faster than scrolling Viber
- ✅ Direct contact (no in-app messaging complexity)
- ✅ Looks simple/community-focused, NOT corporate

**Scale:**
- ✅ Handles 1,655 potential users (165 active)
- ✅ Handles 50 slots/week, 100 bookings/week
- ✅ Zero performance issues on free tier hosting

---

## Out of Scope (Explicitly Defined)

**From Chat Logs and Design Decisions:**

❌ **Payment Integration** - Your design decision: "wala munang payment integration; adds too much complexity"
❌ **Google Calendar UI** - Your design decision during planning: "strip ko to core functionalities"
❌ **Multi-Community Support** - Only LMR exists, premature scaling
❌ **Viber Group Chat Integration** - Sister said app would compete with incentivized group chats
❌ **Advanced Booking Workflows** - Keep it simple like Viber (post + PM)
❌ **Reviews/Ratings** - Community already knows each other
❌ **Admin Panel** - Community self-moderates (like Viber group)
❌ **Corporate Marketing UI** - Your design decision: keep it simple, not corporate

---

## Roles and Attribution

**Sister (Elen Peli) - Client/First User:**
- High-level requirement: "Simple use app for small community for booking available parking space"
- User feedback: "Keep it simple para mailabas agad" (keep it simple to launch quickly)
- User context: LMR Parking Viber group (1,655 members)
- Specialty: Chemistry (not technical)

**You (ltpt420) - Developer:**
- Technical requirements: Platform-independent DB (local Postgres, Neon, Supabase)
- Design decisions: No payment integration, keep it simple/not corporate
- Architecture decisions: PostgreSQL LISTEN/NOTIFY for notifications
- Implementation strategy: Minimal MVP first, enhancements later
- Technical execution: Idempotent migrations, auto-detect DB type

---

## Next Steps for Parkboard Instance

**Root instance has completed:**
1. ✅ Chat log analysis (real user needs extracted from sister's request)
2. ✅ Over-engineering identification (476-line landing page, fake testimonials, pricing cards)
3. ✅ Minimal architecture design (40-line landing, platform-independent DB)
4. ✅ Real-time notification pattern from carpool-app (Phase 2 enhancement)
5. ✅ Implementation plan (5 phases, 12 hours total)

**Parkboard instance should now:**
1. Read this document (`MINIMAL_MVP_REDESIGN_20251026.md`)
2. Use `/plan-execution` to execute the 5-phase plan
3. Start with Phase 1 (strip out over-engineering)
4. Delegate to `@parkboard-api-expert`, `@parkboard-database-manager` as needed
5. Update `coordination/project-status/parkboard-status.md` every 30 minutes
6. Report completion back to root instance when done

---

**Document Status:** Ready for Parkboard Instance Execution
**Estimated Implementation Time:** 12 hours (across 5 phases)
**Priority:** P1 (High - MVP simplification critical before any new features)

---

**Questions for Parkboard Instance?** See `coordination/shared-alerts.md` or escalate back to root instance.
