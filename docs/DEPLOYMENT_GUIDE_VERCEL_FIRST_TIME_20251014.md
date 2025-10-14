# First-Time Deployment Guide: ParkBoard to Vercel

**Project:** ParkBoard - Multi-Tenant Parking Marketplace
**Target URL:** parkboard.app/LMR
**Platform:** Vercel (Production) + Porkbun (DNS)
**Date Created:** 2025-10-14
**Audience:** First-time deployers

---

## Overview

This guide walks you through deploying ParkBoard to production for the **first time ever**. We'll cover:

1. GitHub repository preparation
2. Vercel account setup and project creation
3. Environment variables configuration
4. Production database migration
5. Custom domain setup (parkboard.app via Porkbun)
6. SSL/HTTPS configuration (automatic)
7. Post-deployment testing
8. Troubleshooting and rollback

**Estimated Time:** 2-3 hours (first deployment)

**Prerequisites:**
- ✅ GitHub account with parkboard repository
- ✅ Porkbun account with `parkboard.app` domain registered
- ✅ Supabase project (cgbkknefvggnhkvmuwsa)
- ✅ Local development working perfectly
- ✅ All tests in `PRE_DEPLOYMENT_CHECKLIST_20251014.md` passing

---

## Deployment Philosophy

**Key Principle:** Deploy to production incrementally and test at every step.

**Deployment Stages:**
1. Deploy to Vercel with temporary URL (e.g., `parkboard-xyz.vercel.app`)
2. Test functionality on temporary URL
3. Run production database migrations
4. Connect custom domain (`parkboard.app`)
5. Configure DNS (Porkbun → Vercel)
6. Test on custom domain
7. Monitor for issues

**Why This Order?**
- Vercel temporary URL lets you test deployment before touching DNS
- DNS changes take 1-48 hours to propagate globally
- If deployment fails, your domain isn't affected
- Easy rollback if issues occur

---

## Stage 1: GitHub Repository Preparation

### Step 1.1: Verify Git Status

```bash
cd /home/ltpt420/repos/parkboard

# Check current branch
git branch
# Should show: * parkboard-mvp-optimized

# Check git status
git status
```

**Expected Output:**
```
On branch parkboard-mvp-optimized
nothing to commit, working tree clean
```

**If you see uncommitted changes:**
```bash
# Review changes
git status

# Commit all changes
git add .
git commit -m "feat: multi-tenant architecture complete, ready for deployment"

# Push to GitHub
git push origin parkboard-mvp-optimized
```

### Step 1.2: Verify GitHub Repository Access

1. Open browser: https://github.com/alfieprojectsdev/parkboard
2. Verify you can see the repository
3. Verify `parkboard-mvp-optimized` branch exists
4. Click on branch dropdown to confirm

**If repository is private:**
- ✅ Good! Keep it private for production deployment
- Vercel can access private repos after authorization

### Step 1.3: Create Production Branch (Optional but Recommended)

**Best Practice:** Deploy from `main` branch, not feature branch

**Option A: Merge to main (Recommended)**
```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Merge feature branch
git merge parkboard-mvp-optimized

# Push to GitHub
git push origin main
```

**Option B: Deploy from feature branch (Faster, less safe)**
- Deploy directly from `parkboard-mvp-optimized`
- Can always change later in Vercel settings

**For first deployment, I recommend Option B** (faster, you can switch to main later)

### Step 1.4: Document Current Commit

```bash
# Note the current commit hash
git log -1 --oneline
```

**Copy the output** (e.g., `11e1c12 feat: core booking flow with auth improvements`)

**Why?** If deployment fails, you'll know exactly what code was deployed.

---

## Stage 2: Vercel Account Setup

### Step 2.1: Create Vercel Account

1. **Go to:** https://vercel.com/signup
2. **Choose:** "Continue with GitHub"
3. **Authorize Vercel** to access your GitHub account
4. **Complete account setup:**
   - Name: (your name)
   - Team name: (optional, can skip)
   - Usage: Personal/Hobby (free tier is fine)

**Important:** Use the SAME GitHub account that owns the parkboard repository

### Step 2.2: Verify Vercel Dashboard Access

After signup, you should see:
- URL: https://vercel.com/dashboard
- Empty dashboard (no projects yet)
- "Import Project" or "Add New..." button

**If you see this, you're ready to proceed!**

---

## Stage 3: Deploy ParkBoard to Vercel

