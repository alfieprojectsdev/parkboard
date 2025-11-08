# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ParkBoard** - Peer-to-peer parking slot marketplace for condo residents.

**Purpose:** List unused parking slots or book available slots from neighbors within a condo community.

**Status:** Production-ready MVP (158 unit tests, 8 E2E tests, ~85% coverage)

**Deployment Target:** parkboard.app/LMR (community-specific instance)

---

## Root Instance Coordination

This project is coordinated by the **root-level Claude instance** in `/home/ltpt420/repos/claude-config/`.

### Before Starting Work in This Project

**ALWAYS perform these checks:**

1. ✅ Check root instance status: `/home/ltpt420/repos/claude-config/ROOT_INSTANCE.md`
2. ✅ Read shared alerts: `/home/ltpt420/repos/claude-config/coordination/shared-alerts.md`
3. ✅ Check priorities: `/home/ltpt420/repos/claude-config/coordination/priority-queue.md`
4. ✅ Update parkboard status: `/home/ltpt420/repos/claude-config/coordination/project-status/parkboard-status.md`

### Root Instance Roles

**Coordination:** Manages priorities and resolves conflicts across all projects (parkboard, pipetgo, carpool-app)

**Development:** Creates new agents/commands that get deployed to this project

**Documentation:** Maintains agent standards and prompt engineering patterns

### When to Escalate to Root Instance

- **Critical failures** affecting multiple projects or production
- **Need for new agents/commands** that could benefit other projects
- **Pattern discoveries** that should be generalized (add to prompt-engineering.md)
- **Cross-project coordination** required (shared resources, dependencies)
- **Blocking issues** that affect project priorities

### Communication Format

**For urgent issues, create an alert in shared-alerts.md:**

```markdown
### YYYY-MM-DD HH:MM: [Brief Description]

**Priority:** URGENT
**Project:** parkboard
**Impact:** [what's affected]
**Action Required:** [specific action]
```

**For status updates, modify parkboard-status.md:**

```markdown
**Active Instances:** [count]
**Current Work:** [description]
**Blockers:** [any blockers]
**ETA:** [completion estimate]
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS 3.4 + shadcn/ui components
- **State Management:** React hooks + Supabase client-side state

### Backend
- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth (email/password + OAuth)
- **API:** Next.js API Routes + Server Actions
- **Server Functions:** PostgreSQL triggers and functions

### Testing
- **Unit/Component:** Jest 30.2.0 + React Testing Library 16.3.0
- **E2E:** Playwright 1.56.0
- **Coverage:** ~85% (158 unit tests, 8 E2E scenarios)
- **Diagnostic Testing:** Playwright-first (50x faster than F12 debugging)

### Multi-Tenant Architecture
- **Path-based routing:** `/[community]/` (e.g., `/LMR/slots`)
- **RLS isolation:** Community data separated via Row Level Security
- **Dynamic routing:** Community code in URL determines data scope

## Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev              # Port 3000 (main branch)

# Testing
npm test                 # Jest unit tests (158 tests, ~10 seconds)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E (8 scenarios)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Show browser during tests

# Linting & Type Checking
npm run lint             # ESLint
npx tsc --noEmit        # TypeScript type checking

# Database (Supabase)
# No local commands - use Supabase dashboard
# SQL Editor: Run db/schema_optimized.sql
```

### Port Assignments (Git Worktrees)

| Branch | Port | Purpose |
|--------|------|---------|
| Main | 3000 | Production testing |
| feature-* | 3001 | Feature development |
| bugfix-* | 3002 | Bug fixes |
| experiment-* | 3003 | Prototypes |

## File Structure

```
parkboard/
├── app/                        # Next.js App Router
│   ├── [community]/           # Multi-tenant routing
│   │   ├── slots/             # Browse slots
│   │   ├── bookings/          # My bookings
│   │   └── list-slot/         # List new slot
│   ├── api/                   # API routes
│   ├── auth/                  # Auth pages (login, register)
│   └── profile/               # Profile completion (OAuth)
│
├── components/
│   ├── auth/                  # Auth-related components
│   ├── common/                # Shared components (Navigation)
│   └── ui/                    # shadcn/ui base components
│
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser Supabase client
│       └── server.ts          # Server Supabase client
│
├── db/
│   └── schema_optimized.sql   # ALWAYS reference this (single source of truth)
│
├── __tests__/                 # Jest unit/integration tests
│   ├── components/
│   ├── routes/
│   └── utils/
│
├── e2e/                       # Playwright E2E tests
│   └── user-journeys.spec.ts # 8 complete user flows
│
├── middleware.ts              # Server-side auth protection
├── jest.config.js             # Jest configuration
└── playwright.config.ts       # Playwright configuration
```

