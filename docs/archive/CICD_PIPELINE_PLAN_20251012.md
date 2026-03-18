# ParkBoard - CI/CD Pipeline Plan
**Date:** 2025-10-12
**Status:** Ready for Implementation
**Platform:** GitHub Actions (Primary) + Vercel (Deployment)

---

## Executive Summary

This plan implements a **production-ready CI/CD pipeline** for ParkBoard using existing stack and free-tier services:

- ✅ **GitHub Actions** for CI/CD orchestration (free for public repos, 2000 min/month private)
- ✅ **Vercel** for Next.js deployment (free tier: unlimited deployments)
- ✅ **Supabase** for database hosting (already in use)
- ✅ **GitHub** for version control (already in use)

**Cost:** $0/month (all free tiers)

---

## 1. Current Stack Analysis

### Technologies in Use

| Component | Technology | Version | CI/CD Ready |
|-----------|-----------|---------|-------------|
| **Framework** | Next.js | 14.2.33 | ✅ Yes |
| **Runtime** | Node.js | 20.x | ✅ Yes |
| **Package Manager** | npm | Latest | ✅ Yes |
| **Language** | TypeScript | 5.x | ✅ Yes |
| **Database** | Supabase (PostgreSQL) | Cloud | ✅ Yes |
| **Auth** | Supabase Auth | Cloud | ✅ Yes |
| **Styling** | Tailwind CSS | 3.4.1 | ✅ Yes |
| **UI Components** | shadcn/ui + Radix UI | Latest | ✅ Yes |
| **Testing (Unit)** | Jest + RTL | 30.2.0 | ✅ Yes |
| **Testing (E2E)** | Playwright | 1.56.0 | ✅ Yes |
| **Linting** | ESLint | 8.x | ✅ Yes |

### Repository Information

- **Git Host:** GitHub
- **Repository:** https://github.com/alfieprojectsdev/parkboard.git
- **Current Branch:** parkboard-mvp-optimized
- **Main Branch:** main

---

## 2. CI/CD Architecture

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMMIT & PUSH                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Code Quality (2-3 min)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Checkout   │→ │    Lint      │→ │  Type Check  │          │
│  │     Code     │  │   (ESLint)   │  │ (TypeScript) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Unit Tests (7-10 min)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Install     │→ │   Run Jest   │→ │   Upload     │          │
│  │ Dependencies │  │  158 Tests   │  │  Coverage    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Build & E2E Tests (5-7 min)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Next.js     │→ │  Playwright  │→ │   Upload     │          │
│  │   Build      │  │   8 Tests    │  │   Report     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: Deploy (main/production only) (2-3 min)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Vercel     │→ │  Run Smoke   │→ │   Notify     │          │
│  │   Deploy     │  │    Tests     │  │    Team      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘

Total Time: ~15-20 minutes (full pipeline)
```

---

## 3. Environment Strategy

### Three-Tier Environment Setup

| Environment | Branch | URL | Database | Purpose |
|------------|--------|-----|----------|---------|
| **Development** | feature/* | localhost:3000 | Local/Staging DB | Local dev |
| **Staging** | develop | parkboard-staging.vercel.app | Staging Supabase | Pre-prod testing |
| **Production** | main | parkboard.vercel.app | Production Supabase | Live users |

### Environment Variables Management

**Stored in:**
- GitHub Secrets (sensitive)
- Vercel Environment Variables (deployment)
- `.env.local` (local development - gitignored)

**Required Secrets:**

```bash
# GitHub Secrets (Settings → Secrets → Actions)
NEXT_PUBLIC_SUPABASE_URL_STAGING
SUPABASE_SERVICE_ROLE_KEY_STAGING
NEXT_PUBLIC_SUPABASE_URL_PRODUCTION
SUPABASE_SERVICE_ROLE_KEY_PRODUCTION
VERCEL_TOKEN                        # For deployment
VERCEL_ORG_ID                       # Your Vercel org ID
VERCEL_PROJECT_ID                   # Your Vercel project ID

# Optional (for notifications)
SLACK_WEBHOOK_URL                   # Team notifications
DISCORD_WEBHOOK_URL                 # Alternative notifications
```

---

## 4. GitHub Actions Workflows

### Workflow Files to Create

```
.github/
└── workflows/
    ├── ci.yml                    # Main CI pipeline (all branches)
    ├── deploy-staging.yml        # Auto-deploy to staging (develop branch)
    ├── deploy-production.yml     # Manual deploy to production (main branch)
    ├── nightly-e2e.yml          # Full E2E suite (nightly)
    └── dependency-update.yml     # Dependabot auto-merge