### Step 3.1: Import Project from GitHub

1. **In Vercel Dashboard**, click "Add New..." → "Project"
2. **Import Git Repository** section:
   - You should see "Continue with GitHub" or list of repos
3. **If repos not showing:**
   - Click "Adjust GitHub App Permissions"
   - Grant access to `alfieprojectsdev/parkboard` repository
   - Return to Vercel dashboard
4. **Find parkboard** in the list of repositories
5. **Click "Import"** next to `alfieprojectsdev/parkboard`

### Step 3.2: Configure Project Settings

**You'll see a configuration screen. Fill in the following:**

#### Framework Preset
- **Framework:** Next.js (should auto-detect)
- **Leave as-is** if detected correctly

#### Root Directory
- **Leave blank** (repository root is correct)

#### Build and Output Settings
- **Build Command:** `npm run build` (default, don't change)
- **Output Directory:** `.next` (default, don't change)
- **Install Command:** `npm install` (default, don't change)

#### Branch to Deploy
- **Select:** `parkboard-mvp-optimized` (or `main` if you merged)

#### Environment Variables (CRITICAL!)
Click "Environment Variables" section and add these:

**Required Variables:**

1. **Variable 1:**
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://cgbkknefvggnhkvmuwsa.supabase.co`
   - Environment: Production (checked), Preview (checked), Development (checked)

2. **Variable 2:**
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (get from Supabase dashboard - see below)
   - Environment: Production (checked), Preview (checked), Development (checked)

3. **Variable 3:**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (get from Supabase dashboard - see below)
   - Environment: Production (checked), Preview (checked), Development (checked)

**How to Get Supabase Keys:**

1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. Click "Settings" (gear icon in sidebar)
4. Click "API" in settings menu
5. **Copy values:**
   - **URL:** Under "Project URL" → Copy entire URL
   - **anon public:** Under "Project API keys" → Copy `anon` `public` key
   - **service_role:** Under "Project API keys" → Click "Reveal" → Copy `service_role` `secret` key

**IMPORTANT SECURITY NOTE:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose (prefixed with `NEXT_PUBLIC_`)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is SECRET - never expose in client code
- Vercel keeps environment variables secure (not visible in browser)

### Step 3.3: Deploy!

1. **Review all settings**
2. **Click "Deploy"** button
3. **Wait for deployment** (2-5 minutes)

**What Happens Now:**
- Vercel clones your GitHub repository
- Installs dependencies (`npm install`)
- Runs build command (`npm run build`)
- Deploys to Vercel's global CDN
- Generates temporary URL (e.g., `parkboard-xyz.vercel.app`)

**You'll see a progress screen** with logs:
- Installing dependencies...
- Building application...
- Uploading build output...
- Deploying...

### Step 3.4: Deployment Success!

**If successful, you'll see:**
- ✅ "Congratulations!" or "Your project has been deployed"
- 🔗 Temporary URL: `https://parkboard-xyz.vercel.app` (click to visit)
- Screenshot of your landing page

**Copy the temporary URL** - you'll test with this before adding custom domain.

**If deployment fails, see "Troubleshooting Deployment Failures" section below**

---

## Stage 4: Test Temporary Deployment

**Before touching DNS, verify deployment works on temporary URL**

### Step 4.1: Basic Smoke Tests

Using the temporary URL (e.g., `https://parkboard-xyz.vercel.app`):

1. **Test root page:**
   - Visit: `https://parkboard-xyz.vercel.app/`
   - Expected: Landing page loads, no errors
   - Check: Browser DevTools (F12) Console - 0 errors

2. **Test community landing:**
   - Visit: `https://parkboard-xyz.vercel.app/LMR`
   - Expected: Lumiere community page loads
   - Check: "Welcome to Lumiere Residences" text visible

3. **Test browse slots (PUBLIC):**
   - Visit: `https://parkboard-xyz.vercel.app/LMR/slots`
   - Expected: Slot listing loads, NO infinite spinner
   - Check: At least 1 slot visible (if you created test slots)
   - Check: Navigation bar visible

4. **Test login:**
   - Visit: `https://parkboard-xyz.vercel.app/login`
   - Try logging in with test credentials:
     - Email: `user1@parkboard.test`
     - Password: `test123456`
   - Expected: Login succeeds, redirects to `/LMR`

**If ALL 4 tests pass, proceed to next stage.**

**If ANY test fails, DO NOT proceed to DNS setup - fix issues first.**

### Step 4.2: Document Deployment Details

**Record these for your notes:**
- Deployment URL: `https://parkboard-xyz.vercel.app`
- Deployment time: `[current time]`
- Commit deployed: `[git commit hash]`
- Status: ✅ Working / ❌ Issues found

---

## Stage 5: Production Database Migration

**IMPORTANT:** Your Supabase database needs multi-tenant migrations applied.

### Step 5.1: Verify Current Database State

**Check if migrations already applied:**

1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. Click "SQL Editor"
4. Run this query:
   ```sql
   -- Check if communities table exists
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_name = 'communities'
   );
   ```

**Result:**
- **`true`**: Migrations already applied ✅ Skip to Stage 6
- **`false`**: Migrations needed ⚠️ Continue below

### Step 5.2: Run Production Migrations

**Run migrations IN ORDER:**

#### Migration 1: Hybrid Pricing Model

1. **Open file:** `db/migrations/001_hybrid_pricing_model_idempotent.sql`
2. **Copy entire contents**
3. **In Supabase SQL Editor**, paste and click "Run"
4. **Expected output:** `SUCCESS` (or "No rows returned" - both are OK)
5. **If error:** Check "Troubleshooting Migrations" section

#### Migration 2: Multi-Tenant Communities

1. **Open file:** `db/migrations/002_multi_tenant_communities_idempotent.sql`
2. **Copy entire contents**
3. **In Supabase SQL Editor**, paste and click "Run"
4. **Expected output:** `SUCCESS`

#### Migration 3: Community RLS Policies

1. **Open file:** `db/migrations/003_community_rls_policies_idempotent.sql`
2. **Copy entire contents**
3. **In Supabase SQL Editor**, paste and click "Run"
4. **Expected output:** `SUCCESS`

### Step 5.3: Verify Migrations Applied

**Run verification query:**

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('communities', 'parking_slots', 'bookings', 'user_profiles')
ORDER BY table_name;

-- Check communities table has data
SELECT * FROM communities;

-- Check community_code column exists in user_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'community_code';
```

**Expected Results:**
1. Query 1: Returns 4 table names
2. Query 2: Returns 3 rows (LMR, SRP, BGC communities)
3. Query 3: Returns 1 row showing `community_code` column exists

**If any query fails, see "Troubleshooting Migrations" section**

### Step 5.4: Update Existing Data (If Needed)

**If you have existing user_profiles or parking_slots with NULL community_code:**

```sql
-- Update existing users to LMR community
UPDATE user_profiles
SET community_code = 'LMR'
WHERE community_code IS NULL;

-- Update existing slots to LMR community
UPDATE parking_slots
SET community_code = 'LMR'
WHERE community_code IS NULL;

-- Verify updates
SELECT COUNT(*) FROM user_profiles WHERE community_code IS NULL;
-- Should return: 0

SELECT COUNT(*) FROM parking_slots WHERE community_code IS NULL;
-- Should return: 0
```

---

## Stage 6: Custom Domain Setup (parkboard.app)

**Now we connect your Porkbun domain to Vercel**

### Step 6.1: Add Domain in Vercel

1. **Go to:** Vercel Dashboard → Your Project (`parkboard`)
2. **Click "Settings"** tab (top navigation)
3. **Click "Domains"** in sidebar
4. **Click "Add"** button
5. **Enter domain:** `parkboard.app`
6. **Click "Add"**

**Vercel will show:**
- ⚠️ "Invalid Configuration" (this is normal - DNS not set up yet)
- **Two DNS records** you need to add in Porkbun

**Example Vercel Instructions:**
```
Add the following records to your DNS provider:

Type: A
Name: parkboard.app (or @)
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**IMPORTANT:** Copy these values - you'll need them for Porkbun.

**Note:** Vercel's IP address and CNAME values may differ - use EXACTLY what Vercel shows.

### Step 6.2: Configure DNS in Porkbun

1. **Go to:** https://porkbun.com/account/domainsSpeedy
2. **Find:** `parkboard.app` in domain list
3. **Click:** "DNS" button next to parkboard.app
4. **You'll see:** DNS Records management page

#### Add A Record (Root Domain)

1. **Click:** "Add" or "+" button
2. **Fill in:**
   - **Type:** A
   - **Host:** @ (or leave blank for root domain)
   - **Answer:** `76.76.21.21` (or IP Vercel provided)
   - **TTL:** 600 (10 minutes - default is fine)
3. **Click:** "Add" or "Submit"

#### Add CNAME Record (www Subdomain)

1. **Click:** "Add" or "+" button again
2. **Fill in:**
   - **Type:** CNAME
   - **Host:** www
   - **Answer:** `cname.vercel-dns.com` (or value Vercel provided)
   - **TTL:** 600
3. **Click:** "Add" or "Submit"

#### Remove Conflicting Records (If Present)

**Check for these and DELETE if they exist:**
- Old A record pointing to different IP
- Old CNAME record pointing to different service
- Parking page redirects

**Porkbun Gotcha:** Some registrars pre-configure parking pages. Remove those.

### Step 6.3: Wait for DNS Propagation

**DNS changes take time to propagate globally:**
- **Minimum:** 5-10 minutes
- **Typical:** 30-60 minutes
- **Maximum:** 24-48 hours (rare)

**How to Check Propagation:**

**Method 1: Online DNS Checker**
1. Go to: https://dnschecker.org/
2. Enter: `parkboard.app`
3. Select: "A" record type
4. Click "Search"
5. **Look for:** Green checkmarks showing `76.76.21.21` (or Vercel IP)
6. **Wait until:** Most locations show correct IP

**Method 2: Command Line**
```bash
# Check A record
dig parkboard.app +short
# Expected: 76.76.21.21 (or Vercel IP)

# Check CNAME record
dig www.parkboard.app +short
# Expected: cname.vercel-dns.com (or Vercel CNAME)
```

**If results show old values, wait longer and check again.**

### Step 6.4: Verify Domain in Vercel

**Once DNS propagates:**

1. **Go to:** Vercel Dashboard → Your Project → Settings → Domains
2. **You should see:** `parkboard.app` with ✅ "Valid Configuration"
3. **If still showing ⚠️:** Wait longer for DNS propagation

**Vercel will automatically:**
- ✅ Issue SSL certificate (Let's Encrypt)
- ✅ Enable HTTPS
- ✅ Redirect HTTP → HTTPS
- ✅ Add `www.parkboard.app` → `parkboard.app` redirect

**This happens automatically - no action needed!**

---

## Stage 7: Configure Path-Based Routing (/LMR)

**By default, Vercel routes `parkboard.app` → root page (`/`)**

**We need `parkboard.app/LMR` to work correctly.**

### Step 7.1: Verify Routing Works

**Test these URLs:**

1. **Root domain:**
   - URL: `https://parkboard.app/`
   - Expected: Landing page with community selector

2. **Community route:**
   - URL: `https://parkboard.app/LMR`
   - Expected: Lumiere community landing page

3. **Slots route:**
   - URL: `https://parkboard.app/LMR/slots`
   - Expected: Browse slots page

**If all 3 work, routing is correct!** ✅

**If `parkboard.app/LMR` returns 404:**
- Check Next.js build logs in Vercel
- Verify `app/[community]/` folder exists in deployment
- See "Troubleshooting Routing Issues" section

### Step 7.2: Optional - Redirect Root to /LMR

**If you want `parkboard.app` → automatically redirect to `parkboard.app/LMR`:**

**Option A: Add to `middleware.ts` (Recommended)**

```typescript
// Around line 20 in middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to LMR community (production only)
  if (pathname === '/' && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(new URL('/LMR', request.url))
  }

  // ... rest of middleware code
}
```

**Option B: Vercel Redirect Rule**

1. Go to: Vercel Dashboard → Settings → Redirects
2. Add redirect:
   - **Source:** `/`
   - **Destination:** `/LMR`
   - **Permanent:** No (302)
3. Save

**For now, I recommend keeping root page as-is** (community selector) until you're ready to focus on LMR only.

---

## Stage 8: Post-Deployment Testing (Production)

**Run critical tests on production domain**

### Step 8.1: Repeat P0 Tests from Checklist

**Using production URL `https://parkboard.app`:**

1. **Test 3:** Browse Slots (public) → `https://parkboard.app/LMR/slots`
2. **Test 6:** User Login → `https://parkboard.app/login`
3. **Test 7:** Browse Slots (authenticated)
4. **Test 9:** Book a Slot

**If all pass, deployment successful!** 🎉

### Step 8.2: Production-Specific Checks

**1. HTTPS/SSL Certificate:**
- Visit: `https://parkboard.app`
- Check: Browser address bar shows 🔒 padlock
- Click padlock → "Connection is secure"
- Certificate issued by: Let's Encrypt (or similar)

**2. No CORS Errors:**
- Open DevTools (F12) → Console
- Navigate through app
- Check: No "CORS policy" errors

**3. Environment Variables Applied:**
- Verify: Supabase connection works (can load slots, login, etc.)
- If not working: Check Vercel → Settings → Environment Variables

**4. API Routes Accessible:**
- Test signup: `https://parkboard.app/register`
- Create new user with unique email
- Verify: User created in Supabase

**5. Performance Check:**
- Visit: `https://parkboard.app/LMR/slots`
- Open DevTools → Network tab
- Check page load time: < 3 seconds (first load), < 1 second (cached)

### Step 8.3: Create Production Test User

**DO NOT use test users in production. Create real production user:**

```bash
# Use production URL
curl -X POST https://parkboard.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parkboard.app",
    "password": "SecureProductionPassword123!",
    "name": "Admin User",
    "phone": "+639171234567",
    "unit_number": "ADMIN-01"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User created successfully"
}
```

**Verify in Supabase:**
1. Go to: Supabase Dashboard → Table Editor
2. Select: `user_profiles`
3. Find: Email `admin@parkboard.app`
4. Check: `community_code = 'LMR'`

**Save credentials securely!** You'll use this for production testing.

---

## Stage 9: Cleanup and Optimization

### Step 9.1: Remove Test Data (Optional)

**If you have test users/slots, decide:**
- **Keep test data:** Useful for demo purposes
- **Remove test data:** Cleaner production database

**To remove test users:**
```sql
-- Check test users
SELECT * FROM user_profiles WHERE email LIKE '%@parkboard.test';

-- Delete test users (CAUTION!)
DELETE FROM bookings WHERE renter_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%@parkboard.test'
);
DELETE FROM parking_slots WHERE owner_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%@parkboard.test'
);
DELETE FROM user_profiles WHERE email LIKE '%@parkboard.test';
```

### Step 9.2: Remove Debug/Console Logs

**Search for and remove:**
```bash
# Search for console.log in production code
grep -r "console.log" app/ components/ lib/
```

**Remove or comment out:**
- `console.log()` statements
- Debug alerts
- Temporary test code

**Commit and redeploy:**
```bash
git add .
git commit -m "chore: remove debug logs for production"
git push origin parkboard-mvp-optimized
```

**Vercel will auto-deploy** (if you enabled automatic deployments)

### Step 9.3: Enable Automatic Deployments (Recommended)

**Vercel can auto-deploy on every push to GitHub:**

1. Go to: Vercel Dashboard → Settings → Git
2. **Production Branch:** `parkboard-mvp-optimized` (or `main`)
3. **Enable:** "Automatic deployments from Git"
4. **Save**

**Now every push to GitHub automatically deploys to production!**

**⚠️ WARNING:** Be careful with automatic deployments - broken code goes live immediately. Consider:
- Using preview deployments (see below)
- Deploying from `main` only after testing on feature branch

### Step 9.4: Set Up Preview Deployments (Recommended)

**Preview deployments = test deployment before production**

**How it works:**
1. Create feature branch (e.g., `feature/new-feature`)
2. Push to GitHub
3. Vercel creates preview URL (e.g., `parkboard-abc123.vercel.app`)
4. Test on preview URL
5. If good, merge to production branch
6. Production deploys automatically

**To enable:**
1. Go to: Vercel Dashboard → Settings → Git
2. **Enable:** "Preview Deployments" for all branches
3. **Save**

**Workflow:**
```bash
# Create feature branch
git checkout -b feature/add-admin-dashboard

# Make changes, commit
git add .
git commit -m "feat: add admin dashboard"

# Push to GitHub
git push origin feature/add-admin-dashboard

# Vercel creates preview URL automatically
# Test on preview URL
# If good, merge to main
```

---

## Stage 10: Monitoring and Maintenance

### Step 10.1: Set Up Vercel Analytics (Free)

1. Go to: Vercel Dashboard → Analytics
2. Click "Enable Analytics"
3. **Free tier includes:**
   - Page views
   - Top pages
   - Top referrers
   - Devices and browsers

### Step 10.2: Set Up Error Monitoring (Optional)

**Recommended: Sentry (free tier available)**

1. Go to: https://sentry.io/signup/
2. Create account
3. Create Next.js project
4. Follow integration guide (adds Sentry to your app)
5. **Benefits:** Real-time error alerts, stack traces, user context

### Step 10.3: Supabase Database Monitoring

1. Go to: Supabase Dashboard → Reports
2. Check:
   - Database size
   - Active connections
   - Query performance
3. Set up alerts (in Supabase settings)

### Step 10.4: Regular Maintenance Checklist

**Weekly:**
- [ ] Check Vercel deployment logs for errors
- [ ] Check Supabase database size (free tier: 500 MB limit)
- [ ] Review Analytics for traffic patterns

**Monthly:**
- [ ] Update dependencies (`npm update`)
- [ ] Review and update environment variables if needed
- [ ] Backup database (Supabase auto-backs up daily, verify)

**Quarterly:**
- [ ] Review and update documentation
- [ ] Performance audit (Lighthouse, PageSpeed Insights)
- [ ] Security audit (update dependencies with vulnerabilities)

---

## Troubleshooting Guide

### Deployment Failures

#### Build Failed: TypeScript Errors

**Error in Vercel logs:**
```
Error: Type 'X' is not assignable to type 'Y'
```

**Fix:**
```bash
# Run TypeScript check locally
npx tsc --noEmit

# Fix all errors shown
# Commit and push
git add .
git commit -m "fix: typescript errors"
git push
```

#### Build Failed: Missing Dependencies

**Error in Vercel logs:**
```
Module not found: Can't resolve 'package-name'
```

**Fix:**
```bash
# Verify package.json includes the package
npm install package-name --save

# Commit and push
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push
```

#### Build Failed: Environment Variables Not Set

**Error in Vercel logs:**
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**Fix:**
1. Go to: Vercel Dashboard → Settings → Environment Variables
2. Add missing variable
3. **Redeploy:** Deployments tab → Click "..." → "Redeploy"

### Runtime Errors

#### 500 Internal Server Error

**Symptoms:** Pages return 500 error

**Debugging:**
1. Go to: Vercel Dashboard → Deployments → Latest → Functions
2. Check function logs for errors
3. Common causes:
   - Database connection failed (check Supabase credentials)
   - RLS policy blocking query
   - Missing environment variable

**Fix:**
- Verify environment variables in Vercel
- Test database connection in Supabase SQL Editor
- Check RLS policies allow intended queries

#### Infinite Spinner on Browse Slots (Production)

**If this happens in production (should NOT if local tests passed):**

**Quick Fix:**
1. Check `app/[community]/slots/page.tsx` line ~45
2. Verify `useEffect(() => { fetchSlots() }, [])`
3. If wrong, fix and redeploy

**Diagnostic:**
1. Open DevTools → Console
2. Look for "Maximum update depth exceeded" error
3. Indicates useEffect infinite loop

#### Authentication Not Working

**Symptoms:** Can't log in, session immediately expires

**Checks:**
1. **Vercel environment variables:**
   - Go to: Settings → Environment Variables
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match Supabase
2. **Supabase RLS policies:**
   - Go to: Supabase Dashboard → Authentication → Policies
   - Verify policies allow read access
3. **Cookie domain issues:**
   - Check if `parkboard.app` allows cookies
   - Test in Incognito mode (eliminates cookie issues)

### DNS and Domain Issues

#### Domain Shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Cause:** DNS not configured or not propagated yet

**Fix:**
1. Wait longer (DNS can take 24-48 hours)
2. Check DNS records in Porkbun match Vercel requirements
3. Use https://dnschecker.org/ to verify propagation

#### Domain Shows "Invalid Configuration" in Vercel

**Cause:** DNS records not pointing to Vercel correctly

**Fix:**
1. Go to: Vercel Dashboard → Settings → Domains
2. Check what DNS records Vercel expects
3. Go to: Porkbun DNS settings
4. Verify A and CNAME records match exactly
5. Wait 10-30 minutes for verification

#### SSL Certificate Not Working

**Symptoms:** Browser shows "Not Secure" warning

**Cause:** Vercel hasn't issued certificate yet (usually automatic)

**Fix:**
1. Wait 10-30 minutes after DNS propagates
2. Go to: Vercel Dashboard → Settings → Domains
3. Check certificate status
4. If "Certificate Error", click "Refresh" or "Regenerate"

### Database Migration Issues

#### Constraint Already Exists

**Error:**
```
ERROR: constraint "name" for relation "table" already exists
```

**Fix:**
- Use idempotent migration files (all files in `db/migrations/` are already idempotent)
- Check if migration was partially run before
- Safe to re-run idempotent migrations

#### NULL Constraint Violation

**Error:**
```
ERROR: null value in column "community_code" violates not-null constraint
```

**Fix:**
```sql
-- Update existing records
UPDATE user_profiles SET community_code = 'LMR' WHERE community_code IS NULL;
UPDATE parking_slots SET community_code = 'LMR' WHERE community_code IS NULL;
```

#### RLS Policy Blocks Query

**Error in logs:**
```
permission denied for table parking_slots
```

**Fix:**
1. Go to: Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   -- Check RLS enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'parking_slots';

   -- Check policies exist
   SELECT * FROM pg_policies WHERE tablename = 'parking_slots';
   ```
3. If policies missing, re-run migration 003
4. If policies exist but wrong, update policy definition

---

## Rollback Procedures

### Rollback Deployment (Vercel)

**If deployment breaks production, rollback to previous version:**

1. **Go to:** Vercel Dashboard → Deployments
2. **Find:** Previous working deployment (marked with ✅)
3. **Click:** "..." menu → "Promote to Production"
4. **Confirm:** Previous deployment becomes production
5. **Takes effect:** Immediately (< 1 minute)

**Note:** Rollback DOES NOT rollback database changes - handle those separately

### Rollback Database Migrations

**Database migrations are harder to rollback. Prevention is key:**

**Before running production migration:**
1. **Backup database:**
   - Go to: Supabase Dashboard → Database → Backups
   - Click "Create Backup"
   - Wait for backup to complete

**If migration breaks production:**

**Option A: Restore from Backup (DESTRUCTIVE)**
1. Go to: Supabase Dashboard → Database → Backups
2. Find pre-migration backup
3. Click "Restore"
4. **⚠️ WARNING:** All data changes since backup are LOST

**Option B: Write Reverse Migration (SAFER)**
1. Identify what migration broke
2. Write SQL to undo changes
3. Run in Supabase SQL Editor
4. Example:
   ```sql
   -- If migration added column, remove it
   ALTER TABLE parking_slots DROP COLUMN IF EXISTS new_column;

   -- If migration changed constraint, revert it
   ALTER TABLE parking_slots DROP CONSTRAINT new_constraint;
   ALTER TABLE parking_slots ADD CONSTRAINT old_constraint CHECK (...);
   ```

**For this deployment, migrations 002 & 003 should NOT need rollback** - they're additive (add tables/columns, don't modify existing data structure)

---

## Post-Deployment Checklist

### Immediate (Within 1 Hour)

- [ ] All P0 tests passing on production URL
- [ ] HTTPS working (🔒 padlock in browser)
- [ ] Custom domain `parkboard.app` resolves correctly
- [ ] User registration working
- [ ] User login working
- [ ] Browse slots working (public)
- [ ] Create booking working (authenticated)
- [ ] No console errors on any page

### Short-Term (Within 24 Hours)

- [ ] Test from multiple devices (desktop, mobile, tablet)
- [ ] Test from multiple browsers (Chrome, Firefox, Safari)
- [ ] Test from multiple networks (home, mobile data, VPN)
- [ ] Create at least 1 real booking end-to-end
- [ ] Verify Vercel Analytics showing traffic
- [ ] Check Supabase logs for errors
- [ ] Remove test data (if decided to clean up)
- [ ] Document production credentials securely

### Medium-Term (Within 1 Week)

- [ ] Set up error monitoring (Sentry or similar)
- [ ] Enable Vercel preview deployments
- [ ] Create staging environment (optional)
- [ ] Write incident response plan
- [ ] Train team on deployment process
- [ ] Schedule first database backup verification

---

## Success Criteria

**Deployment considered successful when:**

✅ **All P0 tests passing** on production domain
✅ **Custom domain working** (parkboard.app)
✅ **HTTPS enabled** (automatic via Vercel)
✅ **Database migrations applied** successfully
✅ **No console errors** on critical pages
✅ **Authentication working** (login, register, session persistence)
✅ **Core user flows working:**
   - Browse slots (public)
   - Register account
   - Login
   - Create slot
   - Book slot
   - View bookings

**You can now consider ParkBoard LIVE IN PRODUCTION!** 🎉

---

## Next Steps After Successful Deployment

### Immediate Next Steps

1. **Announce launch:**
   - Share `parkboard.app/LMR` with beta users
   - Post on social media (if applicable)
   - Send email to early testers

2. **Monitor closely:**
   - Check Vercel logs daily for first week
   - Check Supabase database for errors
   - Be ready to rollback if critical issues found

3. **Gather feedback:**
   - Create feedback form
   - Track user issues
   - Prioritize bug fixes

### Short-Term Roadmap (Weeks 1-4)

1. **Performance optimization:**
   - Run Lighthouse audit
   - Optimize images
   - Enable caching where appropriate

2. **Add remaining communities:**
   - Deploy SRP (Serendra) - `parkboard.app/SRP`
   - Deploy BGC - `parkboard.app/BGC`

3. **UI/UX improvements:**
   - Implement designs from `UI_UX_IMPROVEMENT_PLAN_20251009.md`
   - Mobile bottom navigation
   - Booking modal

4. **Payment integration:**
   - Research payment providers (Stripe, PayMongo)
   - Implement payment flow
   - Test with real transactions

### Long-Term Roadmap (Months 1-3)

1. **Admin dashboard:**
   - Manage slots
   - Manage users
   - View analytics

2. **Advanced features:**
   - Recurring bookings
   - Slot availability calendar
   - Push notifications

3. **Scale to more communities:**
   - Add 5-10 more condos
   - Multi-city expansion

---

## Resources and References

### Vercel Documentation
- **Next.js on Vercel:** https://vercel.com/docs/frameworks/nextjs
- **Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Custom Domains:** https://vercel.com/docs/projects/domains
- **Deployment Overview:** https://vercel.com/docs/deployments/overview

### Supabase Documentation
- **Database Migrations:** https://supabase.com/docs/guides/database/migrations
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres

### DNS and Domain Resources
- **DNS Checker:** https://dnschecker.org/
- **Porkbun Documentation:** https://kb.porkbun.com/
- **Understanding DNS:** https://www.cloudflare.com/learning/dns/what-is-dns/

### ParkBoard-Specific Documentation
- **Pre-Deployment Checklist:** `PRE_DEPLOYMENT_CHECKLIST_20251014.md`
- **Multi-Tenant Implementation:** `MULTI_TENANT_IMPLEMENTATION_20251014.md`
- **Sitemap and User Flows:** `SITEMAP_AND_USER_FLOWS_20251014.md`
- **Project Guide:** `CLAUDE.md`

---

## Getting Help

### If You Get Stuck

1. **Check this guide's Troubleshooting section** (most common issues covered)
2. **Check Vercel logs:** Dashboard → Deployments → Functions
3. **Check Supabase logs:** Dashboard → Logs
4. **Search Vercel documentation:** https://vercel.com/docs
5. **Community resources:**
   - Vercel Discord: https://vercel.com/discord
   - Supabase Discord: https://discord.supabase.com/
   - Next.js Discussions: https://github.com/vercel/next.js/discussions

### Emergency Rollback

**If production is completely broken:**

```bash
# Immediate rollback in Vercel
# 1. Go to: Vercel Dashboard → Deployments
# 2. Find last working deployment
# 3. Click "..." → "Promote to Production"
# 4. Takes effect in < 1 minute

# Database rollback (if needed)
# 1. Go to: Supabase Dashboard → Database → Backups
# 2. Restore from pre-deployment backup
# ⚠️ CAUTION: Loses all data changes since backup
```

**After rollback:**
- Document what went wrong
- Fix issues in development
- Test thoroughly before re-deploying

---

## Deployment Completion Certificate

**When deployment is successful, fill this out:**

---

**PARKBOARD PRODUCTION DEPLOYMENT**

**Deployed By:** _____________________
**Date:** _____________________
**Time:** _____________________

**Deployment Details:**
- Production URL: https://parkboard.app
- Vercel Project: _____________________
- GitHub Commit: _____________________
- Database Migrations: 001, 002, 003 ✅

**Test Results:**
- [ ] All P0 tests passing
- [ ] HTTPS enabled
- [ ] Custom domain working
- [ ] Database migrations applied
- [ ] No critical errors

**Status:** ✅ **PRODUCTION LIVE**

**Signature:** _____________________

---

**🎉 CONGRATULATIONS ON YOUR FIRST PRODUCTION DEPLOYMENT! 🎉**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Maintained By:** Development Team
