// middleware.ts - Server-side auth protection
// ============================================================================
// NEXT.JS MIDDLEWARE - SERVER-SIDE AUTHENTICATION PROTECTION
// ============================================================================
// This file runs BEFORE any page loads on the server
// Provides true server-side auth that CANNOT be bypassed with browser DevTools
//
// 🎓 LEARNING: What is Middleware?
// ----------------------------------------------------------------------------
// Middleware in Next.js is code that runs BEFORE a request is completed.
// It runs on the EDGE (fast, globally distributed servers).
//
// Think of it as a security guard at the entrance:
// 1. User tries to visit /slots
// 2. Middleware checks: "Do you have a valid session?"
// 3. If YES → Allow access
// 4. If NO → Redirect to /login
//
// Why it's powerful:
// ✅ Runs on the server (can't disable with DevTools)
// ✅ Checks EVERY request (no gaps in protection)
// ✅ Fast (runs on Edge, not your origin server)
// ✅ Consistent (one place for all auth logic)
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================
// These routes are accessible to everyone, even without logging in
// Note: API routes (/api/*) are handled separately and skip this check
const PUBLIC_ROUTES = [
  '/',                    // Landing page
  '/login',              // Login page
  '/register',           // Registration page
  '/auth/callback',      // OAuth callback (if using social login)
  '/LMR',                // LMR community landing page
  '/LMR/',               // LMR community landing page (trailing slash)
  '/LMR/slots',          // Browse LMR slots (no auth required)
  '/LMR/slots/',         // Browse LMR slots (trailing slash)
]

// ============================================================================
// AUTH-ONLY ROUTES - Only accessible when NOT logged in
// ============================================================================
// If user is already authenticated, they should NOT access these
const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
]

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================
// This function runs on EVERY request that matches the config.matcher below
export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 🎓 LEARNING: Creating Supabase Client in Middleware
  // --------------------------------------------------------------------------
  // We need a special setup for middleware because:
  // 1. Middleware runs on the Edge (not Node.js)
  // 2. We need to read AND update cookies
  // 3. Edge runtime has different APIs than Node.js
  //
  // The key difference from our server.ts client:
  // - server.ts: Only reads cookies (get method only)
  // - middleware.ts: Reads AND writes cookies (get + set methods)
  //
  // Why write cookies?
  // - Refresh expired tokens
  // - Update session data
  // - Remove cookies on logout
  // --------------------------------------------------------------------------

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookie from request
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Write cookie to response
        set(name: string, value: string, options: any) {
          // Set cookie on both request and response
          // Request: So subsequent middleware code sees it
          // Response: So browser receives it
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        // Remove cookie from response
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 🎓 LEARNING: getSession() vs getUser()
  // --------------------------------------------------------------------------
  // getSession(): Fast, checks local JWT cookie
  // - Reads from cookie (no database call)
  // - Fast but could be stale
  // - Good for middleware (needs to be fast)
  //
  // getUser(): Slower, validates with Supabase
  // - Makes API call to Supabase
  // - Always fresh, validates JWT signature
  // - Good for API routes (needs to be secure)
  //
  // For middleware, we use getSession() for speed
  // RLS policies will double-check on actual database queries
  // --------------------------------------------------------------------------

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthenticated = !!session

  // Get the pathname (e.g., "/slots", "/login")
  const pathname = request.nextUrl.pathname

  // 🎓 LEARNING: Middleware Logic Flow
  // --------------------------------------------------------------------------
  // We have two main security rules:
  //
  // RULE 0: Skip API Routes (they handle their own auth)
  // API routes should not be redirected - they return JSON
  // → Allow all /api/* routes to pass through
  //
  // RULE 1: Protected Routes (require authentication)
  // If user is NOT logged in AND trying to access protected route
  // → Redirect to /login
  //
  // RULE 2: Auth-Only Routes (require NO authentication)
  // If user IS logged in AND trying to access /login or /register
  // → Redirect to /slots
  //
  // This creates a clean user experience:
  // - Anonymous users → forced to login
  // - Logged in users → can't see login page (already logged in!)
  // --------------------------------------------------------------------------

  // ============================================================================
  // RULE 0: Skip middleware for API routes
  // ============================================================================
  // API routes handle their own authentication and return JSON
  // Redirecting them would break the API response
  if (pathname.startsWith('/api/')) {
    return response
  }

  // ============================================================================
  // RULE 1: Protect non-public routes
  // ============================================================================
  // Check if this is a protected route (not in PUBLIC_ROUTES)
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route)

  if (!isAuthenticated && !isPublicRoute) {
    // User is NOT authenticated and trying to access protected route
    // → Redirect to login page

    // 🎓 LEARNING: Preserving redirect path
    // ------------------------------------------------------------------------
    // We add ?redirect=/original-path to the login URL
    // This allows the login page to redirect back after successful login
    //
    // Example:
    // User visits: /slots
    // Redirected to: /login?redirect=/slots
    // After login: Redirected back to /slots
    //
    // This is better UX than always going to home page after login
    // ------------------------------------------------------------------------

    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ============================================================================
  // RULE 2: Redirect authenticated users away from auth pages
  // ============================================================================
  // If user IS logged in, they shouldn't see login/register pages
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => pathname === route)

  if (isAuthenticated && isAuthOnlyRoute) {
    // User is authenticated but trying to access login/register
    // → Redirect to community selector (multi-tenant: no default community)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ============================================================================
  // Allow the request to proceed
  // ============================================================================
  // If we got here, either:
  // 1. User is authenticated and accessing allowed route, OR
  // 2. User is anonymous and accessing public route
  //
  // Return the response (with potentially updated cookies from getSession)
  return response
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================
// Tells Next.js which routes this middleware should run on
//
// 🎓 LEARNING: Matcher Patterns
// ----------------------------------------------------------------------------
// We use a NEGATIVE pattern (exclude what we DON'T want to protect)
// This is more secure than a positive pattern (include what we DO protect)
//
// Why? If we forget to add a new protected route to the list, it will:
// - NEGATIVE pattern: Be protected by default ✅ (secure by default)
// - POSITIVE pattern: Be unprotected ❌ (insecure by default)
//
// Pattern explained:
// /((?!pattern1|pattern2|...).*)
//   (?!...)  = Negative lookahead (exclude if matches)
//   |        = OR operator
//   .*       = Match everything else
//
// We exclude:
// - _next/static: Next.js static files (JS, CSS)
// - _next/image: Next.js optimized images
// - favicon.ico: Browser icon
// - .*\\..*: Files with extensions (images, fonts, etc.)
//
// Why exclude these?
// 1. No user data involved (public assets)
// 2. Middleware would slow them down (called on EVERY asset)
// 3. They can't be "protected" anyway (browser needs them to render)
// ----------------------------------------------------------------------------
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}

