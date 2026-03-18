# Multi-Tenancy Implementation Improvements for Parkboard

**Document Version:** 1.0
**Date:** 2025-12-06
**Status:** Recommendation
**Author:** Technical Analysis based on Washboard patterns

---

## Executive Summary

### Current State vs Desired State

**Current State:**
- Multi-tenancy attempted (migration 002) but rolled back (migration 004)
- Hardcoded to single community `'LMR'` in signup API
- No tenant context in session management (NextAuth.js)
- No application-level tenant isolation checks
- URL routing hardcoded to `/LMR/` paths
- RLS policies removed, leaving no row-level authorization

**Desired State:**
- Explicit community code multi-tenancy (3-field login: Community Code + Email + Password)
- Community context in every session (NextAuth JWT)
- Tenant isolation enforced at application AND database level
- Single-route architecture (`parkboard.app/login` - no path-based routing)
- Community codes as shared secrets (distributed via group chat)
- Defense-in-depth: RLS policies + application checks

**Current Security Vulnerabilities:**

⚠️ **CRITICAL**: No tenant isolation - any authenticated user can access all communities' data
⚠️ **HIGH**: Hardcoded `'LMR'` in signup prevents new community onboarding
⚠️ **MEDIUM**: No RLS policies - database-level authorization completely absent
⚠️ **MEDIUM**: Session lacks community context - requires database lookup on every request

### Why Multi-Tenancy Matters for Parkboard

1. **Scalability**: Support multiple condos (LMR, SRP, BGC) without code duplication
2. **Data Isolation**: Prevent users from one community accessing another's parking slots/bookings
3. **Customization**: Per-community branding, pricing, rules (already designed in migration 002)
4. **Revenue**: Each community becomes a separate tenant/customer
5. **Security**: Proper tenant isolation is a compliance requirement for multi-tenant SaaS

### Migration Path Complexity Estimate

- **Difficulty**: Medium (3-4 days of work)
- **Risk**: Low (migrations already written and tested in migration 002/003)
- **Breaking Changes**: Minimal (re-applying previously rolled back migrations)
- **Data Migration**: Simple (all existing data assigned to `'LMR'`)

---

## Recommended Architecture

Based on Washboard's proven multi-tenant implementation, we recommend **Option 1: Explicit Community Code (Direct Washboard Pattern)** - a single-database, row-level multi-tenancy pattern with 3-field login (Community Code + Email + Password).

### Community Code Format

Community codes use a secure alphanumeric format to prevent enumeration:

```
Format: {acronym}_{random_alphanumeric}
Examples:
  - lmr_x7k9p2  (Lumiere Residences)
  - srp_m4n8q1  (Serendra Park)
  - bgc_r6t3w5  (Bonifacio Global City)

Distribution: Via trusted group chat (Telegram/WhatsApp/Viber)
Security: Acts as shared secret, not public information
Length: 10-12 characters (3-4 char acronym + underscore + 6-7 char random)
```

**Why This Pattern?**
- **Security**: Difficult-to-guess codes prevent enumeration attacks
- **Simplicity**: Single-route architecture (`/login`, `/dashboard` - no dynamic `[communityCode]` routing)
- **Social Trust**: Distributed to pre-vetted users via group chat
- **Proven**: Mirrors Washboard's successful 3-field login (Branch Code + Username + Password)

### Why Not Path-Based Routing?

| Aspect | Path-Based (/LMR/login) | Explicit Code (Recommended) |
|--------|------------------------|------------------------------|
| **Security** | Community codes visible in URL | Codes are shared secrets |
| **Routing** | Complex dynamic routes | Simple single-route architecture |
| **Hosting** | Path/subdomain constraints | No hosting limitations |
| **SEO/Analytics** | Path segments pollute data | Clean, unified analytics |
| **User Discovery** | Public (via URL enumeration) | Private (via trusted channel) |
| **Code Complexity** | Middleware, dynamic layouts | Session-based, straightforward |
| **Revocability** | Must change URLs | Change DB value, no code deploy |
| **User Mobility** | URL changes if user moves | Same URL, different community code |

### 1. Database Schema Changes

**Pattern from Washboard:**

Every table includes `branch_code` as the first column in composite indexes, with foreign keys to the `branches` table:

```sql
-- Washboard pattern
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  branch_code VARCHAR(20) NOT NULL REFERENCES branches(branch_code) ON DELETE CASCADE,
  -- ... other columns
);

CREATE INDEX idx_bookings_branch_status_position
  ON bookings(branch_code, status, position);
```

**Recommended for Parkboard:**

Re-apply migration 002 with `community_code` column on all tenant-scoped tables:

```sql
-- Parkboard pattern
CREATE TABLE parking_slots (
  slot_id SERIAL PRIMARY KEY,
  community_code TEXT NOT NULL REFERENCES communities(community_code) ON DELETE RESTRICT,
  -- ... other columns
);

-- Composite index: community_code FIRST (critical for query performance)
CREATE INDEX idx_slots_community_status
  ON parking_slots(community_code, status);
```

