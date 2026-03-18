# ParkBoard Authentication Architecture Analysis
**Date:** 2026-03-18
**Status:** Production - NextAuth.js v5 with Neon/Supabase PostgreSQL
**Comprehensive Analysis:** Complete authentication flow, middleware troubleshooting history, and JWT token structure

---

## Executive Summary

ParkBoard uses **NextAuth.js v5** for authentication with a split-config architecture to handle Edge Runtime constraints:

- **`lib/auth/auth.ts`** - Full configuration with database access, providers, JWT/session callbacks
- **`lib/auth/auth.config.ts`** - Edge-compatible configuration with route authorization logic only
- **`middleware.ts`** - Protects routes using Edge Runtime (imports from `auth.config.ts`)
- **Custom JWT tokens** - Extended with custom fields: `phone`, `unitNumber`, `communityCode`
- **Session Strategy** - JWT-based (serverless-optimized, no session store needed)
- **Database** - PostgreSQL (Neon or Supabase) with `user_profiles` table
- **Security** - Rate limiting (P0-005), bcrypt password hashing, tenant isolation via `communityCode`

---

## 1. Authentication Flow - Complete Architecture

### 1.1 Entry Points

**Browser Request → Middleware → Route Protection**

```
1. User requests /LMR/slots/new (protected route)
   ↓
2. Middleware.ts runs
   - Imports: export { auth as middleware } from '@/lib/auth/auth.config'
   - Calls: authorized({ auth, request }) callback
   - Checks: Is user authenticated? Is this a public route?
   ↓
3. If unauthenticated:
   - Redirect to /login?redirect=/LMR/slots/new
   - Return Response.redirect()
   ↓
4. If authenticated:
   - Allow request to proceed
   - Session data available in auth object
```

### 1.2 Login Flow

**User Credentials → Verification → JWT Token Creation**

```
1. User submits form: { communityCode: 'LMR', email, password }
   ↓
2. NextAuth.js Credentials Provider (auth.ts) receives credentials
   - In: authorize(credentials) callback
   ↓
3. Rate Limiting Check
   - Call: checkRateLimit(email)
   - Default: 5 attempts per 15 minutes
   - If exceeded: Return null (failed login)
   - P0-005 Security Feature
   ↓
4. Database Query
   - Query: user_profiles table
   - Filter: WHERE email = $1 AND community_code = $2
   - Why community_code? Multi-tenant isolation
   ↓
5. Password Verification
   - Call: bcrypt.compare(password, user.password_hash)
   - If invalid: Return null (failed login)
   ↓
6. User Object Returned
   {
     id: 'user-123',
     email: 'user@example.com',
     name: 'John Doe',
     phone: '555-1234',
     unitNumber: '1201',
     communityCode: 'LMR',
   }
   ↓
7. JWT Callback Triggered
   - Called with: { token, user }
   - Adds custom fields to token
   - token.userId = user.id
   - token.phone = user.phone
   - token.unitNumber = user.unitNumber
   - token.communityCode = user.communityCode
   ↓
8. JWT Token Created & Stored
   - Algorithm: HS256 (HMAC with SHA-256)
   - Secret: process.env.NEXTAUTH_SECRET
   - MaxAge: 30 days
   - Strategy: 'jwt' (serverless-optimized)
   ↓
9. Client Receives Token
   - Stored in NextAuth.js secure cookie: __Secure-next-auth.session-token
   - HttpOnly: true (cannot be accessed via JavaScript)
   - Secure: true (HTTPS only in production)
   - SameSite: Lax (CSRF protection)
```

### 1.3 Session Access in Components

**Two Patterns:**

#### Pattern A: Client Components (useSession Hook)
```typescript
// Client Component (use 'use client')
import { useSession } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>Loading...</div>
  if (status === 'unauthenticated') return <div>Not logged in</div>

  // session.user available here
  const { id, email, name, phone, unitNumber, communityCode } = session.user
}
```

#### Pattern B: Server Components (auth() function)
```typescript
// Server Component (no 'use client')
import { auth } from '@/lib/auth/auth'

export default async function MyComponent() {
  const session = await auth()

  if (!session) {
    return <div>Not logged in</div>
  }

  // session.user available here
  const { id, email, name, phone, unitNumber, communityCode } = session.user
}
```

### 1.4 Sign Out Flow