```

### 4.1 Main CI Pipeline (`ci.yml`)

**Triggers:** All pushes and PRs
**Duration:** ~15 minutes
**Purpose:** Validate code quality, tests, and build

**Jobs:**
1. **Lint & Type Check** (2-3 min)
   - ESLint
   - TypeScript type checking
   - Prettier formatting check

2. **Unit Tests** (7-10 min)
   - Run all 158 Jest tests
   - Generate coverage report
   - Upload coverage to Codecov (optional)

3. **Build** (3-5 min)
   - Next.js production build
   - Check for build errors
   - Verify bundle size

4. **E2E Tests** (5-7 min)
   - Playwright tests (8 scenarios)
   - Run against built app
   - Upload test artifacts

### 4.2 Staging Deployment (`deploy-staging.yml`)

**Triggers:** Push to `develop` branch (after CI passes)
**Duration:** ~5 minutes
**Purpose:** Auto-deploy to staging for testing

**Steps:**
1. Checkout code
2. Deploy to Vercel (staging environment)
3. Run smoke tests
4. Notify team (Slack/Discord)

### 4.3 Production Deployment (`deploy-production.yml`)

**Triggers:** Manual workflow dispatch OR tag creation (`v*`)
**Duration:** ~5 minutes
**Purpose:** Deploy to production with safety checks

**Steps:**
1. Require approval (GitHub Environments)
2. Deploy to Vercel (production)
3. Run production smoke tests
4. Notify team
5. Create GitHub release

### 4.4 Nightly E2E Tests (`nightly-e2e.yml`)

**Triggers:** Cron (daily at 2 AM UTC)
**Duration:** ~30 minutes
**Purpose:** Comprehensive E2E testing with extended scenarios

**Steps:**
1. Run full Playwright suite
2. Run stress tests (20+ users)
3. Test concurrent operations
4. Report failures to team

---

## 5. Deployment Strategy

### Vercel Integration (Recommended)

**Why Vercel:**
- ✅ Built for Next.js (best DX)
- ✅ Zero-config deployments
- ✅ Automatic HTTPS
- ✅ Edge functions support
- ✅ Preview deployments for PRs
- ✅ Free tier: unlimited deployments

**Setup Steps:**

1. **Connect GitHub to Vercel**
   ```bash
   # Via Vercel Dashboard
   1. Go to vercel.com/new
   2. Import alfieprojectsdev/parkboard
   3. Configure project settings
   ```

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Development Command: npm run dev
   ```

3. **Set Environment Variables**
   ```
   Staging:
   - NEXT_PUBLIC_SUPABASE_URL (staging DB)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

   Production:
   - NEXT_PUBLIC_SUPABASE_URL (production DB)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   ```

4. **Configure Domains**
   ```
   Production: parkboard.vercel.app (or custom domain)
   Staging: parkboard-staging.vercel.app
   Preview: parkboard-pr-123.vercel.app (automatic)
   ```

### Alternative: Self-Hosted (Docker)

**If Vercel is not an option:**

```dockerfile
# Dockerfile (create this)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Deploy to:**
- Railway.app (free tier)
- Render.com (free tier)
- DigitalOcean App Platform ($5/month)
- AWS/GCP/Azure (pay-as-you-go)

---

## 6. Database Migration Strategy

### Supabase Migrations

**Problem:** How to apply schema changes across environments?

**Solution:** Use Supabase CLI for migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize
supabase init

# Create migration
supabase migration new add_user_roles

# Apply to staging
supabase db push --db-url=$STAGING_DB_URL

# Apply to production (manual approval)
supabase db push --db-url=$PRODUCTION_DB_URL
```

**CI/CD Integration:**

```yaml
# In deploy workflow
- name: Run Database Migrations
  run: |
    npx supabase db push --db-url=${{ secrets.SUPABASE_DB_URL }}
```

**Best Practices:**
- ✅ All migrations in `supabase/migrations/` (version controlled)
- ✅ Test migrations in staging first
- ✅ Manual approval for production migrations
- ✅ Rollback plan for each migration

---

## 7. Quality Gates

### Pre-Merge Requirements

**Branch Protection Rules (GitHub):**

```yaml
main:
  - Require pull request reviews: 1 reviewer
  - Require status checks to pass:
    - CI / lint
    - CI / test-unit
    - CI / test-e2e
    - CI / build
  - Require branches to be up to date
  - Do not allow force push

develop:
  - Require status checks to pass:
    - CI / lint
    - CI / test-unit
    - CI / build
  - Allow force push (for rebasing)
```

### Automated Checks

| Check | Threshold | Action on Failure |
|-------|-----------|-------------------|
| Linting | 0 errors | ❌ Block merge |
| Type Errors | 0 errors | ❌ Block merge |
| Unit Tests | 100% pass | ❌ Block merge |
| Code Coverage | ≥80% | ⚠️ Warn only |
| E2E Tests | 100% pass | ❌ Block merge |
| Build | Success | ❌ Block merge |
| Bundle Size | <500KB (first load) | ⚠️ Warn only |