## Database Schema

### Location
**ALWAYS reference:** `db/schema_optimized.sql` (single source of truth)

**NEVER reference:** Old versions like `schema_refined.sql`

### Key Tables

**user_profiles**
```sql
- id (UUID, FK to auth.users)
- name (VARCHAR)
- email (VARCHAR UNIQUE)
- phone (VARCHAR)
- unit_number (VARCHAR UNIQUE) -- One account per unit
- community_id (UUID) -- Multi-tenant isolation
```

**parking_slots**
```sql
- id (UUID)
- owner_id (UUID FK to user_profiles)
- community_id (UUID) -- Multi-tenant isolation
- slot_number (VARCHAR, e.g., "A-101")
- slot_type ('covered' | 'uncovered')
- price_per_hour (NUMERIC)
- description (TEXT)
- is_available (BOOLEAN)
```

**bookings**
```sql
- id (UUID)
- parking_slot_id (UUID FK)
- renter_id (UUID FK to user_profiles)
- slot_owner_id (UUID) -- Denormalized for RLS performance
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ)
- total_price (NUMERIC) -- Auto-calculated by trigger
- status ('pending' | 'confirmed' | 'completed' | 'cancelled')
```

### Critical Database Features

**1. Server-Side Price Calculation (Security)**
```sql
CREATE TRIGGER booking_price_calculation
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_price();
```
**Why:** Prevents client manipulation via DevTools
**Never:** Trust client-provided `total_price`

**2. Temporal Overlap Prevention (Correctness)**
```sql
EXCLUDE USING gist (
  parking_slot_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
```
**Why:** Prevents double-booking at database level
**Result:** Race conditions impossible

**3. Row Level Security (Multi-Tenant + Security)**
```sql
-- Users see only their community's slots
CREATE POLICY slots_select ON parking_slots
  FOR SELECT USING (community_id = get_user_community());

-- Users see their bookings (as renter or owner)
CREATE POLICY bookings_select ON bookings
  FOR SELECT USING (renter_id = auth.uid() OR slot_owner_id = auth.uid());
```
**Why:** Defense-in-depth + multi-tenant isolation
**Performance:** Uses denormalized `slot_owner_id` (no subquery)

**4. Denormalized Fields (Performance - Reviewed)**
```sql
ALTER TABLE bookings ADD COLUMN slot_owner_id UUID;
CREATE TRIGGER set_slot_owner_id ... -- Auto-populate
```
**Rationale:** RLS policy needs owner check frequently
**Scale:** Premature for <10k bookings (see SESSION_SUMMARY_20241024.md)
**Status:** ⚠️ Consider removing if simplifying schema

## Authentication & Authorization

### Supabase Auth Configuration

**Providers enabled:**
- Email/password (primary)
- Google OAuth (optional, adds complexity)
- Facebook OAuth (optional, adds complexity)

**Auth flow:**
1. User signs up/in → Supabase Auth creates `auth.users` record
2. Trigger creates `user_profiles` record (linked by `id`)
3. OAuth users: Redirect to `/profile/complete` for phone/unit_number
4. Middleware enforces server-side auth on protected routes

### Server-Side Auth Pattern

**Critical:** ALWAYS use server-side auth checks
```typescript
// middleware.ts - Runs BEFORE page renders
export async function middleware(req: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect('/login');
  }

  return NextResponse.next();
}
```

**Never:** Trust client-side auth checks (UX only, not security)

### Authorization Patterns

**Resource Ownership:**
```typescript
// Verify user can access resource (server-side)
const { data: slot } = await supabase
  .from('parking_slots')
  .select('*')
  .eq('id', slotId)
  .single();

if (slot.owner_id !== session.user.id) {
  return redirect('/unauthorized');
}
```