```
1. User clicks "Logout" button
   ↓
2. Client calls: signOut() from next-auth/react
   ↓
3. NextAuth.js:
   - Clears secure cookie (__Secure-next-auth.session-token)
   - Redirects to: /login (or custom signout page)
   ↓
4. Middleware blocks further access to protected routes
   - Redirects to /login?redirect=/...
```

---

## 2. Middleware Troubleshooting History

### 2.1 The Edge Runtime Problem

**What is Edge Runtime?**
- Lightweight JavaScript runtime used by Vercel for middleware
- Cannot import Node.js built-in modules (fs, path, pg, crypto, etc.)
- Cannot use Node.js-specific libraries (bcrypt, pg, etc.)
- Much faster than full Node.js runtime

**Error Experienced:**
```
MIDDLEWARE_INVOCATION_FAILED
Cannot find module 'pg' (from file '..../lib/auth/auth.ts')
```

**Root Cause:**
```typescript
// ❌ OLD MIDDLEWARE (BROKEN)
// middleware.ts was importing from auth.ts which contains:
import { auth } from '@/lib/auth/auth'

// Inside auth.ts:
import { Pool } from 'pg'           // ← Node.js only!
import bcrypt from 'bcryptjs'       // ← Node.js crypto only!
```

### 2.2 Fix Timeline

| Commit | Date | Issue | Fix |
|--------|------|-------|-----|
| `f033d35` | Jan 7, 2:38pm | Middleware can't import Node.js modules | Created `auth.config.ts` (edge-compatible), middleware imports from it |
| `43ea289` | Jan 7, 4:12pm | Middleware still importing from wrong location | Updated `middleware.ts` to import from `auth.config.ts` directly |
| `98193e1` | Jan 7 | Build errors from duplicate exports | Cleaned up duplicate export statement in `auth.config.ts` |
| `786d2c3` | Jan 7 | Middleware still buggy after export fix | Updated middleware import path again |
| `360dd55` | Jan 7, 4:18pm | Final cleanup: simplify `auth.config.ts` to single export | Remove all unnecessary code, keep only what Edge Runtime needs |

### 2.3 The Solution: Split Config Architecture

**The key insight:** NextAuth.js provides `authConfig` object that can run without database calls.

```typescript
// ============================================================================
// lib/auth/auth.config.ts (EDGE-COMPATIBLE)
// ============================================================================
// Contains ONLY:
// - Public/protected route definitions
// - authorized() callback (route checks, redirects)
// - Empty providers array
// - NO database imports
// - NO bcrypt imports
// - NO Node.js APIs

import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request }) {
      // Simple checks only - no database queries
      const isAuthenticated = !!auth?.user
      const pathname = request.nextUrl.pathname

      if (pathname.startsWith('/api/')) {
        return true  // API routes handle own auth
      }

      if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
        return Response.redirect(new URL('/login', request.nextUrl.origin))
      }

      return true
    },
  },
  providers: [],  // Empty - added in auth.ts
}

export default authConfig

// ============================================================================
// lib/auth/auth.ts (FULL CONFIGURATION - Node.js Only)
// ============================================================================
// Contains:
// - All providers (Credentials, Google, etc.)
// - Database connection & user lookup
// - JWT and Session callbacks
// - Password validation
// - Rate limiting
// - NodeAuth.js initialization

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { Pool } from 'pg'           // ← Node.js only
import bcrypt from 'bcryptjs'       // ← Node.js only

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,  // Spread edge-compatible config

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  providers: [
    Credentials({
      async authorize(credentials) {
        // Database query
        const db = getPool()
        const result = await db.query(...)

        // Password check
        const valid = await bcrypt.compare(password, hash)

        // Return user
        return { id, email, name, phone, unitNumber, communityCode }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // Add custom fields to JWT
      if (user) {
        token.phone = user.phone
        token.unitNumber = user.unitNumber
        token.communityCode = user.communityCode
      }
      return token
    },
    session({ session, token }) {
      // Expose JWT fields to session
      session.user.phone = token.phone
      session.user.unitNumber = token.unitNumber
      session.user.communityCode = token.communityCode
      return session
    },
  },
})

// ============================================================================
// middleware.ts (USES EDGE-COMPATIBLE CONFIG)
// ============================================================================
// Imports ONLY the edge-compatible config
export { auth as middleware } from '@/lib/auth/auth.config'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|...)).*)',],
}
```

### 2.4 Why This Architecture Works

