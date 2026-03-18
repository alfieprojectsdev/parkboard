# Community Code Rotation Guide

## Overview

The community code rotation tool is a **critical security feature** that allows administrators to rotate compromised community codes. This is essential for maintaining the security of the multi-tenant architecture described in `MULTI_TENANCY_IMPROVEMENTS.md`.

## Prerequisites

### Database Requirements

The rotation tool requires the multi-tenant architecture to be deployed. This means:

1. **Migration 002 must be applied** (`db/migrations/002_multi_tenant_communities_idempotent.sql`)
   - Creates `communities` table with `community_code` as primary key
   - Adds `community_code` columns to `user_profiles` and `parking_slots`
   - Sets up foreign key constraints with CASCADE update

2. **Migration 004 must NOT be applied** (it removes multi-tenancy)
   - If migration 004 was applied, re-run migration 002 to restore multi-tenancy

### Environment Setup

Set one of these environment variables:
- `DATABASE_URL` (PostgreSQL connection string)
- `NEON_CONNECTION_STRING` (Neon-specific connection string)

Example:
```bash
export NEON_CONNECTION_STRING="postgresql://user:pass@host/db?sslmode=require"
```

## When to Rotate Codes

Rotate community codes in these scenarios:

1. **Security Breach**: Code was accidentally shared publicly (e.g., posted on social media)
2. **Suspected Compromise**: Unauthorized users have the code
3. **Periodic Rotation**: As part of regular security maintenance (quarterly recommended)
4. **User Offboarding**: When a resident moves out and may retain the code
5. **Compliance**: Required by security policy or regulations

## Usage

### Basic Commands

```bash
# View help and usage information
npm run rotate-code -- --help

# Auto-generate new code (recommended)
npm run rotate-code -- lmr_x7k9p2

# Specify new code manually
npm run rotate-code -- lmr_x7k9p2 lmr_j8m3n5

# Dry run (preview only - no changes)
npm run rotate-code -- lmr_x7k9p2 --dry-run
```

### Typical Workflow

1. **Preview the rotation** (dry-run mode):
   ```bash
   npm run rotate-code -- lmr_x7k9p2 --dry-run
   ```

   This displays:
   - Community details
   - Number of affected users, slots, and bookings
   - Rollback SQL (save this!)
   - No database changes are made

2. **Review the output**:
   - Verify the community details are correct
   - Note the number of affected records
   - **Save the rollback SQL** to a file

3. **Execute the rotation**:
   ```bash
   npm run rotate-code -- lmr_x7k9p2
   ```

   The tool will:
   - Display a preview of changes
   - Ask for confirmation (type 'yes' to proceed)
   - Execute the rotation in a transaction
   - Verify CASCADE updates worked correctly
   - Save rollback SQL to a file

4. **Announce the new code**:
   - Post to the community group chat (Telegram/WhatsApp/Viber)
   - Message: "New community code effective immediately: lmr_j8m3n5"
   - Existing users remain logged in (sessions use user ID, not community code)
   - New signups must use the new code

## How It Works

### Database Operations

The rotation updates the `community_code` primary key in the `communities` table:

```sql
UPDATE communities
  SET community_code = 'lmr_j8m3n5'
  WHERE community_code = 'lmr_x7k9p2';
```

Foreign key constraints with `ON UPDATE CASCADE` automatically update:
- `user_profiles.community_code`
- `parking_slots.community_code`

This ensures referential integrity - all related records are updated atomically.

### Transaction Safety

All operations are wrapped in a transaction:
```sql
BEGIN;
  -- Update community code
  -- Verify CASCADE updates
  -- Check for orphaned records
COMMIT; -- Only if all checks pass
```

If any step fails, the entire operation is rolled back - **no partial updates**.

### Session Handling

**Important**: Existing user sessions remain valid after rotation because NextAuth.js stores the user ID (UUID) in the JWT token, not the community code. Users can continue using the app without re-logging in.

