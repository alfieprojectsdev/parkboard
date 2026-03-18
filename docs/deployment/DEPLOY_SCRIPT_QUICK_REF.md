# Deploy Script Quick Reference

## TL;DR - Just Deploy

```bash
./scripts/deploy-vercel.sh --auto-fix
```

This handles everything automatically:
- Installs Vercel CLI if needed
- Logs you in if needed
- Fixes DATABASE_URL format
- Retries migrations on failure
- Retries deployment on failure
- Verifies deployment works

---

## Common Scenarios

### First-Time Deployment

```bash
# 1. Get your DATABASE_URL from Neon
# https://console.neon.tech -> Your Project -> Connection Details

# 2. Run the script (it will prompt for DATABASE_URL)
./scripts/deploy-vercel.sh --auto-fix
```

**What happens:**
1. Script installs Vercel CLI (if needed)
2. Opens browser to log in to Vercel
3. Prompts for DATABASE_URL
4. Auto-converts to pooled connection
5. Runs database migrations
6. Deploys to Vercel
7. Tests deployment
8. Shows deployment URL

### Subsequent Deployments

```bash
# Uses saved .env.vercel.production
./scripts/deploy-vercel.sh --auto-fix
```

**What happens:**
1. Loads environment from `.env.vercel.production`
2. Runs migrations
3. Deploys to Vercel
4. Tests deployment
5. Shows deployment URL

### CI/CD (GitHub Actions, Jenkins, etc.)

```bash
DATABASE_URL="$NEON_DATABASE_URL" \
NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE" \
./scripts/deploy-vercel.sh --force --auto-fix
```

**What happens:**
1. No user prompts
2. Uses environment variables
3. Auto-fixes any issues
4. Exits with code 0 on success, 1 on failure

---

## Auto-Fix Features

| Issue | Auto-Fix Behavior |
|-------|-------------------|
| Vercel CLI missing | Automatically installs via npm |
| Not logged in | Opens browser for authentication |
| Non-pooled DATABASE_URL | Converts `ep-xxx` to `ep-xxx-pooler` |
| Database suspended | Wakes database and retries (3x) |
| Migration timeout | Waits 10s and retries (3x) |
| Expired Vercel token | Re-authenticates and retries (2x) |
| Deployment fails | Diagnoses issue and retries (2x) |
| API returns 500 | Suggests DATABASE_URL fix |

---

## Command-Line Options

```bash
# Recommended: Auto-fix everything
./scripts/deploy-vercel.sh --auto-fix

# See what would happen without doing it
./scripts/deploy-vercel.sh --dry-run

# Fully automated (no prompts)
./scripts/deploy-vercel.sh --force --auto-fix

# Debug mode (see all commands)
./scripts/deploy-vercel.sh --verbose --auto-fix

# Custom domain
./scripts/deploy-vercel.sh --auto-fix --domain parkboard.app
```

---

## Troubleshooting

### Script fails immediately

```bash
# Run with verbose mode to see what's happening
./scripts/deploy-vercel.sh --verbose --auto-fix
```

### Migrations fail repeatedly

```bash
# Test database connection manually
psql "$DATABASE_URL" -c "SELECT 1"

# Check if database is suspended in Neon console
# https://console.neon.tech -> Your Project -> Monitor

# Verify DATABASE_URL uses -pooler
echo "$DATABASE_URL" | grep -q -- "-pooler" && echo "OK" || echo "FAIL"
```

### Deployment succeeds but API returns 500

```bash
# Check environment variables in Vercel
vercel env ls

# Verify DATABASE_URL is set
vercel env pull .env.vercel.check

# Check Vercel function logs
vercel logs https://your-app.vercel.app
```

### Verification tests fail

```bash
# Wait 60 seconds for deployment to be ready
sleep 60

# Test endpoints manually
curl -I https://your-app.vercel.app/
curl -I https://your-app.vercel.app/login
curl -I https://your-app.vercel.app/api/slots

# Check Vercel dashboard
open https://vercel.com/dashboard
```

---

## Environment Variables

### Required

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Neon Console | `postgresql://...@ep-xxx-pooler...` |

**Note:** Script auto-generates `NEXTAUTH_SECRET` if not provided

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXTAUTH_URL` | Auto-set from Vercel URL | App base URL |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL | Public app URL |

### Where to Get DATABASE_URL

1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection Details"
4. Select "Pooled connection" (important!)
5. Copy the connection string

**Correct format:**
```
postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/db?sslmode=require
                            ^^^^^^^ Important: -pooler