| Component | Runtime | Can Import | Used For |
|-----------|---------|------------|----------|
| `auth.config.ts` | Edge Runtime | Only pure JS/TypeScript | Route authorization checks |
| `auth.ts` | Node.js | pg, bcrypt, etc. | User lookup, password validation, JWT signing |
| `middleware.ts` | Edge Runtime | Only `auth.config.ts` | Protect routes on every request |
| `API routes` | Node.js | pg, bcrypt, etc. | Custom authentication logic |
| `Server Components` | Node.js | `auth.ts` directly | Get current session |
| `Client Components` | Browser | `useSession()` hook | Access session data |

---

## 3. JWT Token Structure

### 3.1 What's In the JWT

**Original NextAuth.js fields:**
```typescript
{
  sub: 'user-123',                    // Subject (user ID)
  name: 'John Doe',
  email: 'john@example.com',
  iat: 1673177400,                    // Issued at (Unix timestamp)
  exp: 1705799400,                    // Expires at (30 days later)
  jti: 'abc123def456',                // JWT ID (unique identifier)
}
```

**Custom fields added by ParkBoard:**
```typescript
{
  // Standard NextAuth.js
  sub: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  iat: 1673177400,
  exp: 1705799400,
  jti: 'abc123def456',

  // ParkBoard Custom Fields (from JWT callback in auth.ts)
  userId: 'user-123',           // Redundant with sub, but explicit
  phone: '555-1234',            // From user_profiles.phone
  unitNumber: '1201',           // From user_profiles.unit_number (camelCased)
  communityCode: 'LMR',         // From user_profiles.community_code (camelCased)
}
```

### 3.2 Where Custom Fields Are Set

**In `lib/auth/auth.ts` - JWT Callback:**
```typescript
callbacks: {
  async jwt({ token, user }) {
    // Called when JWT is created or updated
    if (user) {  // Only on initial sign-in
      token.userId = user.id
      token.name = user.name
      token.email = user.email

      // Custom fields (from Credentials provider authorize())
      if ('phone' in user) {
        token.phone = user.phone as string | null
      }
      if ('unitNumber' in user) {
        token.unitNumber = user.unitNumber as string | null
      }
      if ('communityCode' in user) {
        token.communityCode = user.communityCode as string
      }
    }
    return token
  },
},
```

### 3.3 Where They're Exposed to Sessions

**In `lib/auth/auth.ts` - Session Callback:**
```typescript
callbacks: {
  async session({ session, token }) {
    // Called when session is accessed
    if (session.user) {
      session.user.id = token.userId as string
      session.user.name = token.name as string
      session.user.email = token.email as string

      // Expose custom fields to client
      session.user.phone = token.phone as string | null
      session.user.unitNumber = token.unitNumber as string | null
      session.user.communityCode = token.communityCode as string
    }
    return session
  },
},
```

### 3.4 TypeScript Type Extensions

**Declaring the custom fields:**
```typescript
// In lib/auth/auth.ts at bottom

declare module 'next-auth' {
  interface User {
    phone?: string | null
    unitNumber?: string | null
    communityCode?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      phone: string | null
      unitNumber: string | null
      communityCode: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    phone?: string | null
    unitNumber?: string | null
    communityCode?: string
  }
}
```

---

## 4. Client vs Server Authentication

### 4.1 Client Components (Requires SessionProvider)

**Setup in `app/layout.tsx`:**
```typescript
import AuthSessionProvider from '@/components/auth/SessionProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthSessionProvider>  {/* Enables useSession() hook */}
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
```

**Usage in Client Components:**
```typescript
'use client'

import { useSession } from 'next-auth/react'

export default function ClientComponent() {
  const { data: session, status } = useSession()

  // Access custom fields
  const phone = session?.user?.phone
  const unitNumber = session?.user?.unitNumber
  const communityCode = session?.user?.communityCode
}
```

### 4.2 Server Components (Direct auth() call)

**No SessionProvider needed - works automatically**

```typescript
import { auth } from '@/lib/auth/auth'

export default async function ServerComponent() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Access custom fields
  const phone = session.user.phone
  const unitNumber = session.user.unitNumber
  const communityCode = session.user.communityCode
}
```

### 4.3 API Routes

