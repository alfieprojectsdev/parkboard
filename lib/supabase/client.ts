// ============================================================================
// SUPABASE BROWSER CLIENT
// ============================================================================
// This file creates a Supabase client that runs in the BROWSER (client-side)
// Used in: Client Components (components with 'use client')
//
// 🎓 LEARNING: Client vs Server in Next.js App Router
// ----------------------------------------------------------------------------
// Next.js has TWO execution environments:
// 1. CLIENT (Browser) - JavaScript runs in user's browser
// 2. SERVER (Node.js) - JavaScript runs on your server before sending HTML
//
// This file runs in the BROWSER, so it has access to:
// ✅ window object, localStorage, cookies (via document.cookie)
// ✅ User interactions (clicks, form inputs)
// ❌ NO access to server-only APIs, file system, or server environment vars
// ============================================================================

import { createBrowserClient } from '@supabase/ssr'

// 🎓 LEARNING: Environment Variables in Next.js
// ----------------------------------------------------------------------------
// NEXT_PUBLIC_* prefix = Exposed to browser (safe for public use)
// Without prefix = Server-only (never sent to browser)
//
// Example:
// NEXT_PUBLIC_API_URL ✅ Available in browser
// DATABASE_SECRET_KEY ❌ Server-only, browser can't see it
//
// Q: Why is NEXT_PUBLIC_SUPABASE_ANON_KEY safe to expose?
// A: The "anon key" is PUBLIC by design. It's like a "guest pass" that:
//    - Allows read/write BUT only through RLS (Row Level Security) policies
//    - Cannot bypass security rules (only service_role_key can)
//    - Is meant to be in your client-side JavaScript
//
// Think of it like a hotel keycard:
// - Anon key = Guest keycard (limited access, RLS enforced)
// - Service role key = Master key (full access, bypasses RLS) ⚠️ NEVER expose!
// ----------------------------------------------------------------------------

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow build-time static generation to pass (env vars set at runtime in Vercel)
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side: return a stub client for build time
      // Real requests will have env vars set
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
    }
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// 🎓 LEARNING: When to use this client
// ----------------------------------------------------------------------------
// ✅ USE in Client Components:
//    - User actions (login, signup, create booking)
//    - Real-time subscriptions (live updates)
//    - Client-side data fetching (after page load)
//
// ❌ DON'T USE in Server Components:
//    - Use lib/supabase/server.ts instead
//    - Server components need cookies for auth
//    - This client doesn't have access to server cookies properly
//
// Example usage:
// ```tsx
// 'use client'  // ← Client Component
// import { createClient } from '@/lib/supabase/client'
//
// function MyComponent() {
//   const supabase = createClient()
//
//   async function handleClick() {
//     const { data } = await supabase.from('slots').select('*')
//   }
// }
// ```
// ----------------------------------------------------------------------------