**Tables requiring `community_code`:**
- `user_profiles` (which community does this user belong to?)
- `parking_slots` (which community owns this slot?)
- `bookings` (inherited from slot's community, for denormalization/performance)

### 2. Session Management Updates

**Washboard Pattern:**

Session stores `branchCode` alongside user data:

```typescript
// washboard-app/src/lib/auth/session.ts
export interface SessionData {
  userId: number;
  branchCode: string;  // ← Tenant context in session
  username: string;
  name: string;
  email: string | null;
  role: string;
}
```

**Recommended for Parkboard:**

Extend NextAuth.js CredentialsProvider to accept community code:

```typescript
// lib/auth/auth.ts - CredentialsProvider
credentials: {
  communityCode: { label: 'Community Code', type: 'text' },
  email: { label: 'Email', type: 'email' },
  password: { label: 'Password', type: 'password' },
},

async authorize(credentials) {
  // Validate user belongs to specified community
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', credentials.email)
    .eq('community_code', credentials.communityCode)
    .single();

  if (!profile) {
    throw new Error('Invalid credentials or community code');
  }

  // Verify password (bcrypt comparison)
  const isValid = await bcrypt.compare(credentials.password, profile.password_hash);
  if (!isValid) {
    throw new Error('Invalid credentials or community code');
  }

  // Return user with communityCode for JWT
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    communityCode: profile.community_code, // ← Include for session
  };
}

// JWT callback - store communityCode
async jwt({ token, user }) {
  if (user) {
    token.userId = user.id ?? '';
    token.communityCode = user.communityCode ?? null; // ← Add tenant context
    // ... other fields
  }
  return token;
}

// Session callback - expose to client
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.userId as string;
    session.user.communityCode = token.communityCode as string; // ← Expose to client
    // ... other fields
  }
  return session;
}
```

**Type extensions:**

```typescript
declare module 'next-auth' {
  interface User {
    communityCode?: string;
  }

  interface Session {
    user: {
      id: string;
      communityCode: string; // ← Add to session type
      // ... other fields
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    communityCode?: string; // ← Add to JWT type
  }
}
```

### 3. API Route Protection Pattern

**Washboard Pattern:**

Every authenticated API route checks tenant access:

```typescript
// washboard-app/src/app/api/bookings/route.ts
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authResult = await isAuthenticated(request);
  if (!authResult.authenticated || !authResult.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { branchCode: userBranchCode } = authResult.session;

  // 2. Parse tenant parameter
  const branchCode = searchParams.get('branchCode') || userBranchCode;

  // 3. CRITICAL: Enforce tenant access
  if (branchCode !== userBranchCode) {
    return NextResponse.json({ error: 'Access denied to other branches' }, { status: 403 });
  }

  // 4. Query with tenant filter
  const result = await db.query(
    'SELECT * FROM bookings WHERE branch_code = $1', // ← Always filter by tenant
    [branchCode]
  );
  // ...
}
```

**Recommended for Parkboard:**

Create a reusable tenant access helper:

```typescript
// lib/auth/tenant-access.ts
import { auth } from '@/lib/auth/auth';

export async function getSessionWithCommunity() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (!session.user.communityCode) {
    return { error: 'No community assigned', status: 403 };
  }

  return {
    session,
    userId: session.user.id,
    communityCode: session.user.communityCode,
  };
}

export function ensureCommunityAccess(
  requestedCommunity: string,
  userCommunity: string
): { error?: string; status?: number } {
  if (requestedCommunity !== userCommunity) {
    return {
      error: 'Access denied to other communities',
      status: 403
    };
  }
  return {};
}
```

**Usage in API routes:**

```typescript
// app/api/parking-slots/route.ts
export async function GET(request: NextRequest) {
  const authResult = await getSessionWithCommunity();

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { communityCode } = authResult;

  // ALWAYS scope queries to user's community
  const result = await db.query(
    `SELECT * FROM parking_slots
     WHERE community_code = $1 AND status = 'active'`,
    [communityCode]
  );

  return NextResponse.json({ slots: result.rows });
}
```

### 4. Login/Signup UX Flow

**Signup Page (app/signup/page.tsx)**

**Fields (in order):**
1. Community Code (text input, placeholder: "Provided by your building admin")
2. Email (email input)
3. Password (password input, min 8 chars)
4. Full Name (text input)
5. Phone (tel input)
6. Unit Number (text input, e.g., "12-A")

**Validation:**
- Community code must exist in `communities` table and have `status = 'active'`
- Email must be globally unique (check across ALL communities)
- Unit number must be unique within the community
- Password must meet security requirements (bcrypt with cost 12)

**Error Messages:**
- "Invalid community code. Please check with your building admin."
- "This email is already registered in your community."
- "This email is registered in another community. Contact support to migrate."
- "Unit {number} is already registered. Contact your admin if incorrect."

**Login Page (app/login/page.tsx)**

**Fields (in order):**
1. Community Code (text input, same as signup)
2. Email (email input)
3. Password (password input)

**Validation:**
- Query: `WHERE email = ? AND community_code = ?`
- Bcrypt password comparison
- Generic error: "Invalid credentials or community code" (prevent enumeration)

**Database Uniqueness Constraints:**
```sql
-- Email is globally unique (allows user mobility between communities)
CREATE UNIQUE INDEX idx_user_profiles_email ON user_profiles(email);

-- Unit number is unique per community (prevents duplicate accounts)
CREATE UNIQUE INDEX idx_user_profiles_community_unit
  ON user_profiles(community_code, unit_number);
```

---

## Step-by-Step Migration Plan

### Phase 1: Database Schema (Re-apply Migration 002 with Complex Codes)

**Goal:** Restore `community_code` column and `communities` table with secure alphanumeric codes

**Steps:**

1. Update migration 002 to use complex community codes:

```sql
-- db/migrations/002_multi_tenant_communities_idempotent.sql (UPDATED)

-- 1. Create communities table
CREATE TABLE IF NOT EXISTS communities (
  community_code TEXT PRIMARY KEY,  -- "lmr_x7k9p2" format (not simple "LMR")
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 2. Insert LMR with new complex code format
INSERT INTO communities (community_code, name, display_name, status) VALUES (
  'lmr_x7k9p2',  -- ✅ Complex alphanumeric code (updated from simple 'LMR')
  'Lumiere Residences',
  'Lumiere',
  'active'
) ON CONFLICT (community_code) DO NOTHING;

-- 3. Add community_code to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS community_code TEXT;

-- 4. Backfill existing users to LMR with new code
UPDATE user_profiles SET community_code = 'lmr_x7k9p2' WHERE community_code IS NULL;

-- 5. Add NOT NULL constraint
ALTER TABLE user_profiles ALTER COLUMN community_code SET NOT NULL;

-- 6. Add foreign key constraint
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_community
  FOREIGN KEY (community_code) REFERENCES communities(community_code) ON DELETE RESTRICT;

-- 7. Keep email globally unique (important for user mobility)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 8. Add community + unit_number uniqueness (prevents duplicate accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_community_unit
  ON user_profiles(community_code, unit_number);

-- 9. Add community_code to parking_slots
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS community_code TEXT;

-- 10. Backfill parking_slots
UPDATE parking_slots SET community_code = 'lmr_x7k9p2' WHERE community_code IS NULL;

-- 11. Add NOT NULL constraint
ALTER TABLE parking_slots ALTER COLUMN community_code SET NOT NULL;

-- 12. Add foreign key constraint
ALTER TABLE parking_slots ADD CONSTRAINT fk_slot_community
  FOREIGN KEY (community_code) REFERENCES communities(community_code) ON DELETE RESTRICT;

-- 13. Add indexes (community_code FIRST for query performance)
CREATE INDEX IF NOT EXISTS idx_slots_community_status
  ON parking_slots(community_code, status);
```

2. Apply migration to Neon database:

```bash
psql $NEON_CONNECTION_STRING < db/migrations/002_multi_tenant_communities_idempotent.sql
```

3. Verify tables:

```sql
-- Check communities table exists with complex code
SELECT * FROM communities WHERE community_code = 'lmr_x7k9p2';

-- Verify email global uniqueness
\d user_profiles
-- Should show: idx_user_profiles_email UNIQUE (email)

-- Verify community + unit uniqueness
-- Should show: idx_user_profiles_community_unit UNIQUE (community_code, unit_number)

-- Check parking_slots has community_code
\d parking_slots;
```

**Expected Result:**
- `communities` table with `lmr_x7k9p2` entry (not simple 'LMR')
- `user_profiles.community_code` column (NOT NULL, references communities)
- Email globally unique (allows user mobility)
- Unit number unique per community
- `parking_slots.community_code` column (NOT NULL, references communities)
- Foreign key constraints enforced
- Indexes created with community_code first

**Rollback Plan:**
```bash
# If issues occur, re-run migration 004
psql $NEON_CONNECTION_STRING < db/migrations/004_remove_multi_tenant_idempotent.sql
```

---

### Phase 2: Session Integration (3-Field Login)

**Goal:** Add `communityCode` to NextAuth.js CredentialsProvider and session

**Steps:**

1. Update signup to accept and validate community code:

```typescript
// app/api/auth/signup/route.ts
export async function POST(req: NextRequest) {
  const { communityCode, email, password, name, phone, unitNumber } = await req.json();

  // ✅ STEP 1: Validate community code exists and is active
  const { data: community } = await supabase
    .from('communities')
    .select('community_code, status')
    .eq('community_code', communityCode)
    .eq('status', 'active')
    .single();

  if (!community) {
    return NextResponse.json(
      { error: 'Invalid community code. Please check with your building admin.' },
      { status: 400 }
    );
  }

  // ✅ STEP 2: Check email globally unique (allows user mobility)
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('email, community_code')
    .eq('email', email)
    .single();

  if (existingUser) {
    if (existingUser.community_code === communityCode) {
      return NextResponse.json(
        { error: 'This email is already registered in your community.' },
        { status: 409 }
      );
    } else {
      return NextResponse.json(
        { error: 'This email is registered in another community. Contact support to migrate.' },
        { status: 409 }
      );
    }
  }

  // ✅ STEP 3: Check unit number unique per community
  const { data: existingUnit } = await supabase
    .from('user_profiles')
    .select('unit_number')
    .eq('community_code', communityCode)
    .eq('unit_number', unitNumber)
    .single();

  if (existingUnit) {
    return NextResponse.json(
      { error: `Unit ${unitNumber} is already registered. Contact your admin if incorrect.` },
      { status: 409 }
    );
  }

  // ✅ STEP 4: Create user profile WITH validated community_code
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      community_code: communityCode,  // ✅ From validated user input (not hardcoded)
      email, name, phone,
      unit_number: unitNumber,
    });

  // ... rest of signup
}
```

2. Update auth.ts to accept community code in credentials:

```typescript
// lib/auth/auth.ts
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        communityCode: { label: 'Community Code', type: 'text' },  // ← Add this
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.communityCode || !credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        // ✅ Query with BOTH email AND community_code
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email, name, phone, unit_number, password_hash, community_code')
          .eq('email', credentials.email)
          .eq('community_code', credentials.communityCode)  // ← Validate community match
          .single();

        if (!profile) {
          // Generic error prevents enumeration
          throw new Error('Invalid credentials or community code');
        }

        // Verify password (bcrypt comparison)
        const isValid = await bcrypt.compare(credentials.password, profile.password_hash);
        if (!isValid) {
          throw new Error('Invalid credentials or community code');
        }

        // Return user with communityCode for JWT
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          phone: profile.phone,
          unitNumber: profile.unit_number,
          communityCode: profile.community_code, // ← Include for session
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id ?? '';
        token.communityCode = (user as any).communityCode ?? null; // ← Store in JWT
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.communityCode = token.communityCode as string; // ← Expose to client
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};
```

3. Extend TypeScript types:

```typescript
// lib/auth/auth.ts (bottom of file)
declare module 'next-auth' {
  interface User {
    communityCode?: string; // ← Add this
  }

  interface Session {
    user: {
      id: string;
      communityCode: string; // ← Add this
      email: string;
      name: string;
      phone?: string;
      unitNumber?: string;
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    communityCode?: string; // ← Add this
  }
}
```

**Testing:**

```typescript
// Test in a server component or API route
import { auth } from '@/lib/auth/auth';

const session = await auth();
console.log('User community:', session?.user?.communityCode); // Should print 'lmr_x7k9p2'
```

---

### Phase 3: API Route Protection

**Goal:** Add community checks to all API routes

**Steps:**

1. Create tenant access helper:

```typescript
// lib/auth/tenant-access.ts
import { auth } from '@/lib/auth/auth';

export async function getSessionWithCommunity() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (!session.user.communityCode) {
    return { error: 'No community assigned', status: 403 };
  }

  return {
    session,
    userId: session.user.id,
    communityCode: session.user.communityCode,
  };
}

export function ensureCommunityAccess(
  requestedCommunity: string,
  userCommunity: string
): { error?: string; status?: number } {
  if (requestedCommunity !== userCommunity) {
    return {
      error: 'Access denied to other communities',
      status: 403
    };
  }
  return {};
}
```

2. Update existing API routes (example patterns):

**Before (no tenant isolation):**
```typescript
// app/api/parking-slots/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();

  // ⚠️ NO TENANT FILTERING - SECURITY ISSUE
  const result = await db.query('SELECT * FROM parking_slots WHERE status = $1', ['active']);

  return NextResponse.json({ slots: result.rows });
}
```

**After (with tenant isolation):**
```typescript
// app/api/parking-slots/route.ts
import { getSessionWithCommunity } from '@/lib/auth/tenant-access';

export async function GET(request: NextRequest) {
  const authResult = await getSessionWithCommunity();

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { communityCode } = authResult;

  // ✅ TENANT FILTERING ENFORCED
  const result = await db.query(
    `SELECT * FROM parking_slots
     WHERE community_code = $1 AND status = $2`,
    [communityCode, 'active']
  );

  return NextResponse.json({ slots: result.rows });
}
```

3. Audit all API routes:

```bash
# Find all API route files
find app/api -name "route.ts" -type f

# Expected files to update:
# - app/api/parking-slots/route.ts
# - app/api/bookings/route.ts (if exists)
# - Any other data access routes
```

**Checklist for each route:**
- ✅ Calls `getSessionWithCommunity()` for auth
- ✅ Extracts `communityCode` from session
- ✅ Filters database queries with `WHERE community_code = $1`
- ✅ Validates tenant access for cross-community operations (e.g., admin routes)

---

### Phase 4: Navigation and UI Updates

**Goal:** Update UI to use single-route architecture (no path-based routing)

**Steps:**

1. Update navigation components (community code in session, not URL):

```typescript
// components/Navbar.tsx
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export function Navbar() {
  const { data: session } = useSession();

  // Community code is in session, NOT in URL path
  // User accesses: parkboard.app/dashboard (not /lmr_x7k9p2/dashboard)

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/slots">My Slots</Link>
      <Link href="/bookings">My Bookings</Link>

      {/* Display community info from session */}
      {session?.user?.communityCode && (
        <span className="community-badge">
          {session.user.communityCode}
        </span>
      )}
    </nav>
  );
}
```

2. Update page redirects after signup/login:

```typescript
// app/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  async function handleSignIn(communityCode: string, email: string, password: string) {
    const result = await signIn('credentials', {
      communityCode,  // ← Community code as credential, not URL param
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      // Redirect to unified dashboard (no community in path)
      router.push('/dashboard');
    } else {
      // Show error (generic message to prevent enumeration)
      setError('Invalid credentials or community code');
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      handleSignIn(
        formData.get('communityCode'),
        formData.get('email'),
        formData.get('password')
      );
    }}>
      <input name="communityCode" placeholder="Community Code" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

3. Protected pages check session (no path validation needed):

```typescript
// app/dashboard/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  // Simple auth check (no path-based community validation)
  if (!session?.user) {
    redirect('/login');
  }

  const { communityCode } = session.user;

  // Fetch data scoped to user's community (from session)
  const slots = await fetchSlots(communityCode);

  return (
    <div>
      <h1>Dashboard - {communityCode}</h1>
      {/* Display community-specific data */}
    </div>
  );
}
```

4. Middleware simplified (no path-based routing to validate):

```typescript
// middleware.ts (OPTIONAL - can be omitted for simple auth)
import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/signup', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protected routes (auth required)
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // No path-based community validation needed
  // Community isolation handled by API routes via session
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### Phase 5: Testing and Rollout

