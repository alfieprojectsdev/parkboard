# ParkBoard Production Deployment Guide: Vercel + Neon (2025)

**Last Updated:** 2025-12-21
**Status:** Production-ready (All P0 issues resolved)
**Target Platform:** Vercel (hosting) + Neon (database)
**Time Required:** 15-45 minutes
**Difficulty:** Easy (CLI) / Intermediate (Manual UI)

---

## Overview

This guide walks through deploying ParkBoard to production using:

- **Vercel** - Serverless hosting with automatic scaling
- **Neon** - Serverless PostgreSQL database with connection pooling
- **NextAuth.js v5** - JWT-based authentication (no session database required)
- **In-memory rate limiting** - Brute-force protection (no Redis needed)

**Key Changes from Legacy Guide:**
- ✅ NextAuth.js v5 replaces Supabase Auth (JWT sessions)
- ✅ Migration 006 adds NextAuth session tables (Account, Session, VerificationToken)
- ✅ Rate limiting on signup/login endpoints (P0-005)
- ✅ Complete tenant-isolated API layer (P0-004)
- ✅ TypeScript migration runner replaces bash scripts
- ✅ **NEW: Automated CLI deployment script** (recommended)

---

## Deployment Methods

Choose your deployment method:

| Method | Time Required | Difficulty | Best For |
|--------|--------------|------------|----------|
| **🚀 CLI Deployment** (Recommended) | 15-20 minutes | Easy | Developers comfortable with terminal |
| **🖱️ Manual UI Deployment** | 30-45 minutes | Intermediate | First-time users, visual learners |

### 🚀 RECOMMENDED: CLI Deployment (Quick Start)

**Automated deployment script handles everything:**
- Prerequisites verification (Node.js, Vercel CLI, git)
- Environment variable setup and validation
- Database migrations execution
- Vercel deployment with environment configuration
- Post-deployment health checks

**Quick Start:**

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Set up environment variables
cp .env.vercel.example .env.vercel.production
# Edit .env.vercel.production with your DATABASE_URL and generate NEXTAUTH_SECRET

# 4. Run deployment script
./scripts/deploy-vercel.sh

# That's it! The script will:
# - Check all prerequisites
# - Run database migrations
# - Deploy to Vercel
# - Verify deployment
# - Show deployment summary
```

**For detailed CLI deployment instructions, see:** [CLI Deployment Guide](#method-1-cli-deployment-recommended)

**For manual UI deployment, see:** [Manual UI Deployment Guide](#method-2-manual-ui-deployment)

---

## Prerequisites

Before starting, ensure you have:

- [ ] **GitHub account** with ParkBoard repository access
- [ ] **Neon account** (free tier at https://neon.tech - no credit card required)
- [ ] **Vercel account** (free tier at https://vercel.com)
- [ ] **Terminal access** with `node` and `npm` installed

**Check Node.js version:**
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher
```

**No PostgreSQL client required** - TypeScript migration runner uses `pg` npm package.

---

---

## Method 1: CLI Deployment (Recommended)

### Overview

The automated deployment script (`scripts/deploy-vercel.sh`) handles the entire deployment process:

1. **Prerequisites Check** - Verifies Node.js, Vercel CLI, git status
2. **Environment Setup** - Validates and configures environment variables
3. **Database Migrations** - Runs TypeScript migration runner against Neon
4. **Vercel Deployment** - Deploys to production with environment variables
5. **Post-Deployment Verification** - Tests endpoints and health checks

**Total time:** 15-20 minutes

### Prerequisites

Before running the deployment script:

