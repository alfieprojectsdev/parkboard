// ============================================================================
// NEXTAUTH.JS v5 - API ROUTE HANDLER
// ============================================================================
// This file exposes the NextAuth.js handlers as Next.js API routes.
// It handles all auth-related requests at /api/auth/*
//
// Routes handled:
// - GET /api/auth/signin      - Sign-in page
// - POST /api/auth/signin     - Sign-in action
// - GET /api/auth/signout     - Sign-out page
// - POST /api/auth/signout    - Sign-out action
// - GET /api/auth/session     - Get current session
// - GET /api/auth/csrf        - Get CSRF token
// - GET /api/auth/providers   - Get configured providers
// - GET /api/auth/callback/*  - OAuth callbacks
// ============================================================================

import { GET, POST } from '@/lib/auth/auth'

export { GET, POST }