**RLS handles most authorization** (see database section above)

## Testing Strategy

### Test-Driven Development (TDD)

**ALWAYS follow TDD workflow:**
1. Write test first (it fails red)
2. Implement minimal code to pass (green)
3. Refactor while keeping tests green
4. Commit frequently

### Testing Commands

```bash
# Unit tests (fast, run often)
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# E2E tests (slower, run before commits)
npm run test:e2e            # Headless mode
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:headed     # Show browser
```

### Test Structure

**Unit/Integration tests:** `__tests__/`
- 158 passing tests
- ~85% coverage
- Tests: rendering, user interactions, form validation, API routes, utils

**E2E tests:** `e2e/user-journeys.spec.ts`
- 8 complete user scenarios:
  1. Browse slots (unauthenticated)
  2. Register new user
  3. Login existing user
  4. List parking slot
  5. Book parking slot
  6. View my bookings
  7. Cancel booking
  8. OAuth login + profile completion

### Diagnostic Testing (CRITICAL)

**NEVER use manual F12 debugging for React issues**

**ALWAYS use Playwright diagnostic tests instead** (50x faster):

```typescript
// Create diagnostic test when debugging
test('DIAGNOSTIC: Slot form state issue', async ({ page }) => {
  await page.goto('/LMR/list-slot');

  // Add debug output
  await page.locator('[data-testid="slot-form"]').screenshot({ path: 'debug.png' });

  // Check state
  const formData = await page.evaluate(() => {
    const form = document.querySelector('form');
    return new FormData(form);
  });

  console.log('Form data:', Object.fromEntries(formData));

  // Test hypothesis
  expect(formData.get('slot_number')).toBeTruthy();
});
```

**Why:** Playwright tests run in real browser, reproducible, automated

## Code Conventions

### TypeScript Style

**General:**
- Strict mode enabled (`tsconfig.json`)
- Use `const`/`let` (never `var`)
- Prefer `async/await` over `.then()`
- Template literals for strings with variables
- 2-space indentation

**Naming:**
- Variables/functions: camelCase (`getUserProfile`, `slotData`)
- Types/Interfaces: PascalCase (`UserProfile`, `BookingStatus`)
- Database columns: snake_case (`user_id`, `created_at`)
- React components: PascalCase (`SlotCard`, `BookingForm`)
- CSS classes: kebab-case (`.slot-card`, `.btn-primary`)

**Imports:**
```typescript
// External packages first
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Internal imports
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/lib/utils';

// Types
import type { Slot, Booking } from '@/types';
```

### Error Handling

**Supabase queries:**
```typescript
const { data, error } = await supabase
  .from('parking_slots')
  .select('*');

if (error) {
  console.error('Database error:', error);
  return { error: 'Failed to fetch slots' };
}

return { data };
```

**API routes:**
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    if (!body.slot_number) {
      return Response.json(
        { error: 'Slot number required' },
        { status: 400 }
      );
    }

    // Process request
    const result = await createSlot(body);

    return Response.json({ data: result });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Common Patterns & Gotchas

### 1. useEffect Dependency Arrays (CRITICAL)

**NEVER use object references in dependencies:**
```typescript
// ❌ BAD: Causes infinite loop
const filters = { community: 'LMR', status: 'available' };
useEffect(() => {
  fetchSlots(filters);
}, [filters]); // Object recreated every render!

// ✅ GOOD: Primitive dependencies
const community = 'LMR';
const status = 'available';
useEffect(() => {
  fetchSlots({ community, status });
}, [community, status]); // Stable primitives
```

**Why:** Object references change every render → infinite re-fetches

**Fixed in:** 3 components (Oct 2024) - see git history

### 2. Supabase Client Usage

**Browser (client-side):**
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
// Use in React components, client-side fetches
```

**Server (API routes, Server Components):**
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = createClient();
// Use in API routes, Server Components, middleware
```

**Never:** Mix client/server Supabase clients (auth context differs)

### 3. Multi-Tenant Routing

**URL structure:**
```
/[community]/slots       → /LMR/slots, /SRP/slots
/[community]/bookings    → /LMR/bookings
```

