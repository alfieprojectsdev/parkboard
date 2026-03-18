# INSTALL DATABASE DEPENDENCIES

**Phase 2 Complete - Action Required**

The Phase 2 database abstraction layer is complete but requires PostgreSQL dependencies to be installed.

## Quick Install

```bash
# Install PostgreSQL client library
npm install pg

# Install TypeScript types for PostgreSQL
npm install -D @types/pg
```

## Why These Are Needed

- `pg` - PostgreSQL client library for Node.js
- `@types/pg` - TypeScript type definitions for pg

These packages enable:
- ✅ Direct PostgreSQL connections (Neon, local)
- ✅ Connection pooling
- ✅ Transaction support
- ✅ Raw SQL query execution

## Current Status

**Without These Dependencies:**
- ✅ All 192 tests pass (tests mock Supabase, don't need pg)
- ✅ Supabase connections work (uses @supabase/supabase-js)
- ❌ Neon connections will fail
- ❌ Local PostgreSQL connections will fail
- ❌ TypeScript compilation shows errors for lib/db/*.ts files

**After Installing:**
- ✅ All database types work (Supabase, Neon, local)
- ✅ TypeScript compilation clean
- ✅ Migration script fully functional
- ✅ Database probe operational

## Verification

After installing, verify everything works:

```bash
# 1. Check TypeScript compilation
npx tsc --noEmit lib/db/connection.ts lib/db/probe.ts

# 2. Run tests
npm test

# 3. Test migration script (if you have local PostgreSQL)
createdb parkboard_test
export DATABASE_URL=postgresql://postgres:password@localhost:5432/parkboard_test
./scripts/migrate.sh --dry-run
```

## Package.json Update

These will be added to `package.json`:

```json
{
  "dependencies": {
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

---

**Status:** READY TO INSTALL
**Impact:** Low (optional for Supabase-only deployments)
**Required For:** Neon and local PostgreSQL support
