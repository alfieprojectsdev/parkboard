# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ParkBoard** is a parking slot booking system for residential condominiums, built as an MVP using Next.js 15, Supabase (PostgreSQL), and TypeScript. It follows a hotel-booking pattern with users, parking slots, and bookings, featuring a mixed ownership model (owned + shared slots).

**Current Status**: MVP 1.1 - Production Ready

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server at http://localhost:3000
npm run build           # Production build
npm start               # Start production server
```

### Testing
```bash
npm test                # Run Jest unit tests
npm run test:e2e        # Run Playwright e2e tests
npm run type-check      # TypeScript type checking without emit
```

### Linting
```bash
npm run lint            # Run Next.js linter
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Backend**: Next.js API routes (server-side)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (extends `auth.users`)

### Critical Directory Structure
```
app/
├── api/                    # Server-side API routes
│   ├── bookings/          # Booking CRUD with overlap checking
│   ├── slots/             # Slot management (admin only)
│   ├── profiles/          # User profile management
│   └── payments/          # Payment handling (future)
├── admin/                 # Admin dashboard and management pages
├── bookings/              # User booking pages
├── dashboard/             # User dashboard
├── login/                 # Auth pages
└── reset-password/        # Password reset flow

components/
├── auth/                  # AuthWrapper (context provider), auth forms
├── booking/               # BookingForm, SlotGrid, TimeRangePicker
├── common/                # Navigation, ErrorDisplay, shared components
├── admin/                 # Admin-specific components
├── dashboard/             # Dashboard components
└── ui/                    # shadcn/ui primitives (Button, Card, etc.)

lib/
├── supabase.ts           # Client-side Supabase client (anon key)
├── supabaseServer.ts     # Server-side Supabase client (service role)
├── constants.ts          # Business rules (BOOKING_RULES, etc.)
└── utils.ts              # Utility functions

db/
├── schema.sql            # Canonical schema (v3 unified with ownership)
├── rls_policies.sql      # Row Level Security policies
├── migrations/           # Schema migration scripts
└── useful_queries.sql    # Common queries for debugging
```

### Database Schema (Core Tables)

**`user_profiles`** (extends `auth.users`)
- Primary Key: `id` (uuid, FK to `auth.users`)
- Fields: `name`, `unit_number`, `email`, `phone`, `vehicle_plate`, `role` ('resident' | 'admin')
- **Important**: NEVER modify `auth.users` directly - always use `user_profiles`

**`parking_slots`**
- Primary Key: `slot_id` (serial)
- Unique: `slot_number`
- Fields: `slot_type` ('covered' | 'uncovered' | 'visitor'), `status` ('available' | 'maintenance' | 'reserved')
- **Ownership**: `owner_id` (uuid, nullable) - NULL means shared/visitor slot
- Owned slots can only be booked by the owner; shared slots (owner_id IS NULL) can be booked by anyone

**`bookings`**
- Primary Key: `booking_id` (serial)
- Foreign Keys: `user_id` (auth.users), `slot_id` (parking_slots)
- Fields: `start_time`, `end_time` (TIMESTAMPTZ in UTC), `status` ('confirmed' | 'cancelled' | 'completed' | 'no_show'), `notes`
- **Constraints**: Overlap checking enforced at API level, not database level

**`payments`** (optional, for future use)
- Links to bookings for payment tracking

### Authentication & Authorization Flow

1. **Client-side Auth**: `AuthWrapper.tsx` provides React Context with `user`, `profile`, `loading`, `sessionError`
2. **Session Management**: Periodic session checks (5 min interval), automatic refresh
3. **API Authentication**: API routes use either:
   - Anon key (client operations with RLS)
   - Service role key (server operations bypassing RLS for validation)
4. **RLS Policies**: Enforce data access at database level
   - Users see only their own data
   - Admins have broader SELECT/UPDATE access
   - Ownership rules enforced in booking INSERT policy

### Business Rules (Frozen for 30 Days - See `parkboard_mvp_plan.md`)

**Booking Constraints** (defined in `lib/constants.ts`):
```typescript
BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
}
```

**Validation Layer**:
- **Client-side**: `BookingForm.tsx` validates before API call
- **Server-side**: `/api/bookings` route validates and enforces overlap checking
- Always mirror server-side validation logic when updating UI

**Slot Ownership Rules**:
- Users can only book slots they own (`owner_id = user_id`) OR shared slots (`owner_id IS NULL`)
- Enforced at RLS level and validated in `/api/bookings` route
- UI displays "Your Slot" badge for owned slots in `SlotGrid.tsx`

