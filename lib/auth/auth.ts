// lib/auth/auth.ts
// ============================================================================
// NEXTAUTH.JS v5 - FULL CONFIGURATION WITH PROVIDERS
// ============================================================================
// This file contains the complete NextAuth.js configuration with:
// - Credentials provider for email/password authentication
// - JWT session strategy (serverless-optimized)
// - Callbacks for JWT and session data
// - Database connection for user lookup
//
// This file should NOT be imported directly in middleware (use auth.config.ts)
// ============================================================================

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

import { authConfig } from './auth.config'
import { query } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/rate-limit'

// ============================================================================
// USER TYPE
// ============================================================================
// Extended user type with profile data from user_profiles table

interface UserProfile {
  id: string
  email: string
  name: string
  phone: string | null
  unit_number: string | null
  password_hash: string
}

// ============================================================================
// NEXTAUTH CONFIGURATION
// ============================================================================

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Spread edge-compatible config
  ...authConfig,

  // Session configuration
  session: {
    strategy: 'jwt', // JWT strategy is serverless-optimized (no session store needed)
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  // Authentication providers
  providers: [
    // ========================================================================
    // CREDENTIALS PROVIDER - Email/Password Authentication
    // ========================================================================
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        try {
          // Validate credentials
          if (!credentials?.email || !credentials?.password) {
            console.error('[Auth] Missing credentials')
            return null
          }

          const email = credentials.email as string
          const password = credentials.password as string

          // ======================================================================
          // RATE LIMITING - Check BEFORE database query
          // ======================================================================
          // P0-005: Prevent brute-force password attacks
          // Use email as identifier to limit login attempts per email
          // Default: 5 attempts per 15 minutes
          // ----------------------------------------------------------------------
          if (!checkRateLimit(email)) {
            console.error('[Auth] Rate limit exceeded for email:', email)
            return null // NextAuth interprets null as failed login
          }

          // Look up the user by email (single community in v2 — no community_code)
          const result = await query<UserProfile>(
            `SELECT id, email, name, phone, unit_number, password_hash
             FROM user_profiles
             WHERE email = $1`,
            [email]
          )

          // Check if user exists
          if (result.rows.length === 0) {
            console.error('[Auth] Invalid credentials')
            return null
          }

          const user = result.rows[0]

          // Verify password with bcrypt
          const passwordValid = await bcrypt.compare(password, user.password_hash)

          if (!passwordValid) {
            console.error('[Auth] Invalid credentials')
            return null
          }

          // Return user object (this becomes the user in JWT/session)
          // Note: Do NOT include password_hash in the return object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            unitNumber: user.unit_number,
          }
        } catch (error) {
          console.error('[Auth] Authorization error:', error)
          return null
        }
      },
    }),
  ],

  // ========================================================================
  // CALLBACKS
  // ========================================================================
  callbacks: {
    // Spread the authorized callback from authConfig
    ...authConfig.callbacks,

    // ========================================================================
    // JWT CALLBACK
    // ========================================================================
    // Called when JWT is created or updated
    // Use this to add custom data to the token
    async jwt({ token, user }) {
      // On initial sign-in, user object is available
      if (user) {
        token.userId = user.id ?? ''
        token.name = user.name ?? null
        token.email = user.email ?? null
        // Add custom fields from credentials provider
        // These are passed from authorize() return value
        if ('phone' in user) {
          token.phone = user.phone as string | null
        }
        if ('unitNumber' in user) {
          token.unitNumber = user.unitNumber as string | null
        }
      }
      return token
    },

    // ========================================================================
    // SESSION CALLBACK
    // ========================================================================
    // Called when session is accessed
    // Use this to expose token data to client via session.user
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        // Expose custom fields to session
        session.user.phone = token.phone as string | null
        session.user.unitNumber = token.unitNumber as string | null
      }
      return session
    },
  },

  // Secret for JWT signing
  secret: process.env.NEXTAUTH_SECRET,

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',
})

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================
// Extend NextAuth types to include custom user fields

// NOTE: `communityCode` is no longer populated anywhere in the auth runtime
// (dropped from the credentials provider, the user lookup, and the jwt/session
// callbacks in M-001). The optional type field is retained ONLY so the not-yet
// migrated consumers (lib/auth/tenant-access.ts, app/(auth)/login/page.tsx, the
// Supabase-backed API routes) still type-check. It is removed for good in M-006
// once those consumers are deleted/rewritten. At runtime it is always undefined.
declare module 'next-auth' {
  interface User {
    phone?: string | null
    unitNumber?: string | null
    /** @deprecated vestigial — removed in M-006. Always undefined at runtime. */
    communityCode?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      phone: string | null
      unitNumber: string | null
      /** @deprecated vestigial — removed in M-006. Always undefined at runtime. */
      communityCode?: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    phone?: string | null
    unitNumber?: string | null
    /** @deprecated vestigial — removed in M-006. Always undefined at runtime. */
    communityCode?: string
  }
}
