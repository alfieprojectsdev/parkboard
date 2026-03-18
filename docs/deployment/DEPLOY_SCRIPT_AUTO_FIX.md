# Deploy Script Auto-Fix Enhancements

## Overview

The `scripts/deploy-vercel.sh` script has been enhanced with comprehensive automatic troubleshooting and fix capabilities. This reduces manual intervention and makes deployments more reliable, especially for first-time users.

## Auto-Fix Capabilities

### 1. Vercel CLI Auto-Install

**Problem:** User doesn't have Vercel CLI installed

**Auto-Fix:**
- Detects if `vercel` command is not available
- In `--auto-fix` mode: Automatically runs `npm install -g vercel`
- In interactive mode: Prompts user with "Install Vercel CLI now? (Y/n)"
- Verifies installation succeeded before proceeding

**Example Output:**
```bash
⚠  Vercel CLI not found
ℹ  Installing Vercel CLI automatically...
✓  Vercel CLI installed successfully
```

### 2. Vercel Authentication Auto-Login

**Problem:** User is not logged in to Vercel

**Auto-Fix:**
- Detects if `vercel whoami` fails
- In `--auto-fix` mode: Automatically runs `vercel login`
- In interactive mode: Prompts user with "Login to Vercel now? (Y/n)"
- Opens browser for authentication
- Verifies login succeeded before proceeding

**Example Output:**
```bash
⚠  Not logged in to Vercel
ℹ  Opening Vercel login...
[Browser opens for authentication]
✓  Logged in successfully
```

### 3. DATABASE_URL Auto-Conversion to Pooled Connection

**Problem:** User provides non-pooled DATABASE_URL (missing `-pooler`)

**Auto-Fix:**
- Detects if DATABASE_URL doesn't contain `-pooler`
- Extracts hostname and automatically converts to pooled format
- In `--auto-fix` mode: Automatically applies conversion
- In interactive mode: Shows before/after and prompts for confirmation

**Example Output:**
```bash
⚠  DATABASE_URL should use pooled connection (-pooler)
ℹ  Auto-converting to pooled connection:
   Old: postgresql://user:pass@ep-abc123.us-east-2.aws.neon.tech/db
   New: postgresql://user:pass@ep-abc123-pooler.us-east-2.aws.neon.tech/db
✓  Auto-converted to pooled connection
```

### 4. Migration Auto-Retry with Diagnostics

**Problem:** Database migrations fail due to transient issues

**Auto-Fix:**
- Retries up to 3 times automatically
- Diagnoses failure causes:
  - **Database suspended:** Wakes up Neon database and retries
  - **Connection timeout:** Waits 10 seconds for database to wake
  - **Permission denied:** Provides specific error message
  - **Tables already exist:** Recognizes as success
- Provides specific troubleshooting steps for each failure type

**Example Output:**
```bash
ℹ  Running migrations (attempt 1/3)...
⚠  Migration failed, diagnosing issue...
⚠  Cannot connect to database
ℹ  Database may be suspended (Neon auto-suspends after inactivity)
ℹ  Waking up database...
ℹ  Waiting 10 seconds for database to wake up...
ℹ  Running migrations (attempt 2/3)...
✓  Database migrations completed
```

### 5. Deployment Auto-Retry with Error Detection

**Problem:** Deployment fails due to expired auth token or transient issues

**Auto-Fix:**
- Retries up to 2 times automatically
- Detects specific failure types:
  - **Invalid token:** Re-authenticates and retries
  - **Build failure:** Shows build logs and common fixes
  - **Unknown error:** Provides troubleshooting steps
- In `--auto-fix` mode: Automatically re-authenticates if needed

**Example Output:**
```bash
ℹ  Deploying to Vercel (attempt 1/2)...
⚠  Deployment failed, diagnosing issue...
✗  Vercel authentication expired or invalid
ℹ  Re-authenticating with Vercel...
✓  Re-authenticated successfully
ℹ  Deploying to Vercel (attempt 2/2)...
✓  Deployed to Vercel
```

### 6. Enhanced Post-Deployment Verification

**Problem:** Deployment succeeds but application has runtime errors

**Auto-Fix:**
- Waits for deployment to be ready (up to 60 seconds with progress)
- Tests critical endpoints:
  - Home page (`/`)
  - Login page (`/login`)
  - API endpoint (`/api/slots`)
  - Signup endpoint (`/api/auth/signup`)
- Detects common issues:
  - **HTTP 500:** Suggests checking DATABASE_URL in Vercel
  - **Timeout:** Indicates deployment may not be ready
- Provides specific troubleshooting steps for failed tests

**Example Output:**
```bash
ℹ  Waiting for deployment to be ready...
ℹ  Waiting for deployment... (5/60 seconds)
✓  Deployment is ready (took 10s)

ℹ  Testing endpoints:
✓  / -> HTTP 200
✓  /login -> HTTP 200
✓  /api/slots -> HTTP 401 (auth required)
✓  /api/auth/signup -> HTTP 400 (validation working)

✓  All verification tests passed
```

## Usage

### Recommended Usage (Interactive with Auto-Fix)

```bash
./scripts/deploy-vercel.sh --auto-fix
```

**Behavior:**
- Automatically installs Vercel CLI if missing
- Automatically logs in if not authenticated
- Auto-converts DATABASE_URL to pooled connection
- Auto-retries migrations (up to 3 times)
- Auto-retries deployment (up to 2 times)
- Prompts for confirmation on critical operations

### Fully Automated (CI/CD)