**Pattern with tenant isolation:**
```typescript
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'

export async function GET(req: Request) {
  // Get session + verify community assignment
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { userId, communityCode } = authResult

  // Verify user has access to requested community
  const community = req.nextUrl.searchParams.get('community')
  const accessResult = ensureCommunityAccess(community, communityCode)
  if ('error' in accessResult) {
    return NextResponse.json({ error: accessResult.error }, { status: accessResult.status })
  }

  // Now safe to query database filtered by communityCode
  const { data } = await supabaseAdmin
    .from('parking_slots')
    .select('*')
    .eq('community_code', communityCode)

  return NextResponse.json({ data })
}
```

---

## 5. Database Integration

### 5.1 User Profile Storage

**Table: `user_profiles`**
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  unit_number VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash, never plain text
  community_code VARCHAR(50) NOT NULL,  -- Multi-tenant key
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_community ON user_profiles(community_code);
```

### 5.2 Registration Flow

**Creating a new user:**
```typescript
// In app/(auth)/register/page.tsx or API route
import bcrypt from 'bcryptjs'

const hashedPassword = await bcrypt.hash(password, 12)  // 12 salt rounds

const { data, error } = await supabaseAdmin
  .from('user_profiles')
  .insert([{
    email,
    name,
    phone,
    unit_number: unitNumber,
    password_hash: hashedPassword,  // ← Hashed, never plain text
    community_code: communityCode,
  }])
```

### 5.3 Password Verification (During Login)

```typescript
// In auth.ts Credentials provider authorize() callback
const user = result.rows[0]  // From database
const passwordValid = await bcrypt.compare(password, user.password_hash)

if (!passwordValid) {
  console.error('[Auth] Invalid credentials or community code')
  return null  // Failed login
}
```

**Why bcrypt + salt?**
- One-way hashing: Cannot be reversed
- Salt: Makes rainbow table attacks impractical
- Slow: Brute-force attacks are expensive
- Industry standard: Used by major platforms

---

## 6. Security Features

### 6.1 Rate Limiting (P0-005)

**Prevents brute-force password attacks:**
```typescript
// In lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(identifier)

  if (!limit || now > limit.resetTime) {
    // First attempt or window expired - reset
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + 15 * 60 * 1000,  // 15 minutes
    })
    return true
  }

  if (limit.count >= 5) {
    // Limit exceeded
    return false
  }

  // Increment counter
  limit.count++
  return true
}
```

**Called in auth.ts:**
```typescript
if (!checkRateLimit(email)) {
  console.error('[Auth] Rate limit exceeded for email:', email)
  return null  // Deny login
}
```

### 6.2 Multi-Tenant Isolation

**Enforced at three levels:**

1. **Database Query Level**
   ```typescript
   // Always filter by community_code
   WHERE email = $1 AND community_code = $2
   ```

2. **Middleware Level**
   ```typescript
   // Middleware checks auth.user exists before allowing access
   // Session contains communityCode
   ```

3. **API Route Level**
   ```typescript
   const { communityCode } = await getSessionWithCommunity()
   const result = await db.query(sql, [communityCode])  // ← Filter by tenant
   ```

### 6.3 Password Security (P1-002)

**Requirements:**
- Minimum 12 characters (enforced in registration)
- Hashed with bcrypt (12 salt rounds)
- Never logged or exposed in errors
- Generic error messages ("Invalid credentials")

### 6.4 Generic Error Messages (P0-006)

**Bad (leaks information):**
```typescript
if (result.rows.length === 0) {
  return null  // "User not found"
}
```

**Good (generic):**
```typescript
console.error('[Auth] Invalid credentials or community code')  // Log the real issue
return null  // Send generic message to client
```

---

## 7. Session Providers & Wrappers

### 7.1 SessionProvider (NextAuth.js)

**Purpose:** Enables `useSession()` hook in client components

**File:** `components/auth/SessionProvider.tsx`
```typescript
'use client'

import { SessionProvider } from 'next-auth/react'

export default function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

**How it works:**
- Wraps the entire app in Context
- Manages session state on client
- Provides `useSession()` hook
- Updates session when user logs in/out

### 7.2 AuthWrapper (Custom Context)

**Purpose:** Provides custom auth context with profile data

