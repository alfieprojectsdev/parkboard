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
./scripts/migrate.sh                # Run migrations (supports both Supabase and Neon)
./scripts/migrate.sh status         # Check migration status

# TypeScript Migration Runner (Neon)
npm run migrate                     # Run pending migrations
npm run migrate:dry-run             # Preview migrations without executing
npx tsx scripts/run-migrations.ts   # Direct execution
```

---

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (Neon or Supabase)
- **Auth:** NextAuth.js v5 (email/password + OAuth support)
- **Testing:** Jest + React Testing Library, Playwright E2E

### Database Support

The project supports multiple PostgreSQL providers:
- **Neon** (recommended for production - serverless)
- **Supabase** (alternative with built-in auth features)
- **Local PostgreSQL** (recommended for development)

---

## Architecture

### Key Directories

```
app/                           # Next.js App Router
├── LMR/                       # LMR community routes (hardcoded for MVP)
│   ├── slots/                # Browse/view/create slots
│   └── bookings/             # User's bookings
├── (auth)/                    # Login/register pages
├── api/                       # API routes
│   └── auth/[...nextauth]/   # NextAuth.js API handlers
└── layout.tsx                 # Root layout with SessionProvider

components/
├── auth/
│   ├── AuthWrapper.tsx       # Auth context provider (client component)
│   └── SessionProvider.tsx   # NextAuth SessionProvider wrapper
├── common/Navigation.tsx      # Nav bar
└── ui/                        # shadcn/ui components

lib/
├── auth/
│   ├── auth.ts               # NextAuth.js config with providers (full config)
│   └── auth.config.ts        # Edge-compatible auth config (for middleware)
└── supabase/                  # Optional Supabase clients (legacy support)

db/
├── schema_optimized.sql      # Main schema (single source of truth)
└── migrations/               # Idempotent migration files
    ├── 001_*.sql
    ├── 002_*.sql
    └── 006_nextauth_tables.sql  # NextAuth session tables
```

### Authentication Architecture

**NextAuth.js v5** is used for authentication:

```typescript
// In Server Components and API routes:
import { auth } from '@/lib/auth/auth'
const session = await auth()

// In Client Components:
import { useSession } from 'next-auth/react'
const { data: session, status } = useSession()

// Or use AuthWrapper context:
import { useAuth } from '@/components/auth/AuthWrapper'
const { user, loading } = useAuth()
```

**Important**: Middleware uses `auth.config.ts` (edge-compatible) while API routes and Server Components use `auth.ts` (full config with database access).

---

## Database

**Schema:** Always reference `db/schema_optimized.sql` (not old versions)

### Key Tables
- `user_profiles` - User info (name, email, phone, unit_number, password_hash)
- `parking_slots` - Available slots (slot_number, type, price, owner)
- `bookings` - Booking records (slot, renter, times, status)
- `Account`, `Session`, `VerificationToken` - NextAuth.js tables (managed by migration 006)

### Critical Features

**Server-side price calculation:** Database trigger calculates `total_price` - never trust client-provided prices.

**Overlap prevention:** EXCLUDE constraint prevents double-booking at database level (no race conditions).

**RLS policies:** All tables use Row Level Security for authorization (Note: Multi-tenant support was removed in migration 004).

### Database Migrations

Migrations are **idempotent** - safe to run multiple times:
- `001_hybrid_pricing_model_idempotent.sql` - Original schema
- `002_multi_tenant_communities_idempotent.sql` - Multi-tenant support (rolled back)
- `003_community_rls_policies_idempotent.sql` - Community RLS (rolled back)
- `004_remove_multi_tenant_idempotent.sql` - Simplified single-tenant
- `005_neon_compatible_schema.sql` - Neon database compatibility
- `006_nextauth_tables.sql` - NextAuth.js session tables

Run migrations with: `./scripts/migrate.sh`

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

### 3. NextAuth.js Environment Variables

Required environment variables:
- `DATABASE_URL` or `NEON_CONNECTION_STRING` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for JWT signing (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Base URL of the app (e.g., `http://localhost:3000`)