### Common Workflows

#### Creating/Updating a Booking
1. User selects time range in `TimeRangePicker.tsx`
2. `SlotGrid.tsx` queries available slots (filters by availability + ownership)
3. User selects slot, `BookingForm.tsx` validates rules
4. POST to `/api/bookings` with overlap checking
5. Server validates ownership, checks conflicts, inserts booking

#### Admin Operations
- Admin routes in `app/admin/` require `role = 'admin'` check
- Use `AdminDashboardContent.tsx` as reference for admin data fetching
- Admin operations bypass some RLS policies but should respect business rules

### Important Files to Read First

When working on a feature, start with these:

**Database/Schema**:
- `db/schema.sql` - Canonical schema
- `db/rls_policies.sql` - Security policies
- `db/useful_queries.sql` - Debugging queries

**API Layer**:
- `app/api/bookings/route.ts` - Booking logic with validation
- `app/api/slots/route.ts` - Slot management
- `app/api/profiles/route.ts` - Profile CRUD

**Core Components**:
- `components/auth/AuthWrapper.tsx` - Auth context provider
- `components/booking/BookingForm.tsx` - Booking creation flow
- `components/booking/SlotGrid.tsx` - Slot selection with ownership display
- `app/admin/AdminDashboardContent.tsx` - Admin data fetching patterns

### Critical Patterns & Conventions

#### Supabase Client Usage
```typescript
// Client-side (with RLS)
import { supabase } from '@/lib/supabase'; // Uses NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side (bypasses RLS - use cautiously)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Rule**: Use service role key ONLY in API routes for validation logic. Never expose it to client.

#### Timezone Handling
- Database stores all timestamps as `TIMESTAMPTZ` (UTC)
- Convert to local timezone ONLY when rendering in UI
- API routes work with ISO 8601 strings

#### Component Reuse
- **Extend existing components** rather than duplicating
- Key reusable components: `AuthWrapper`, `Navigation`, `ErrorDisplay`, `BookingForm`, `SlotGrid`
- shadcn/ui components in `components/ui/` are customizable

#### Path Aliases
```typescript
import { supabase } from '@/lib/supabase';  // '@/' resolves to project root
import { useAuth } from '@/components/auth/AuthWrapper';
```

### Pitfalls & Guardrails

1. **DO NOT modify `auth.users` directly** - Use `user_profiles` table
2. **RLS is the security boundary** - Do not bypass in client code
3. **Service role key = trusted code only** - Already used in some API routes; follow existing patterns
4. **Business rules are frozen for 30 days** - Do not change schema or booking constraints without explicit approval
5. **Overlap checking is server-side** - Trust the API, not the UI state
6. **Type safety**: TypeScript `strict: false` in config, but use types where possible
7. **Keep changes small and reversible** - Prefer adding helpers over large refactors during MVP phase

### Testing Approach

- **Unit Tests**: Use Jest for component logic (`tests/unit/`)
- **E2E Tests**: Use Playwright for critical flows (`tests/e2e.spec.ts`)
- **Manual Testing**: Follow `docs/merged_qa_checklist.md` for comprehensive QA
- **Test Data**: Use `db/fixed_development_seed.sql` for consistent test data

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

### Common Debugging Queries

See `db/useful_queries.sql` for examples:
- View all bookings with slot details
- Check slot ownership
- Identify booking conflicts
- Audit user roles

### Additional Context

- **Mobile Responsive**: All UI components are mobile-first (Tailwind breakpoints)
- **Error Handling**: Use `ErrorDisplay` component for consistent error messages
- **Loading States**: Always show loading indicators during async operations
- **Success Feedback**: Use `SuccessMessage` component after mutations

### When Making Changes

1. **Read the existing code first** - Understand patterns before implementing
2. **Check business rules** - Refer to `lib/constants.ts` and `parkboard_mvp_plan.md`
3. **Test both client and server** - Validation must match on both sides
4. **Verify RLS policies** - Ensure changes don't bypass security
5. **Update types** - Keep TypeScript definitions in sync
6. **Keep it minimal** - MVP phase prioritizes working code over perfect code

### Support & Documentation

- **Planning Docs**: `docs/parkboard_mvp_plan.md`, `docs/businessflows.md`
- **QA Checklist**: `docs/merged_qa_checklist.md`
- **ERD**: `docs/ERD.md`
- **Progress Tracking**: `docs/progress.md`