**Goal:** Validate tenant isolation works correctly

**Test Cases:**

1. **Unit Tests - Tenant Access Helper**

```typescript
// __tests__/lib/auth/tenant-access.test.ts
import { ensureCommunityAccess } from '@/lib/auth/tenant-access';

describe('ensureCommunityAccess', () => {
  it('allows access to own community', () => {
    const result = ensureCommunityAccess('LMR', 'LMR');
    expect(result.error).toBeUndefined();
  });

  it('blocks access to other communities', () => {
    const result = ensureCommunityAccess('SRP', 'LMR');
    expect(result.error).toBe('Access denied to other communities');
    expect(result.status).toBe(403);
  });
});
```

2. **Integration Tests - API Routes**

```typescript
// __tests__/api/parking-slots.test.ts
import { GET } from '@/app/api/parking-slots/route';
import { NextRequest } from 'next/server';

describe('GET /api/parking-slots', () => {
  it('returns only slots from user\'s community', async () => {
    // Mock session with community_code = 'LMR'
    jest.mock('@/lib/auth/auth', () => ({
      auth: async () => ({
        user: { id: 'user-1', communityCode: 'LMR' }
      })
    }));

    const request = new NextRequest('http://localhost/api/parking-slots');
    const response = await GET(request);
    const data = await response.json();

    // Verify all slots belong to LMR
    expect(data.slots.every((s: any) => s.community_code === 'LMR')).toBe(true);
  });

  it('returns 401 for unauthenticated requests', async () => {
    jest.mock('@/lib/auth/auth', () => ({
      auth: async () => null
    }));

    const request = new NextRequest('http://localhost/api/parking-slots');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

3. **E2E Tests - Multi-Community Isolation**

```typescript
// e2e/multi-tenancy.spec.ts
import { test, expect } from '@playwright/test';

