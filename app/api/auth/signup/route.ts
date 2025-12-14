// ============================================================================
// SIGNUP API ROUTE
// ============================================================================
// This is a Next.js API Route Handler (App Router style)
// Handles POST /api/auth/signup
//
// 🎓 LEARNING: Next.js API Routes (Route Handlers)
// ----------------------------------------------------------------------------
// File location determines URL:
// - app/api/auth/signup/route.ts → /api/auth/signup
// - app/api/users/[id]/route.ts → /api/users/123
//
// Export functions named after HTTP methods:
// - export async function GET() → Handles GET requests
// - export async function POST() → Handles POST requests
// - export async function PUT() → Handles PUT requests
// - etc.
//
// These run on the SERVER (Node.js), not browser:
// ✅ Access to server-only secrets (service role key)
// ✅ Direct database access
// ✅ Can perform admin operations
// ❌ No browser APIs (window, document, localStorage)
//
// Different from:
// - Pages (app/page.tsx): Render UI
// - API routes (app/api/.../route.ts): Return JSON data
// ----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// SIGNUP API ROUTE
// This runs on the SERVER - service role key is safe here
// ============================================================================

// 🎓 LEARNING: TypeScript interface for request body
// ----------------------------------------------------------------------------
// Defines the shape of data we expect from the client
// Client sends: JSON.stringify({ email, password, name, phone, unit_number })
// Server receives: req.json() → SignupRequest object
//
// Why define interface?
// - Type safety: Know what fields exist
// - Autocomplete: IDE suggests fields
// - Documentation: Self-documenting API contract
// - Validation: Can check if data matches expected shape
// ----------------------------------------------------------------------------
interface SignupRequest {
  community_code: string
  email: string
  password: string
  name: string
  phone: string
  unit_number: string
}

