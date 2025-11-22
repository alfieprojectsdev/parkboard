# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ParkBoard** - Peer-to-peer parking slot marketplace for condo residents.

**Purpose:** List unused parking slots or book available slots from neighbors within a condo community.

**Status:** Production-ready MVP

**Deployment Target:** parkboard.app/LMR (community-specific instance)

---

## Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # TypeScript type checking

# Unit Tests (Jest)
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
npm test -- --testPathPattern=AuthWrapper  # Run single test file

# E2E Tests (Playwright)
npm run test:e2e                    # Headless mode (starts dev server)
npm run test:e2e:headed             # Show browser
npm run test:e2e:ui                 # Interactive UI mode
npx playwright test --grep "CUJ-014"  # Run single test by name
PLAYWRIGHT_BASE_URL=https://parkboard.app npm run test:e2e:prod  # Against production

# Database
./scripts/migrate.sh                # Run migrations
./scripts/migrate.sh status         # Check migration status
```

---

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL) or Neon
- **Auth:** Supabase Auth (email/password + OAuth)
- **Testing:** Jest + React Testing Library, Playwright E2E

### Multi-Tenant Architecture

Routes use path-based multi-tenancy: `/[community]/...` (e.g., `/LMR/slots`)
- Community code in URL determines data scope
- RLS policies filter data by `community_id`

---

## Architecture

### Key Directories

```
app/                      # Next.js App Router
├── LMR/                  # LMR community routes (hardcoded for MVP)
│   ├── slots/           # Browse/view/create slots
│   └── bookings/        # User's bookings
├── (auth)/              # Login/register pages
├── api/                 # API routes
└── auth/callback/       # OAuth callback handler

components/
├── auth/AuthWrapper.tsx  # Auth state management (client component)
├── common/Navigation.tsx # Nav bar
└── ui/                   # shadcn/ui components

lib/
├── supabase/client.ts   # Browser Supabase client (use in 'use client')
├── supabase/server.ts   # Server Supabase client (use in Server Components/API)
└── auth/dev-session.ts  # Dev mode auth bypass

db/
├── schema_optimized.sql # Main schema (single source of truth)
└── migrations/          # Idempotent migration files
```

### Supabase Client Pattern

```typescript
// In 'use client' components:
import { createClient } from '@/lib/supabase/client'

// In Server Components, API routes, middleware:
import { createClient } from '@/lib/supabase/server'
```

Never mix client/server clients - they handle auth cookies differently.

---

## Database

**Schema:** Always reference `db/schema_optimized.sql` (not old versions)

### Key Tables
- `user_profiles` - User info (name, email, phone, unit_number)
- `parking_slots` - Available slots (slot_number, type, price, owner)
- `bookings` - Booking records (slot, renter, times, status)

### Critical Features

**Server-side price calculation:** Database trigger calculates `total_price` - never trust client-provided prices.

**Overlap prevention:** EXCLUDE constraint prevents double-booking at database level (no race conditions).

**RLS policies:** All tables use Row Level Security for multi-tenant isolation and authorization.

---

## Common Gotchas

### 1. useEffect Dependencies (CRITICAL)

```typescript
// ❌ BAD: Object recreated every render → infinite loop
const filters = { community: 'LMR' };
useEffect(() => fetchSlots(filters), [filters]);

// ✅ GOOD: Stable primitives
const community = 'LMR';
useEffect(() => fetchSlots({ community }), [community]);
```

### 2. Test Dates

E2E tests use **2026 dates** to avoid "cannot book in the past" errors. This is intentional.

### 3. Dev Mode Auth Bypass

For local development without Supabase auth:
- Uses `parkboard_dev_session` cookie
- Check `lib/auth/dev-session.ts` for implementation
- Middleware at `middleware.ts` handles the bypass

### 4. Price Manipulation

Never send `total_price` from client. The database trigger calculates it from `price_per_hour` × duration.

---

## Port Assignments (Git Worktrees)

| Branch | Port | Purpose |
|--------|------|---------|
| Main | 3000 | Production testing |
| feature-* | 3001 | Feature development |
| bugfix-* | 3002 | Bug fixes |
| experiment-* | 3003 | Prototypes |

---

## Authentication Flow

1. User signs up/in → Supabase Auth creates `auth.users` record
2. Database trigger creates `user_profiles` record (linked by `id`)
3. OAuth users: Redirect to `/profile/complete` for phone/unit_number
4. `middleware.ts` enforces server-side auth on protected routes

**Auth providers:** Email/password (primary), Google OAuth, Facebook OAuth

---

## Testing

### Test-Driven Development (TDD)

Follow TDD workflow: Write test first (red) → Implement minimal code (green) → Refactor

### Diagnostic Testing

**Use Playwright diagnostic tests for debugging** (not manual F12 inspection):

```typescript
test('DIAGNOSTIC: form state issue', async ({ page }) => {
  await page.goto('/LMR/slots/new');
  await page.locator('form').screenshot({ path: 'debug.png' });
  const formData = await page.evaluate(() =>
    Object.fromEntries(new FormData(document.querySelector('form')!))
  );
  console.log('Form data:', formData);
});
```

---

## Code Conventions

**Naming:**
- Variables/functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Database columns: `snake_case`
- React components: `PascalCase`

**Imports order:** External packages → Internal imports (`@/...`) → Types

---

## Agents

This project uses specialized agents in `.claude/agents/`:

| Agent | Use For |
|-------|---------|
| `parkboard-triage-specialist` | Route issues to correct agent |
| `parkboard-database-manager` | Schema patterns, idempotent migrations |
| `parkboard-api-expert` | Next.js App Router, multi-tenant routing |
| `parkboard-auth-expert` | AuthWrapper, useEffect gotchas, sign-out |
| `parkboard-test-supervisor` | Run tests, Playwright debugging |
| `parkboard-learning-guide` | Onboard to parkboard architecture |

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