---

## 8. Monitoring & Alerts

### Performance Monitoring

**Vercel Analytics (Built-in):**
- ✅ Core Web Vitals
- ✅ Page load times
- ✅ Real user metrics
- ✅ Free tier included

**Sentry (Optional):**
```bash
npm install @sentry/nextjs

# Add to next.config.js
const { withSentryConfig } = require('@sentry/nextjs')
```

### Error Tracking

**Supabase Logs:**
- Monitor database queries
- Track auth failures
- Review API errors

**Vercel Logs:**
- Function execution logs
- Build logs
- Deployment logs

### Alerts Configuration

```yaml
# alerts.yml (conceptual)
alerts:
  - name: "High Error Rate"
    condition: error_rate > 5%
    channels: [slack, email]

  - name: "Slow Response Time"
    condition: p95_response_time > 2s
    channels: [slack]

  - name: "Failed Deployment"
    condition: deployment_status == "failed"
    channels: [slack, email, discord]

  - name: "Test Failure"
    condition: test_pass_rate < 100%
    channels: [slack]
```

---

## 9. Security Scanning

### Automated Security Checks

**1. Dependency Scanning (Dependabot)**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

**2. Secret Scanning (GitHub)**
- Enabled by default
- Scans for committed secrets
- Alerts on detected credentials

**3. Code Scanning (CodeQL)**
```yaml
# .github/workflows/codeql.yml
name: "CodeQL"
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly
```

**4. OWASP Dependency Check**
```yaml
# Add to ci.yml
- name: OWASP Dependency Check
  run: |
    npm audit --audit-level=high
    # Fail if high/critical vulnerabilities
```

---

## 10. Rollback Strategy

### Automatic Rollback

**Vercel:**
- ✅ One-click rollback in dashboard
- ✅ Keep last 10 deployments
- ✅ Instant rollback (<30 seconds)

**Process:**
```
1. Detect issue (monitoring/alerts)
2. Go to Vercel dashboard
3. Click "Rollback" on previous deployment
4. Verify production is stable
5. Investigate issue offline
6. Fix and redeploy
```

### Manual Rollback (Git)

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit (force push)
git reset --hard <commit-hash>
git push --force origin main
```

### Database Rollback

**Supabase Migrations:**
```bash
# Create down migration
supabase migration new revert_user_roles

# Apply rollback
supabase db push --db-url=$PRODUCTION_DB_URL
```

**Backup Restoration:**
```bash
# Restore from Supabase backup (via dashboard)
1. Go to Supabase Dashboard → Database → Backups
2. Select backup timestamp
3. Click "Restore"
```

---

## 11. Release Process

### Semantic Versioning

**Format:** `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`)

- **MAJOR:** Breaking changes (v1 → v2)
- **MINOR:** New features (v1.2 → v1.3)
- **PATCH:** Bug fixes (v1.2.3 → v1.2.4)

### Release Workflow

```
┌──────────────────────────────────────────────────────────┐
│ 1. Feature Development                                   │
│    - Work in feature/branch                              │
│    - Create PR to develop                                │
│    - CI runs (lint, test, build)                         │
│    - Code review                                         │
│    - Merge to develop                                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Staging Deployment (Automatic)                       │
│    - Auto-deploy to staging                              │
│    - QA testing                                          │
│    - User acceptance testing                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Release Preparation                                   │
│    - Create release PR (develop → main)                  │
│    - Update CHANGELOG.md                                 │
│    - Bump version in package.json                        │
│    - Final review                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Production Deployment (Manual Approval)              │
│    - Merge release PR                                    │
│    - Tag commit (git tag v1.2.3)                        │
│    - Deploy to production                                │
│    - Create GitHub release with notes                    │
└──────────────────────────────────────────────────────────┘
```

### CHANGELOG.md Format

```markdown
# Changelog

## [1.2.3] - 2025-10-12

### Added
- E2E testing with Playwright
- Stress test data generation script
- CI/CD pipeline with GitHub Actions

### Fixed
- Slot detail booking validation for future dates
- UI component mocks in tests

### Changed
- Updated test coverage to 85%