```

---

## What Gets Deployed

### Environment Variables in Vercel

- `DATABASE_URL` - Neon pooled connection
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - App URL (auto-set)
- `NEXT_PUBLIC_APP_URL` - Public app URL (auto-set)

### Database Migrations

All migrations in `db/migrations/` run in order:
1. `001_hybrid_pricing_model_idempotent.sql`
2. `002_multi_tenant_communities_idempotent.sql` (skipped)
3. `003_community_rls_policies_idempotent.sql` (skipped)
4. `004_remove_multi_tenant_idempotent.sql`
5. `005_neon_compatible_schema.sql`
6. `006_nextauth_tables.sql`

**Note:** Migrations are idempotent - safe to run multiple times

### Application Code

- Next.js app from `app/` directory
- Components from `components/` directory
- API routes from `app/api/` directory
- All dependencies from `package.json`

---

## Post-Deployment Checklist

After deployment succeeds:

- [ ] Test signup: `https://your-app.vercel.app/register`
- [ ] Test login: `https://your-app.vercel.app/login`
- [ ] Check rate limiting: Try 6 failed logins
- [ ] Verify database connection: Browse to `/LMR/slots`
- [ ] Check Vercel logs: `vercel logs <url>`
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up custom domain (optional)

---

## Common Questions

### Q: Do I need to redeploy after updating environment variables?

**A:** Yes. After changing environment variables in Vercel:

```bash
vercel --prod
```

### Q: How do I roll back a deployment?

**A:** Via Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments"
4. Find previous deployment
5. Click "..." -> "Promote to Production"

### Q: Can I test migrations without deploying?

**A:** Yes:

```bash
# Dry-run mode
./scripts/deploy-vercel.sh --dry-run

# Or test migrations directly
npm run migrate:dry-run
```

### Q: What if DATABASE_URL is not pooled?

**A:** Script auto-converts if you use `--auto-fix`:

```bash
./scripts/deploy-vercel.sh --auto-fix
# Converts: ep-xxx → ep-xxx-pooler
```

### Q: How do I deploy to a different Vercel project?

**A:** Remove `.vercel` directory first:

```bash
rm -rf .vercel
./scripts/deploy-vercel.sh --auto-fix
# This will create a new Vercel project
```

---

## Error Code Reference

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General failure (see logs) |

**When script fails:**
1. Read the error message (it's specific!)
2. Try with `--verbose` for more details
3. Check troubleshooting section above
4. Check deployment logs: `vercel logs <url>`

---

## Performance

Typical deployment times:

- **First deployment:** 3-5 minutes
  - Vercel CLI install: ~30s
  - Authentication: ~15s
  - Migrations: ~10s
  - Build + deploy: ~2-3 minutes
  - Verification: ~30s

- **Subsequent deployments:** 2-3 minutes
  - Migrations: ~5s
  - Build + deploy: ~2-3 minutes
  - Verification: ~30s

**If deployment takes > 5 minutes:**
- Check build logs in Vercel dashboard
- May indicate TypeScript errors or dependency issues

---

## Security Notes

### Safe to Commit

- `scripts/deploy-vercel.sh` - The deployment script
- `docs/DEPLOY_SCRIPT_*.md` - Documentation

### NEVER Commit

- `.env.vercel.production` - Contains DATABASE_URL and secrets
- `.vercel/` - Vercel project configuration
- Any file with actual credentials

**The script adds these to `.gitignore` automatically.**

---

## Getting Help

1. **Check script help:**
   ```bash
   ./scripts/deploy-vercel.sh --help
   ```

2. **Run in verbose mode:**
   ```bash
   ./scripts/deploy-vercel.sh --verbose --auto-fix
   ```

3. **Check deployment logs:**
   ```bash
   vercel logs https://your-app.vercel.app
   ```

4. **Read full documentation:**
   - [Deployment Guide](./DEPLOYMENT_VERCEL_NEON_2025.md)
   - [Auto-Fix Features](./DEPLOY_SCRIPT_AUTO_FIX.md)

5. **Check Vercel dashboard:**
   - https://vercel.com/dashboard
   - Click your project → Functions → See errors

---

## One-Liners

```bash
# First deployment (interactive)
./scripts/deploy-vercel.sh --auto-fix

# Redeploy after code changes
./scripts/deploy-vercel.sh --auto-fix --force

# Preview deployment (no changes)
./scripts/deploy-vercel.sh --dry-run

# Debug deployment issues
./scripts/deploy-vercel.sh --verbose --auto-fix

# CI/CD deployment
DATABASE_URL="$DB_URL" ./scripts/deploy-vercel.sh --force --auto-fix

# Check deployment status
vercel ls

# View deployment logs
vercel logs https://your-app.vercel.app

# Pull environment variables
vercel env pull .env.vercel.check
```

---

**Last Updated:** 2025-12-21

**Related Docs:**
- [Full Deployment Guide](./DEPLOYMENT_VERCEL_NEON_2025.md)
- [Auto-Fix Documentation](./DEPLOY_SCRIPT_AUTO_FIX.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)