The `communityCode` in the session will be stale until the next token refresh (which happens automatically on the next request or after the JWT expires).

## Security Features

### 1. Confirmation Prompt

The tool requires explicit confirmation before executing:
```
Type 'yes' to proceed with rotation: █
```

Any input other than 'yes' cancels the operation.

### 2. Preview Mode (Dry Run)

Use `--dry-run` to preview changes without modifying the database:
```bash
npm run rotate-code -- lmr_x7k9p2 --dry-run
```

This is safe to run in production to assess impact.

### 3. Validation Checks

The tool validates:
- Code format matches `{acronym}_{random}` pattern
- Old code exists in database
- New code doesn't already exist
- Database connection is available
- All foreign key constraints are satisfied

### 4. Rollback SQL

Before execution, the tool generates rollback SQL:
```sql
BEGIN;

UPDATE communities
  SET community_code = 'lmr_x7k9p2'
  WHERE community_code = 'lmr_j8m3n5';

COMMIT;
```

This is automatically saved to a file:
```
rollback_lmr_x7k9p2_to_lmr_j8m3n5_1638316800000.sql
```

### 5. Cryptographic Random Generation

When auto-generating codes, the tool uses `crypto.randomBytes()` (not `Math.random()`):
- 6 characters from 36-character alphabet (a-z, 0-9)
- 2.17 billion possible combinations
- Sufficient to prevent brute-force enumeration

### 6. Atomic Operations

All updates are atomic - either all records update or none do:
- Transaction-based execution
- Rollback on any error
- Verification of CASCADE updates
- Orphan detection

## Code Format

Community codes follow this format:
```
{acronym}_{random}

Examples:
  lmr_x7k9p2  (Lumiere Residences)
  srp_m4n8q1  (Serendra Park)
  bgc_r6t3w5  (Bonifacio Global City)
```

### Format Rules

- **Acronym**: 2-4 lowercase letters (e.g., `lmr`, `srp`, `bgc`)
- **Separator**: Single underscore `_`
- **Random Part**: 6-7 lowercase alphanumeric characters (a-z, 0-9)
- **Total Length**: 9-12 characters

### Why This Format?