### 4. Price Manipulation

Never send `total_price` from client. The database trigger calculates it from `price_per_hour` × duration.

### 5. Password Hashing

User passwords are hashed with bcrypt in `user_profiles.password_hash`. Always use bcrypt to compare passwords:

```typescript
import bcrypt from 'bcryptjs'
const valid = await bcrypt.compare(password, user.password_hash)
```

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

### Credentials (Email/Password)

1. User registers → Password hashed with bcrypt → Stored in `user_profiles.password_hash`
2. User logs in → NextAuth.js validates credentials → JWT token created
3. JWT contains user data (id, email, name, phone, unitNumber)
4. Session accessible via `useSession()` hook or `auth()` function
5. `middleware.ts` enforces server-side auth on protected routes

### OAuth (Google, Facebook - Future)

1. User clicks OAuth provider → Redirected to provider
2. Provider redirects to `/api/auth/callback/[provider]` with code
3. NextAuth.js exchanges code for user info → Creates `Account` record
4. If profile incomplete → Redirect to `/profile/complete` for phone/unit_number
5. User completes profile → Redirect to app

**Current providers:** Email/password (primary). OAuth support ready but not configured.

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

---

## Security Architecture

### Row Level Security (RLS)

**Status:** Migration 003 RLS policies are **SKIPPED** - Not applicable to current architecture

**Reason:** ParkBoard uses NextAuth.js v5 for session management (JWT tokens), not Supabase session cookies. RLS policies using `auth.uid()` require Supabase sessions, which we don't maintain.

**Alternative:** Application-level tenant isolation (see below)

**Documentation:** See `docs/SECURITY_ARCHITECTURE.md` for comprehensive security architecture explanation.

### Tenant Isolation Pattern (CRITICAL)

**ALL database queries MUST filter by community_code.** This is our primary security mechanism.

**Required Pattern:**
```typescript
// STEP 1: Get authenticated user's community
const authResult = await getSessionWithCommunity()
if ('error' in authResult) {
  return NextResponse.json({ error: authResult.error }, { status: authResult.status })
}

const { userId, communityCode } = authResult

// STEP 2: Filter query by community_code
const { data, error } = await supabaseAdmin
  .from('parking_slots')
  .select('*')
  .eq('community_code', communityCode)  // REQUIRED - Tenant isolation
  .eq('status', 'active')
```

**Code Review Checklist** (MANDATORY for all PRs touching database):
- [ ] Verify `getSessionWithCommunity()` is called
- [ ] Verify query includes `.eq('community_code', communityCode)`
- [ ] Check for raw SQL (should use Supabase query builder)
- [ ] Verify unit tests mock tenant isolation
- [ ] Verify E2E tests check cross-community access is blocked

### Helper Functions

**lib/auth/tenant-access.ts** provides these utilities:

```typescript
// Get session with community context (use in ALL API routes)
export async function getSessionWithCommunity()

// Verify user can access requested community
export function ensureCommunityAccess(requestedCommunity, userCommunity)
```

**Example Usage:**
```typescript
// app/api/slots/route.ts
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'

export async function GET(req: NextRequest) {
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { communityCode } = authResult

  const { data } = await supabaseAdmin
    .from('parking_slots')
    .select('*')
    .eq('community_code', communityCode)  // Application-level filtering

  return NextResponse.json({ data })
}
```

### Security Testing Requirements

**Unit Tests** - Must verify tenant isolation:
```typescript
it('should filter slots by user community code', async () => {
  mockAuth.mockResolvedValue({
    user: { id: 'user-123', communityCode: 'lmr_x7k9p2' }
  })

  await GET(mockRequest)

  expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('community_code', 'lmr_x7k9p2')
})
```

**E2E Tests** - Must verify cross-community isolation:
```typescript
test('CUJ-020: User from LMR cannot access SRP slots', async ({ page }) => {
  // Login as LMR user
  await loginAs(page, 'lmr_x7k9p2')

  // Attempt to access SRP community data (should fail)
  const response = await page.request.get('/api/slots?community=srp_m4n8q1')

  expect(response.status()).toBe(403)
})
```

