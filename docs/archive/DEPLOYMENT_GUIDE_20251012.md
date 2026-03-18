# ParkBoard - Comprehensive Deployment Guide
**Platform:** Vercel
**Domain:** parkboard.app (Porkbun)
**Date:** 2025-10-12

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Vercel Setup](#vercel-setup)
3. [Environment Variables](#environment-variables)
4. [Domain Configuration (Porkbun)](#domain-configuration)
5. [First Deployment](#first-deployment)
6. [CI/CD Integration](#cicd-integration)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- ✅ GitHub account (already have: `alfieprojectsdev/parkboard`)
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Porkbun account (domain already registered: `parkboard.app`)
- ✅ Supabase account (production database)

### Required Information
Before starting, gather:
- Supabase Production URL
- Supabase Production Anon Key
- Supabase Production Service Role Key
- Porkbun API credentials (for DNS)

---

## Vercel Setup

### Step 1: Create Vercel Account

1. Go to https://vercel.com/signup
2. **Sign up with GitHub** (recommended for seamless integration)
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..." → "Project"**
2. In "Import Git Repository":
   - Search for `alfieprojectsdev/parkboard`
   - Click **"Import"**

3. Configure Project:
   ```
   Project Name: parkboard
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. Click **"Deploy"** (this will fail initially - that's OK!)

### Step 3: Project Settings

After import, configure:

1. **General Settings**
   - Node.js Version: `20.x`
   - Install Command: `npm ci` (faster than npm install)
   - Build Command: `npm run build`
   - Output Directory: `.next`

2. **Git Settings**
   - Production Branch: `main`
   - Auto-Deploy: `main` and `develop` branches

3. **Build & Development Settings**
   - Framework: Next.js
   - Root Directory: `./`

---

## Environment Variables

### Required Variables

Navigate to **Project Settings → Environment Variables** and add:

#### Production Environment

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cgbkknefvggnhkvmuwsa.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (from Supabase) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (from Supabase) | Production |

#### Preview/Staging Environment

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://staging-xxx.supabase.co` | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (staging) | Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (staging) | Preview |

#### Development Environment

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://staging-xxx.supabase.co` | Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (staging) | Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (staging) | Development |

### How to Add Variables

```bash
# Option 1: Via Vercel Dashboard
1. Go to Project Settings
2. Click "Environment Variables"
3. Add each variable
4. Select appropriate environment(s)
5. Click "Save"

# Option 2: Via Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Get Supabase Credentials

```bash
# Go to Supabase Dashboard → Project Settings → API

NEXT_PUBLIC_SUPABASE_URL: Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY: Project API keys → anon public
SUPABASE_SERVICE_ROLE_KEY: Project API keys → service_role (secret)
```

**⚠️ CRITICAL:** Never commit service role key to Git!

---

## Domain Configuration (Porkbun)

### Step 1: Get Vercel DNS Records

1. In Vercel Dashboard, go to **Project → Settings → Domains**
2. Click **"Add Domain"**
3. Enter `parkboard.app`
4. Vercel will show you DNS records to add

**Vercel provides:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 2: Configure Porkbun DNS

1. Log into Porkbun: https://porkbun.com/account/login
2. Go to **Domain Management**
3. Click on `parkboard.app`
4. Navigate to **DNS Records**

#### Add A Record (Root Domain)

```
Type: A
Host: @  (or leave blank)
Answer: 76.76.21.21
TTL: 600
```

Click **"Add"**

#### Add CNAME Record (WWW Subdomain)

```
Type: CNAME
Host: www
Answer: cname.vercel-dns.com.  (note the trailing dot)
TTL: 600
```

Click **"Add"**

#### Optional: Staging Subdomain

```
Type: CNAME
Host: staging
Answer: cname.vercel-dns.com.
TTL: 600
```

### Step 3: Remove Conflicting Records

**IMPORTANT:** Remove any existing A or CNAME records for:
- `@` (root domain)
- `www`
- `staging` (if adding)

Porkbun may have default DNS records - delete them!

### Step 4: Verify in Vercel

Back in Vercel:
1. After adding DNS records, click **"Verify"**
2. Wait 1-5 minutes for DNS propagation
3. Vercel will show ✅ when verified

**DNS Propagation:** Can take 5 minutes to 48 hours (usually 5-30 minutes)

### Step 5: Enable HTTPS

Vercel automatically:
- Issues SSL certificate (Let's Encrypt)
- Enables HTTPS
- Redirects HTTP → HTTPS
- Adds HSTS headers

**No manual configuration needed!** 🎉

### Step 6: Add WWW Redirect

In Vercel:
1. Go to **Domains**
2. Click `www.parkboard.app`
3. Select **"Redirect to parkboard.app"**
4. Choose **"308 Permanent Redirect"**

Now `www.parkboard.app` → `parkboard.app`

---

## First Deployment

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"**
3. Click **"Redeploy"** on latest deployment
4. Wait ~2-3 minutes
5. Click **"Visit"** to see live site

### Option 2: Deploy via Git Push

```bash
# Ensure you're on main branch
git checkout main

# Push to GitHub
git push origin main

# Vercel auto-deploys!
# Watch progress at https://vercel.com/your-project
```

### Option 3: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy to production
vercel --prod

# Output:
# ✅ Production: https://parkboard.app [copied to clipboard]
```

### First Deployment Checklist

After first successful deployment:

- [ ] Site loads at https://parkboard.app
- [ ] HTTPS is enabled (padlock icon in browser)
- [ ] www.parkboard.app redirects to parkboard.app
- [ ] Login functionality works
- [ ] Registration works
- [ ] Database connection successful
- [ ] Images/assets load correctly

---

## CI/CD Integration

### GitHub Actions Setup

#### Step 1: Get Vercel Tokens

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Get tokens
vercel project ls  # Lists your projects

# 4. Get Project ID and Org ID
vercel inspect parkboard

# Output shows:
# Project ID: prj_xxxxxxxxxxxxx
# Org ID: team_xxxxxxxxxxxxx
```

#### Step 2: Create Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `GitHub Actions - ParkBoard`
4. Scope: `Full Access` (or limit to specific project)
5. Expiration: `No Expiration` (or choose duration)
6. Click **"Create"**
7. **Copy token immediately** (shown only once)

#### Step 3: Add GitHub Secrets

1. Go to GitHub: https://github.com/alfieprojectsdev/parkboard
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**

Add these secrets:

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `VERCEL_TOKEN` | `xVxxxx...` | From Step 2 above |
| `VERCEL_ORG_ID` | `team_xxx` | From `vercel inspect` |
| `VERCEL_PROJECT_ID` | `prj_xxx` | From `vercel inspect` |
| `NEXT_PUBLIC_SUPABASE_URL_STAGING` | Staging DB URL | Supabase Dashboard |
| `SUPABASE_ANON_KEY_STAGING` | Staging anon key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY_STAGING` | Staging service key | Supabase Dashboard |

#### Step 4: Test CI/CD

```bash
# Create a test branch
git checkout -b test/cicd

# Make a small change
echo "# CI/CD Test" >> README.md
git add README.md
git commit -m "test: CI/CD pipeline"

# Push
git push origin test/cicd

# Go to GitHub → Actions tab
# Watch workflows run:
# - CI workflow runs
# - All tests pass
# - Build succeeds
```

#### Step 5: Deploy to Production

```bash
# Merge to main
git checkout main
git merge test/cicd
git push origin main

# GitHub Actions:
# 1. Runs CI
# 2. Deploys to Vercel
# 3. Updates https://parkboard.app
```

---

## Post-Deployment Verification

### Automated Checks

Run these after deployment:

```bash
# 1. Check site is live
curl -I https://parkboard.app

# Expected:
# HTTP/2 200
# content-type: text/html

# 2. Check HTTPS redirect
curl -I http://parkboard.app

# Expected:
# HTTP/1.1 308 Permanent Redirect
# location: https://parkboard.app

# 3. Check API health (if you have health endpoint)
curl https://parkboard.app/api/health

# 4. Check WWW redirect
curl -I https://www.parkboard.app

# Expected:
# HTTP/2 308 Permanent Redirect
# location: https://parkboard.app
```

### Manual Checks

- [ ] **Homepage loads** (https://parkboard.app)
- [ ] **Login works** (/login)
- [ ] **Registration works** (/register)
- [ ] **Browse slots** (/slots)
- [ ] **Create booking** (/slots/1)
- [ ] **View bookings** (/bookings)
- [ ] **List new slot** (/slots/new)
- [ ] **Images load** (check browser console)
- [ ] **No console errors** (F12 → Console)
- [ ] **Mobile responsive** (test on phone or DevTools)

### Performance Checks

Use **Vercel Analytics** (built-in):

1. Go to **Project → Analytics**
2. Check:
   - Real User Monitoring (RUM)
   - Core Web Vitals
   - Page load times

Use **Lighthouse** (Chrome DevTools):

```bash
# Run Lighthouse audit
1. Open https://parkboard.app in Chrome
2. Press F12 → Lighthouse tab
3. Click "Generate report"

Target scores:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90
```

---

## Troubleshooting

### Issue 1: Deployment Fails with "Build Error"

**Symptoms:** Vercel build fails

**Solutions:**

```bash
# Check build logs in Vercel Dashboard
# Common causes:

# 1. TypeScript errors
npm run build  # Test locally first

# 2. Missing environment variables
# Verify all required vars are set in Vercel

# 3. Dependency issues
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue 2: Domain Not Connecting

**Symptoms:** parkboard.app shows "Domain Not Found"

**Solutions:**

```bash
# 1. Check DNS propagation
dig parkboard.app
nslookup parkboard.app

# 2. Wait 5-30 minutes for DNS propagation

# 3. Verify Porkbun records match Vercel's instructions

# 4. Remove any conflicting records in Porkbun

# 5. Try incognito/private browsing (clear DNS cache)
```

### Issue 3: SSL Certificate Error

**Symptoms:** "Your connection is not private"

**Solutions:**

```bash
# 1. Wait 5-10 minutes after DNS verification
# Vercel auto-issues certificate

# 2. Check Vercel Dashboard → Domains
# Should show "✅ Valid Certificate"

# 3. If stuck, remove domain and re-add

# 4. Contact Vercel support (live chat)
```

### Issue 4: Environment Variables Not Loading

**Symptoms:** App crashes, database connection fails

**Solutions:**

```bash
# 1. Verify vars in Vercel Dashboard
# Settings → Environment Variables

# 2. Check correct environment selected:
# - Production
# - Preview
# - Development

# 3. Redeploy after adding/changing vars
# Vercel → Deployments → Redeploy

# 4. Check variable names match exactly:
# NEXT_PUBLIC_SUPABASE_URL (not SUPABASE_URL)
```

### Issue 5: Old Deployment Still Showing

**Symptoms:** Changes not visible on site

**Solutions:**

```bash
# 1. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# 2. Check Vercel deployment status
# Dashboard → Deployments → Should show "Ready"

# 3. Verify correct branch deployed
# main branch = production

# 4. Check deployment URL
# Sometimes preview URL is cached
```

### Issue 6: API Routes Return 404

**Symptoms:** /api/* routes not found

**Solutions:**

```bash
# 1. Verify Next.js app directory structure
app/
  api/
    auth/
      signup/
        route.ts  # Must export GET/POST functions

# 2. Check Vercel Functions
# Dashboard → Functions tab
# Should see API routes listed

# 3. Check middleware isn't blocking API routes
# middleware.ts should allow /api/* paths

# 4. Check API route syntax
# export async function POST(request) { }
```

### Issue 7: Supabase Connection Fails

**Symptoms:** "Database connection error"

**Solutions:**

```bash
# 1. Verify Supabase credentials in Vercel
# Check URL, anon key, service role key

# 2. Test connection locally
NEXT_PUBLIC_SUPABASE_URL=... npm run dev

# 3. Check Supabase project is active
# Supabase Dashboard → Project should be "Active"

# 4. Verify no IP restrictions
# Supabase → Project → Settings → API
# "Allow all origins" for testing

# 5. Check RLS policies
# May need to adjust for production
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables documented
- [ ] Database migrations ready (if any)
- [ ] Supabase production DB configured

### Vercel Setup

- [ ] Project imported from GitHub
- [ ] Environment variables configured
- [ ] Production branch set to `main`
- [ ] Auto-deploy enabled

### Domain Configuration

- [ ] A record added to Porkbun (@)
- [ ] CNAME record added (www)
- [ ] Old records removed
- [ ] DNS verified in Vercel
- [ ] SSL certificate issued

### CI/CD

- [ ] GitHub Actions workflows created
- [ ] Vercel token generated
- [ ] GitHub secrets configured
- [ ] Test deployment successful

### Post-Deployment

- [ ] Site accessible at parkboard.app
- [ ] HTTPS working
- [ ] WWW redirect working
- [ ] All features tested manually
- [ ] Performance acceptable (Lighthouse)
- [ ] Monitoring configured

---

## Useful Commands

### Vercel CLI

```bash
# Login
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs parkboard

# List deployments
vercel ls

# Inspect project
vercel inspect parkboard

# Pull environment variables
vercel env pull .env.production.local

# Add environment variable
vercel env add VARIABLE_NAME production
```

### DNS Checks

```bash
# Check DNS propagation
dig parkboard.app +short

# Check nameservers
dig NS parkboard.app +short

# Check from specific DNS server
dig @8.8.8.8 parkboard.app

# Trace DNS resolution
dig parkboard.app +trace
```

### SSL Checks

```bash
# Check SSL certificate
openssl s_client -connect parkboard.app:443 -servername parkboard.app

# Check certificate expiry
echo | openssl s_client -servername parkboard.app -connect parkboard.app:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Production URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Production** | https://parkboard.app | Live site (main branch) |
| **WWW** | https://www.parkboard.app | Redirects to parkboard.app |
| **Staging** | https://parkboard-staging.vercel.app | Testing (develop branch) |
| **PR Previews** | https://parkboard-pr-*.vercel.app | Feature testing |
| **Vercel Dashboard** | https://vercel.com/parkboard | Deployment management |
| **Supabase Dashboard** | https://app.supabase.com | Database management |

---

## Support Resources

### Documentation
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Porkbun DNS Guide:** https://kb.porkbun.com/article/22-how-to-change-your-nameservers
- **Supabase Docs:** https://supabase.com/docs

### Support Channels
- **Vercel Support:** https://vercel.com/support (live chat)
- **Porkbun Support:** https://porkbun.com/support
- **GitHub Issues:** https://github.com/alfieprojectsdev/parkboard/issues

---

## Next Steps After Deployment

1. **Set up monitoring:**
   - Enable Vercel Analytics
   - Configure Sentry (optional)
   - Set up Supabase logging

2. **Configure alerts:**
   - Slack/Discord webhooks
   - Email notifications
   - PagerDuty (if needed)

3. **Create runbook:**
   - Incident response procedures
   - Rollback instructions
   - Contact information

4. **Document:**
   - Update README with production URL
   - Add deployment badges
   - Write release notes

---

**Last Updated:** 2025-10-12
**Maintained By:** Development Team
**Status:** ✅ **Ready for Production Deployment**
