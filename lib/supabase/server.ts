// ============================================================================
// SUPABASE SERVER CLIENT
// ============================================================================
// This file creates a Supabase client that runs on the SERVER (Node.js)
// Used in: Server Components, Server Actions, API Routes
//
// 🎓 LEARNING: Why do we need a SEPARATE server client?
// ----------------------------------------------------------------------------
// Q: Why not just use the browser client everywhere?
// A: Authentication! Server needs to read auth cookies differently.
//
// Browser client: Uses document.cookie (browser API)
// Server client: Uses Next.js cookies() helper (Node.js API)
//
// Think of it like this:
// - Browser: "Hey user's browser, what cookies do you have?"
// - Server: "Hey Next.js, what cookies did the user send in this request?"
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 🎓 LEARNING: Next.js cookies() helper
// ----------------------------------------------------------------------------
// `cookies()` is a Next.js function that reads HTTP cookies from the request
// Only works in:
// ✅ Server Components
// ✅ Server Actions
// ✅ Route Handlers (API routes)
// ❌ Client Components (will error!)
//
// Why it's async in some Next.js versions:
// - In Next.js 15+, cookies() is async: await cookies()
// - In Next.js 14, it's sync: cookies()
// - Always check your Next.js version!
// ----------------------------------------------------------------------------

export function createClient() {
  // Get the cookie store from the current request
  // This happens on EVERY request - cookies are request-specific
  const cookieStore = cookies()

  // 🎓 LEARNING: Why pass cookies to Supabase?
  // --------------------------------------------------------------------------
  // Supabase stores auth session in cookies (not localStorage like old SPAs)
  // Cookie name: sb-<project-ref>-auth-token
  //
  // Flow:
  // 1. User logs in (browser)
  // 2. Supabase sets auth cookie (httpOnly, secure)
  // 3. Browser sends cookie with every request
  // 4. Server reads cookie to know who the user is
  // 5. Supabase uses cookie to get user data
  //
  // This is MORE SECURE than localStorage because:
  // - httpOnly cookies can't be stolen by XSS attacks
  // - Cookies auto-send with requests (no manual handling)
  // --------------------------------------------------------------------------

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 🎓 LEARNING: Cookie getter function
        // ----------------------------------------------------------------------
        // Supabase calls this function when it needs to read auth cookies
        // name: The cookie name (e.g., "sb-abc-auth-token")
        //
        // cookieStore.get(name) returns: { name: string, value: string } | undefined
        // We use ?.value to safely get just the value
        //
        // Optional chaining (?.) explained:
        // cookieStore.get('missing')?.value → undefined (no error)
        // cookieStore.get('exists')?.value → "cookie_value"
        // ----------------------------------------------------------------------
        get(name: string) {
          return cookieStore.get(name)?.value
        },

        // 🎓 ADVANCED: Why no set() or remove()?
        // ----------------------------------------------------------------------
        // In read-only contexts (Server Components), we only need get()
        // For Route Handlers that need to SET cookies, you'd add:
        //
        // set(name: string, value: string, options: CookieOptions) {
        //   cookieStore.set({ name, value, ...options })
        // },
        // remove(name: string, options: CookieOptions) {
        //   cookieStore.set({ name, value: '', ...options })
        // }
        //
        // But for now, we only READ cookies (authentication check)
        // ----------------------------------------------------------------------
      },
    }
  )
}

// 🎓 LEARNING: When to use Server vs Client vs Admin
// ----------------------------------------------------------------------------
// Use lib/supabase/SERVER.ts when:
// ✅ Server Components (default in Next.js App Router)
// ✅ Server Actions (functions with 'use server')
// ✅ API Routes that need authenticated user
// ✅ Initial page load data fetching
//
// Use lib/supabase/CLIENT.ts when:
// ✅ Client Components ('use client')
// ✅ User interactions (buttons, forms)
// ✅ Real-time subscriptions
// ✅ Client-side data fetching (after page load)
//
// Use lib/supabase/ADMIN.ts when:
// ✅ API routes that need to bypass RLS
// ✅ Admin operations (user management)
// ✅ Server-side only! Never in client code!
//
// Example: Fetching user's bookings
// ----------------------------------
// Server Component (Initial load):
// ```tsx
// import { createClient } from '@/lib/supabase/server'
//
// export default async function BookingsPage() {
//   const supabase = createClient()
//   const { data } = await supabase.from('bookings').select('*')
//   return <div>{/* render data */}</div>
// }
// ```
//
// Client Component (Interactive):
// ```tsx
// 'use client'
// import { createClient } from '@/lib/supabase/client'
//
// export default function BookingsPage() {
//   const [bookings, setBookings] = useState([])
//   const supabase = createClient()
//
//   useEffect(() => {
//     supabase.from('bookings').select('*').then(({ data }) => setBookings(data))
//   }, [])
// }
// ```
// ----------------------------------------------------------------------------