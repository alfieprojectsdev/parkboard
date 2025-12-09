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
import { Pool } from 'pg'

import { authConfig } from './auth.config'

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
// Singleton Pool for Neon database connection
// Uses DATABASE_URL environment variable (same as NEON_CONNECTION_STRING)

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING

    if (!connectionString) {
      throw new Error('DATABASE_URL or NEON_CONNECTION_STRING environment variable is required')
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Neon
      max: 10, // Connection pool size
    })
  }
  return pool
}

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
  community_code: string
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
        communityCode: { label: 'Community Code', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        try {
          // Validate credentials
          if (!credentials?.communityCode || !credentials?.email || !credentials?.password) {
            console.error('[Auth] Missing credentials')
            return null
          }

          const communityCode = credentials.communityCode as string
          const email = credentials.email as string
          const password = credentials.password as string

          // Query user_profiles table for user with matching email AND community_code
          const db = getPool()
          const result = await db.query<UserProfile>(
            `SELECT id, email, name, phone, unit_number, password_hash, community_code
             FROM user_profiles
             WHERE email = $1 AND community_code = $2`,
            [email, communityCode]
          )

          // Check if user exists
          if (result.rows.length === 0) {
            console.error('[Auth] Invalid credentials or community code')
            return null
          }

          const user = result.rows[0]

          // Verify password with bcrypt
          const passwordValid = await bcrypt.compare(password, user.password_hash)

          if (!passwordValid) {
            console.error('[Auth] Invalid credentials or community code')
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
            communityCode: user.community_code,
          }
        } catch (error) {
          console.error('[Auth] Authorization error:', error)
          return null
        }
      },
    }),

    // ========================================================================
    // GOOGLE PROVIDER (Optional - Add later)
    // ========================================================================
    // TODO: Uncomment and configure when ready to add Google OAuth
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
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
        if ('communityCode' in user) {
          token.communityCode = user.communityCode as string
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
        session.user.communityCode = token.communityCode as string
      }
      return session
    },

    // ========================================================================
    // SIGN-IN CALLBACK
    // ========================================================================
    // Called on every sign-in attempt
    // Use this for OAuth users to check profile completion
    async signIn({ user, account }) {
      // For credentials provider, just allow sign-in
      if (account?.provider === 'credentials') {
        return true
      }

      // For OAuth providers (Google, etc.), check if user_profiles entry exists
      // If profile is incomplete, redirect to profile completion page
      if (account?.provider === 'google') {
        try {
          const db = getPool()
          const result = await db.query(
            `SELECT id, phone, unit_number FROM user_profiles WHERE id = $1`,
            [user.id]
          )

          // If no profile exists or profile is incomplete, redirect to complete
          if (result.rows.length === 0) {
            // User doesn't have a profile yet - allow sign-in
            // The profile will be created on first login
            // Then redirect to profile completion
            return '/profile/complete'
          }

          const profile = result.rows[0]
          // Check if required fields are missing
          if (!profile.phone || !profile.unit_number) {
            return '/profile/complete'
          }
        } catch (error) {
          console.error('[Auth] Error checking OAuth user profile:', error)
          // Allow sign-in even if profile check fails
          return true
        }
      }

      return true
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

declare module 'next-auth' {
  interface User {
    phone?: string | null
    unitNumber?: string | null
    communityCode?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      phone: string | null
      unitNumber: string | null
      communityCode: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    phone?: string | null
    unitNumber?: string | null
    communityCode?: string
  }
}