1. **Security**: Difficult to guess (not sequential like `LMR001`, `LMR002`)
2. **Simplicity**: Easy to type and share in group chats
3. **Human-Readable**: Acronym provides context (users know it's their community)
4. **Case-Insensitive**: All lowercase prevents confusion (LMR vs lmr)

## Examples

### Example 1: Standard Rotation

```bash
$ npm run rotate-code -- lmr_x7k9p2

======================================================================
COMMUNITY CODE ROTATION TOOL
======================================================================

ℹ Auto-generated new code: lmr_h4m2n9
ℹ Old code: lmr_x7k9p2
ℹ New code: lmr_h4m2n9
ℹ Mode: LIVE EXECUTION

ℹ Connecting to database...
✓ Connected to database

Community Details:
  Name: Lumiere
  Display Name: Lumiere Residences
  Status: active

Affected Records:
  Users: 42
  Parking Slots: 128
  Bookings (via slots): 87

Rollback Instructions:
──────────────────────────────────────────────────────────────────────
-- ROLLBACK SQL (save this before executing!)
-- If rotation fails or needs to be reversed, run:

BEGIN;

UPDATE communities
  SET community_code = 'lmr_x7k9p2'
  WHERE community_code = 'lmr_h4m2n9';

COMMIT;
──────────────────────────────────────────────────────────────────────

⚠ WARNING: This operation will update the community code in the database.
⚠ WARNING: Foreign keys will CASCADE the update to user_profiles and parking_slots.

Type 'yes' to proceed with rotation: yes

──────────────────────────────────────────────────────────────────────
EXECUTING ROTATION
──────────────────────────────────────────────────────────────────────

ℹ Updating communities table...
✓ Communities table updated
ℹ Verifying CASCADE updates...
✓ User profiles updated: 42
✓ Parking slots updated: 128

✓ Transaction committed successfully

======================================================================
ROTATION SUMMARY
======================================================================
Timestamp: 2025-12-09T10:30:45.123Z
Old Code: lmr_x7k9p2
New Code: lmr_h4m2n9
Users Updated: 42
Slots Updated: 128
Status: SUCCESS

Next Steps:
  1. Update community code in group chat (Telegram/WhatsApp/Viber)
  2. Announce to users: "New community code effective immediately"
  3. Existing users can continue using the app (sessions still valid)
  4. New signups must use the new code

ℹ Rollback SQL saved to: rollback_lmr_x7k9p2_to_lmr_h4m2n9_1733742645123.sql
```

### Example 2: Dry Run

```bash
$ npm run rotate-code -- lmr_x7k9p2 --dry-run

======================================================================
COMMUNITY CODE ROTATION TOOL
======================================================================

ℹ Auto-generated new code: lmr_p5q8r2
ℹ Old code: lmr_x7k9p2
ℹ New code: lmr_p5q8r2
ℹ Mode: DRY RUN (preview only)

ℹ Connecting to database...
✓ Connected to database

Community Details:
  Name: Lumiere
  Display Name: Lumiere Residences
  Status: active

Affected Records:
  Users: 42
  Parking Slots: 128
  Bookings (via slots): 87

Rollback Instructions:
──────────────────────────────────────────────────────────────────────
[...rollback SQL...]
──────────────────────────────────────────────────────────────────────

⚠ WARNING: DRY RUN MODE - No changes will be made
ℹ Remove --dry-run flag to execute rotation
```

### Example 3: Specifying New Code

```bash
$ npm run rotate-code -- lmr_x7k9p2 lmr_secure2025

======================================================================
COMMUNITY CODE ROTATION TOOL
======================================================================

ℹ Old code: lmr_x7k9p2
ℹ New code: lmr_secure2025
ℹ Mode: LIVE EXECUTION

[...continues with confirmation prompt...]
```

## Troubleshooting

### Error: "Community code not found"

**Cause**: The old code doesn't exist in the database.

**Solution**:
1. Check for typos in the old code
2. Verify the code exists: `SELECT * FROM communities WHERE community_code = 'lmr_x7k9p2';`
3. Ensure migration 002 was applied

### Error: "New code already exists"

**Cause**: The new code you specified is already in use.

**Solution**:
1. Let the tool auto-generate a code (omit the second argument)
2. Choose a different code manually
3. Check database: `SELECT * FROM communities;`

### Error: "Database connection not configured"

**Cause**: Environment variables not set.

**Solution**:
1. Check `.env.dev` or `.env` file exists
2. Set `DATABASE_URL` or `NEON_CONNECTION_STRING`
3. Run with environment: `source .env.dev && npm run rotate-code -- ...`

### Error: "relation 'communities' does not exist"

**Cause**: Multi-tenant architecture not deployed (migration 002 not applied).

**Solution**:
1. Run migration 002: `./scripts/migrate.sh`
2. Or manually: `psql $NEON_CONNECTION_STRING < db/migrations/002_multi_tenant_communities_idempotent.sql`
3. Verify: `SELECT * FROM communities;`

### Error: "CASCADE failed: X orphaned records"

**Cause**: Foreign key constraints not set up correctly.

**Solution**:
1. Re-run migration 002 (idempotent - safe to run multiple times)
2. Verify foreign keys exist:
   ```sql
   SELECT conname FROM pg_constraint WHERE conname LIKE 'fk_%community';
   ```

## Testing

### Unit Tests

Run unit tests to verify code generation and validation:
```bash
npm test -- --testPathPatterns=rotate-community-code
```

Expected output:
```
PASS __tests__/scripts/rotate-community-code.test.ts
  Community Code Rotation - Unit Tests
    validateCodeFormat
      ✓ validates correct format with 3-char acronym
      ✓ validates correct format with 4-char acronym
      [... 25 more tests ...]

Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

### Integration Testing

Test against a staging database:
```bash
# 1. Set staging database URL
export NEON_CONNECTION_STRING="postgresql://staging-connection-string"

# 2. Run dry-run mode
npm run rotate-code -- test_abc123 --dry-run

# 3. Execute rotation
npm run rotate-code -- test_abc123

# 4. Verify rotation
psql $NEON_CONNECTION_STRING -c "SELECT * FROM communities WHERE community_code = 'test_...'"

# 5. Test rollback (optional)
psql $NEON_CONNECTION_STRING -f rollback_test_abc123_to_test_xyz789_*.sql
```

## Best Practices

### 1. Always Use Dry-Run First

Preview changes before executing:
```bash
npm run rotate-code -- lmr_x7k9p2 --dry-run
```

This ensures:
- Correct community is targeted
- Expected number of records will be updated
- Rollback SQL is available before changes

### 2. Save Rollback SQL

The tool automatically saves rollback SQL, but you should also:
- Copy rollback SQL to a secure location
- Include in incident documentation
- Test rollback in staging before production

### 3. Announce During Low-Traffic Periods

Schedule rotations during:
- Late night/early morning
- Off-peak hours
- Maintenance windows

This minimizes user impact if issues occur.

### 4. Communicate Clearly

When announcing new codes:
- Use clear, simple language
- Include the exact new code
- Explain what users need to do (nothing for existing users, new code for signups)
- Provide support contact if questions arise

Example message:
```
🔐 COMMUNITY CODE UPDATE

New code effective immediately: lmr_j8m3n5

Existing users: No action needed - you can continue using the app.
New residents: Use the new code when signing up.

Questions? Contact building management.
```

### 5. Monitor After Rotation

After rotating:
- Check for failed logins (users using old code)
- Monitor error logs for issues
- Verify new signups work correctly
- Be available for support questions

### 6. Document Rotation History

Maintain a rotation log:
```
Date        Old Code     New Code     Reason                Performed By
----------  -----------  -----------  --------------------  -------------
2025-12-09  lmr_x7k9p2   lmr_h4m2n9   Suspected compromise  Admin Team
2025-09-15  lmr_abc123   lmr_x7k9p2   Quarterly rotation    Admin Team
```

## Security Considerations

### 1. Access Control

Restrict access to the rotation tool:
- Only authorized administrators should run it
- Require VPN or secure connection
- Log all rotation attempts
- Require two-person approval for production

### 2. Code Distribution

Distribute new codes securely:
- Use trusted group chats only (avoid email)
- Verify recipient identity before sharing
- Delete old code announcements after rotation
- Monitor for code leaks (Google search, Pastebin, etc.)

### 3. Rotation Frequency

Balance security and convenience:
- **High-risk**: Rotate monthly or after each suspected breach
- **Medium-risk**: Rotate quarterly
- **Low-risk**: Rotate annually or as-needed

### 4. Backup Before Rotation

Always backup the database before rotation:
```bash
# Backup database
pg_dump $NEON_CONNECTION_STRING > backup_before_rotation_$(date +%Y%m%d_%H%M%S).sql

# Run rotation
npm run rotate-code -- lmr_x7k9p2

# Verify success
psql $NEON_CONNECTION_STRING -c "SELECT * FROM communities;"
```

### 5. Audit Trail

The rotation tool logs:
- Timestamp of rotation
- Old and new codes
- Number of affected records
- Success/failure status

Consider also:
- Capturing console output to a log file
- Storing rollback SQL in version control
- Documenting rotation reason and approver

## Related Documentation

- `MULTI_TENANCY_IMPROVEMENTS.md` - Multi-tenant architecture design
- `db/migrations/002_multi_tenant_communities_idempotent.sql` - Database schema
- `CLAUDE.md` - Project guidelines and conventions

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review unit test examples
3. Consult `MULTI_TENANCY_IMPROVEMENTS.md` for architecture context
4. Contact technical team for production support