---

## Security Checklist

Before deploying to production:

- [ ] All database queries filter by `community_code` (application-level tenant isolation)
- [ ] All API routes use `getSessionWithCommunity()` helper
- [ ] Unit tests verify tenant isolation for each API route
- [ ] E2E test CUJ-020 (cross-community isolation) passes
- [ ] Server-side auth checks in middleware
- [ ] Price calculated server-side (never trust client)
- [ ] OAuth redirect URIs validated
- [ ] CORS configured (if needed)
- [ ] Environment variables not exposed to client
- [ ] Rate limiting on login endpoint (P0-005)
- [ ] Generic error messages to prevent enumeration (P0-006)
- [ ] Password validation minimum 12 characters (P1-002)
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

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

**Examples:**

```bash
# Single file analysis
gemini -p "@app/api/auth/signup/route.ts Explain the signup validation flow"

# Multiple files
gemini -p "@lib/auth/auth.ts @lib/auth/auth.config.ts Compare the NextAuth configurations"

# Entire directory
gemini -p "@components/auth/ Summarize all authentication components and their purposes"

# Multiple directories
gemini -p "@app/(auth)/ @components/auth/ Compare the authentication UI pages and auth components"

# Current directory and subdirectories
gemini -p "@./ Give me an overview of the ParkBoard architecture"

# Or use --all_files flag
gemini --all_files -p "Analyze all TypeScript files and identify common patterns"
```

### Implementation Verification Examples

```bash
# Check if a feature is implemented
gemini -p "@app/ @components/ Is multi-tenant support fully implemented? Show relevant code"

# Verify authentication flow
gemini -p "@lib/auth/ @app/api/auth/ Does the NextAuth.js setup match the documentation in CLAUDE.md?"

# Check for security patterns
gemini -p "@app/api/ @middleware.ts Are all API routes properly protected with authentication checks?"

# Verify database schema consistency
gemini -p "@db/ @lib/ Does the database schema match the TypeScript interfaces?"

# Check test coverage
gemini -p "@__tests__/ @e2e/ What user journeys are covered by tests and what's missing?"

# Verify RLS policies
gemini -p "@db/schema_optimized.sql Are RLS policies implemented for all tables?"

# Check pricing logic
gemini -p "@db/schema_optimized.sql @app/api/ Is price calculation server-side only?"

# Verify component patterns
gemini -p "@components/ Do all components follow the same pattern for error handling?"
```

### When to Use Gemini CLI

Use `gemini -p` when:
- Analyzing entire codebases or large directories
- Comparing multiple implementations (e.g., different auth flows)
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if authentication, multi-tenancy, or security patterns are consistent
- Checking for data consistency between schema and code
- Understanding the complete booking workflow across components
- Cross-referencing database schema with API routes
- Analyzing test coverage across unit and E2E tests

### Important Notes

- Paths in `@` syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for `--yolo` flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results
- Particularly useful for verifying consistency between database schema and application code
- Helpful for understanding multi-tenant architecture and RLS policies

### Multimodal Capabilities

Gemini CLI is multimodal and can read PDFs, images, and screenshots. This is particularly useful for analyzing UI/UX or documentation.

**Reading Screenshots:**

```bash
# Analyze UI screenshots from Playwright tests
gemini -p "@e2e/screenshots/*.png Analyze the booking form UI for accessibility issues"

# Compare before/after screenshots
gemini -p "@screenshots/before.png @screenshots/after.png What changed in the UI?"
```

**Reading Documentation:**

```bash
# Extract requirements from PDF docs
gemini -p "@docs/*.pdf Summarize all security requirements mentioned in the documentation"
```

**Use Cases for Multimodal Analysis:**

- **UI/UX review** - Analyze screenshots for accessibility and design consistency
- **Visual regression testing** - Compare screenshots to detect unintended changes
- **Documentation extraction** - Pull requirements from PDF specs
- **Diagram analysis** - Understand architecture diagrams or flowcharts

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
