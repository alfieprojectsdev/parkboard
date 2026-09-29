// proxy.ts (Next.js 16's name for middleware.ts)
// Page-level login redirects. The rules live in the authorized() callback in
// lib/auth/auth.config.ts. This builds its own NextAuth instance from that
// database-free config, so pg and bcrypt never load here.
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)'],
}
