# DATABASE SETUP & MANAGEMENT GUIDE

**Project:** ParkBoard - Minimal MVP
**Purpose:** Comprehensive guide for database setup, migrations, and management
**Last Updated:** 2025-10-27
**Maintainer:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Supported Platforms](#supported-platforms)
3. [Quick Start](#quick-start)
4. [Detailed Setup Instructions](#detailed-setup-instructions)
5. [Running Migrations](#running-migrations)
6. [Database Schema](#database-schema)
7. [Troubleshooting](#troubleshooting)
8. [Migration Development](#migration-development)
9. [Production Deployment](#production-deployment)
10. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Overview

ParkBoard uses a **platform-independent database abstraction layer** that supports:

- **Supabase** (PostgreSQL with Auth) - Recommended for production
- **Neon** (Serverless PostgreSQL) - Alternative serverless option
- **Local PostgreSQL** - For development and testing

The application automatically detects which database to use based on environment variables.

### Architecture Benefits

✅ **Platform Independence** - Switch databases without code changes
✅ **Auto-Detection** - No manual configuration needed
✅ **Connection Pooling** - Optimized for serverless and traditional hosting
✅ **Migration System** - Idempotent migrations safe to run multiple times
✅ **Health Checks** - Built-in database probe for monitoring

---

## Supported Platforms

### Option 1: Supabase (Recommended for Production)

**Why Supabase?**
- Built-in authentication
- Row Level Security (RLS) for multi-tenant isolation
- Real-time subscriptions (future feature)
- Dashboard for SQL queries
- Free tier available

**Best For:** Production deployments, multi-tenant SaaS

### Option 2: Neon (Serverless PostgreSQL)

**Why Neon?**
- Serverless PostgreSQL (scales to zero)
- Branching for testing (database per PR)
- Fast cold starts
- Cost-effective for variable workloads

**Best For:** Cost optimization, CI/CD testing

### Option 3: Local PostgreSQL

**Why Local?**
- Full control and speed
- No internet dependency
- Easy debugging
- Free (no cloud costs)

**Best For:** Development, local testing

---

## Quick Start

### For Development (Local PostgreSQL)

```bash
# 1. Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# 2. Create database
createdb parkboard

# 3. Set environment variable
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/parkboard" >> .env.local

# 4. Run migrations
./scripts/migrate.sh

# 5. Verify setup
./scripts/migrate.sh status
```

### For Production (Supabase)

```bash
# 1. Create Supabase project
# Go to: https://supabase.com/dashboard

# 2. Get API keys
# Project Settings → API

# 3. Set environment variables in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 4. Run migrations
./scripts/migrate.sh
# Or paste SQL into Supabase Dashboard → SQL Editor

# 5. Verify setup
./scripts/migrate.sh status
```

### For Testing (Neon)

```bash
# 1. Create Neon project
# Go to: https://neon.tech

# 2. Copy connection string from dashboard

# 3. Set environment variable
echo "DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require" >> .env.local

# 4. Run migrations
./scripts/migrate.sh

# 5. Verify setup
./scripts/migrate.sh status
```

---

## Detailed Setup Instructions

### Prerequisites

**Required:**
- Node.js 18+ (for Next.js application)
- npm or yarn (for dependencies)

**Platform-Specific:**
- **Supabase:** Supabase account (free tier available)
- **Neon:** Neon account (free tier available)
- **Local:** PostgreSQL 12+ installed locally

### Installation Steps

#### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client
- `pg` - PostgreSQL client library
- `@types/pg` - TypeScript types

#### Step 2: Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Edit `.env.local` based on your chosen platform:

**For Supabase:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**For Neon:**
```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
```

**For Local PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/parkboard
```

#### Step 3: Create Database (Local Only)

If using local PostgreSQL:

```bash
# Create database
createdb parkboard

# Verify connection
psql parkboard -c "SELECT version();"
```

#### Step 4: Run Migrations

Use the migration script:

```bash
# Run all pending migrations
./scripts/migrate.sh

# Check migration status
./scripts/migrate.sh status

# Preview migrations (dry-run)
./scripts/migrate.sh --dry-run
```

#### Step 5: Verify Setup

Run the database probe:

```bash
# Using npm script (if added to package.json)
npm run db:probe

# Or directly with Node.js
node -e "
  const { probeDatabase, formatProbeReport } = require('./lib/db/probe');
  probeDatabase().then(report => {
    console.log(formatProbeReport(report));
  });
"
```

Expected output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE PROBE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONNECTION:
  Type: local
  Status: ✅ Connected
  Connection Time: 45ms
  Version: PostgreSQL 15.3

TABLES:
  users: ✅
  parking_slots: ✅

EXTENSIONS:
  uuid-ossp: ✅
  pgcrypto: ⚠️  (optional)

ROW LEVEL SECURITY:
  Enabled: ✅
  Policies: 6 found

PERFORMANCE:
  Indexes: 8

OVERALL STATUS:
  Ready: ✅ YES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Running Migrations

### Migration Script Commands

The `scripts/migrate.sh` script provides several commands:

#### Run All Pending Migrations

```bash
./scripts/migrate.sh
# or
./scripts/migrate.sh run
```

This will:
1. Detect database type from environment variables
2. Create migration tracking table (if not exists)
3. Check which migrations have already run
4. Execute only pending migrations
5. Record each migration in tracking table

#### Check Migration Status

```bash
./scripts/migrate.sh status
```

Output example:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIGRATION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Database type: local

Available Migrations:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 001_core_schema.sql (executed)
○ 002_add_timestamps.sql (pending)
```

#### Dry-Run Mode

Preview what would be executed without actually running:

```bash
./scripts/migrate.sh --dry-run
```

#### Rollback Last Migration

```bash
./scripts/migrate.sh rollback
```

**Important:** This only works if a rollback file exists at:
`app/db/migrations/rollback/<migration_name>_rollback.sql`

#### Help

```bash
./scripts/migrate.sh help
```

### Manual Migration Execution

If you prefer to run migrations manually:

#### Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Open migration file: `app/db/migrations/001_core_schema.sql`
3. Copy contents
4. Paste into SQL Editor
5. Click "Run"

#### Using psql (Neon/Local)

```bash
psql $DATABASE_URL -f app/db/migrations/001_core_schema.sql
```

#### Using Supabase CLI

```bash
supabase db execute --file app/db/migrations/001_core_schema.sql
```

---

## Database Schema

### Core Tables

#### Users Table

Stores resident profiles (one account per unit).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  contact_viber TEXT,
  contact_telegram TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Constraints:**
- `email` must be unique
- At least one contact method required (enforced at app level)

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_unit` on `unit_number`

#### Parking Slots Table

Stores available parking slots with location-based identification.

```sql
CREATE TABLE parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Location (replaces slot_number)
  location_level TEXT NOT NULL CHECK (location_level IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')),
  location_tower TEXT NOT NULL CHECK (location_tower IN ('East Tower', 'North Tower', 'West Tower')),
  location_landmark TEXT,

  -- Availability window
  available_from TIMESTAMPTZ NOT NULL,
  available_until TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'taken', 'expired')),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (available_until > available_from)
);
```

**Key Constraints:**
- `owner_id` references `users(id)` with CASCADE delete
- `location_level` must be P1-P6
- `location_tower` must be one of three towers
- `available_until` must be after `available_from`
- `status` must be valid enum value

**Indexes:**
- `idx_slots_status` on `status`
- `idx_slots_dates` on `(available_from, available_until)`
- `idx_slots_location` on `(location_level, location_tower)`
- `idx_slots_owner` on `owner_id`

### Database Triggers

#### Auto-Expire Slots

Automatically marks slots as expired when they pass their `available_until` time.

```sql
CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS trigger AS $$
BEGIN
  UPDATE parking_slots
  SET status = 'expired', updated_at = NOW()
  WHERE available_until < NOW()
    AND status = 'available';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_slots
  AFTER INSERT OR UPDATE ON parking_slots
  FOR EACH STATEMENT
  EXECUTE FUNCTION expire_old_slots();
```

#### Auto-Update Timestamps

Automatically updates `updated_at` field when rows are modified.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Row Level Security (RLS)

RLS policies ensure data isolation and security.

#### Users Table Policies

```sql
-- Anyone can view all profiles (for contact info)
CREATE POLICY "users_select" ON users
  FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::UUID);
```

#### Parking Slots Table Policies

```sql
-- Anyone can view all available slots
CREATE POLICY "slots_select" ON parking_slots
  FOR SELECT
  USING (true);

-- Users can create slots (must be their own)
CREATE POLICY "slots_insert" ON parking_slots
  FOR INSERT
  WITH CHECK (owner_id = current_setting('app.current_user_id', true)::UUID);

-- Users can update only their own slots
CREATE POLICY "slots_update" ON parking_slots
  FOR UPDATE
  USING (owner_id = current_setting('app.current_user_id', true)::UUID);

-- Users can delete only their own slots
CREATE POLICY "slots_delete" ON parking_slots
  FOR DELETE
  USING (owner_id = current_setting('app.current_user_id', true)::UUID);
```

**Setting User Context:**

Before queries, set the current user:

```typescript
await db.query(`SET app.current_user_id = '${userId}'`);
```

---

## Troubleshooting

### Common Issues

#### Issue: "relation 'users' does not exist"

**Cause:** Migrations haven't been run yet.

**Solution:**
```bash
./scripts/migrate.sh
```

#### Issue: "function execute_sql does not exist" (Supabase)

**Cause:** Supabase helper function not installed.

**Solution:**
```bash
# Run helper migration
./scripts/migrate.sh
```

Or switch to direct PostgreSQL connection:
```env
# Use Supabase's connection pooler
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

#### Issue: "connection refused" (Local)

**Cause:** PostgreSQL not running.

**Solution:**
```bash
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql

# Windows
# Use pgAdmin or Services app to start PostgreSQL
```

#### Issue: "permission denied for schema public"

**Cause:** Database user lacks permissions.

**Solution:**
```sql
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

#### Issue: "SSL connection required" (Neon)

**Cause:** Missing `?sslmode=require` in connection string.

**Solution:**
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require
```

### Database Probe for Diagnostics

Run the probe to identify issues:

```bash
node -e "
  const { probeDatabase, formatProbeReport } = require('./lib/db/probe');
  probeDatabase().then(report => {
    console.log(formatProbeReport(report));
    if (!report.ready) {
      console.log('\nAction Items:');
      report.errors.forEach(err => console.log('  - ' + err));
    }
  });
"
```

The probe will tell you exactly what's missing or misconfigured.

---

## Migration Development

### Creating New Migrations

Follow this process when adding new database features:

#### 1. Create Migration File

File naming convention: `XXX_description.sql`

```bash
# Example: 002_add_bookings_table.sql
touch app/db/migrations/002_add_bookings_table.sql
```

#### 2. Write Idempotent SQL

**Template:**

```sql
-- Migration: 002_add_bookings_table.sql
-- Purpose: Add bookings table for tracking slot reservations
-- Idempotent: YES
-- Rollback: See app/db/migrations/rollback/002_add_bookings_table_rollback.sql
-- Date: 2025-10-27

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_time, end_time);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

COMMIT;

-- Verification queries
SELECT COUNT(*) FROM bookings;
```

#### 3. Create Rollback File

```bash
touch app/db/migrations/rollback/002_add_bookings_table_rollback.sql
```

**Rollback template:**

```sql
-- Rollback: 002_add_bookings_table.sql
-- Date: 2025-10-27

BEGIN;

-- Drop policies
DROP POLICY IF EXISTS "bookings_select" ON bookings;

-- Drop table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS bookings CASCADE;

COMMIT;
```

#### 4. Test Migration

```bash
# Test on local database
./scripts/migrate.sh --dry-run   # Preview
./scripts/migrate.sh              # Execute
./scripts/migrate.sh              # Run again (should skip, already executed)

# Test rollback
./scripts/migrate.sh rollback     # Rollback
./scripts/migrate.sh              # Re-run migration
```

#### 5. Verify Idempotency

Run the migration 3 times - should succeed all times:

```bash
psql $DATABASE_URL -f app/db/migrations/002_add_bookings_table.sql
psql $DATABASE_URL -f app/db/migrations/002_add_bookings_table.sql
psql $DATABASE_URL -f app/db/migrations/002_add_bookings_table.sql
```

No errors = idempotent ✅

### Idempotency Checklist

✅ **Tables:** Use `CREATE TABLE IF NOT EXISTS`
✅ **Indexes:** Use `CREATE INDEX IF NOT EXISTS`
✅ **Functions:** Use `CREATE OR REPLACE FUNCTION`
✅ **Triggers:** Use `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER`
✅ **Policies:** Use `DROP POLICY IF EXISTS` then `CREATE POLICY`
✅ **Constraints:** Use `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` (PostgreSQL 9.6+)
✅ **Transaction:** Wrap entire migration in `BEGIN;` ... `COMMIT;`
✅ **Rollback:** Provide rollback file in `rollback/` directory

---

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production:

- [ ] All migrations tested on local/staging database
- [ ] Migrations verified as idempotent (run 3x successfully)
- [ ] Rollback files created and tested
- [ ] Database backup created
- [ ] Downtime window planned (if needed)
- [ ] Team notified of deployment schedule

### Deployment Steps

#### Option A: Zero-Downtime Deployment (Recommended)

**For additive changes only** (new tables, new columns with defaults)

1. Deploy migration to production
2. Deploy application code
3. Verify functionality
4. Monitor for errors

```bash
# 1. Run migration
./scripts/migrate.sh

# 2. Verify migration
./scripts/migrate.sh status

# 3. Deploy application
git push production main
```

#### Option B: Maintenance Window Deployment

**For breaking changes** (dropping columns, renaming tables)

1. Schedule maintenance window
2. Put application in maintenance mode
3. Create database backup
4. Run migration
5. Deploy application code
6. Remove maintenance mode
7. Monitor

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
./scripts/migrate.sh

# 3. Verify
./scripts/migrate.sh status

# 4. Deploy application
git push production main
```

### Rollback Plan

If deployment fails:

```bash
# 1. Rollback application code
git revert HEAD
git push production main

# 2. Rollback database migration
./scripts/migrate.sh rollback

# 3. Verify rollback
./scripts/migrate.sh status

# 4. Restore from backup (if needed)
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## Maintenance & Monitoring

### Health Checks

Implement health check endpoint:

```typescript
// app/api/health/route.ts
import { getDatabaseStatus } from '@/lib/db/probe'

export async function GET() {
  const dbStatus = await getDatabaseStatus()

  return Response.json({
    status: dbStatus.status,
    database: dbStatus.message,
    timestamp: new Date().toISOString()
  }, {
    status: dbStatus.status === 'healthy' ? 200 : 503
  })
}
```

### Monitoring Queries

#### Check Connection Count

```sql
SELECT count(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database();
```

#### Check Slow Queries

```sql
SELECT
  query,
  state,
  now() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
```

#### Check Table Sizes

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backup Strategy

#### Automated Backups (Supabase/Neon)

Both Supabase and Neon provide automatic backups:

- **Supabase:** Daily backups (configurable in dashboard)
- **Neon:** Continuous backup with point-in-time recovery

#### Manual Backups (Local)

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Create compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## Resources

### Documentation

- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Supabase Docs:** https://supabase.com/docs
- **Neon Docs:** https://neon.tech/docs
- **pg Library:** https://node-postgres.com/

### Tools

- **pgAdmin:** https://www.pgadmin.org/ (GUI for PostgreSQL)
- **DBeaver:** https://dbeaver.io/ (Universal database tool)
- **Supabase CLI:** `npm install -g supabase`
- **psql:** Built-in PostgreSQL command-line tool

### Internal Files

- **Connection Layer:** `lib/db/connection.ts`
- **Database Probe:** `lib/db/probe.ts`
- **Migration Script:** `scripts/migrate.sh`
- **Core Schema:** `app/db/migrations/001_core_schema.sql`
- **Migration README:** `app/db/migrations/README.md`

---

## Getting Help

### Check These First

1. Run database probe: `node -e "require('./lib/db/probe').probeDatabase().then(r => console.log(require('./lib/db/probe').formatProbeReport(r)))"`
2. Check migration status: `./scripts/migrate.sh status`
3. Review error logs in terminal
4. Check DATABASE.md (this file) for troubleshooting section

### Common Commands Reference

```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# List tables
psql $DATABASE_URL -c "\dt"

# Describe table
psql $DATABASE_URL -c "\d users"

# Run migration
./scripts/migrate.sh

# Check status
./scripts/migrate.sh status

# Rollback
./scripts/migrate.sh rollback

# Database probe
node -e "require('./lib/db/probe').probeDatabase().then(r => console.log(require('./lib/db/probe').formatProbeReport(r)))"
```

---

**Last Updated:** 2025-10-27
**Maintained By:** ParkBoard Development Team
**Version:** 1.0 (Minimal MVP)
