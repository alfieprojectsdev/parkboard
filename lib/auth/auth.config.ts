// lib/auth/auth.config.ts
// ============================================================================
// NEXTAUTH.JS v5 - EDGE-COMPATIBLE CONFIGURATION
// ============================================================================
// This file contains the edge-compatible NextAuth.js configuration.
// It's used by middleware for auth checks and should NOT contain any
// database calls or Node.js-only dependencies.
//
// Why separate from auth.ts?
// - Middleware runs on the Edge runtime (not full Node.js)
// - Edge runtime has limited API access (no direct DB connections)
// - This config defines routes and authorization logic only
// - auth.ts imports this and adds providers/database logic
// ============================================================================

import type { NextAuthConfig } from 'next-auth'

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================
// These routes are accessible to everyone, even without logging in
export const PUBLIC_ROUTES = [
  '/',                    // Landing page
  '/login',              // Login page
  '/register',           // Registration page
  '/auth/callback',      // OAuth callback
  '/LMR',                // LMR community landing page
  '/LMR/',               // LMR community landing page (trailing slash)
  '/LMR/slots',          // Browse LMR slots (no auth required)
  '/LMR/slots/',         // Browse LMR slots (trailing slash)
]

// ============================================================================
// AUTH-ONLY ROUTES - Only accessible when NOT logged in
// ============================================================================
// If user is already authenticated, they should NOT access these
export const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
]

// ============================================================================
// EDGE-COMPATIBLE AUTH CONFIG
// ============================================================================
// This configuration can safely run in Edge runtime (middleware)
// No database calls, no Node.js-only APIs

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
      // Redirecting them would break the API response
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

      // Allow the request to proceed
      return true
    },
  },

  // Empty providers array - providers are added in auth.ts
  // This ensures the config is edge-compatible (no DB calls here)
  providers: [],
}

export default authConfig