// 🎓 LEARNING: async function and NextRequest/NextResponse
// ----------------------------------------------------------------------------
// export async function POST(req: NextRequest)
//        ^                        ^
//        Async (we await operations)  Request object from Next.js
//
// NextRequest: Enhanced Request with Next.js features
// - req.json(): Parse JSON body
// - req.headers: Get request headers
// - req.cookies: Get cookies
// - req.nextUrl: Get URL details
//
// NextResponse: Enhanced Response with Next.js features
// - NextResponse.json(data): Return JSON response
// - NextResponse.redirect(url): Redirect to another page
// - Set headers, cookies, status codes
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 🎓 LEARNING: try/catch in API routes
  // --------------------------------------------------------------------------
  // Always wrap API route logic in try/catch
  // Why? If anything throws an error, we can return a proper HTTP response
  // Without try/catch: User sees generic 500 error, no details
  // With try/catch: Return specific error message with appropriate status code
  // --------------------------------------------------------------------------
  try {
    // 🎓 LEARNING: Parsing request body
    // ------------------------------------------------------------------------
    // await req.json() parses JSON from request body
    // Returns a Promise, so we must await
    //
    // Client side:
    // fetch('/api/auth/signup', {
    //   method: 'POST',
    //   body: JSON.stringify({ email, password, ... })  ← Sent as JSON string
    // })
    //
    // Server side:
    // const body = await req.json()  ← Parses back to JavaScript object
    //
    // Why await? Parsing is async (body might be large, streamed, etc.)
    // ------------------------------------------------------------------------
    const body: SignupRequest = await req.json()

    // 🎓 LEARNING: Destructuring assignment
    // ------------------------------------------------------------------------
    // const { email, password, ... } = body
    //
    // Shorthand for:
    // const email = body.email
    // const password = body.password
    // const name = body.name
    // ... etc
    //
    // Cleaner when you need multiple fields from an object
    // ------------------------------------------------------------------------
    const { community_code, email, password, name, phone, unit_number } = body

    // ========================================================================
    // STEP 0: Validate password strength
    // ========================================================================
    // P1-002: Password validation (minimum 12 characters)
    // ------------------------------------------------------------------------
    // Strong passwords reduce account takeover risk
    // 12 characters is NIST recommendation for user-chosen passwords
    // ------------------------------------------------------------------------
    if (!password || password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long.' },
        { status: 400 }
      )
    }

    // Create admin client (bypasses RLS - we need this to create auth users)
    const supabaseAdmin = createAdminClient()

    // ========================================================================
    // STEP 1: Validate community code exists and is active
    // ========================================================================
    // 🎓 LEARNING: Community code validation
    // ------------------------------------------------------------------------
    // Before creating a user, verify the community code is valid
    // - Must exist in communities table
    // - Must be in 'active' status (not disabled)
    //
    // This prevents users from registering with invalid codes
    // ------------------------------------------------------------------------
    const { data: community } = await supabaseAdmin
      .from('communities')
      .select('community_code, status')
      .eq('community_code', community_code)
      .eq('status', 'active')
      .single()

    if (!community) {
      // P0-006 FIX: Use generic error to prevent community code enumeration
      return NextResponse.json(
        { error: 'Invalid registration credentials. Please verify your information and try again.' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 2: Check email globally unique (allows user mobility)
    // ========================================================================
    // 🎓 LEARNING: Email uniqueness across communities
    // ------------------------------------------------------------------------
    // Email must be globally unique (not just per community)
    // Why? Allows user to migrate between communities if needed
    //
    // Two cases:
    // 1. Email exists in same community → Already registered
    // 2. Email exists in different community → Contact support to migrate
    //
    // This gives better error messages than generic "email exists"
    // ------------------------------------------------------------------------
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, community_code')
      .eq('email', email)
      .single()

    if (existingProfile) {
      // P0-006 FIX: Generic error - don't reveal if email is in same/different community
      return NextResponse.json(
        { error: 'This email is already registered. Please use a different email or contact support.' },
        { status: 409 }
      )
    }

    // ========================================================================
    // STEP 3: Check unit number unique per community
    // ========================================================================
    // 🎓 LEARNING: Unit number uniqueness per community
    // ------------------------------------------------------------------------
    // Unit numbers must be unique within a community
    // Why? Each unit can only have one registered user
    //
    // Different from email: unit numbers CAN duplicate across communities
    // Example: Unit 101 in Building A != Unit 101 in Building B
    //
    // This prevents two users from claiming the same unit in same community
    // ------------------------------------------------------------------------
    const { data: existingUnit } = await supabaseAdmin
      .from('user_profiles')
      .select('unit_number')
      .eq('community_code', community_code)
      .eq('unit_number', unit_number)
      .single()

    if (existingUnit) {
      // P0-006 FIX: Generic error - don't reveal specific unit conflicts
      return NextResponse.json(
        { error: 'This unit is already registered. Please verify your unit number or contact support.' },
        { status: 409 }
      )
    }


    // ========================================================================
    // STEP 4: Create auth user
    // ========================================================================
    // 🎓 LEARNING: Transaction pattern (Manual rollback)
    // ------------------------------------------------------------------------
    // Signup requires TWO operations:
    // 1. Create user in auth.users (Supabase managed)
    // 2. Create profile in user_profiles (our table)
    //
    // What if step 1 succeeds but step 2 fails?
    // - User exists in auth.users (can log in)
    // - No profile in user_profiles (app breaks!)
    //
    // Solution: Manual transaction
    // - Try step 1
    // - Try step 2
    // - If step 2 fails, rollback step 1 (delete auth user)
    //
    // Database transactions (BEGIN/COMMIT/ROLLBACK) don't work across
    // Supabase Auth and PostgreSQL tables, so we handle it manually
    // ------------------------------------------------------------------------

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Auto-confirm (can change later)

      // 🎓 LEARNING: user_metadata
      // ----------------------------------------------------------------------
      // Supabase auth.users table has a JSONB column: user_metadata
      // Store any extra data here (accessible via user object)
      //
      // Why also store in user_profiles?
      // - user_metadata: Quick access from auth object
      // - user_profiles: Structured, searchable, can have constraints
      //
      // Think of it as: metadata = cache, user_profiles = source of truth
      // ----------------------------------------------------------------------
      user_metadata: {
        name,  // Store in auth metadata too
        unit_number,
        community_code  // Store community_code in auth metadata for session
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // 🎓 LEARNING: Defensive programming (null check)
    // ------------------------------------------------------------------------
    // Even if no error, data.user might be null (edge case)
    // Always check critical data exists before continuing
    // ------------------------------------------------------------------------
    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      )
    }

    // ========================================================================
    // STEP 5: Create user profile (Transaction Part 2)
    // ========================================================================
    // 🎓 LEARNING: Foreign key relationship
    // ------------------------------------------------------------------------
    // user_profiles.id REFERENCES auth.users(id)
    //                  ^
    //                  Foreign key: id must match an existing auth user
    //
    // We use authData.user.id (from step 1) as the profile id
    // This links the profile to the auth user
    // ------------------------------------------------------------------------

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,  // Same ID as auth user (foreign key)
        name,
        email,
        phone,
        unit_number,
        community_code  // From validated user input (not hardcoded)
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)

      // 🎓 LEARNING: PostgreSQL error codes
      // ----------------------------------------------------------------------
      // PostgreSQL has specific error codes for different failures
      // 23505 = unique_violation (duplicate key)
      //
      // Why check? Distinguish between:
      // - Duplicate email (user's fault, 409)
      // - Network error, permission issue (server's fault, 500)
      //
      // See full list: https://www.postgresql.org/docs/current/errcodes-appendix.html
      // ----------------------------------------------------------------------

      // Check if it's a duplicate key error
      if (profileError.code === '23505') {  // PostgreSQL unique constraint violation
        // User exists but profile creation failed - might be data inconsistency
        return NextResponse.json(
          { error: 'This email is already registered. Try logging in instead.' },
          { status: 409 }
        )
      }

      // 🎓 LEARNING: Manual rollback (CRITICAL!)
      // ----------------------------------------------------------------------
      // Profile creation failed for unknown reason
      // We must rollback step 1 (delete the auth user we just created)
      //
      // Why? Prevent orphaned auth user:
      // - User exists in auth.users ✅
      // - No profile in user_profiles ❌
      // - User can log in but app crashes (no profile data)
      //
      // By deleting auth user, we ensure consistency:
      // - Both operations succeed, OR
      // - Both operations fail (rollback)
      //
      // This is the "all or nothing" principle of transactions
      // ----------------------------------------------------------------------

      // For other errors, rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: 'Profile creation failed: ' + profileError.message },
        { status: 500 }
      )
    }

    // ========================================================================
    // SUCCESS (Both operations completed successfully!)
    // ========================================================================
    // 🎓 LEARNING: Success response pattern
    // ------------------------------------------------------------------------
    // Return 200 OK with success data
    // Include minimal info (don't send password, sensitive data)
    //
    // Client will use this response to:
    // 1. Know signup succeeded
    // 2. Auto-login the user (using email/password they just entered)
    // 3. Redirect to dashboard
    //
    // Why not return profile data here?
    // - Client will fetch it anyway after login
    // - Keeps response small and focused
    // - Less data to accidentally leak
    // ------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error: unknown) {
    // 🎓 LEARNING: Catch-all error handler
    // ------------------------------------------------------------------------
    // This catches ANY error not handled above:
    // - Network failures
    // - JSON parse errors (malformed request)
    // - Unexpected exceptions
    //
    // Why "error: unknown"?
    // - JavaScript errors can be anything (Error object, string, number, etc.)
    // - TypeScript can't know what will be thrown
    // - "unknown" type is safer than "any" - forces type checking
    //
    // Why (error as Error).message || 'Signup failed'?
    // - error might not have a message property
    // - Fallback to generic message if error is weird
    // - Prevents returning undefined or [object Object]
    // ------------------------------------------------------------------------
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Signup failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// 🎓 RECAP: Signup Flow (Step-by-step)
// ============================================================================
// 1. Client sends POST request to /api/auth/signup
//    Body: { email, password, name, phone, unit_number }
//
// 2. Server parses JSON body
//    → Destructures fields
//
// 3. Check if email already exists
//    → If yes: Return 409 Conflict
//
// 4. Create auth user (Step 1 of transaction)
//    → If fails: Return 400 Bad Request
//
// 5. Create user profile (Step 2 of transaction)
//    → If fails: Rollback (delete auth user), return 500
//
// 6. Both succeeded!
//    → Return 200 OK with user data
//
// 7. Client receives success
//    → Calls signInWithPassword()
//    → Redirects to dashboard
//
// ============================================================================
// 🎓 COMMON PATTERNS IN THIS FILE
// ============================================================================
// ✅ Early returns: if (error) return response
// ✅ Specific error messages: "Email already exists" not "Error"
// ✅ Appropriate status codes: 409 for conflict, 500 for server error
// ✅ Manual transactions: rollback on failure
// ✅ Defensive checks: if (!data.user) handle it
// ✅ Type safety: TypeScript interfaces for request/response
// ✅ Error logging: console.error() for debugging
//
// ============================================================================