test('user cannot access other community via URL manipulation', async ({ page }) => {
  // Login as LMR user
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'user@lmr.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Verify redirected to LMR dashboard
  await expect(page).toHaveURL(/\/LMR\/dashboard/);

  // Attempt to access SRP dashboard (should redirect back to LMR)
  await page.goto('/SRP/dashboard');
  await expect(page).toHaveURL(/\/LMR\/dashboard/);
});
```

4. **Database-Level Verification**

```sql
-- Verify no orphaned community references
SELECT
  up.id,
  up.community_code,
  c.community_code as community_exists
FROM user_profiles up
LEFT JOIN communities c ON up.community_code = c.community_code
WHERE c.community_code IS NULL;
-- Should return 0 rows

-- Verify all slots have valid community
SELECT
  ps.slot_id,
  ps.community_code,
  c.community_code as community_exists
FROM parking_slots ps
LEFT JOIN communities c ON ps.community_code = c.community_code
WHERE c.community_code IS NULL;
-- Should return 0 rows
```

**Rollout Checklist:**

- [ ] Migration 002 applied to production database
- [ ] Session includes `communityCode` (verify with test login)
- [ ] All API routes filter by `community_code`
- [ ] Middleware validates community access
- [ ] Navigation uses dynamic community paths
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual QA on staging environment
- [ ] Database verification queries passing
- [ ] Rollback plan documented

---

## Code Examples

### Before/After Comparisons

#### 1. Signup API Route

**Before (Current Parkboard - Hardcoded):**

```typescript
// app/api/auth/signup/route.ts (CURRENT - WRONG)
const { error: profileError } = await supabaseAdmin
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    name, email, phone, unit_number,
    community_code: 'LMR'  // ❌ HARDCODED - prevents multi-tenancy
  });
```

**After (Recommended - User-Provided with Validation):**

```typescript
// app/api/auth/signup/route.ts (RECOMMENDED)
export async function POST(req: NextRequest) {
  const { communityCode, email, password, name, phone, unitNumber } = await req.json();

  // ✅ STEP 1: Validate community code exists and is active
  const { data: community } = await supabase
    .from('communities')
    .select('community_code, status')
    .eq('community_code', communityCode)
    .eq('status', 'active')
    .single();

  if (!community) {
    return NextResponse.json(
      { error: 'Invalid community code. Please check with your building admin.' },
      { status: 400 }
    );
  }

  // ✅ STEP 2: Check email globally unique
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('email, community_code')
    .eq('email', email)
    .single();

  if (existingUser) {
    if (existingUser.community_code === communityCode) {
      return NextResponse.json(
        { error: 'This email is already registered in your community.' },
        { status: 409 }
      );
    } else {
      return NextResponse.json(
        { error: 'This email is registered in another community. Contact support to migrate.' },
        { status: 409 }
      );
    }
  }

  // ✅ STEP 3: Check unit number unique per community
  const { data: existingUnit } = await supabase
    .from('user_profiles')
    .select('unit_number')
    .eq('community_code', communityCode)
    .eq('unit_number', unitNumber)
    .single();

  if (existingUnit) {
    return NextResponse.json(
      { error: `Unit ${unitNumber} is already registered. Contact your admin if incorrect.` },
      { status: 409 }
    );
  }

  // ✅ STEP 4: Create user profile WITH validated community_code
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      community_code: communityCode,  // ✅ From validated user input
      email, name, phone,
      unit_number: unitNumber,
    });

  // ... rest of signup
}
```

---

#### 2. Session Data Structure

**Washboard Pattern:**

```typescript
// washboard-app/src/lib/auth/session.ts
export interface SessionData {
  userId: number;
  branchCode: string;      // ← Tenant in session
  username: string;
  name: string;
  email: string | null;
  role: string;
}