### Security
- Updated dependencies to patch vulnerabilities
```

---

## 12. Cost Analysis

### Free Tier Usage

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|----------------|------|
| **GitHub Actions** | 2000 min/month (private) | ~500 min/month | $0 |
| **Vercel** | Unlimited deployments | ~30/month | $0 |
| **Supabase** | 500MB DB, 2GB bandwidth | <100MB, <1GB | $0 |
| **Codecov** | 1 repo (optional) | 1 repo | $0 |
| **Sentry** | 5K events/month (optional) | <1K/month | $0 |
| **Total** | - | - | **$0/month** |

### Scaling Costs (Future)

| Service | Paid Tier | When Needed | Cost |
|---------|-----------|-------------|------|
| GitHub Actions | 3000 min/month | >2000 min/month | $4/month |
| Vercel Pro | Unlimited + extras | >100GB bandwidth | $20/month |
| Supabase Pro | 8GB DB, 50GB bandwidth | >500MB DB | $25/month |

**Total at scale:** ~$50/month (still very affordable)

---

## 13. Implementation Checklist

### Phase 1: Setup (Day 1)

- [ ] Create `.github/workflows/` directory
- [ ] Add GitHub Secrets
- [ ] Connect GitHub to Vercel
- [ ] Configure Vercel environments
- [ ] Set up branch protection rules

### Phase 2: CI Pipeline (Day 2)

- [ ] Create `ci.yml` workflow
- [ ] Test lint job
- [ ] Test unit test job
- [ ] Test build job
- [ ] Test E2E job
- [ ] Verify all gates work

### Phase 3: CD Pipeline (Day 3)

- [ ] Create `deploy-staging.yml`
- [ ] Create `deploy-production.yml`
- [ ] Test staging deployment
- [ ] Test production deployment (dry run)
- [ ] Configure smoke tests

### Phase 4: Monitoring (Day 4)

- [ ] Enable Vercel Analytics
- [ ] Configure Sentry (optional)
- [ ] Set up Slack/Discord notifications
- [ ] Create alert rules
- [ ] Test alert delivery

### Phase 5: Documentation (Day 5)

- [ ] Update README with badges
- [ ] Document deployment process
- [ ] Create runbook for incidents
- [ ] Train team on workflows
- [ ] Conduct first production deployment

---

## 14. Success Metrics

### Pipeline Health

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CI Duration | <15 min | TBD | 🆕 New |
| Deployment Frequency | 1-2/day | TBD | 🆕 New |
| Deployment Success Rate | >95% | TBD | 🆕 New |
| Mean Time to Recovery (MTTR) | <30 min | TBD | 🆕 New |
| Change Failure Rate | <5% | TBD | 🆕 New |

### Quality Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Pass Rate | 100% | 100% | ✅ Met |
| Code Coverage | ≥80% | ~85% | ✅ Exceeded |
| Build Success Rate | >98% | TBD | 🆕 New |
| Security Vulnerabilities | 0 high/critical | TBD | 🆕 New |

---

## 15. Next Steps

### Immediate (This Week)
1. **Create GitHub Actions workflows** (ci.yml, deploy-*.yml)
2. **Set up Vercel deployment**
3. **Configure GitHub Secrets**
4. **Test full pipeline** with sample PR

### Short Term (Next 2 Weeks)
1. Enable Dependabot
2. Set up monitoring (Vercel Analytics + optional Sentry)
3. Configure Slack/Discord notifications
4. Create deployment runbook

### Long Term (Next Month)
1. Add performance budgets
2. Implement automated DB migrations
3. Set up staging data refresh
4. Create disaster recovery plan

---

## 16. Resources

### Documentation Links
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Playwright CI](https://playwright.dev/docs/ci)

### Example Repositories
- [Next.js with GitHub Actions](https://github.com/vercel/next.js/tree/canary/.github/workflows)
- [Supabase with CI/CD](https://github.com/supabase/supabase/tree/master/.github/workflows)

---

## 17. Troubleshooting

### Common Issues

**1. E2E Tests Failing in CI**
```yaml
# Increase timeout, install deps
- name: Install Playwright browsers
  run: npx playwright install --with-deps
```

**2. Build Fails on CI but Works Locally**
```bash
# Check Node version matches
- uses: actions/setup-node@v4
  with:
    node-version: '20'
```

**3. Environment Variables Not Loading**
```yaml
# Ensure secrets are properly referenced
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

**4. Vercel Deployment Timeout**
```
# Increase timeout in Vercel settings
Build & Development Settings → Build Command Timeout
```

---

## Conclusion

This CI/CD pipeline provides:

✅ **Automated testing** at every commit
✅ **Zero-downtime deployments** via Vercel
✅ **Environment isolation** (dev → staging → production)
✅ **Quality gates** preventing bad code from shipping
✅ **Monitoring & alerts** for production issues
✅ **Fast feedback loops** (<20 min full pipeline)
✅ **Cost-effective** ($0/month initially)

**Ready to implement!** 🚀

---

**Last Updated:** 2025-10-12
**Maintained By:** Development Team
**Status:** ✅ **Ready for Implementation**
