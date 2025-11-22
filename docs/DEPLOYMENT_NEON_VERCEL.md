# ParkBoard Deployment Guide: Neon + Vercel

**Purpose:** Deploy ParkBoard to production using Neon (database) and Vercel (hosting)
**Time Required:** ~30 minutes
**Difficulty:** Beginner-friendly

---

## Prerequisites

Before starting, ensure you have:

- [ ] GitHub account with ParkBoard repository access
- [ ] Neon account (free at https://neon.tech)
- [ ] Vercel account (free at https://vercel.com)
- [ ] Terminal access with `psql` installed

**Check psql installation:**
```bash
psql --version
```

If not installed:
```bash
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install postgresql
```

---

## Phase 1: Neon Database Setup (10-15 min)

### Step 1.1: Create Neon Project

- [ ] Go to https://console.neon.tech
- [ ] Click "New Project"
- [ ] Enter project name: `parkboard-production`
- [ ] Select region: Choose closest to your users (e.g., `ap-southeast-1` for Asia)
- [ ] Click "Create Project"

### Step 1.2: Get Connection String

- [ ] In Neon dashboard, click "Connection Details"
- [ ] Select "Pooled connection" (recommended for serverless)
- [ ] Copy the connection string

**Example format:**
```
postgresql://neondb_owner:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### Step 1.3: Run Database Setup Script

Open terminal and run:

```bash
# Set connection string (replace with your actual string)
export NEON_CONNECTION_STRING="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Navigate to project
cd /home/ltpt420/repos/parkboard

# Run setup (schema only)
./scripts/setup-neon.sh

# OR run setup with test data
./scripts/setup-neon.sh --with-seed
```

**Expected output:**
```
ParkBoard Neon Database Setup
================================

Checking prerequisites...

[OK] psql is installed
[OK] NEON_CONNECTION_STRING is set
[OK] Schema file exists: 005_neon_compatible_schema.sql

Running schema migration...

[OK] Schema created successfully

Verifying tables...

[OK] user_profiles table exists
[OK] parking_slots table exists
[OK] bookings table exists

Setup complete! 3 tables ready.
```

### Step 1.4: Verify Database Setup

```bash
# Test connection
psql "$NEON_CONNECTION_STRING" -c "SELECT COUNT(*) FROM parking_slots;"
```

**Expected output:** `count` row showing number of slots (0 if no seed data)

---

## Phase 2: Vercel Project Setup (10 min)

### Step 2.1: Create Vercel Project

- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New..." then "Project"
- [ ] Select "Import Git Repository"
- [ ] Find and select `parkboard` repository
- [ ] Click "Import"

### Step 2.2: Configure Build Settings

On the configuration screen:

- [ ] **Framework Preset:** Next.js (auto-detected)
- [ ] **Root Directory:** Leave blank (use repository root)
- [ ] **Build Command:** `npm run build` (default)
- [ ] **Output Directory:** `.next` (default)

### Step 2.3: Configure Environment Variables

Click "Environment Variables" and add these:

| Key | Value | Environments |
|-----|-------|--------------|
| `DATABASE_URL` | Your Neon connection string | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cgbkknefvggnhkvmuwsa.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | All |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |

**To get Supabase keys:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings > API
4. Copy "anon public" key

### Step 2.4: Deploy

- [ ] Review all settings
- [ ] Click "Deploy"
- [ ] Wait 2-5 minutes for build to complete

**On success, you'll see:**
- Deployment URL (e.g., `https://parkboard-xyz.vercel.app`)
- Screenshot of your landing page

---

## Phase 3: Verification (5 min)

### Step 3.1: Run Verification Script

```bash
# Basic endpoint checks
./scripts/verify-deployment.sh https://your-app.vercel.app

# With database verification
./scripts/verify-deployment.sh https://your-app.vercel.app --with-db
```

**Expected output:**
```
ParkBoard Deployment Verification
====================================
Target: https://your-app.vercel.app

Checking endpoints...

/ -> 200 OK
/LMR/slots -> 200 OK
/login -> 200 OK

Checking database connectivity...

Database tables verified (3 core tables found)

Results: 4/4 checks passed
Deployment verified successfully!
```

### Step 3.2: Manual Smoke Test

Open browser and verify:

- [ ] **Home page:** `https://your-app.vercel.app/` loads
- [ ] **Slots page:** `https://your-app.vercel.app/LMR/slots` shows parking slots
- [ ] **Login page:** `https://your-app.vercel.app/login` displays login form
- [ ] **Browser console:** No errors (F12 > Console)

---

## Troubleshooting

### Database Connection Failed

**Symptom:** Setup script shows "Connection failed"

**Solutions:**
1. Verify connection string format includes `?sslmode=require`
2. Check Neon project is active (not paused)
3. Ensure IP is not blocked in Neon settings

```bash
# Test connection directly
psql "$NEON_CONNECTION_STRING" -c "SELECT 1;"
```

### Build Failed on Vercel

**Symptom:** Deployment shows red "Failed" status

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Run local build to reproduce:
   ```bash
   npm run build
   ```

### 500 Error on Pages

**Symptom:** Pages return Internal Server Error

**Solutions:**
1. Check Vercel Functions logs: Dashboard > Deployments > Latest > Functions
2. Verify `DATABASE_URL` environment variable is set
3. Check database tables exist:
   ```bash
   psql "$NEON_CONNECTION_STRING" -c "\dt"
   ```

### Slots Page Shows Empty

**Symptom:** `/LMR/slots` loads but shows no slots

**Solutions:**
1. Run setup with seed data:
   ```bash
   ./scripts/setup-neon.sh --with-seed
   ```
2. Verify seed data exists:
   ```bash
   psql "$NEON_CONNECTION_STRING" -c "SELECT COUNT(*) FROM parking_slots;"
   ```

---

## Next Steps

After successful deployment:

1. **Add custom domain** (optional)
   - Vercel Dashboard > Settings > Domains
   - Add your domain and configure DNS

2. **Set up monitoring**
   - Enable Vercel Analytics: Dashboard > Analytics
   - Consider adding error tracking (Sentry)

3. **Create production users**
   - Register real users through the app
   - Remove test data if using `--with-seed`

---

## Quick Reference

### Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/setup-neon.sh` | Create database schema |
| `./scripts/setup-neon.sh --with-seed` | Schema + test data |
| `./scripts/setup-neon.sh --dry-run` | Preview without executing |
| `./scripts/verify-deployment.sh <url>` | Check deployment health |
| `./scripts/verify-deployment.sh <url> --with-db` | Health check + database |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_APP_URL` | No | Production URL for callbacks |

---

## Getting Help

1. **Check logs:** Vercel Dashboard > Deployments > View Build Logs
2. **Database issues:** Run `./scripts/setup-neon.sh --dry-run` to preview
3. **Neon docs:** https://neon.tech/docs
4. **Vercel docs:** https://vercel.com/docs
5. **Project docs:** See `docs/DATABASE.md` for database details

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Maintained By:** ParkBoard Development Team
