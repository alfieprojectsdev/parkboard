import type { NextAuthConfig } from 'next-auth'

// ============================================================================
// ROUTE ACCESS
// ============================================================================
// Pages anyone can open. Everything else needs a login. API routes are not
// handled here: they return their own JSON 401s.
const PUBLIC_PAGES: Array<string | RegExp> = [
  '/',
  '/login',
  '/register',
  '/LMR',
  '/LMR/slots',
  /^\/LMR\/slots\/(?!new$)[^/]+$/, // slot detail (contact stays hidden until login)
]

// Pages a logged-in user is sent away from.
const AUTH_ONLY_PAGES = ['/login', '/register']

const matches = (pathname: string, rule: string | RegExp) =>
  typeof rule === 'string' ? pathname === rule : rule.test(pathname)

// ============================================================================
// SHARED CONFIG (no database access)
// ============================================================================
// proxy.ts builds its NextAuth instance from this object alone, so the proxy
// never loads pg or bcrypt. lib/auth/auth.ts spreads it and adds the
// credentials provider. This file must not import or re-export auth.ts:
// until 2026-09-29 it did (`export { auth } from './auth'`), which pulled the
// database client into the middleware bundle.
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Vercel sets the Host header; this lets preview URLs and custom domains work.
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname
      if (pathname.startsWith('/api/')) return true

      const loggedIn = !!auth?.user
      if (loggedIn && AUTH_ONLY_PAGES.includes(pathname)) {
        return Response.redirect(new URL('/LMR/slots', nextUrl.origin))
      }
      if (!loggedIn && !PUBLIC_PAGES.some((rule) => matches(pathname, rule))) {
        const login = new URL('/login', nextUrl.origin)
        login.searchParams.set('redirect', pathname)
        return Response.redirect(login)
      }
      return true
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id ?? ''
        token.name = user.name ?? null
        token.email = user.email ?? null
        token.unitNumber = (user as { unitNumber?: string }).unitNumber ?? null
      }
      // The profile page calls useSession().update() after a save so the nav
      // shows the new name/unit. Display only: no route authorizes on these.
      if (trigger === 'update' && session && typeof session === 'object') {
        const { name, unitNumber } = session as { name?: unknown; unitNumber?: unknown }
        if (typeof name === 'string' && name.length <= 100) token.name = name
        if (typeof unitNumber === 'string' && unitNumber.length <= 20) token.unitNumber = unitNumber
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.unitNumber = (token.unitNumber as string | null) ?? null
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig

export default authConfig