**File:** `components/auth/AuthWrapper.tsx`
```typescript
'use client'

import { createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'

interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  const user = session?.user ? { ...session.user } : null
  const profile = session?.user ? { ...session.user, unit_number: session.user.unitNumber } : null

  if (loading) return <LoadingSpinner />
  if (!user) return <p>Redirecting...</p>

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## 8. Multi-Tenant Architecture

### 8.1 Community Code as Tenant Key

**Every user belongs to exactly one community:**
```typescript
// In user_profiles table
community_code: 'LMR'  // Lumiere Residences
community_code: 'SRP'  // Serendra
community_code: 'BGC'  // BGC
```

**Stored in JWT token:**
```typescript
// JWT payload includes:
{
  sub: 'user-123',
  communityCode: 'LMR',  // ← Identifies tenant
}
```

### 8.2 Query Filtering Pattern (CRITICAL)

**All database queries must filter by community_code:**

```typescript
// ✅ CORRECT - Filters by community
const { data } = await supabaseAdmin
  .from('parking_slots')
  .select('*')
  .eq('community_code', communityCode)

// ❌ WRONG - No tenant filtering
const { data } = await supabaseAdmin
  .from('parking_slots')
  .select('*')
// This could return slots from OTHER communities!
```

### 8.3 Session Contains Community

**Accessed via JWT callback:**
```typescript
// In auth.ts
jwt({ token, user }) {
  if (user) {
    token.communityCode = user.communityCode  // ← From authorize()
  }
  return token
}

// In session callback
session({ session, token }) {
  session.user.communityCode = token.communityCode  // ← Available to app
}
```

---

## 9. Key Files Reference

| File | Purpose | Runtime | Key Exports |
|------|---------|---------|-------------|
| `lib/auth/auth.config.ts` | Edge-compatible route auth | Edge | `authConfig`, `auth`, `PUBLIC_ROUTES` |
| `lib/auth/auth.ts` | Full NextAuth.js config | Node.js | `auth`, `handlers`, `signIn`, `signOut` |
| `lib/auth/tenant-access.ts` | Tenant isolation helpers | Node.js | `getSessionWithCommunity()`, `ensureCommunityAccess()` |
| `middleware.ts` | Route protection middleware | Edge | `middleware`, `config` |
| `components/auth/SessionProvider.tsx` | Client-side session context | Browser | `AuthSessionProvider` |
| `components/auth/AuthWrapper.tsx` | Custom auth context | Browser | `AuthWrapper`, `useAuth()`, `useOptionalAuth()` |
| `app/layout.tsx` | Root layout | Server | Wraps app with `AuthSessionProvider` |
| `app/(auth)/login/page.tsx` | Login form | Server | Renders form, calls `/api/auth/signin` |
| `app/(auth)/register/page.tsx` | Registration form | Server | Creates user in `user_profiles` table |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth.js API routes | Node.js | Generated by `handlers` export |

---

## 10. Recent Commits - Middleware Fix Sequence

### Commit Timeline

**Problem:** Middleware running in Edge Runtime couldn't import Node.js modules (`pg`, `bcrypt`)

```
Date: January 7, 2026

f033d35 (14:38) - Initial fix attempt
├─ Created lib/auth/auth.config.ts with edge-compatible config
├─ Added export { auth } from './auth' (re-export)
├─ Updated middleware.ts to import from auth.config.ts
└─ Commit message:
   "Fix middleware: import auth from auth.config instead of auth.ts
    - Middleware runs on Edge Runtime which doesn't support Node.js APIs
    - lib/auth.ts imports pg and bcrypt which require Node.js
    - Fixed by importing from lib/auth/auth.config which is edge-compatible"

43ea289 (16:12) - Second fix
├─ Removed unnecessary middleware wrapper
├─ Ensured middleware.ts imports directly from lib/auth/auth.config.ts
└─ Comment update (escaped backticks in comments)
   "Fix middleware: import from edge-compatible auth.config.ts
    Remove unnecessary middleware wrapper file and ensure middleware.ts
    imports directly from lib/auth/auth.config.ts which contains no Node.js dependencies.
    This resolves MIDDLEWARE_INVOCATION_FAILED error in Vercel."

98193e1 - Fix duplicate export
├─ Removed conflicting export statement in auth.config.ts
└─ "Fix duplicate export in auth.config.ts"

786d2c3 - Update middleware import
├─ Updated import path in middleware.ts again
└─ "Update middleware import to use auth.config.ts directly"

360dd55 (16:18) - Final cleanup
├─ Simplified auth.config.ts to single export
├─ Removed duplicate/unnecessary code
├─ Removed lengthy comments to reduce bundle size
└─ Commit message:
   "Simplify auth.config.ts to have single export
    Remove duplicate export statement that was causing build errors.
    Keep only export default authConfig for NextAuth.js usage."