```bash
DATABASE_URL="..." NEXTAUTH_SECRET="..." ./scripts/deploy-vercel.sh --force --auto-fix
```

**Behavior:**
- No user prompts
- All auto-fixes applied automatically
- Suitable for GitHub Actions, Jenkins, etc.

### Interactive Without Auto-Fix (Manual Control)

```bash
./scripts/deploy-vercel.sh
```

**Behavior:**
- Prompts for all confirmations
- Shows suggestions but doesn't auto-fix
- User has full control

### Dry-Run Mode

```bash
./scripts/deploy-vercel.sh --dry-run
```

**Behavior:**
- Shows what would be done without executing
- Validates environment and prerequisites
- No changes made

## New Command-Line Options

| Option | Description |
|--------|-------------|
| `--auto-fix` | Enable automatic fixes (recommended) |
| `--no-auto-fix` | Disable automatic fixes (default) |

All other options remain the same:
- `--dry-run` - Preview deployment without executing
- `--force` - Skip all confirmations (non-interactive)
- `--verbose` - Enable debug output
- `--domain <domain>` - Set custom domain

## Error Handling Improvements

### Migration Diagnostics

The script now detects and handles:

1. **Suspended Database**
   - Symptom: Connection timeout or ECONNREFUSED
   - Fix: Wakes database with simple query, waits 10 seconds, retries

2. **IP Allowlist Block**
   - Symptom: "no pg_hba.conf entry" error
   - Fix: Provides link to Neon IP allowlist settings

3. **Permission Errors**
   - Symptom: "permission denied" in migration
   - Fix: Suggests checking user permissions (CREATE, ALTER, INSERT)

4. **Tables Already Exist**
   - Symptom: Migration fails but tables exist
   - Fix: Recognizes as success and continues

### Deployment Diagnostics

The script now detects and handles:

1. **Expired Authentication**
   - Symptom: "invalid token" or "unauthorized" error
   - Fix: Re-authenticates and retries automatically

2. **Build Failures**
   - Symptom: "build failed" or "build error"
   - Fix: Shows build logs and suggests local fixes:
     - `npm run build`
     - `npx tsc --noEmit`
     - `npm run lint`

3. **Unknown Deployment Errors**
   - Symptom: Deployment fails without clear error
   - Fix: Provides troubleshooting steps and Vercel dashboard link

### Verification Diagnostics

Post-deployment verification now provides:

1. **Progress Indicator**
   - Shows waiting progress every 5 seconds
   - Times out after 60 seconds (indicates issue)

2. **Endpoint-Specific Diagnostics**
   - HTTP 500 on API: "DATABASE_URL not set in Vercel"
   - HTTP 000: "Deployment timeout or network issue"
   - HTTP 401: "Expected (auth required)"

3. **Troubleshooting Guide**
   - Shows specific commands to diagnose issues
   - Links to Vercel dashboard and function logs
   - Lists common issues and fixes

## Enhanced Error Messages

### Before
```bash
✗ Vercel CLI not found
ℹ Install: npm i -g vercel
[Script exits]
```

### After
```bash
⚠  Vercel CLI not found
ℹ  Installing Vercel CLI automatically...
[Installs CLI]
✓  Vercel CLI installed successfully
[Script continues]
```

## Backward Compatibility

All enhancements are backward compatible:

- Default behavior unchanged (prompts for confirmations)
- Existing scripts and CI/CD pipelines continue to work
- New `--auto-fix` flag is opt-in
- All environment variables remain the same

## Testing Checklist

Test the script with:

- [ ] Missing Vercel CLI → Auto-installs
- [ ] Not logged in → Auto-authenticates
- [ ] Non-pooled DATABASE_URL → Auto-converts
- [ ] Suspended Neon database → Auto-wakes and retries
- [ ] Expired Vercel token → Re-authenticates and retries
- [ ] Successful deployment → All verifications pass
- [ ] `--dry-run` mode → No changes made
- [ ] `--force --auto-fix` → Fully automated
- [ ] `--help` → Shows updated documentation

## Future Enhancements

Potential future improvements:

1. **Auto-detect DATABASE_URL from .env files**
   - Search for `.env`, `.env.local`, `.env.production`
   - Suggest using found values

2. **Vercel Project Auto-Setup**
   - Detect if project not linked to Vercel
   - Run `vercel` (interactive mode) to link project

3. **Database Schema Validation**
   - Verify schema matches expected structure
   - Detect missing tables or columns

4. **Cost Estimation**
   - Estimate Vercel and Neon costs before deployment
   - Warn if deployment may incur charges

5. **Rollback on Failure**
   - Revert to previous deployment if verification fails
   - Provide `--rollback` flag for manual rollback

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_VERCEL_NEON_2025.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)
- [CLAUDE.md](../CLAUDE.md) - Project-specific conventions

## Changelog

### 2025-12-21 - Auto-Fix Enhancements

**Added:**
- `--auto-fix` and `--no-auto-fix` flags
- Vercel CLI auto-install
- Vercel authentication auto-login
- DATABASE_URL auto-conversion to pooled connection
- Migration auto-retry (up to 3 attempts)
- Deployment auto-retry (up to 2 attempts)
- Enhanced post-deployment verification with progress
- Comprehensive error diagnostics and troubleshooting

**Improved:**
- Error messages are now actionable
- Failure modes are auto-detected and fixed
- Verification provides specific remediation steps
- Help documentation reflects auto-fix capabilities

**Maintained:**
- Backward compatibility with existing usage
- All environment variables unchanged
- Default behavior (prompts) unchanged