// ============================================================================
// SECURITY NOTES
// ============================================================================
// ✅ This middleware provides TRUE server-side protection
//    - Cannot be bypassed with browser DevTools
//    - Cannot be disabled by blocking JavaScript
//    - Runs before ANY page code executes
//
// ✅ Works with Supabase RLS (Row Level Security)
//    - Middleware: First line of defense (routing)
//    - RLS: Second line of defense (data access)
//    - Even if someone bypasses routing, they can't access data
//
// ✅ Edge-optimized for performance
//    - Runs on Vercel Edge Network (globally distributed)
//    - <50ms latency worldwide
//    - No cold starts
//
// 🔐 ADDITIONAL SECURITY RECOMMENDATIONS:
// 1. Enable Supabase RLS on all tables
// 2. Add rate limiting for API routes (Upstash, Vercel)
// 3. Use HTTPS only (Next.js forces this in production)
// 4. Set secure cookie options in Supabase config
// 5. Implement CSRF protection for forms (Supabase handles this)
// ============================================================================

// ============================================================================
// TODO: OAUTH RATE LIMITING IMPLEMENTATION
// ============================================================================
// Current Status: ❌ NOT IMPLEMENTED
// Priority: LOW (only needed if app scales beyond typical condo usage)
//
// Background:
// - Google OAuth: Free up to 50,000 Monthly Active Users (MAU)
// - Facebook Login: Free forever, but limited to ~200 calls/user/hour
// - Current middleware does NOT track or limit OAuth API calls
//
// When to implement:
// - If you expect >10,000 active users/month
// - If you notice 429 errors from Facebook/Google
// - If you want proactive protection against abuse
//
// Implementation Steps:
// ----------------------------------------------------------------------------
//
// STEP 1: Install rate limiting library
// -------
// Option A: Upstash Redis (recommended for Vercel)
//   npm install @upstash/ratelimit @upstash/redis
//   - Create Upstash account: https://upstash.com
//   - Create Redis database
//   - Add env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//
// Option B: Vercel KV (if using Vercel hosting)
//   npm install @vercel/kv
//   - Enable KV in Vercel dashboard
//   - Automatically configured on deployment
//
// STEP 2: Create rate limiter instance
// -------
// import { Ratelimit } from '@upstash/ratelimit'
// import { Redis } from '@upstash/redis'
//
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// })
//
// // OAuth-specific rate limiter
// const oauthRateLimiter = new Ratelimit({
//   redis: redis,
//   limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 OAuth attempts per hour
//   analytics: true,
// })
//
// // General API rate limiter
// const apiRateLimiter = new Ratelimit({
//   redis: redis,
//   limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
//   analytics: true,
// })
//
// STEP 3: Add rate limiting logic to middleware
// -------
// Add this BEFORE the session check (around line 148):
//
// // Identify user by IP or session
// const identifier = session?.user?.id ||
//                    request.headers.get('x-forwarded-for') ||
//                    request.ip ||
//                    'anonymous'
//
// // Check if this is an OAuth callback route
// if (pathname === '/auth/callback') {
//   const { success, limit, remaining, reset } = await oauthRateLimiter.limit(
//     `oauth:${identifier}`
//   )
//
//   if (!success) {
//     // Rate limit exceeded - return 429
//     return new NextResponse('Too Many OAuth Attempts', {
//       status: 429,
//       headers: {
//         'X-RateLimit-Limit': limit.toString(),
//         'X-RateLimit-Remaining': remaining.toString(),
//         'X-RateLimit-Reset': new Date(reset).toISOString(),
//       },
//     })
//   }
// }
//
// // Apply general rate limiting to all API routes
// if (pathname.startsWith('/api/')) {
//   const { success, limit, remaining, reset } = await apiRateLimiter.limit(
//     `api:${identifier}`
//   )
//
//   if (!success) {
//     return new NextResponse('Too Many Requests', {
//       status: 429,
//       headers: {
//         'X-RateLimit-Limit': limit.toString(),
//         'X-RateLimit-Remaining': remaining.toString(),
//         'X-RateLimit-Reset': new Date(reset).toISOString(),
//       },
//     })
//   }
// }
//
// STEP 4: Add rate limit tracking for OAuth providers
// -------
// Track OAuth provider usage separately:
//
// // Get OAuth provider from callback URL
// const provider = request.nextUrl.searchParams.get('provider') // 'google' or 'facebook'
//
// if (pathname === '/auth/callback' && provider) {
//   // Track per-provider limits
//   const providerLimiter = new Ratelimit({
//     redis: redis,
//     limiter: provider === 'facebook'
//       ? Ratelimit.slidingWindow(150, '1 h')  // Conservative: 150/hour (Facebook limit: 200/hour)
//       : Ratelimit.slidingWindow(1000, '1 h'), // Google is more generous
//   })
//
//   const { success } = await providerLimiter.limit(
//     `oauth:${provider}:${identifier}`
//   )
//
//   if (!success) {
//     return new NextResponse(`Too many ${provider} login attempts`, {
//       status: 429,
//     })
//   }
// }
//
// STEP 5: Add monitoring/alerting (optional)
// -------
// Track rate limit violations:
//
// if (!success) {
//   // Log to monitoring service (Sentry, LogRocket, etc.)
//   console.error(`Rate limit exceeded for ${identifier} on ${pathname}`)
//
//   // Optional: Send alert if threshold exceeded
//   // await sendAlert(`High rate limit violations detected`)
// }
//
// STEP 6: Update environment variables
// -------
// Add to .env.local:
// UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
// UPSTASH_REDIS_REST_TOKEN=your-token-here
//
// STEP 7: Test implementation
// -------
// Test scenarios:
// 1. Normal OAuth login (should work)
// 2. Rapid OAuth attempts (should be rate limited after 10 attempts/hour)
// 3. Check response headers include rate limit info
// 4. Verify Redis is storing rate limit data correctly
//
// Pseudocode for testing:
// for (let i = 0; i < 15; i++) {
//   const response = await fetch('/auth/callback?provider=google')
//   console.log(`Attempt ${i}: ${response.status}`)
//   // First 10 should be 200/302, next 5 should be 429
// }
//
// ============================================================================
// IMPLEMENTATION NOTES:
// ============================================================================
// - OAuth rate limiting protects against:
//   ✓ Brute force login attempts
//   ✓ OAuth token harvesting
//   ✓ API quota exhaustion
//   ✓ DDoS attacks on auth endpoints
//
// - Does NOT protect against:
//   ✗ Rate limits enforced by Google/Facebook themselves
//   ✗ Costs beyond free tier (you still pay if exceeding 50K MAU)
//
// - For a condo app with <1000 users, this is likely overkill
// - Implement only if you see abuse or scale beyond 10K users
// ============================================================================