```

### Why Multiple Commits Were Needed

1. **f033d35**: Initial insight - split into edge-compatible config
2. **43ea289**: Realized middleware could import directly (no wrapper needed)
3. **98193e1**: Fixed build error from duplicate exports
4. **786d2c3**: Path issues still being resolved
5. **360dd55**: Final cleanup - removed unnecessary code

---

## 11. Common Pitfalls & Solutions

### 11.1 Middleware Errors

**Error: `MIDDLEWARE_INVOCATION_FAILED` or `Cannot find module 'pg'`**

**Cause:**
- Middleware importing from `auth.ts` (has Node.js imports)
- Should import from `auth.config.ts` (edge-compatible)

**Solution:**
```typescript
// middleware.ts
// ❌ WRONG
export { auth as middleware } from '@/lib/auth/auth'

// ✅ CORRECT
export { auth as middleware } from '@/lib/auth/auth.config'
```

### 11.2 Session Not Available in Client Component

**Error:** `useSession()` returns `{ data: null, status: 'unauthenticated' }`

**Cause:**
- Component not wrapped in `SessionProvider`
- Missing `<AuthSessionProvider>` in layout

**Solution:**
```typescript
// app/layout.tsx
import AuthSessionProvider from '@/components/auth/SessionProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthSessionProvider>  {/* ← Required */}
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
```

### 11.3 useEffect Infinite Loop

**Issue:** Auth check in useEffect causes infinite loops

**Bad Pattern:**
```typescript
useEffect(() => {
  if (!user) {
    router.push('/login')
  }
}, [user, router])  // ← Object recreated on every render!
```

**Good Pattern:**
```typescript
useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/login')
  }
}, [status, router])  // ← Primitive values
```

### 11.4 Missing Custom Fields in Session

**Issue:** `session.user.communityCode` is undefined

**Cause:**
- JWT callback not adding field
- Session callback not exposing field
- TypeScript module augmentation missing

**Solution:**
```typescript
// In lib/auth/auth.ts
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.communityCode = user.communityCode  // ← Add to token
    }
    return token
  },
  session({ session, token }) {
    if (session.user) {
      session.user.communityCode = token.communityCode  // ← Expose to session
    }
    return session
  },
},

// At bottom of lib/auth/auth.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      communityCode: string  // ← Declare type
    }
  }
}
```

---

## 12. Security Checklist

- [x] Passwords hashed with bcrypt (12 salt rounds)
- [x] JWT tokens signed with NEXTAUTH_SECRET
- [x] Secure cookies (HttpOnly, Secure, SameSite)
- [x] Rate limiting on login (5 attempts per 15 minutes)
- [x] Generic error messages (no user enumeration)
- [x] Multi-tenant isolation (all queries filter by community_code)
- [x] Middleware protects all routes
- [x] API routes verify authentication
- [x] Password minimum 12 characters (P1-002)
- [x] NEXTAUTH_SECRET set in production
- [x] NEXTAUTH_URL matches deployment domain
- [x] Database connection SSL enabled (Neon requires this)

---

## 13. Deployment Checklist

**Before deploying to production:**

1. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db
   NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
   NEXTAUTH_URL=https://parkboard.app
   NODE_ENV=production
   ```

2. **Verify auth.config.ts is Edge-Compatible**
   - No `import` from Node.js modules
   - No database queries
   - No bcrypt or crypto

3. **Verify Middleware Import**
   ```typescript
   // middleware.ts should import from auth.config
   export { auth as middleware } from '@/lib/auth/auth.config'
   ```

4. **Verify Database**
   - `user_profiles` table created
   - Indexes created
   - SSL enabled (for Neon)

5. **Test Rate Limiting**
   - Try 6 failed login attempts
   - 6th should fail (rate limit)

6. **Test JWT Expiry**
   - Login
   - Wait 30 days (or mock time)
   - Verify session expired

---

## References

- NextAuth.js v5 Docs: https://authjs.dev/
- Middleware Runtime Docs: https://nextjs.org/docs/app/building-your-application/rendering/edge-and-node-runtimes
- JWT Tokens: https://tools.ietf.org/html/rfc7519
- bcrypt: https://www.npmjs.com/package/bcryptjs
- Vercel Edge Runtime: https://vercel.com/docs/concepts/edge-runtime

---

**Document Status:** Complete
**Last Updated:** 2026-03-18
**Confidence Level:** HIGH
**Reviewed By:** Codebase Analysis
