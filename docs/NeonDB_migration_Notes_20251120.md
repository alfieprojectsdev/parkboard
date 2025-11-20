No, there are no existing migration notes for NeonDB in the project. All current documentation assumes Supabase for both database and authentication.

Current Situation Analysis
The project currently uses Supabase for:

PostgreSQL Database (can be migrated to NeonDB ✅)
Supabase Auth (authentication service) ⚠️ NeonDB doesn't provide this
Supabase Client Libraries (@supabase/ssr, @supabase/supabase-js)
Key Decision Needed: Authentication
Since NeonDB is PostgreSQL-only (no auth service), you'll need to choose an authentication solution:

Option A: NextAuth.js (Auth.js) v5 ⭐ Recommended
Most popular Next.js auth solution
Works with NeonDB PostgreSQL
Similar user table structure
Handles sessions, OAuth providers
Effort: Medium (replace auth layer)
Option B: Clerk
Drop-in auth UI components
Hosted auth service
Modern developer experience
Effort: Low (minimal code changes)
Cost: Paid service (free tier available)
Option C: Lucia
Lightweight, flexible
Full control over auth logic
Works with any database
Effort: High (manual implementation)
Migration Scope
If you choose NextAuth.js + NeonDB, here's what needs updating:

1. Database Migration (Easy ✅)
# Export schema from Supabase
# Import to NeonDB (PostgreSQL-compatible)
# Run existing migrations: 002_multi_tenant, 003_community_rls
2. Auth Layer Replacement (Medium ⚠️)
Replace lib/supabase/client.ts with NextAuth client
Replace lib/supabase/server.ts with NextAuth server session
Update middleware.ts for NextAuth session handling
Modify auth routes (app/(auth)/login, register)
Update AuthWrapper.tsx component
3. Database Client (Medium ⚠️)
Replace Supabase queries with:
Drizzle ORM (type-safe, recommended) or
Prisma (popular, heavier) or
Postgres.js (lightweight, raw SQL)
4. Environment Variables (Easy ✅)
# Replace
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# With
DATABASE_URL=postgresql://...@neon.tech/...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://parkboard.app
Questions Before I Create Migration Guide
Which auth solution do you prefer? 
> NextAuth.js
Which database client? 
> Drizzle ORM recommended
Do you want to migrate existing users from Supabase Auth? 
> start fresh
Timeline? Should I prioritize a quick migration or a comprehensive refactor?
Let me know your preferences, and I'll create a detailed NeonDB + NextAuth.js Migration Guide with step-by-step instructions! 🚀