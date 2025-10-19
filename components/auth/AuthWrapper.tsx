// ============================================================================
// AUTH WRAPPER COMPONENT
// ============================================================================
// This component provides authentication state to the entire app
// Uses React Context API to share auth data globally
//
// 🎓 LEARNING: Why 'use client' at the top?
// ----------------------------------------------------------------------------
// In Next.js App Router, components are Server Components by default
// 'use client' makes this a Client Component (runs in browser)
//
// Why Client Component here?
// - Uses React hooks (useState, useEffect, useContext)
// - Needs browser APIs (redirects, Supabase auth listeners)
// - Server Components can't use hooks or browser features
//
// Think of it:
// Server Component = Static HTML generator (fast, no interactivity)
// Client Component = Dynamic React app (slow, full interactivity)
// ----------------------------------------------------------------------------
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'

// ============================================================================
// SECTION 1: Context Setup (Global State Management)
// ============================================================================
// 🎓 LEARNING: React Context API
// ----------------------------------------------------------------------------
// Problem: Need auth data in many components (navbar, pages, etc.)
// Bad solution: Pass props down 10 levels (prop drilling)
// Good solution: Context = Global state accessible anywhere
//
// How it works:
// 1. Create context with createContext()
// 2. Provide value with <AuthContext.Provider value={...}>
// 3. Consume anywhere with useContext(AuthContext)
//
// Think of it like a global variable, but React-managed:
// - Changes trigger re-renders
// - Type-safe with TypeScript
// - No prop drilling needed
// ----------------------------------------------------------------------------

// 🎓 LEARNING: TypeScript interface for Context
// ----------------------------------------------------------------------------
// Defines the shape of auth data available throughout the app
//
// user: Supabase auth user (email, id, etc.)
// profile: Our custom user_profiles data (name, phone, unit_number)
// loading: Are we still fetching auth data?
//
// Why separate user and profile?
// - user: Comes from Supabase auth.users (managed by Supabase)
// - profile: Comes from our user_profiles table (we control this)
// ----------------------------------------------------------------------------
interface AuthContextType {
  user: User | null      // null = Not logged in
  profile: UserProfile | null
  loading: boolean
}

// 🎓 LEARNING: createContext with TypeScript
// ----------------------------------------------------------------------------
// createContext<AuthContextType | undefined>(undefined)
//                                            ^^^^^^^^^^
//                                            Initial value
//
// Why "AuthContextType | undefined"?
// - undefined = Context used outside Provider (error case)
// - AuthContextType = Context used inside Provider (normal case)
//
// This lets us throw a helpful error if someone uses useAuth() wrong
// ----------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 🎓 LEARNING: Custom Hook Pattern
// ----------------------------------------------------------------------------
// useAuth() is a "custom hook" - a reusable function with React hooks inside
//
// Rules for hooks (functions starting with "use"):
// 1. Must be called inside components or other hooks
// 2. Can't be called in loops, conditions, or after returns
// 3. Always call in the same order
//
// Why a custom hook?
// - Cleaner: useAuth() vs useContext(AuthContext)
// - Error checking: Throws if used outside AuthWrapper
// - Type safety: Returns AuthContextType, not undefined
// ----------------------------------------------------------------------------
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  // 🎓 Guard clause: Fail fast with helpful error
  // If someone uses useAuth() outside AuthWrapper, crash immediately
  // Better than returning undefined and getting cryptic errors later
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthWrapper')
  }

  return context
}

// 🆕 Optional version for public pages
// Returns null if not in AuthWrapper context (for public pages like browse slots)
export function useOptionalAuth(): AuthContextType | null {
  const context = useContext(AuthContext)
  return context || null
}

// ============================================================================
// SECTION 2: AuthWrapper Component
// ============================================================================
// This component wraps protected pages and provides auth state via Context
//
// 🎓 LEARNING: Component Props with TypeScript
// ----------------------------------------------------------------------------
// interface AuthWrapperProps { children: ReactNode }
//
// children: Special prop that contains JSX between component tags
// ReactNode: TypeScript type for any renderable React content
//
// Example usage:
// <AuthWrapper>
//   <MyPage />        ← This is "children"
// </AuthWrapper>
//
// ReactNode includes: JSX, string, number, null, array of these, etc.
// ----------------------------------------------------------------------------