**Get community from URL:**
```typescript
import { useParams } from 'next/navigation';

const { community } = useParams();
// Use community code for RLS filtering
```

**RLS automatically filters by community** (see schema)

### 4. Price Calculation Security

**Never trust client:**
```typescript
// ❌ BAD: Client calculates price
const totalPrice = slotPrice * duration;
await supabase.from('bookings').insert({
  total_price: totalPrice, // Client can manipulate this!
});

// ✅ GOOD: Server calculates (or DB trigger)
await supabase.from('bookings').insert({
  parking_slot_id,
  start_time,
  end_time,
  // total_price calculated by DB trigger
});
```

**Database trigger handles price** (see schema)

### 5. Booking Overlaps

**Don't check in application:**
```typescript
// ❌ BAD: App-level check (race condition possible)
const existing = await supabase
  .from('bookings')
  .select('*')
  .eq('parking_slot_id', slotId)
  .overlaps('start_time', 'end_time', [newStart, newEnd]);

if (existing.length > 0) return { error: 'Slot busy' };
```

**Database EXCLUDE constraint handles this** (atomic, no race conditions)

## Agent Usage Guidelines

### Agent Organization

This project uses a **hybrid agent system**:

**Generic Agents (Symlinked from `/home/ltpt420/repos/claude-config/`):**
- `architect.md` → Portfolio-wide design and ADRs
- `database-manager.md` → Generic database optimization
- `debugger.md` → Systematic bug investigation
- `developer.md` → TDD implementation
- `quality-reviewer.md` → Production failure detection
- `security-auth.md` → Authentication and security audits
- `technical-writer.md` → Code-level documentation
- `ux-reviewer.md` → UI/UX and accessibility

**Parkboard-Specific Agents (Local files):**
- `parkboard-database-manager.md` → Parkboard schema patterns, idempotent migrations
- `parkboard-api-expert.md` → Next.js App Router, multi-tenant routing
- `parkboard-auth-expert.md` → AuthWrapper, useEffect gotchas, sign-out fixes
- `parkboard-test-supervisor.md` → Run 158 tests, Playwright debugging
- `parkboard-triage-specialist.md` → Route issues to correct agent
- `parkboard-learning-guide.md` → Onboard new devs to parkboard architecture
- `parkboard-documentation-expert.md` → Feature docs, user guides (not code-level)

**Why Symlinks?**
- Generic agents maintained centrally in `claude-config` repo
- Updates propagate to all projects automatically
- Parkboard-specific agents capture project-unique knowledge
- Run `git worktree` status shows symlinks (not duplicates)

### When to Use Each Agent

**@agent-architect** - Design decisions and planning
```
Use for:
- Designing new features (notifications, reviews, payment integration)
- Database schema changes (new tables, constraints)
- Multi-tenant architecture decisions
- Feature scoping and ADR writing

Example:
"@architect design a rating/review system for parking slots"
```

**@agent-developer** - Implementation with tests
```
Use for:
- Implementing features from architect's designs
- Writing React components
- Creating API routes
- Bug fixes with known solutions

Example:
"@developer implement the slot rating component from architect's spec"
```

**@agent-debugger** - Complex bug investigation
```
Use for:
- useEffect infinite loops
- RLS policy issues (data not showing)
- Performance bottlenecks
- Supabase auth state bugs

NOT for simple syntax errors - fix those directly.

Example:
"@debugger investigate why bookings aren't showing for slot owners"
```

**@agent-database-manager** - Schema and query optimization
```
Use for:
- RLS policy design and optimization
- Index strategy for slow queries
- Database trigger design
- Evaluating denormalization decisions

Example:
"@database-manager review RLS policies in db/schema_optimized.sql for performance"
```

**@agent-security-auth** - Authentication and security
```
Use for:
- OAuth implementation review
- Session management security
- Middleware protection patterns
- Price manipulation prevention review
- Multi-tenant data isolation verification

Example:
"@security-auth review OAuth callback flow in app/auth/callback/route.ts"
```