// Usage in API route
const { branchCode } = authResult.session;
const result = await db.query(
  'SELECT * FROM bookings WHERE branch_code = $1',
  [branchCode]  // ← Always filter by tenant
);
```

**Current Parkboard (No Tenant Context):**

```typescript
// lib/auth/auth.ts
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    unitNumber: string | null;
    // ⚠️ NO COMMUNITY CODE - missing tenant context
  }
}

// Current usage - NO TENANT FILTERING
const result = await db.query('SELECT * FROM parking_slots WHERE status = $1', ['active']);
// ⚠️ Returns ALL communities' data
```

**Recommended Parkboard:**

```typescript
// lib/auth/auth.ts
interface Session {
  user: {
    id: string;
    communityCode: string;   // ✅ Tenant in session
    name: string;
    email: string;
    phone: string | null;
    unitNumber: string | null;
  }
}

// Recommended usage
const { communityCode } = session.user;
const result = await db.query(
  'SELECT * FROM parking_slots WHERE community_code = $1 AND status = $2',
  [communityCode, 'active']  // ✅ Always filter by tenant
);
```

---

#### 3. API Route Protection

**Washboard Pattern:**

```typescript
// washboard-app/src/app/api/bookings/route.ts
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authResult = await isAuthenticated(request);
  if (!authResult.authenticated || !authResult.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { branchCode: userBranchCode } = authResult.session;

  // 2. Parse query params
  const { searchParams } = new URL(request.url);
  const branchCode = searchParams.get('branchCode') || userBranchCode;

  // 3. CRITICAL: Enforce tenant access
  if (branchCode !== userBranchCode) {
    return NextResponse.json(
      { error: 'Access denied to other branches', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 4. Query with tenant filter (parameterized)
  const result = await db.query(
    'SELECT * FROM bookings WHERE branch_code = $1',
    [branchCode]
  );

  return NextResponse.json({ success: true, bookings: result.rows });
}
```

**Current Parkboard (No Tenant Checks):**

```typescript
// Hypothetical app/api/parking-slots/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ⚠️ NO TENANT FILTERING - returns all communities' data
  const result = await db.query(
    'SELECT * FROM parking_slots WHERE status = $1',
    ['active']
  );

  return NextResponse.json({ slots: result.rows });
}
```

**Recommended Parkboard:**

```typescript
// app/api/parking-slots/route.ts
import { getSessionWithCommunity } from '@/lib/auth/tenant-access';

export async function GET(request: NextRequest) {
  // 1. Authenticate with community context
  const authResult = await getSessionWithCommunity();

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { communityCode } = authResult;

  // 2. Query with tenant filter (parameterized)
  const result = await db.query(
    `SELECT slot_id, slot_number, slot_type, price_per_hour, description
     FROM parking_slots
     WHERE community_code = $1 AND status = $2`,
    [communityCode, 'active']
  );

  return NextResponse.json({
    success: true,
    community: communityCode,
    slots: result.rows
  });
}
```

---

## Performance Considerations

### Index Strategy

**Critical Pattern from Washboard:**

Always put `tenant_column` FIRST in composite indexes:

```sql
-- ✅ CORRECT: community_code first
CREATE INDEX idx_slots_community_status
  ON parking_slots(community_code, status);

-- ❌ WRONG: status first (doesn't benefit tenant filtering)
CREATE INDEX idx_slots_status_community
  ON parking_slots(status, community_code);
```

**Why?** PostgreSQL can use the index efficiently when filtering by leading columns:

```sql
-- Uses idx_slots_community_status efficiently
SELECT * FROM parking_slots
WHERE community_code = 'LMR' AND status = 'active';

-- Cannot use idx_slots_status_community efficiently (must scan all 'active' rows)
SELECT * FROM parking_slots
WHERE community_code = 'LMR' AND status = 'active';
```

**Recommended Indexes for Parkboard:**

```sql
-- user_profiles
CREATE INDEX idx_user_profiles_community
  ON user_profiles(community_code);

-- parking_slots
CREATE INDEX idx_slots_community_status
  ON parking_slots(community_code, status);

CREATE INDEX idx_slots_community_owner
  ON parking_slots(community_code, owner_id);

-- bookings
CREATE INDEX idx_bookings_community_status
  ON bookings(community_code, status);

CREATE INDEX idx_bookings_community_renter
  ON bookings(community_code, renter_id, status);

-- Covering index for marketplace queries
CREATE INDEX idx_slots_marketplace
  ON parking_slots(community_code, status, slot_id)
  INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  WHERE status = 'active';
```

### Query Optimization

**Always use parameterized queries with tenant filter:**

```sql
-- ✅ GOOD: Parameterized, tenant-scoped
SELECT * FROM parking_slots
WHERE community_code = $1 AND status = $2;

-- ❌ BAD: No tenant filter (returns all communities)
SELECT * FROM parking_slots
WHERE status = $1;

-- ❌ DANGEROUS: String concatenation (SQL injection risk)
SELECT * FROM parking_slots
WHERE community_code = '${communityCode}';
```

**Use EXPLAIN ANALYZE to verify index usage:**

```sql
EXPLAIN ANALYZE
SELECT * FROM parking_slots
WHERE community_code = 'LMR' AND status = 'active';

-- Look for:
-- "Index Scan using idx_slots_community_status"
-- NOT "Seq Scan on parking_slots"
```

### Caching Per Community

**Session-based caching:**

Since `communityCode` is in the session, you can cache API responses per community:

```typescript
// lib/cache/community-cache.ts
import { unstable_cache } from 'next/cache';

export const getCommunitySlots = unstable_cache(
  async (communityCode: string) => {
    const result = await db.query(
      `SELECT * FROM parking_slots
       WHERE community_code = $1 AND status = 'active'`,
      [communityCode]
    );
    return result.rows;
  },
  ['community-slots'], // Cache key prefix
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: (communityCode) => [`community-${communityCode}-slots`],
  }
);

// Usage in API route
const slots = await getCommunitySlots(communityCode);
```

**Cache invalidation:**

```typescript
// When a slot is updated
import { revalidateTag } from 'next/cache';

await db.query(
  'UPDATE parking_slots SET status = $1 WHERE slot_id = $2',
  ['maintenance', slotId]
);

// Invalidate cache for this community
revalidateTag(`community-${communityCode}-slots`);
```

---

## Security Implications

### Community Code as Shared Secret

**Distribution Channel:** Trusted group chat (Telegram/WhatsApp/Viber)

**Security Properties:**
1. **Pre-vetting**: Only group members receive code (admin knows who has access)
2. **Social accountability**: Users known to community admin (not anonymous signups)
3. **Barrier to entry**: Prevents random signups and enumeration attacks
4. **Revocability**: Admin can rotate code if compromised (change DB value, no code deploy)
5. **Audit trail**: Track which code was used at signup (forensics if needed)

**Attack Scenarios Prevented:**
- ❌ **Enumeration**: Attacker cannot guess community codes (complex alphanumeric format)
- ❌ **Cross-community access**: Must know correct code for target community
- ❌ **Automated bots**: Cannot discover communities via URL path scanning
- ❌ **Social engineering**: Less effective (user expects to receive code from known admin)
- ❌ **Phishing**: Harder to trick users (they know code should come from specific group chat)

**Code Rotation Procedure:**
```sql
-- Step 1: Admin generates new code (e.g., using random generator)
-- Old: lmr_x7k9p2 → New: lmr_j8m3n5

-- Step 2: Update communities table
UPDATE communities
SET community_code = 'lmr_j8m3n5'
WHERE community_code = 'lmr_x7k9p2';
-- Foreign keys CASCADE automatically update user_profiles and parking_slots

-- Step 3: Announce in group chat
-- "New community code effective immediately: lmr_j8m3n5"

-- Step 4: Existing users unaffected (session persists, FK cascades)
-- Step 5: New signups use new code only
```

**Why NOT Path-Based Routing:**
- Path-based exposes community codes in URLs (`/lmr_x7k9p2/login`)
- URLs leak in browser history, server logs, analytics, referrer headers
- Shared links accidentally expose codes to unauthorized users
- Difficult to rotate (would break bookmarked URLs)

---

### Current Vulnerabilities

⚠️ **CRITICAL: No Tenant Isolation**

**Attack Scenario:**

```typescript
// Current API route (no tenant filtering)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ⚠️ VULNERABILITY: Returns ALL communities' data
  const result = await db.query('SELECT * FROM parking_slots');
  return NextResponse.json({ slots: result.rows });
}
```

**Impact:**
- User from LMR can see SRP and BGC parking slots
- User can book slots from other communities
- Data privacy violation (GDPR/CCPA concern)
- Revenue leakage (users book cheaper slots from other communities)

---

⚠️ **HIGH: No RLS Policies**

Migration 004 removed all RLS policies, leaving zero database-level authorization:

```sql
-- Migration 004 removed these policies:
DROP POLICY IF EXISTS "community_read_profiles" ON user_profiles;
DROP POLICY IF EXISTS "community_read_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_read_own_bookings" ON bookings;
```

**Impact:**
- If application-level checks fail, database has no defense
- Direct database access (e.g., SQL injection) bypasses all authorization
- No defense-in-depth

---

### How Recommended Changes Fix Vulnerabilities

✅ **Application-Level Tenant Isolation**

```typescript
// Recommended API route (with tenant filtering)
import { getSessionWithCommunity } from '@/lib/auth/tenant-access';

export async function GET(request: NextRequest) {
  const authResult = await getSessionWithCommunity();

  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { communityCode } = authResult;

  // ✅ FIX: Always filter by community_code
  const result = await db.query(
    'SELECT * FROM parking_slots WHERE community_code = $1',
    [communityCode]
  );

  return NextResponse.json({ slots: result.rows });
}
```

**Benefits:**
- Users can only see their community's data
- Session provides single source of truth for tenant context
- Query parameters cannot override tenant isolation

---

✅ **Database-Level RLS Policies (Defense-in-Depth)**

Re-apply migration 003 to restore RLS policies with community filtering:

```sql
-- migration 003_community_rls_policies_idempotent.sql

-- User Profiles: Only see profiles in your community
CREATE POLICY "community_read_profiles" ON user_profiles
  FOR SELECT USING (
    community_code = current_setting('app.current_community', true)
  );

-- Parking Slots: Only see slots in your community
CREATE POLICY "community_read_slots" ON parking_slots
  FOR SELECT USING (
    community_code = current_setting('app.current_community', true)
  );

-- Bookings: Only see bookings for your community's slots
CREATE POLICY "community_read_own_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parking_slots
      WHERE slot_id = bookings.slot_id
      AND community_code = current_setting('app.current_community', true)
    )
  );