interface AuthWrapperProps {
  children: ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  // 🎓 LEARNING: Next.js useRouter hook
  // --------------------------------------------------------------------------
  // router.push('/path') = Navigate to another page
  // Client-side navigation (no full page reload)
  //
  // Different from:
  // - window.location.href = '/path'  (full page reload, lose state)
  // - <Link href="/path">  (for JSX links, not programmatic navigation)
  // --------------------------------------------------------------------------
  const router = useRouter()

  // Get Supabase client (browser client, not server!)
  const supabase = createClient()

  // 🎓 LEARNING: useState hook
  // --------------------------------------------------------------------------
  // const [value, setValue] = useState<Type>(initialValue)
  //         ^       ^                  ^         ^
  //         |       |                  |         Initial value on first render
  //         |       |                  TypeScript type
  //         |       Function to update value
  //         Current value
  //
  // When you call setValue(), React:
  // 1. Updates the value
  // 2. Re-renders this component
  // 3. Re-renders any component using this context
  //
  // Why useState not just let user = ...?
  // - let user = ... doesn't trigger re-renders
  // - useState tells React "when this changes, update UI"
  // --------------------------------------------------------------------------

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // 🎓 LEARNING: Loading state pattern
  // --------------------------------------------------------------------------
  // Always start with loading = true
  // Why? On first render, we haven't checked auth yet
  //
  // Flow:
  // 1. Component mounts → loading = true
  // 2. Fetch auth data (async)
  // 3. Got data → setLoading(false)
  //
  // Without this: UI flickers (shows "not logged in" before "logged in")
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState(true)

  // ============================================================================
  // SECTION 3: Initialize Auth on Mount
  // ============================================================================
  // 🎓 LEARNING: useEffect hook
  // --------------------------------------------------------------------------
  // useEffect(() => { /* code */ }, [dependencies])
  //             ^                      ^
  //             Function to run        When to run it
  //
  // When does it run?
  // - On first render (component mount)
  // - When any dependency changes
  // - [] = Run once on mount, never again
  // - [user] = Run on mount + whenever user changes
  // - No array = Run on EVERY render (usually a bug!)
  //
  // Think of it as: "Do this side effect when X happens"
  // Side effects: API calls, subscriptions, timers, DOM changes
  // --------------------------------------------------------------------------

