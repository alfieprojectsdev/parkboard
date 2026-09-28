// lib/auth/auth.ts
// ============================================================================
// NEXTAUTH v5: full configuration (Node runtime; route handlers and pages)
// ============================================================================
// Email + password only. Sessions are JWTs signed with AUTH_SECRET /
// NEXTAUTH_SECRET; nothing is stored server-side. proxy.ts uses the
// database-free auth.config.ts instead of this file.
// ============================================================================

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { verifyCredentials } from './credentials'
import { clientIp } from '@/lib/rate-limit'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        try {
          // Rate limits live inside verifyCredentials (per email and per IP).
          return await verifyCredentials(credentials?.email, credentials?.password, clientIp(request.headers))
        } catch (error) {
          console.error('[auth] authorize failed:', error instanceof Error ? error.message : error)
          return null
        }
      },
    }),
  ],
})

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================
declare module 'next-auth' {
  interface User {
    unitNumber?: string | null
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      unitNumber: string | null
    }
  }
}