```

**Set community context before queries:**

```typescript
// lib/db/with-community.ts
export async function queryWithCommunity(
  communityCode: string,
  queryText: string,
  params: any[]
) {
  const client = await db.connect();
  try {
    // Set RLS context
    await client.query(
      `SET LOCAL app.current_community = $1`,
      [communityCode]
    );

    // Execute query (RLS policies automatically apply)
    const result = await client.query(queryText, params);
    return result;
  } finally {
    client.release();
  }
}
```

**Benefits:**
- Even if application code forgets tenant filter, RLS prevents data leakage
- Defense-in-depth: Application checks + Database checks
- Audit trail: Database logs show which community context was used

---

### Defense-in-Depth Approach

**Layer 1: Middleware (Path Validation)**
```typescript
// middleware.ts
// Validates user belongs to requested community in URL
if (session.user.communityCode !== pathCommunity) {
  return NextResponse.redirect('/forbidden');
}
```

**Layer 2: Application (API Routes)**
```typescript
// API routes
// Validates tenant access and filters queries
const { communityCode } = await getSessionWithCommunity();
const result = await db.query(
  'SELECT * FROM parking_slots WHERE community_code = $1',
  [communityCode]
);
```

**Layer 3: Database (RLS Policies)**
```sql
-- RLS policies
-- Automatically filter rows based on current_setting('app.current_community')
CREATE POLICY "community_read_slots" ON parking_slots
  FOR SELECT USING (
    community_code = current_setting('app.current_community', true)
  );
```

**Result:** If any single layer fails, others prevent data leakage.

---

## Testing Strategy

### Unit Tests for Tenant Isolation

```typescript
// __tests__/lib/auth/tenant-access.test.ts
import { getSessionWithCommunity, ensureCommunityAccess } from '@/lib/auth/tenant-access';