  useEffect(() => {
    // 🎓 LEARNING: async/await in useEffect
    // ------------------------------------------------------------------------
    // WRONG: useEffect(async () => { ... })  ❌
    // Why? useEffect expects either:
    // - Nothing returned
    // - A cleanup function
    // async functions ALWAYS return a Promise (not a cleanup function!)
    //
    // CORRECT: Define async function inside, then call it
    // This lets useEffect return nothing while still using async/await
    // ------------------------------------------------------------------------

    // 🔍 CRITICAL FIX: Track if component is still mounted
    // This prevents setState on unmounted component (React warning + bugs)
    let isMounted = true

    async function initializeAuth() {
      // 🎓 LEARNING: try/catch/finally with async
      // ----------------------------------------------------------------------
      // try: Attempt code that might fail
      // catch: Handle errors
      // finally: Always runs (error or not) - perfect for setLoading(false)
      //
      // Why not just catch errors in the async call?
      // - We want to set loading = false even if there's an error
      // - finally ensures loading stops whether success or failure
      // ----------------------------------------------------------------------
      try {
        // 🎓 LEARNING: Supabase getUser() explained
        // --------------------------------------------------------------------
        // Returns: { data: { user }, error }
        // user object validated by Supabase Auth server
        //
        // Why getUser() not getSession()?
        // - getUser() validates with Auth server (secure, always fresh)
        // - getSession() reads from cookies (fast but potentially stale/invalid)
        // - For auth-critical flows, always use getUser()
        //
        // Security warning from Supabase:
        // "Using the user object from getSession() could be insecure!
        //  This value comes directly from storage and may not be authentic.
        //  Use getUser() instead which authenticates with the Auth server."
        //
        // Reference: https://supabase.com/docs/reference/javascript/auth-getuser
        // --------------------------------------------------------------------

        // Get authenticated user (server-validated)
        const { data: { user }, error } = await supabase.auth.getUser()

        // 🎓 LEARNING: Auth error handling
        // --------------------------------------------------------------------
        // getUser() can fail if:
        // - Network error (can't reach Auth server)
        // - Token expired/invalid
        // - Auth server down
        //
        // When this happens:
        // - Set user/profile to null (treat as not logged in)
        // - Stop loading (don't hang forever)
        // - Log error for debugging
        // --------------------------------------------------------------------
        if (error) {
          console.error('[AuthWrapper] Auth error:', error)
          if (!isMounted) return
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        // 🔍 CRITICAL FIX: Only setState if component is still mounted
        if (!isMounted) {
          return
        }

        // 🎓 LEARNING: Nullish coalescing (||)
        // --------------------------------------------------------------------
        // user || null
        //      ^
        //      If user is falsy (undefined/null), use null
        //
        // Why? We want null not undefined (clearer intent: "no user")
        // TypeScript prefers explicit null over undefined for "no value"
        // --------------------------------------------------------------------
        setUser(user || null)

        // 🎓 LEARNING: Conditional data fetching
        // --------------------------------------------------------------------
        // Only fetch profile if user exists
        // Why check? No point querying database if no user logged in
        //
        // Pattern:
        // 1. Check prerequisite (user exists)
        // 2. Fetch dependent data (user's profile)
        // This prevents unnecessary API calls
        // --------------------------------------------------------------------

        // If user exists, fetch their profile
        if (user) {
          // 🎓 LEARNING: Supabase query chain
          // ------------------------------------------------------------------
          // .from('user_profiles')   ← Which table
          // .select('*')             ← Which columns (* = all)
          // .eq('id', user.id)       ← WHERE id = ?
          // .single()                ← Expect one row (throws if 0 or 2+)
          //
          // Returns: { data, error }
          // - data: The profile object (or null if error)
          // - error: Error object (or null if success)
          //
          // Why .single()?
          // - We know id is unique (primary key)
          // - .single() returns object not array
          // - Would be array otherwise: [{ profile }]
          // ------------------------------------------------------------------

          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) {
            console.error('[AuthWrapper] Profile fetch error:', profileError)
          }

          // 🔍 CRITICAL FIX: Check if still mounted before setState
          if (!isMounted) {
            return
          }

          setProfile(profileData)
        }

      } catch (err) {
        // 🎓 LEARNING: Error handling
        // --------------------------------------------------------------------
        // Why console.error not alert()?
        // - console.error: Logs to dev tools (doesn't bother user)
        // - alert(): Blocks UI (annoying for non-critical errors)
        //
        // For auth initialization failure:
        // - Not critical (user just sees login page)
        // - Log error for debugging
        // - Don't interrupt user experience
        // --------------------------------------------------------------------
        console.error('[AuthWrapper] Auth initialization error:', err)
      } finally {
        // 🎓 LEARNING: finally block
        // --------------------------------------------------------------------
        // Runs whether try succeeded or catch caught an error
        // Perfect for cleanup: Stop loading, close connections, etc.
        //
        // Why not put setLoading(false) in try block?
        // - If error occurs, loading would stay true forever!
        // - finally ensures it always runs
        // --------------------------------------------------------------------

        // 🔍 CRITICAL FIX: Check if still mounted before setState
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Call the async function
    // Can't await here (not in async function), but that's fine
    // We don't need to wait for it, React will re-render when state updates
    initializeAuth()

    // 🎓 LEARNING: Setting up event listeners (Subscriptions)
    // ------------------------------------------------------------------------
    // onAuthStateChange() listens for auth events:
    // - User logs in → 'SIGNED_IN' event
    // - User logs out → 'SIGNED_OUT' event
    // - Token refreshes → 'TOKEN_REFRESHED' event
    //
    // Returns: { data: { subscription }, error }
    // subscription has .unsubscribe() method to stop listening
    //
    // Why subscribe?
    // - Auth changes in other tabs → sync this tab
    // - Token expires → automatically refresh
    // - User logs out → redirect to login
    // ------------------------------------------------------------------------

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // 🎓 LEARNING: Callback function (async)
      // ----------------------------------------------------------------------
      // This function is called whenever auth state changes
      // Parameters:
      // - event: What happened ('SIGNED_IN', 'SIGNED_OUT', etc.)
      // - session: New session data (or null if signed out)
      //
      // async callback: We can await inside (fetching profile)
      // ----------------------------------------------------------------------
      async (event, session) => {
        // 🎓 LEARNING: Switch-like if/else for event handling
        // --------------------------------------------------------------------
        // Pattern: Check event type, respond accordingly
        // Each branch handles a different auth state change
        // --------------------------------------------------------------------

        if (event === 'SIGNED_OUT') {
          // User logged out (or session expired)
          setUser(null)
          setProfile(null)
          router.push('/login')  // Redirect to login page

        } else if (event === 'SIGNED_IN' && session) {
          // User just logged in
          setUser(session.user)

          // 🎓 LEARNING: Why fetch profile again?
          // ------------------------------------------------------------------
          // We already fetch on mount, why here too?
          // Answer: This catches logins that happen AFTER mount
          //
          // Scenario:
          // 1. User opens app (not logged in)
          // 2. initializeAuth() runs, finds no session
          // 3. User logs in via login page
          // 4. SIGNED_IN event fires → fetch profile here
          //
          // Without this: User logs in, but profile stays null!
          // ------------------------------------------------------------------

          // Fetch profile
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(profileData)

        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token was refreshed (happens automatically every hour)
          // Update user object (might have new token)
          // No need to re-fetch profile (profile doesn't change on refresh)
          setUser(session.user)
        }
      }
    )

    // 🎓 LEARNING: useEffect cleanup function (CRITICAL!)
    // ------------------------------------------------------------------------
    // The function returned from useEffect runs on:
    // 1. Component unmount (user navigates away)
    // 2. Before effect runs again (dependencies changed)
    //
    // Why cleanup?
    // - Without unsubscribe: Memory leak!
    // - Event listener keeps firing even after component unmounts
    // - Can cause errors (setState on unmounted component)
    //
    // Think of it:
    // useEffect: "Start subscription"
    // Cleanup: "Stop subscription"
    //
    // Like:
    // - addEventListener → removeEventListener
    // - setInterval → clearInterval
    // - subscribe → unsubscribe
    // ------------------------------------------------------------------------

    return () => {
      // 🎓 CRITICAL: Always unsubscribe from listeners!
      // This prevents memory leaks and stale subscriptions

      // 🔍 CRITICAL FIX: Mark component as unmounted
      // This prevents setState calls after unmount (memory leaks + bugs)
      isMounted = false

      subscription.unsubscribe()
    }

    // 🎓 LEARNING: useEffect dependency array
    // ------------------------------------------------------------------------
    // CRITICAL FIX: Empty array [] for mount-only execution
    //
    // ❌ WRONG: [router, supabase]
    // Why wrong? router and supabase are object references that change
    // on every render, causing infinite re-runs and session state resets
    //
    // ✅ CORRECT: []
    // Empty array = run ONCE on mount, never again
    //
    // Why this is safe:
    // - Auth initialization should only happen once when component mounts
    // - onAuthStateChange subscription handles all future auth changes
    // - Re-running this effect would unsubscribe/resubscribe constantly
    //
    // Reference: CLAUDE.md lines 163-186
    // "NEVER use object references in useEffect dependencies"
    // ------------------------------------------------------------------------
  }, [])

  // 🆕 FIXED: Handle redirect in useEffect (MUST be before conditional returns)
  // --------------------------------------------------------------------------
  // CRITICAL: This useEffect MUST be called before any early returns
  // React Hooks Rule: All hooks must be called in the same order every render
  //
  // Why this placement?
  // 1. Hooks can't be inside conditionals (breaks React's hook tracking)
  // 2. Must run on every render to check if redirect needed
  // 3. Only redirects when !loading && !user (safe conditions)
  //
  // Why useEffect not direct router.push()?
  // - router.push() during render causes setState-in-render error
  // - useEffect runs AFTER render completes (safe for side effects)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // ============================================================================
  // SECTION 4: Render Logic (Conditional Rendering)
  // ============================================================================
  // 🎓 LEARNING: Early returns pattern
  // --------------------------------------------------------------------------
  // Instead of nested if/else, we use "early returns":
  // - Check condition
  // - If true, return JSX (exit function)
  // - Otherwise, continue to next check
  //
  // This is cleaner than:
  // if (loading) { ... } else if (!user) { ... } else if (!profile) { ... }
  //
  // Think of it as a "guard clause" pattern:
  // - Guard 1: Still loading? Show spinner
  // - Guard 2: No user? Show redirect message
  // - Guard 3: No profile? Show loading message
  // - Success: Render children
  // --------------------------------------------------------------------------

  // 🎓 GUARD 1: Show loading spinner
  // --------------------------------------------------------------------------
  // Why check loading first?
  // - On mount, user and profile are null (not fetched yet)
  // - Without this, we'd redirect to login before checking auth!
  // - Loading prevents premature decisions
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {/* Tailwind CSS: flex centers content, animate-spin rotates div */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 🎓 GUARD 2: No user - redirect to login
  // --------------------------------------------------------------------------
  // At this point, loading is false (guard 1 passed)
  // So if no user, they're definitely not logged in
  //
  // 🆕 FIXED: Redirect happens in useEffect above (before any returns)
  // This component just shows "Redirecting..." message during redirect
  // --------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    )
  }

  // 🎓 GUARD 3: User exists but no profile
  // --------------------------------------------------------------------------
  // Edge case: User logged in, but profile fetch failed or hasn't completed
  //
  // Why separate from loading?
  // - loading = Still checking if user exists
  // - !profile = User exists, waiting for profile data
  //
  // This can happen if:
  // - Network slow (profile fetch taking time)
  // - Database error (profile doesn't exist)
  // - RLS policy blocking (misconfigured permissions)
  // --------------------------------------------------------------------------
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // 🎓 SUCCESS: All guards passed - render children with context
  // --------------------------------------------------------------------------
  // At this point:
  // ✅ Not loading
  // ✅ User exists
  // ✅ Profile exists
  //
  // Safe to render protected content!
  //
  // LEARNING: Context Provider
  // --------------------------------------------------------------------------
  // <AuthContext.Provider value={{ user, profile, loading }}>
  //                        ^
  //                        This object is available via useAuth()
  //
  // Any component inside {children} can call useAuth() to get:
  // - user: The authenticated user
  // - profile: User's profile data
  // - loading: false (we know it's false here)
  //
  // Example:
  // function MyComponent() {
  //   const { user, profile } = useAuth()
  //   return <p>Hello {profile.name}!</p>
  // }
  // --------------------------------------------------------------------------

  // All good - render children with context
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <div data-testid="auth-wrapper">
        {children}
      </div>
    </AuthContext.Provider>
  )
}