**@agent-quality-reviewer** - Production failure prevention
```
Use for:
- Reviewing booking logic (prevent data loss)
- Checking error handling completeness
- Verifying payment-adjacent code (pricing)
- Concurrency safety review

Example:
"@quality-reviewer review booking creation for race conditions and data loss"
```

**@agent-ux-reviewer** - UI/UX and accessibility
```
Use for:
- Reviewing forms (booking form, slot listing form)
- Checking WCAG 2.1 AA compliance
- Verifying mobile responsiveness (primary user base)
- Ensuring clear feedback and error states

Example:
"@ux-reviewer review booking form for accessibility and mobile usability"
```

**@agent-technical-writer** - Documentation
```
Use for:
- API route documentation
- Component prop documentation
- Updating this CLAUDE.md

Example:
"@technical-writer document the booking API endpoints"
```

### Agent Workflow Example

```
1. @architect design a slot availability calendar feature
   → Architect provides design spec with calendar view, RLS considerations

2. @database-manager review the calendar query performance implications
   → Database manager suggests indexes, query optimizations

3. @developer implement calendar component per architect's design
   → Developer creates React component with Supabase queries

4. @security-auth verify RLS policies prevent cross-community data leaks
   → Security agent confirms multi-tenant isolation works

5. @ux-reviewer review calendar for accessibility and mobile UX
   → UX reviewer checks keyboard nav, screen reader support, mobile touch

6. @quality-reviewer review for booking edge cases and data consistency
   → Quality reviewer checks concurrency, error handling

7. @technical-writer document the calendar component and API
   → Technical writer adds usage documentation
```

## Performance Considerations

### Database Queries

**Use RLS for filtering** (don't filter in app):
```typescript
// ✅ GOOD: RLS filters automatically
const { data } = await supabase
  .from('parking_slots')
  .select('*');
// RLS ensures only user's community

// ❌ BAD: Manual filtering (bypass RLS)
const { data } = await supabase
  .from('parking_slots')
  .select('*');
const filtered = data.filter(slot => slot.community_id === userCommunity);
```

**Limit query results:**
```typescript
const { data } = await supabase
  .from('parking_slots')
  .select('*')
  .limit(50); // Pagination for large lists
```

### Frontend Performance

**Lazy load images:**
```tsx
<img src={slotImage} loading="lazy" alt="Parking slot" />
```

**Debounce search inputs:**
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => searchSlots(query), 300),
  []
);
```

## Security Checklist

Before deploying to production:

- [ ] All SQL queries use RLS (no `.rpc()` without RLS)
- [ ] Server-side auth checks in middleware
- [ ] Price calculated server-side (never trust client)
- [ ] OAuth redirect URIs validated
- [ ] CORS configured (if needed)
- [ ] Environment variables not exposed to client
- [ ] Rate limiting on auth endpoints (Supabase built-in)
- [ ] XSS prevention (React escapes by default, but check `dangerouslySetInnerHTML`)

## Deployment

**Target:** Vercel (recommended for Next.js)

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Deployment Steps:**
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy (automatic on push)

**Database:** Already deployed on Supabase (no migration needed)

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Playwright Docs:** https://playwright.dev/
- **shadcn/ui:** https://ui.shadcn.com/
- **WCAG 2.1 AA:** https://www.w3.org/WAI/WCAG21/quickref/

## Notes for Future Claude Instances

1. **ALWAYS check this file first** for project context
2. **ALWAYS reference `db/schema_optimized.sql`** (not old versions)
3. **ALWAYS use Playwright for debugging** (not F12 manual inspection)
4. **NEVER use object references in useEffect dependencies** (causes infinite loops)
5. **NEVER trust client-provided prices** (use DB trigger)
6. **ALWAYS verify multi-tenant isolation** (RLS policies)
7. **When implementing UI:** Use @agent-ux-reviewer for accessibility
8. **When optimizing DB:** Use @agent-database-manager with scale context
9. **When in doubt:** Ask for clarification rather than making assumptions

---

**Last Updated:** 2024-10-24
**Project Status:** Production-ready MVP
**Test Coverage:** ~85% (158 unit tests, 8 E2E scenarios)
**Deployment:** parkboard.app/LMR (pending)
**Complexity:** Medium (some premature optimization - see SESSION_SUMMARY_20241024.md)