describe('Tenant Access Control', () => {
  describe('getSessionWithCommunity', () => {
    it('returns error for unauthenticated requests', async () => {
      jest.mock('@/lib/auth/auth', () => ({
        auth: async () => null,
      }));

      const result = await getSessionWithCommunity();
      expect(result.error).toBe('Unauthorized');
      expect(result.status).toBe(401);
    });

    it('returns error for users without community', async () => {
      jest.mock('@/lib/auth/auth', () => ({
        auth: async () => ({ user: { id: 'user-1' } }),
      }));

      const result = await getSessionWithCommunity();
      expect(result.error).toBe('No community assigned');
      expect(result.status).toBe(403);
    });

    it('returns session with community for valid users', async () => {
      jest.mock('@/lib/auth/auth', () => ({
        auth: async () => ({
          user: { id: 'user-1', communityCode: 'LMR' }
        }),
      }));

      const result = await getSessionWithCommunity();
      expect(result.communityCode).toBe('LMR');
      expect(result.userId).toBe('user-1');
    });
  });

  describe('ensureCommunityAccess', () => {
    it('allows access to own community', () => {
      const result = ensureCommunityAccess('LMR', 'LMR');
      expect(result.error).toBeUndefined();
    });

    it('blocks access to other communities', () => {
      const result = ensureCommunityAccess('SRP', 'LMR');
      expect(result.error).toBe('Access denied to other communities');
      expect(result.status).toBe(403);
    });

    it('is case-sensitive', () => {
      const result = ensureCommunityAccess('lmr', 'LMR');
      expect(result.error).toBe('Access denied to other communities');
    });
  });
});
```

---

### E2E Tests for Multi-Community Flows

```typescript
// e2e/multi-tenancy.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenancy Isolation', () => {
  test('LMR user sees only LMR parking slots via API', async ({ page }) => {
    // Login as LMR user with community code
    await page.goto('/login');
    await page.fill('input[name="communityCode"]', 'lmr_x7k9p2');
    await page.fill('input[name="email"]', 'user@lmr.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify redirected to unified dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to slots page
    await page.goto('/slots');

    // Verify all displayed slots are from LMR
    const slotCommunities = await page.$$eval(
      '[data-testid="slot-community"]',
      (elements) => elements.map((el) => el.textContent)
    );

    expect(slotCommunities.every((c) => c === 'lmr_x7k9p2')).toBe(true);
  });

  test('SRP user sees only SRP parking slots via API', async ({ page }) => {
    // Login as SRP user with different community code
    await page.goto('/login');
    await page.fill('input[name="communityCode"]', 'srp_m4n8q1');
    await page.fill('input[name="email"]', 'user@srp.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify redirected to unified dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to slots page
    await page.goto('/slots');

    // Verify all displayed slots are from SRP
    const slotCommunities = await page.$$eval(
      '[data-testid="slot-community"]',
      (elements) => elements.map((el) => el.textContent)
    );

    expect(slotCommunities.every((c) => c === 'srp_m4n8q1')).toBe(true);
  });

  test('Invalid community code shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="communityCode"]', 'invalid_code');
    await page.fill('input[name="email"]', 'user@lmr.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show error (not redirect)
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials or community code'
    );
  });

  test('API endpoints enforce tenant isolation', async ({ request }) => {
    // Login as LMR user to get auth cookie
    const loginResponse = await request.post('/api/auth/callback/credentials', {
      data: {
        communityCode: 'lmr_x7k9p2',
        email: 'user@lmr.com',
        password: 'password123',
      },
    });

    const cookies = loginResponse.headers()['set-cookie'];

    // Fetch parking slots (should only return LMR slots)
    const slotsResponse = await request.get('/api/parking-slots', {
      headers: { Cookie: cookies },
    });

    const { slots } = await slotsResponse.json();
    expect(slots.every((s: any) => s.community_code === 'lmr_x7k9p2')).toBe(true);

    // Verify NO slots from other communities
    expect(slots.some((s: any) => s.community_code === 'srp_m4n8q1')).toBe(false);
  });

  test('Email registered in different community shows specific error', async ({ page }) => {
    // Attempt to signup with email already registered in LMR
    await page.goto('/signup');
    await page.fill('input[name="communityCode"]', 'srp_m4n8q1');  // SRP code
    await page.fill('input[name="email"]', 'existing@lmr.com');    // LMR user's email
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '09171234567');
    await page.fill('input[name="unitNumber"]', '10-A');
    await page.click('button[type="submit"]');

    // Should show specific error about cross-community conflict
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'This email is registered in another community. Contact support to migrate.'
    );
  });
});
```

---

### Data Migration Validation

```sql
-- Verify all users assigned to valid communities
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN community_code IS NOT NULL THEN 1 END) as assigned_users,
  COUNT(CASE WHEN community_code IS NULL THEN 1 END) as unassigned_users
FROM user_profiles;

-- Expected: total_users = assigned_users, unassigned_users = 0

-- Verify all slots assigned to valid communities
SELECT
  community_code,
  COUNT(*) as slot_count
FROM parking_slots
GROUP BY community_code
ORDER BY community_code;

-- Expected: All slots grouped by community_code (e.g., LMR: 50, SRP: 0, BGC: 0)

-- Verify foreign key integrity
SELECT
  up.id,
  up.community_code,
  c.community_code as community_exists
FROM user_profiles up
LEFT JOIN communities c ON up.community_code = c.community_code
WHERE c.community_code IS NULL;

-- Expected: 0 rows (all user_profiles.community_code references valid communities.community_code)

-- Verify RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'parking_slots', 'bookings')
ORDER BY tablename, policyname;