// ============================================================================
// 🎓 RECAP: How AuthWrapper Works (Step-by-step)
// ============================================================================
// 1. Component mounts
//    → loading = true
//    → Shows loading spinner
//
// 2. useEffect runs
//    → Calls initializeAuth()
//    → Fetches session from Supabase
//    → If session exists, fetches profile
//    → Sets loading = false
//
// 3. Component re-renders (because state changed)
//    → loading = false (guard 1 fails, continue)
//    → user exists? Check guard 2
//    → profile exists? Check guard 3
//    → All good? Render children
//
// 4. Auth state listener active
//    → User logs out elsewhere? SIGNED_OUT event → redirect
//    → Token refreshes? TOKEN_REFRESHED → update user
//
// 5. Component unmounts (user navigates away)
//    → Cleanup function runs
//    → Unsubscribes from auth listener
//    → No memory leaks!
//
// ============================================================================
// 🎓 COMMON BUGS TO AVOID
// ============================================================================
// ❌ Forgetting cleanup: return () => subscription.unsubscribe()
//    Result: Memory leak, errors on unmounted component
//
// ❌ async useEffect: useEffect(async () => {})
//    Result: TypeScript error, effect returns Promise not cleanup function
//
// ❌ Missing dependencies: useEffect(() => { use(something) }, [])
//    Result: Stale closure, uses old values
//
// ❌ Not checking loading: if (!user) redirect (without checking loading)
//    Result: Premature redirect before auth check completes
//
// ❌ Forgetting .single(): .select('*').eq('id', ...)
//    Result: Array returned instead of object, profile.name fails
//
// ============================================================================