- [ ] **Node.js >= 18** installed (`node --version`)
- [ ] **Vercel CLI** installed (`npm i -g vercel`)
- [ ] **Vercel account** (free tier at https://vercel.com)
- [ ] **Neon database** created with pooled connection string
- [ ] **Git repository** initialized and clean

### Step 1: Set Up Neon Database

**Create Neon database** (5 minutes):

1. Go to https://console.neon.tech
2. Create new project: `parkboard-production`
3. Select region closest to your users (e.g., `us-east-1`)
4. Copy **pooled connection string** (contains `-pooler`)
   - Format: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require`

**Save connection string** - you'll need it in the next step.

### Step 2: Configure Environment Variables

**Create environment file:**

```bash
# Copy template
cp .env.vercel.example .env.vercel.production

# Edit with your values
nano .env.vercel.production  # or use your preferred editor
```

**Required variables:**

```bash
# Neon pooled connection string (from Step 1)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Generate NextAuth secret
# Run: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here

# Leave empty - will be set after first deployment
NEXTAUTH_URL=
NEXT_PUBLIC_APP_URL=

# Supabase variables (legacy - still needed for query layer)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**⚠️ IMPORTANT:** Never commit `.env.vercel.production` to git!

### Step 3: Install Vercel CLI and Login

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login
# Follow prompts to authenticate
```

### Step 4: Run Deployment Script

**Standard deployment:**

```bash
./scripts/deploy-vercel.sh
```

The script will:
1. ✓ Check prerequisites (Node.js, Vercel CLI, git)
2. ✓ Validate environment variables
3. ✓ Run database migrations
4. ✓ Deploy to Vercel
5. ✓ Verify deployment health
6. ✓ Show deployment summary

**Expected output:**

```
═══════════════════════════════════════════════════════════
CHECKING PREREQUISITES
═══════════════════════════════════════════════════════════
ℹ Checking Node.js version...
✓ Node.js v20.10.0
ℹ Checking Vercel CLI...
✓ Vercel CLI 33.0.1
ℹ Checking Vercel authentication...
✓ Logged in as: your-email@example.com
ℹ Checking git repository...
✓ Git repository found
✓ Working directory clean
✓ All prerequisites satisfied

═══════════════════════════════════════════════════════════
ENVIRONMENT SETUP
═══════════════════════════════════════════════════════════
ℹ Loading environment from: .env.vercel.production
✓ DATABASE_URL configured (pooled connection)
✓ NEXTAUTH_SECRET configured (44 characters)
ℹ NEXTAUTH_URL will be set after first deployment
✓ Environment setup complete

═══════════════════════════════════════════════════════════
DATABASE MIGRATIONS
═══════════════════════════════════════════════════════════
ℹ Running TypeScript migration runner...
🔍 Checking migration status...
✓ Migration tracking table ready
🔍 Found 6 migration files

🔄 Executing pending migrations:
⊙ 001_hybrid_pricing_model_idempotent.sql (already executed)
⊙ 002_multi_tenant_communities_idempotent.sql (already executed)
⊙ 003_community_rls_policies_idempotent.sql (already executed)
⊙ 004_remove_multi_tenant_idempotent.sql (already executed)
⊙ 005_neon_compatible_schema.sql (already executed)
→ 006_nextauth_tables.sql (executing...)
✓ 006_nextauth_tables.sql (324ms)

✓ All migrations complete! (1 executed, 5 skipped)
✓ Database migrations completed

═══════════════════════════════════════════════════════════
VERCEL DEPLOYMENT
═══════════════════════════════════════════════════════════
ℹ Configuring environment variables in Vercel...
✓ Environment variables configured
ℹ Deploying to Vercel (this may take 2-5 minutes)...
✓ Deployed to Vercel
ℹ Production URL: https://parkboard-xyz123.vercel.app
⚠ Environment variables updated - redeployment recommended
✓ Vercel deployment complete

═══════════════════════════════════════════════════════════
POST-DEPLOYMENT VERIFICATION
═══════════════════════════════════════════════════════════
ℹ Waiting for deployment to be ready (30 seconds)...
ℹ Testing home page...
✓ Home page responding (HTTP 200)
ℹ Testing login page...
✓ Login page responding (HTTP 200)
ℹ Testing API endpoint...
✓ API endpoint responding (HTTP 401)
ℹ Testing rate limiting endpoint...
✓ Signup endpoint responding (HTTP 400 - validation working)
✓ Post-deployment verification complete

═══════════════════════════════════════════════════════════
DEPLOYMENT SUMMARY
═══════════════════════════════════════════════════════════
🚀 Deployment successful!

ℹ Production URL: https://parkboard-xyz123.vercel.app
ℹ Dashboard: https://vercel.com/dashboard

ℹ Next steps:
  1. Test the deployment: https://parkboard-xyz123.vercel.app
  2. Verify authentication flow (signup, login)
  3. Check rate limiting (attempt 6 logins with wrong password)
  4. Set up custom domain (optional): vercel domains add your-domain.com
  5. Enable Vercel Analytics (Dashboard → Analytics → Enable)

⚠ NEXTAUTH_URL was set after first deployment
ℹ Recommended: Redeploy to apply updated environment variables
ℹ Run: vercel --prod

✓ Deployment guide: docs/DEPLOYMENT_VERCEL_NEON_2025.md
```

### Step 5: Redeploy (First-Time Only)

**Why redeploy?** The script sets `NEXTAUTH_URL` after the first deployment. Redeploy to apply this change.

```bash
vercel --prod
```

**Or run the script again:**

```bash
./scripts/deploy-vercel.sh --force
```

### Step 6: Verify Deployment

**Manual verification:**

1. **Test home page:** Visit your deployment URL
2. **Test signup:** Create a test account
3. **Test login:** Login with test account
4. **Test rate limiting:** Attempt 6 failed logins (should block on 6th)

**Automated verification:**

```bash
# Run E2E tests against production
PLAYWRIGHT_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

### CLI Deployment Options

**Dry-run (preview without deploying):**

```bash
./scripts/deploy-vercel.sh --dry-run
```

**Non-interactive (skip confirmations):**

```bash
./scripts/deploy-vercel.sh --force
```

**Deploy with custom domain:**

```bash
./scripts/deploy-vercel.sh --domain parkboard.app
```

**Verbose mode (debug):**

```bash
./scripts/deploy-vercel.sh --verbose
```

**Help:**

```bash
./scripts/deploy-vercel.sh --help
```

### Troubleshooting CLI Deployment

**Issue: "Vercel CLI not found"**

```bash
# Install Vercel CLI
npm i -g vercel

# Verify installation
vercel --version
```

**Issue: "Not logged in to Vercel"**

```bash
vercel login
# Follow authentication prompts
```

**Issue: "Invalid DATABASE_URL: Must use pooled connection"**

- Ensure your connection string contains `-pooler` in the hostname
- Correct: `ep-xxx-pooler.region.aws.neon.tech`
- Incorrect: `ep-xxx.region.aws.neon.tech`

**Issue: "Database migrations failed"**

- Check DATABASE_URL is correct
- Verify Neon database is active (not suspended)
- Test connection: `psql "$DATABASE_URL" -c "SELECT 1;"`

**Issue: "Deployment verification failed"**

- Wait a few more minutes for deployment to stabilize
- Check Vercel function logs: `vercel logs`
- Verify environment variables in Vercel dashboard

For more troubleshooting, see [Common Issues](#troubleshooting) below.

---

## Method 2: Manual UI Deployment

**Note:** Manual deployment takes longer (30-45 minutes) and requires more manual steps. CLI deployment is recommended for most users.

If you prefer the manual approach or want to understand each step in detail, continue with the sections below.

---

## Phase 1: Neon Database Setup (15 minutes)

### Step 1.1: Create Neon Project

1. **Navigate to Neon Console**
   - Go to https://console.neon.tech
   - Sign in or create free account

2. **Create New Project**
   - Click **"New Project"**
   - **Project name:** `parkboard-production`
   - **Region:** Choose closest to your users:
     - `us-east-1` (US East Coast)
     - `eu-central-1` (Europe)
     - `ap-southeast-1` (Asia Pacific - Singapore)
   - **PostgreSQL version:** 16 (default)
   - Click **"Create Project"**

3. **Wait for Provisioning** (~30 seconds)
   - Neon will create your database automatically
   - You'll see connection details when ready

### Step 1.2: Get Connection Strings

1. **Find Connection Details**
   - In Neon dashboard, click **"Connection Details"** (top right)
   - OR navigate to: Dashboard → Your Project → Connection Details

2. **Copy Pooled Connection String**
   - Select **"Pooled connection"** (REQUIRED for Vercel serverless)
   - Click **"Copy"** button

**Connection string format:**
```
postgresql://neondb_owner:npg_XXXXX@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**⚠️ IMPORTANT:** Use the **pooled** connection string (contains `-pooler`), not direct connection. Vercel serverless functions need connection pooling to avoid exhausting database connections.

3. **Save Connection String**
   - Store in password manager or `.env.local` file
   - You'll need this in Step 1.4 and Phase 2

### Step 1.3: Configure Database Settings (Optional)

**Recommended for production:**

1. **Enable Auto-Suspend**
   - Dashboard → Settings → Compute
   - **Auto-suspend delay:** 5 minutes (free tier) or 1 hour (paid)
   - Saves costs during low traffic periods

2. **Set Compute Size**
   - Free tier: 0.25 vCPU (sufficient for MVP)
   - Paid tier: 0.5-1 vCPU for production

3. **Enable Backups** (Paid feature)
   - Automatic daily backups
   - Point-in-time recovery

### Step 1.4: Run Database Migrations

**Use TypeScript migration runner** (recommended):

```bash
# Navigate to project directory
cd /path/to/parkboard

# Set DATABASE_URL environment variable (temporary)
export DATABASE_URL="postgresql://neondb_owner:npg_XXXXX@ep-...-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Preview migrations (dry-run)
npm run migrate:dry-run

# Execute migrations
npm run migrate
```

**Expected output:**
```
🔍 Checking migration status...
✓ Migration tracking table ready
🔍 Found 6 migration files

🔄 Executing pending migrations:
⊙ 001_hybrid_pricing_model_idempotent.sql (already executed)
⊙ 002_multi_tenant_communities_idempotent.sql (already executed)
⊙ 003_community_rls_policies_idempotent.sql (already executed)
⊙ 004_remove_multi_tenant_idempotent.sql (already executed)
⊙ 005_neon_compatible_schema.sql (already executed)
→ 006_nextauth_tables.sql (executing...)
✓ 006_nextauth_tables.sql (324ms)

✓ All migrations complete! (1 executed, 5 skipped)
🔍 Total execution time: 324ms
```

**Migration Details:**

| Migration | Purpose |
|-----------|---------|
| `001_hybrid_pricing_model_idempotent.sql` | Core schema (user_profiles, parking_slots, bookings) |
| `002_multi_tenant_communities_idempotent.sql` | Community support (community_code column) |
| `003_community_rls_policies_idempotent.sql` | RLS policies (SKIPPED - not compatible with NextAuth JWT) |
| `004_remove_multi_tenant_idempotent.sql` | Cleanup multi-tenant artifacts |
| `005_neon_compatible_schema.sql` | Neon-specific compatibility fixes |
| `006_nextauth_tables.sql` | NextAuth session tables (Account, Session, VerificationToken) |

**⚠️ Migration 003 is intentionally skipped** - See `db/migrations/003_community_rls_policies_SKIPPED.md` for rationale.

### Step 1.5: Verify Database Setup

**Check tables exist:**
```bash
# Install pg globally (one-time)
npm install -g pg

# Query tables
psql "$DATABASE_URL" -c "\dt"
```

**Expected tables:**
```
 Schema |       Name        | Type  |     Owner
--------+-------------------+-------+----------------
 public | user_profiles     | table | neondb_owner
 public | parking_slots     | table | neondb_owner
 public | bookings          | table | neondb_owner
 public | Account           | table | neondb_owner
 public | Session           | table | neondb_owner
 public | VerificationToken | table | neondb_owner
 public | schema_migrations | table | neondb_owner
```

**Verify migration tracking:**
```bash
psql "$DATABASE_URL" -c "SELECT migration_name, executed_at FROM schema_migrations ORDER BY id;"
```

**Optional: Seed test data** (development only)
```bash
# Create test users and slots for manual testing
psql "$DATABASE_URL" -f db/seed_data.sql
```

---

## Phase 2: Vercel Project Setup (10 minutes)

### Step 2.1: Prepare Repository

**Ensure `.gitignore` excludes secrets:**
```bash
# Check .gitignore includes these lines
cat .gitignore | grep -E "\.env|test-results"
```

**Required entries:**
```
.env.local
.env*.local
test-results/
playwright-report/
```

**Commit latest changes:**
```bash
git status
git add .
git commit -m "docs: add Vercel + Neon deployment guide"
git push origin main
```

### Step 2.2: Import Project to Vercel

1. **Navigate to Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Sign in with GitHub (recommended for auto-deploy)

2. **Import Git Repository**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find `parkboard` repository
   - Click **"Import"**

3. **Configure Project Settings**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (leave blank)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

### Step 2.3: Configure Environment Variables

**Click "Environment Variables" section and add:**

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `DATABASE_URL` | Your Neon pooled connection string | Production, Preview, Development | **REQUIRED** - Use `-pooler` URL |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | Production, Preview, Development | **REQUIRED** - Keep secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production | **Set AFTER first deploy** |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` | Production | For client-side redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cgbkknefvggnhkvmuwsa.supabase.co` | All environments | Legacy - still needed for query layer |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | All environments | Legacy - still needed for query layer |

**Detailed instructions for each variable:**

#### 1. DATABASE_URL

```bash
# Use the pooled connection string from Step 1.2
# Format: postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require

# Example:
DATABASE_URL=postgresql://neondb_owner:npg_ABC123@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**⚠️ CRITICAL:** Must use `-pooler` hostname for serverless compatibility.

#### 2. NEXTAUTH_SECRET

```bash
# Generate a random 32-byte base64 string
openssl rand -base64 32

# Example output:
# kJ9x2vR8mN4pQ7wA3bC5dE6fG8hI9jK0lM1nO2pQ3rS4t=

# Copy this value to Vercel environment variable
NEXTAUTH_SECRET=kJ9x2vR8mN4pQ7wA3bC5dE6fG8hI9jK0lM1nO2pQ3rS4t=
```

**⚠️ SECURITY:** Never commit this to git. Treat like a password.

#### 3. NEXTAUTH_URL (Set AFTER first deploy)

```bash
# Initially deploy without this variable
# After first deploy, Vercel assigns a URL like:
# https://parkboard-xyz123.vercel.app

# Then add this environment variable and redeploy:
NEXTAUTH_URL=https://parkboard-xyz123.vercel.app
NEXT_PUBLIC_APP_URL=https://parkboard-xyz123.vercel.app
```

**Why set after deploy?** You don't know the Vercel URL until first deployment.

#### 4. NEXT_PUBLIC_SUPABASE_* (Legacy - Required for Query Layer)

**⚠️ NOTE:** Even though ParkBoard uses NextAuth.js for authentication, it still uses Supabase client for database queries. These variables are REQUIRED.

**Get Supabase credentials:**

1. Go to https://supabase.com/dashboard
2. Select your project (or create one)
3. Navigate to: **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```bash
# Example:
NEXT_PUBLIC_SUPABASE_URL=https://cgbkknefvggnhkvmuwsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Why needed?** API routes use `createClient()` from `lib/supabase/server.ts` for database queries via Supabase SDK (even though database is Neon).

**Alternative:** Future refactor could replace Supabase client with direct `pg` queries, eliminating this dependency.

### Step 2.4: Deploy to Vercel

1. **Review Configuration**
   - Verify all environment variables are set
   - Check build command is `npm run build`
   - Confirm framework preset is Next.js

2. **Click "Deploy"**
   - Vercel will:
     - Clone repository
     - Install dependencies (`npm install`)
     - Run build (`npm run build`)
     - Deploy to edge network
   - Build takes 2-5 minutes

3. **Monitor Build Logs**
   - Watch for errors in real-time
   - Common issues:
     - Missing environment variables
     - TypeScript errors
     - Build timeout (increase in project settings)

4. **Deployment Success**
   - You'll see: ✅ **"Your project is ready!"**
   - Note the deployment URL: `https://parkboard-xyz123.vercel.app`
   - Click **"Visit"** to see your app

### Step 2.5: Update NEXTAUTH_URL

**After first successful deploy:**

1. **Copy Vercel deployment URL**
   - Example: `https://parkboard-xyz123.vercel.app`

2. **Add environment variables in Vercel**
   - Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `NEXTAUTH_URL=https://parkboard-xyz123.vercel.app`
     - `NEXT_PUBLIC_APP_URL=https://parkboard-xyz123.vercel.app`
   - Select environment: **Production**

3. **Redeploy**
   - Dashboard → Deployments → Latest → **"Redeploy"**
   - OR: Push a new commit to trigger auto-deploy

**Why redeploy?** Environment variables only apply to NEW deployments.

---

## Phase 3: Post-Deployment Verification (10 minutes)

### Step 3.1: Manual Smoke Tests

**Test 1: Home page loads**
```bash
curl https://your-app.vercel.app/
# Should return 200 OK with HTML
```

**Test 2: Login page renders**
```
1. Open browser to: https://your-app.vercel.app/login
2. Verify login form appears
3. Check browser console (F12) - no errors
```

**Test 3: Signup flow**
```
1. Navigate to: /register (or signup page)
2. Fill in:
   - Community Code: LMR (or your test community)
   - Email: test@example.com
   - Password: TestPassword123
   - Name: Test User
   - Unit Number: 101
3. Submit form
4. Verify:
   - [ ] No error messages
   - [ ] Redirects to login or dashboard
   - [ ] User created in database
```

**Test 4: Login flow with rate limiting**
```
1. Navigate to: /login
2. Attempt login with WRONG password 5 times
3. Verify:
   - [ ] First 5 attempts show "Invalid credentials"
   - [ ] 6th attempt shows "Too many attempts. Try again later."
   - [ ] Status code 429 on 6th attempt
4. Wait 15 minutes (or continue with valid login)
```

**Test 5: Database connectivity**
```bash
# Check if API routes can connect to Neon
curl https://your-app.vercel.app/api/slots
# Should return 401 (unauthorized) or 200 (if authenticated)
# Should NOT return 500 (database connection error)
```

### Step 3.2: Verify Rate Limiting

**Signup rate limiting:**
```bash
# Attempt signup 6 times with same email
for i in {1..6}; do
  curl -X POST https://your-app.vercel.app/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123456","communityCode":"LMR","name":"Test","unitNumber":"101"}'
  echo ""
done

# Expected:
# Attempts 1-5: 409 (email already exists) or 201 (created)
# Attempt 6: 429 (rate limited)
```

**Login rate limiting:**
```bash
# Attempt login 6 times with wrong password
for i in {1..6}; do
  curl -X POST https://your-app.vercel.app/api/auth/signin/credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword","communityCode":"LMR"}'
  echo ""
done

# Expected:
# Attempts 1-5: 401 (invalid credentials)
# Attempt 6: 401 (appears same, but rate limited internally)
```

### Step 3.3: Verify Tenant Isolation

**Test cross-community data access:**

```bash
# Login as LMR user (get session token from browser DevTools)
# Then attempt to access SRP community data

curl https://your-app.vercel.app/api/slots?community=srp_m4n8q1 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected: 200 OK with EMPTY array (filtered by user's community)
# OR: 403 Forbidden (if endpoint validates community parameter)
```

**Manual test:**
1. Create user in community LMR
2. Create parking slot as LMR user
3. Login as different user in community SRP
4. Navigate to `/LMR/slots` or call `GET /api/slots`
5. Verify: SRP user CANNOT see LMR slots

### Step 3.4: Database Query Check

**Verify migrations executed:**
```bash
# Connect to production Neon database
psql "$DATABASE_URL" -c "SELECT migration_name, executed_at FROM schema_migrations ORDER BY id;"

# Expected output:
#        migration_name        |        executed_at
# -----------------------------+---------------------------
#  001_hybrid_pricing_model... | 2025-12-21 10:30:15.123
#  002_multi_tenant_communities...
#  003_community_rls_policies...
#  004_remove_multi_tenant...
#  005_neon_compatible_schema...
#  006_nextauth_tables.sql     | 2025-12-21 10:35:42.789
```

**Check NextAuth tables exist:**
```bash
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('Account', 'Session', 'VerificationToken');"

# Expected:
#    table_name
# -------------------
#  Account
#  Session
#  VerificationToken
```

### Step 3.5: Verify Vercel Functions

**Check function logs:**
1. Vercel Dashboard → Your Project → **Functions**
2. Select a function (e.g., `/api/slots`)
3. Click **"View Logs"**
4. Trigger function by visiting endpoint
5. Verify:
   - [ ] Function executes without errors
   - [ ] Database queries succeed
   - [ ] No timeout errors (default 10s limit)

**Check function configuration:**
- **Region:** `iad1` (US East) or closest to Neon database
- **Memory:** 1024 MB (default)
- **Max Duration:** 10s (hobby tier) or 60s (pro tier)

---

## Phase 4: Production Checklist

### Security Checklist

Before announcing to users, verify:

- [ ] **Environment Variables**
  - [ ] `NEXTAUTH_SECRET` is strong random value (32+ chars)
  - [ ] `DATABASE_URL` uses `-pooler` connection string
  - [ ] No `.env.local` files committed to git
  - [ ] Production variables different from development

- [ ] **Authentication**
  - [ ] Signup rate limiting active (5 attempts / 15 min)
  - [ ] Login rate limiting active (5 attempts / 15 min)
  - [ ] Password minimum 12 characters enforced
  - [ ] Generic error messages (no enumeration)

- [ ] **API Security**
  - [ ] All endpoints require authentication (except public routes)
  - [ ] All queries filter by `community_code` (tenant isolation)
  - [ ] Server-side price calculation enforced
  - [ ] No SQL injection vulnerabilities
  - [ ] No XSS vulnerabilities

- [ ] **Database**
  - [ ] All 6 migrations executed successfully
  - [ ] Migration 003 skipped (documented in SKIPPED.md)
  - [ ] Neon connection pooling enabled (`-pooler` hostname)
  - [ ] Neon auto-suspend configured (cost savings)

- [ ] **Monitoring**
  - [ ] Vercel Analytics enabled
  - [ ] Error tracking configured (Sentry recommended)
  - [ ] Database performance monitoring (Neon dashboard)

### Performance Checklist

- [ ] **Build Optimization**
  - [ ] Next.js build completes without warnings
  - [ ] Bundle size < 500 KB (check Vercel build logs)
  - [ ] No server-side blocking queries on page load

- [ ] **Database Optimization**
  - [ ] Indexes on foreign keys (community_code, owner_id, renter_id)
  - [ ] Connection pooling enabled (Neon `-pooler`)
  - [ ] Query response time < 100ms (check Neon dashboard)

- [ ] **Vercel Configuration**
  - [ ] Functions deployed to region closest to database
  - [ ] Edge middleware enabled (if using middleware.ts)
  - [ ] Image optimization enabled (Next.js Image component)

### Compliance Checklist

Reference `CLAUDE.md` security checklist:

- [x] All database queries filter by `community_code`
- [x] All API routes use `getSessionWithCommunity()` helper
- [x] Unit tests verify tenant isolation for each API route
- [ ] E2E test CUJ-021 (cross-community API isolation) passes
- [x] Server-side auth checks in middleware
- [x] Price calculated server-side (never trust client)
- [x] Rate limiting on login endpoint (P0-005)
- [x] Generic error messages to prevent enumeration (P0-006)
- [x] Password validation minimum 12 characters (P1-002)
- [x] XSS prevention (React escapes by default)

**Status:** 10/11 items complete (CUJ-021 pending)

---

## Troubleshooting

### Issue: Build Failed on Vercel

**Symptom:** Deployment shows red "Failed" status

**Solutions:**

1. **Check build logs**
   - Vercel Dashboard → Deployments → Failed Deployment → **"View Build Logs"**
   - Look for specific error (TypeScript, missing dependencies, etc.)

2. **Common causes:**
   - **Missing environment variables**
     - Error: `DATABASE_URL is not defined`
     - Fix: Add `DATABASE_URL` in Vercel environment variables

   - **TypeScript errors**
     - Error: `Type 'X' is not assignable to type 'Y'`
     - Fix: Run `npx tsc --noEmit` locally to reproduce

   - **Build timeout**
     - Error: `Build exceeded maximum duration of 45 minutes`
     - Fix: Upgrade Vercel plan or optimize build

3. **Test build locally**
   ```bash
   npm run build
   # Should complete without errors
   ```

### Issue: Database Connection Failed

**Symptom:** API routes return 500 errors, logs show "connect ECONNREFUSED"

**Solutions:**

1. **Verify DATABASE_URL format**
   ```bash
   # Must include -pooler suffix and sslmode=require
   # Correct:
   postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require

   # Incorrect (missing -pooler):
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
   ```

2. **Check Neon project status**
   - Neon Dashboard → Your Project
   - Verify project is **Active** (not Paused or Suspended)
   - Free tier auto-suspends after 7 days inactivity

3. **Test connection from local machine**
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   # Should return: 1
   ```

4. **Check Vercel function logs**
   - Look for specific error: `password authentication failed` (wrong credentials) vs `connection timeout` (network issue)

### Issue: NextAuth Session Not Persisting

**Symptom:** User logs in but immediately gets logged out

**Solutions:**

1. **Verify NEXTAUTH_SECRET is set**
   ```bash
   # In Vercel: Settings → Environment Variables
   # Should see NEXTAUTH_SECRET (value hidden)
   ```

2. **Verify NEXTAUTH_URL matches deployment URL**
   ```bash
   # Must match exactly (including https://)
   NEXTAUTH_URL=https://parkboard-xyz123.vercel.app
   # NOT: http:// or www. prefix
   ```

3. **Check cookie settings in browser DevTools**
   - F12 → Application → Cookies → your-domain
   - Look for: `next-auth.session-token`
   - Verify: `SameSite=Lax`, `Secure=true`, `HttpOnly=true`

4. **Test JWT token generation**
   ```bash
   # Login and check browser console
   # Should see session object with user data
   console.log(await fetch('/api/auth/session').then(r => r.json()))
   ```

### Issue: Rate Limiting Not Working

**Symptom:** Can attempt login more than 5 times without being blocked

**Solutions:**

1. **Check rate limiter implementation**
   - Verify `checkRateLimit()` is called in `lib/auth/auth.ts` (login)
   - Verify `checkRateLimit()` is called in `app/api/auth/signup/route.ts` (signup)

2. **In-memory limiter resets on redeploy**
   - This is EXPECTED behavior
   - Vercel serverless functions restart frequently
   - For production scale, migrate to Redis (see below)

3. **Test with curl**
   ```bash
   # Attempt 6 signups rapidly
   for i in {1..6}; do
     curl -X POST https://your-app.vercel.app/api/auth/signup \
       -H "Content-Type: application/json" \
       -d "{\"email\":\"test$i@example.com\",\"password\":\"Test123456\",\"communityCode\":\"LMR\",\"name\":\"Test\",\"unitNumber\":\"101\"}"
     echo ""
   done
   ```

### Issue: 403 Forbidden on API Endpoints

**Symptom:** Authenticated user gets 403 when calling `/api/slots`

**Solutions:**

1. **Verify user has `communityCode` in session**
   ```bash
   # Check session object in browser console
   const session = await fetch('/api/auth/session').then(r => r.json())
   console.log(session.user.communityCode)
   // Should show: "lmr_x7k9p2" or similar
   ```

2. **Check middleware protection**
   - Verify `middleware.ts` allows the route
   - Check `matcher` config excludes API routes that need public access

3. **Verify `getSessionWithCommunity()` logic**
   - File: `lib/auth/tenant-access.ts`
   - Should return `communityCode` from session
   - If missing, returns 403 error

### Issue: Supabase Environment Variables Missing

**Symptom:** Build fails with "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Solution:**

Even though ParkBoard uses NextAuth for authentication, it still uses Supabase client for database queries. You MUST set these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Get credentials from:** https://supabase.com/dashboard → Settings → API

**Why needed?** API routes use `createClient()` from `lib/supabase/server.ts` which requires these variables.

### Issue: Migrations Already Executed

**Symptom:** Migration runner shows "already executed" for all migrations

**This is EXPECTED behavior!**

Migrations are idempotent - safe to run multiple times. If you see:

```
⊙ 001_hybrid_pricing_model_idempotent.sql (already executed)
⊙ 002_multi_tenant_communities_idempotent.sql (already executed)
...
✓ All migrations complete! (0 executed, 6 skipped)
```

This means your database is already up-to-date. No action needed.

**To verify:** Check `schema_migrations` table:
```bash
psql "$DATABASE_URL" -c "SELECT migration_name FROM schema_migrations;"
```

---

## Advanced Configuration

### Custom Domain Setup

**Add custom domain to Vercel:**

1. **Purchase domain** (e.g., parkboard.app)
2. **Vercel Dashboard** → Your Project → Settings → **Domains**
3. **Add domain:** `parkboard.app`
4. **Configure DNS:**
   - Add CNAME record: `parkboard.app` → `cname.vercel-dns.com`
   - OR: Add A record to Vercel IP (76.76.21.21)
5. **Wait for DNS propagation** (5 minutes - 48 hours)
6. **Update environment variables:**
   ```bash
   NEXTAUTH_URL=https://parkboard.app
   NEXT_PUBLIC_APP_URL=https://parkboard.app
   ```

### Migrate Rate Limiter to Redis (Upstash)

**When to migrate:** If you have multiple Vercel instances or need persistent rate limiting.

**Steps:**

1. **Create Upstash Redis database**
   - Go to https://console.upstash.com
   - Create new database (free tier: 10K requests/day)
   - Copy: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Install Upstash SDK**
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **Update `lib/rate-limit.ts`**
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   })

   const ratelimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(5, '15 m'),
   })

   export async function checkRateLimit(identifier: string): Promise<boolean> {
     const { success } = await ratelimit.limit(identifier)
     return success
   }
   ```

4. **Add environment variables to Vercel**
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

5. **Deploy and test**

### Enable Vercel Analytics

**Basic Analytics (Free):**

1. **Vercel Dashboard** → Your Project → **Analytics** → **Enable**
2. No code changes needed
3. Tracks: Page views, unique visitors, top pages

**Speed Insights (Free):**

1. **Install package:**
   ```bash
   npm install @vercel/speed-insights
   ```

2. **Add to `app/layout.tsx`:**
   ```typescript
   import { SpeedInsights } from '@vercel/speed-insights/next'

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <SpeedInsights />
         </body>
       </html>
     )
   }
   ```

3. **Deploy**

### Set Up Error Tracking (Sentry)

**Why Sentry?** Capture and debug production errors.

**Steps:**

1. **Create Sentry account** (free tier: 5K errors/month)
   - Go to https://sentry.io
   - Create new project: Next.js

2. **Install Sentry SDK:**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Configure DSN in Vercel:**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

4. **Test error tracking:**
   ```typescript
   // Throw test error
   throw new Error('Sentry test error')
   ```

5. **Check Sentry dashboard** for captured error

---

## Monitoring & Maintenance

### Daily Monitoring

**Check these metrics daily:**

1. **Vercel Analytics** (Dashboard → Analytics)
   - Total requests
   - Error rate (should be < 1%)
   - Average response time (should be < 500ms)

2. **Neon Database** (Dashboard → Monitoring)
   - Active connections (should be < 10)
   - Query performance (slow queries > 1s)
   - Storage usage (free tier: 3 GB)

3. **Error Logs** (Dashboard → Functions → Logs)
   - Look for 500 errors
   - Database connection errors
   - Rate limit errors (high volume may indicate attack)

### Weekly Maintenance

**Every week:**

1. **Review failed auth attempts**
   ```bash
   # Check Vercel function logs for rate limit hits
   # High volume from same IP → potential attack
   ```

2. **Check database backups** (Neon paid feature)
   - Verify automatic backups running
   - Test restore process quarterly

3. **Update dependencies**
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```

### Monthly Maintenance

**Every month:**

1. **Review Neon usage** (Dashboard → Billing)
   - Free tier limits: 3 GB storage, 1 GB transfer
   - Upgrade if approaching limits

2. **Review Vercel usage** (Dashboard → Usage)
   - Hobby tier limits: 100 GB bandwidth, 100 hours compute
   - Upgrade to Pro if exceeding

3. **Security audit**
   - Run: `npm audit`
   - Update Next.js, NextAuth, and other security-critical packages
   - Review Vercel security settings

### Backup Strategy

**Database backups:**

1. **Automated (Neon paid feature)**
   - Daily backups retained for 7 days
   - Point-in-time recovery

2. **Manual backups (free tier)**
   ```bash
   # Weekly manual backup
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

   # Store in secure location (S3, Google Drive, etc.)
   ```

3. **Test restore quarterly**
   ```bash
   # Create test database
   # Restore backup
   psql "$TEST_DATABASE_URL" < backup_20251221.sql
   # Verify data integrity
   ```

**Code backups:**

- Already backed up in GitHub
- Tag releases: `git tag v1.0.0 && git push --tags`
- Keep production `.env` in password manager

---

## Scaling Considerations

### Current Architecture (MVP)

- **Single region** (Vercel + Neon in same region)
- **In-memory rate limiting** (resets on redeploy)
- **JWT sessions** (no session database queries)
- **Connection pooling** (Neon `-pooler`)

**Supports:**
- ~1,000 users
- ~10,000 requests/day
- ~100 concurrent connections

### Scale to 10K Users

**Upgrades needed:**

1. **Migrate rate limiter to Redis (Upstash)**
   - Persistent rate limiting across deployments
   - ~$10/month for 1M requests

2. **Enable Neon auto-scaling**
   - Scale compute from 0.25 to 2 vCPU on demand
   - ~$20/month base + usage

3. **Upgrade Vercel to Pro**
   - Remove hobby tier limits (100 GB bandwidth)
   - Priority support
   - ~$20/month per seat

4. **Add database read replicas** (Neon paid feature)
   - Offload read queries to replicas
   - Reduce primary database load

### Scale to 100K Users

**Additional upgrades:**

1. **Multi-region deployment**
   - Deploy Vercel functions to multiple regions
   - Neon read replicas in each region
   - CDN for static assets

2. **Add caching layer (Redis)**
   - Cache frequent queries (slot listings)
   - Reduce database load by 80%+

3. **Implement queue system (Inngest/BullMQ)**
   - Async booking processing
   - Email notifications
   - Analytics events

4. **Database optimization**
   - Partition large tables by community_code
   - Archive old bookings (> 1 year)
   - Optimize indexes based on query patterns

---

## Production Deployment Summary

**Total Time:** 30-45 minutes
**Total Cost (MVP):** $0/month (free tiers)
**Total Cost (Production):** ~$50/month (Vercel Pro + Neon Scale)

### Deployment Checklist

**Before deploying:**

- [x] All P0 security issues resolved
- [x] All migrations executed (001-006)
- [x] Environment variables documented
- [x] Security review passed
- [x] Unit tests passing (21 test files)
- [ ] E2E test CUJ-021 passing (cross-community isolation)
- [ ] Custom domain configured (optional)
- [ ] Error tracking configured (Sentry)

**After deploying:**

- [ ] Verify signup flow works
- [ ] Verify login flow works
- [ ] Verify rate limiting active (6th attempt blocked)
- [ ] Verify tenant isolation (cross-community blocked)
- [ ] Check database queries successful
- [ ] Monitor error logs for 24 hours
- [ ] Set up weekly backup cron job
- [ ] Document deployment URL in team wiki

### Rollback Plan

**If deployment fails or has critical bugs:**

1. **Revert in Vercel**
   - Dashboard → Deployments → Previous Deployment → **"Promote to Production"**

2. **Revert database migrations** (if needed)
   ```bash
   # Restore from backup
   psql "$DATABASE_URL" < backup_pre_migration.sql
   ```

3. **Notify users** (if production)
   - Post status update
   - Estimated downtime
   - Contact support email

### Support Contacts

**Neon Support:**
- Docs: https://neon.tech/docs
- Discord: https://discord.gg/neon
- Email: support@neon.tech (paid plans)

**Vercel Support:**
- Docs: https://vercel.com/docs
- Help: https://vercel.com/help
- Email: support@vercel.com (Pro/Enterprise)

**NextAuth Support:**
- Docs: https://authjs.dev
- GitHub: https://github.com/nextauthjs/next-auth/issues
- Discord: https://discord.gg/nextauth

---

## Resources

### Documentation

**ParkBoard Docs:**
- `CLAUDE.md` - Project instructions and patterns
- `docs/SECURITY_ARCHITECTURE.md` - Security model explanation
- `docs/P0_COMPLETION_SUMMARY.md` - P0 issue resolution details
- `scripts/run-migrations.ts` - Migration runner source code

**External Docs:**
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [NextAuth.js v5 Docs](https://authjs.dev)

### Migration Files

All migrations are in `db/migrations/`:

1. `001_hybrid_pricing_model_idempotent.sql` - Core schema
2. `002_multi_tenant_communities_idempotent.sql` - Multi-tenant support
3. `003_community_rls_policies_idempotent.sql` - RLS (SKIPPED)
4. `004_remove_multi_tenant_idempotent.sql` - Cleanup
5. `005_neon_compatible_schema.sql` - Neon compatibility
6. `006_nextauth_tables.sql` - NextAuth session tables

### Environment Variable Reference

**Production `.env.production` (for reference only - set in Vercel UI):**

```bash
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require

# Authentication (NextAuth.js)
NEXTAUTH_SECRET=your-32-byte-random-secret
NEXTAUTH_URL=https://parkboard.app
NEXT_PUBLIC_APP_URL=https://parkboard.app

# Database Query Layer (Supabase SDK - still needed)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Optional: Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**⚠️ NEVER commit production `.env` to git!**

---

## Frequently Asked Questions

### Why use Neon instead of Supabase for database?

**Neon advantages:**
- True serverless PostgreSQL (pay-per-use)
- Better connection pooling for Vercel serverless
- No session storage needed (NextAuth uses JWT)
- More cost-effective for MVP scale

**Supabase still used for:**
- Database query SDK (`createClient` from `lib/supabase/server.ts`)
- Future migration path: Replace with direct `pg` queries

### Why keep Supabase environment variables?

API routes use `createClient()` from `lib/supabase/server.ts`, which creates a Supabase SDK client. Even though the database is Neon, queries go through Supabase SDK for convenience.

**Future improvement:** Refactor to use `pg` directly, eliminating Supabase dependency.

### Why is migration 003 skipped?

Migration 003 implements Row Level Security (RLS) policies using `auth.uid()`, which requires Supabase session cookies. ParkBoard uses NextAuth JWT sessions, making RLS incompatible.

**Alternative:** Application-level tenant isolation via `community_code` filtering in all queries.

**See:** `db/migrations/003_community_rls_policies_SKIPPED.md` for full explanation.

### How does rate limiting work without Redis?

In-memory rate limiting (`lib/rate-limit.ts`) stores attempt counts in a JavaScript Map. This works for single-instance serverless deployments (Vercel hobby tier) but resets on function restart.

**Limitations:**
- Resets on redeploy (~5 minutes)
- Doesn't work across multiple instances

**When to upgrade:** If you need persistent rate limiting or have multiple instances, migrate to Upstash Redis (see Advanced Configuration).

### What happens if Neon database suspends?

Neon free tier auto-suspends after 7 days of inactivity. First query after suspension takes ~5 seconds to wake database.

**Solutions:**
- Upgrade to paid tier (never suspends)
- Schedule weekly health check (keep-alive)
- Accept 5s delay for first user after inactivity

### How do I rotate NEXTAUTH_SECRET?

1. Generate new secret: `openssl rand -base64 32`
2. Add to Vercel environment variables
3. Redeploy
4. All users will be logged out (JWT invalidated)
5. Users can log in again with same credentials

**Recommended frequency:** Quarterly or after suspected breach.

---

**Document Version:** 2.0
**Last Updated:** 2025-12-21
**Author:** @technical-writer
**Status:** Production-ready
