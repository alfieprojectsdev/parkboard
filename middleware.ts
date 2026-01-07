// middleware.ts - NextAuth.js v5 Server-Side Auth Protection
// ============================================================================
// This middleware uses NextAuth.js v5 for authentication.
// All routing logic (public routes, auth-only routes, redirects) is handled
// by the `authorized` callback in lib/auth/auth.config.ts.
//
// This file simply exports the NextAuth middleware function and configures
// which routes it should run on via the matcher.
// ============================================================================

export { auth as middleware } from '@/lib/auth/auth'

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================
// Tells Next.js which routes this middleware should run on.
// Uses a negative pattern to exclude static assets and files.
// All other routes pass through NextAuth's authorized callback.
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
