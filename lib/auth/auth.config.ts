import type { NextAuthConfig } from 'next-auth'

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth/callback',
  '/LMR',
  '/LMR/',
  '/LMR/slots',
  '/LMR/slots/',
]

// ============================================================================
// AUTH-ONLY ROUTES - Only accessible when NOT logged in
// ============================================================================
export const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
]

// ============================================================================
// EDGE-COMPATIBLE AUTH CONFIG
// ============================================================================
export const authConfig: NextAuthConfig = {
  // Custom pages - redirect to our custom login page
  pages: {
    signIn: '/login',
  },

  // Callbacks for authorization and session handling
  callbacks: {
    // ========================================================================
    // AUTHORIZED CALLBACK
    // ========================================================================
    // This runs in middleware to determine if a request should proceed
    // Returns: true (allow) or Response (redirect/deny)
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user
      const pathname = nextUrl.pathname

      // RULE 0: Skip middleware for API routes
      // API routes handle their own authentication and return JSON
      // Redirecting them would break API response
      if (pathname.startsWith('/api/')) {
        return true
      }

      // RULE 1: Check if this is a public route
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route)

      // RULE 2: Protect non-public routes
      // If user is NOT authenticated and trying to access protected route
      // Redirect to login page with redirect parameter
      if (!isAuthenticated && !isPublicRoute) {
        const redirectUrl = new URL('/login', nextUrl.origin)
        redirectUrl.searchParams.set('redirect', pathname)
        return Response.redirect(redirectUrl)
      }

      // RULE 3: Redirect authenticated users away from auth pages
      // If user IS logged in, they shouldn't see login/register pages
      const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => pathname === route)

      if (isAuthenticated && isAuthOnlyRoute) {
        // Redirect to community selector (multi-tenant: no default community)
        return Response.redirect(new URL('/', nextUrl.origin))
      }

      // Allow to request to proceed
      return true
    },
  },

  // Empty providers array - providers are added in auth.ts
  // This ensures that config is edge-compatible (no DB calls here)
  providers: [],
}

// Export auth for middleware use (edge-compatible re-export of full auth.ts)
export { auth } from './auth'

export default authConfig
