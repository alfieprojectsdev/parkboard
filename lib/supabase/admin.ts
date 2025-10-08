import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SUPABASE ADMIN CLIENT (DANGEROUS - USE WITH EXTREME CAUTION!)
// ============================================================================
// This client uses the SERVICE ROLE KEY which has SUPERUSER powers
// It BYPASSES all Row Level Security (RLS) policies
//
// ⚠️ CRITICAL SECURITY RULES:
// 1. ONLY use in API routes (server-side) - NEVER in client components
// 2. NEVER expose this client to the browser
// 3. NEVER commit SUPABASE_SERVICE_ROLE_KEY to git
// 4. Use ONLY when you MUST bypass RLS (user creation, admin operations)
//
// 🎓 LEARNING: Service Role Key vs Anon Key
// ----------------------------------------------------------------------------
// Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY):
// - Public, safe to expose
// - All operations go through RLS policies
// - Users can only see/modify their own data (if RLS is set up correctly)
//
// Service Role Key (SUPABASE_SERVICE_ROLE_KEY):
// - PRIVATE, like a database root password
// - Bypasses ALL RLS policies
// - Can read/write/delete ANY data
// - If leaked, attacker has full database access!
//
// Think of it like this:
// Anon key = Customer entering a store (can only access what's for sale)
// Service key = Store owner (can access inventory, safe, everything)
// ============================================================================

export function createAdminClient() {
  // 🎓 LEARNING: Early error checking
  // --------------------------------------------------------------------------
  // Why check for missing env var?
  // - Fail fast! Better to crash early with clear error than later with cryptic message
  // - Makes debugging easier ("Missing env var" vs "Cannot read property of undefined")
  //
  // Without this check:
  // - Code would crash when trying to use the client
  // - Error message would be confusing
  // - Harder to debug in production
  // --------------------------------------------------------------------------
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  // 🎓 LEARNING: Why use createClient() directly instead of createServerClient()?
  // --------------------------------------------------------------------------
  // createServerClient: Needs cookies, used for authenticated users
  // createClient: Direct connection, used for admin operations
  //
  // Admin operations don't need user cookies because:
  // - We're not acting as the user
  // - We're acting as the system/admin
  // - We're bypassing user-level security
  // --------------------------------------------------------------------------

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,  // ⚠️ The master key!
    {
      auth: {
        // 🎓 LEARNING: Why disable auth features?
        // ----------------------------------------------------------------------
        // autoRefreshToken: false
        // - Admin client doesn't need token refresh (it's not a user session)
        // - Service role key never expires
        // - No need to refresh what doesn't expire
        //
        // persistSession: false
        // - Don't store session in browser/cookies
        // - This is server-only, no session to persist
        // - Prevents accidental leakage to client
        // ----------------------------------------------------------------------
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 🎓 LEARNING: When to use Admin Client (Legitimate use cases)
// ----------------------------------------------------------------------------
// ✅ GOOD: User signup (creating auth.users requires admin)
//    Example: app/api/auth/signup/route.ts
//    - Create user in auth.users (requires service role)
//    - Create matching user_profiles record
//
// ✅ GOOD: Admin dashboard (viewing all users, all bookings)
//    - Condo manager needs to see all bookings
//    - Regular users can only see their own (RLS blocks them)
//    - Admin bypasses RLS to see everything
//
// ✅ GOOD: Batch operations (daily cleanup, email notifications)
//    - Delete old cancelled bookings
//    - Send reminder emails to all users
//    - Calculate statistics across all users
//
// ❌ BAD: Regular user operations
//    Example: User viewing their bookings
//    - Use server.ts or client.ts instead
//    - Let RLS do its job (security!)
//
// ❌ VERY BAD: Exposing to client
//    ```tsx
//    'use client'  // ← Client Component
//    import { createAdminClient } from '@/lib/supabase/admin'  // ❌ NEVER!
//    ```
//    Result: Service key exposed to browser → Full database compromise!
// ----------------------------------------------------------------------------

// 🎓 LEARNING: How RLS bypass works
// ----------------------------------------------------------------------------
// Normal query (with anon key):
// 1. User requests their bookings
// 2. Supabase checks: "Does this user have permission?" (RLS policy)
// 3. RLS policy: "Show only bookings where renter_id = auth.uid()"
// 4. User sees only their bookings ✅
//
// Admin query (with service role key):
// 1. Admin requests all bookings
// 2. Supabase checks: "This is service role key, skip RLS"
// 3. No filtering applied
// 4. Admin sees ALL bookings (even other users') ✅
//
// Example:
// ```ts
// // Regular user (RLS enforced)
// const { data } = await supabase.from('bookings').select('*')
// // Returns: Only user's own bookings
//
// // Admin (RLS bypassed)
// const { data } = await supabaseAdmin.from('bookings').select('*')
// // Returns: ALL bookings from ALL users
// ```
// ----------------------------------------------------------------------------