-- Expected: Multiple policies per table (e.g., community_read_*, community_update_*, etc.)
```

---

## Alternative Approaches

### 1. Schema-per-Tenant

**Pattern:**
- Each community gets its own schema: `lmr.parking_slots`, `srp.parking_slots`
- Set `search_path` based on user's community

**Pros:**
- Complete data isolation at schema level
- Easy to backup/restore individual tenants
- No risk of accidental cross-tenant queries

**Cons:**
- Schema proliferation (dozens of schemas for dozens of communities)
- Complex migrations (must apply to all schemas)
- Cannot easily query across tenants (e.g., global admin dashboard)
- PostgreSQL connection limits (need separate connections per schema)

**Verdict:** ❌ Overkill for Parkboard (only 3-5 expected communities)

---

### 2. Database-per-Tenant

**Pattern:**
- Each community gets its own database: `parkboard_lmr`, `parkboard_srp`
- Route requests to different databases based on community

**Pros:**
- Maximum isolation (separate databases, separate credentials)
- Scale horizontally by community (e.g., LMR on one server, SRP on another)
- Compliance-friendly (customer data in separate databases)

**Cons:**
- Extreme complexity (multiple database connections, connection pooling)
- Migrations nightmare (apply to all databases)
- Cross-tenant queries impossible (e.g., "total slots across all communities")
- Expensive (multiple database instances, each with overhead)

**Verdict:** ❌ Not suitable for Parkboard (small-scale SaaS with 3-5 communities)

---

### 3. Single-Database-Multi-Tenant (Recommended)

**Pattern:**
- Single database, `community_code` column in every table
- Application-level + RLS-level tenant filtering
- Shared indexes, shared resources, efficient queries

**Pros:**
- ✅ Simple to implement (Parkboard already has migrations 002/003)
- ✅ Easy to maintain (single codebase, single database)
- ✅ Cost-effective (one database instance, shared resources)
- ✅ Cross-tenant queries possible (e.g., admin analytics)
- ✅ Proven pattern (Washboard uses this successfully)

**Cons:**
- Requires careful tenant filtering in all queries
- Potential for bugs (forgetting to filter by community_code)
- Shared database resources (one tenant's heavy load affects others)

**Mitigation:**
- Use helper functions (`getSessionWithCommunity()`) to enforce filtering
- Add RLS policies as defense-in-depth
- Use indexed queries (community_code first) for performance
- Monitor query patterns with `pg_stat_statements`

**Verdict:** ✅ **Recommended for Parkboard**

---

## References

### Washboard Patterns

**Session Management:**
- `/home/finch/repos/washboard/washboard-app/src/lib/auth/session.ts`
- Pattern: `SessionData` interface includes `branchCode`
- Session stored in PostgreSQL with `branch_code` column

**Database Schema:**
- `/home/finch/repos/washboard/washboard-app/src/lib/schema.sql`
- Pattern: Every table has `branch_code VARCHAR(20) NOT NULL REFERENCES branches(branch_code)`
- Composite indexes: `branch_code` is always first column

**API Route Protection:**
- `/home/finch/repos/washboard/washboard-app/src/app/api/bookings/route.ts`
- Pattern: `if (branchCode !== userBranchCode) return 403`
- Pattern: `WHERE branch_code = $1` in all queries

**Transaction Safety:**
- `/home/finch/repos/washboard/washboard-app/src/app/api/bookings/[id]/route.ts`
- Pattern: `BEGIN TRANSACTION`, `SERIALIZABLE isolation level`, `COMMIT/ROLLBACK`
- Pattern: Row locking with `FOR UPDATE` to prevent race conditions

---

### PostgreSQL Multi-Tenancy Best Practices

**Official PostgreSQL Documentation:**
- Multi-tenancy patterns: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Row-level security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Indexing strategies: https://www.postgresql.org/docs/current/indexes-multicolumn.html

**Community Resources:**
- "Multi-Tenancy in PostgreSQL" by Citus Data
- "Single vs Multi Database Multi-Tenancy" by AWS
- "Shared Database vs Shared Schema vs Database per Tenant" by Microsoft

**Key Takeaways:**
1. Always filter queries by tenant column (`community_code`)
2. Index tenant column first in composite indexes
3. Use RLS policies as defense-in-depth
4. Monitor query performance with `EXPLAIN ANALYZE`
5. Test tenant isolation with dedicated E2E tests

---

## Appendix: Migration File Reference

### Migration 002 (Add Multi-Tenancy)

**File:** `db/migrations/002_multi_tenant_communities_idempotent.sql`

**Status:** Already exists, idempotent, safe to re-run

**Key Changes:**
- Creates `communities` table
- Adds `community_code` column to `user_profiles` and `parking_slots`
- Backfills existing data with `'LMR'`
- Adds foreign key constraints
- Creates indexes (`idx_user_community`, `idx_slot_community`)

**To Apply:**
```bash
psql $NEON_CONNECTION_STRING < db/migrations/002_multi_tenant_communities_idempotent.sql
```

---

### Migration 003 (Add RLS Policies)

**File:** `db/migrations/003_community_rls_policies_idempotent.sql`

**Status:** Exists, needs to be re-applied after migration 002

**Key Changes:**
- Creates helper functions (`set_community_context`, `get_community_context`)
- Adds RLS policies for `user_profiles`, `parking_slots`, `bookings`
- Enables row-level security on tables

**To Apply:**
```bash
psql $NEON_CONNECTION_STRING < db/migrations/003_community_rls_policies_idempotent.sql
```

---

### Migration 004 (Remove Multi-Tenancy)

**File:** `db/migrations/004_remove_multi_tenant_idempotent.sql`

**Status:** Already applied, this is what rolled back multi-tenancy

**Key Changes:**
- Drops RLS policies
- Removes `community_code` columns
- Drops `communities` table
- Creates simplified RLS policies (no tenant filtering)

**Note:** We will NOT re-apply this migration (it removes multi-tenancy)

---

## Summary

Multi-tenancy is critical for Parkboard's growth to support multiple communities. The **confirmed approach is Option 1: Explicit Community Code (Direct Washboard Pattern)** with 3-field login:

### Implementation Summary

1. **Database Schema (Phase 1)**
   - Re-apply migration 002 with complex community codes (`lmr_x7k9p2` format)
   - Email globally unique (allows user mobility between communities)
   - Unit number unique per community (prevents duplicate accounts)
   - Foreign key constraints with CASCADE updates

2. **Session Integration (Phase 2)**
   - Update NextAuth.js CredentialsProvider to accept community code
   - Validate community code exists and is active during login/signup
   - Store `communityCode` in JWT and expose to session
   - Check email uniqueness across ALL communities (not just one)

3. **API Route Protection (Phase 3)**
   - Add tenant checks to all API routes using `getSessionWithCommunity()` helper
   - Always filter database queries with `WHERE community_code = $1`
   - Prevent cross-community data access via session validation

4. **UI/Navigation Updates (Phase 4)**
   - Single-route architecture (`/login`, `/dashboard` - NO path-based routing)
   - Community code displayed in session badge (not in URL)
   - 3-field login form: Community Code + Email + Password
   - 6-field signup form: + Name + Phone + Unit Number

5. **RLS Policies (Defense-in-Depth)**
   - Re-apply migration 003 for database-level tenant isolation
   - Set `app.current_community` before queries
   - Automatic row filtering even if application code forgets

6. **Testing (Phase 5)**
   - Unit tests for tenant access helpers
   - Integration tests for API route isolation
   - E2E tests for 3-field login flow
   - Database validation queries

### Security Benefits

✅ **Community codes as shared secrets** (not public URLs)
✅ **Social accountability** (pre-vetted users via group chat)
✅ **Revocability** (admin can rotate codes via DB update)
✅ **Defense-in-depth** (application + database-level checks)
✅ **Simple architecture** (session-based, no complex routing)
✅ **Proven pattern** (mirrors Washboard's 3-field login)

### Operational Benefits

✅ **No hosting constraints** (single domain, no path/subdomain complexity)
✅ **Clean analytics** (no community codes in URL paths)
✅ **Easy code rotation** (DB update, no code deployment)
✅ **User mobility** (email globally unique, can migrate communities)

---

**Next Steps:**

1. ✅ **Review this document** - Confirmed Option 1 (Explicit Community Code)
2. **Update migration 002** - Use complex alphanumeric codes (`lmr_x7k9p2`)
3. **Schedule staging deployment** - Apply migration to staging database
4. **Implement Phase 2** - Update signup/login routes for 3-field authentication
5. **Implement Phase 3** - Add tenant isolation to all API routes
6. **Implement Phase 4** - Update UI components (remove path-based routing)
7. **Run full test suite** - Unit + integration + E2E tests (Phase 5)
8. **Production deployment** - With rollback plan ready (migration 004)

---

**Questions?** Contact the technical team for clarification on any section.
