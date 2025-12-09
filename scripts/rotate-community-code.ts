#!/usr/bin/env tsx
/**
 * Community Code Rotation Tool
 * ============================
 *
 * CRITICAL SECURITY FEATURE: Rotate community codes when compromised
 *
 * Usage:
 *   npm run rotate-code -- <old_code> [new_code] [--dry-run]
 *
 * Examples:
 *   npm run rotate-code -- lmr_x7k9p2                    # Auto-generate new code
 *   npm run rotate-code -- lmr_x7k9p2 lmr_j8m3n5        # Use specific code
 *   npm run rotate-code -- lmr_x7k9p2 --dry-run         # Preview only
 *
 * Security Features:
 *   - Displays preview of affected records
 *   - Requires explicit confirmation (type 'yes')
 *   - Uses database transactions (rollback on error)
 *   - Generates cryptographically random codes
 *   - Provides rollback SQL in case of issues
 *   - Logs rotation with timestamp
 *
 * Database Impact:
 *   - Updates communities.community_code (primary key)
 *   - Foreign keys CASCADE to user_profiles and parking_slots
 *   - All session tokens remain valid (NextAuth uses user ID, not community code)
 */

import * as readline from 'readline';
import * as crypto from 'crypto';
import { Client } from 'pg';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

function error(message: string) {
  log(`✗ ERROR: ${message}`, 'red');
}

function success(message: string) {
  log(`✓ ${message}`, 'green');
}

function warning(message: string) {
  log(`⚠ WARNING: ${message}`, 'yellow');
}

function info(message: string) {
  log(`ℹ ${message}`, 'cyan');
}

/**
 * Validate community code format: {acronym}_{random}
 * Example: lmr_x7k9p2 (3-4 char acronym + underscore + 6-7 char random)
 */
function validateCodeFormat(code: string): boolean {
  const pattern = /^[a-z]{2,4}_[a-z0-9]{6,7}$/i;
  return pattern.test(code);
}

/**
 * Generate cryptographically random community code
 * Format: {acronym}_{6-char-random}
 */
function generateRandomCode(acronym: string): string {
  // Generate 6 random characters (alphanumeric lowercase)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(6);
  let randomPart = '';

  for (let i = 0; i < 6; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }

  return `${acronym.toLowerCase()}_${randomPart}`;
}

/**
 * Extract acronym from existing community code
 */
function extractAcronym(code: string): string {
  const parts = code.split('_');
  return parts[0];
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Get database connection string from environment
 */
function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING || '';
}

/**
 * Main rotation logic
 */
async function rotateCommunityCode(
  oldCode: string,
  newCode: string | null,
  dryRun: boolean
): Promise<void> {
  // Step 1: Validate inputs
  log('\n' + '='.repeat(70), 'bold');
  log('COMMUNITY CODE ROTATION TOOL', 'bold');
  log('='.repeat(70) + '\n', 'bold');

  if (!validateCodeFormat(oldCode)) {
    error(`Invalid old code format: ${oldCode}`);
    error('Expected format: {acronym}_{random} (e.g., lmr_x7k9p2)');
    process.exit(1);
  }

  // Generate new code if not provided
  let finalNewCode = newCode;
  if (!finalNewCode) {
    const acronym = extractAcronym(oldCode);
    finalNewCode = generateRandomCode(acronym);
    info(`Auto-generated new code: ${finalNewCode}`);
  }

  if (!validateCodeFormat(finalNewCode)) {
    error(`Invalid new code format: ${finalNewCode}`);
    error('Expected format: {acronym}_{random} (e.g., lmr_j8m3n5)');
    process.exit(1);
  }

  if (oldCode === finalNewCode) {
    error('Old and new codes must be different');
    process.exit(1);
  }

  // Step 2: Validate database connection
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    error('Database connection not configured');
    error('Set DATABASE_URL or NEON_CONNECTION_STRING environment variable');
    process.exit(1);
  }

  info(`Old code: ${oldCode}`);
  info(`New code: ${finalNewCode}`);
  info(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE EXECUTION'}\n`);

  const client = new Client({ connectionString: dbUrl });

  try {
    // Step 3: Connect to database
    info('Connecting to database...');
    await client.connect();
    success('Connected to database\n');

    // Step 4: Check if old code exists
    const communityCheck = await client.query(
      'SELECT community_code, name, display_name, status FROM communities WHERE community_code = $1',
      [oldCode]
    );

    if (communityCheck.rows.length === 0) {
      error(`Community code not found: ${oldCode}`);
      process.exit(1);
    }

    const community = communityCheck.rows[0];
    log('Community Details:', 'bold');
    log(`  Name: ${community.name}`);
    log(`  Display Name: ${community.display_name}`);
    log(`  Status: ${community.status}\n`);

    // Step 5: Check if new code already exists
    const newCodeCheck = await client.query(
      'SELECT community_code FROM communities WHERE community_code = $1',
      [finalNewCode]
    );

    if (newCodeCheck.rows.length > 0) {
      error(`New code already exists: ${finalNewCode}`);
      error('Choose a different code or check database for conflicts');
      process.exit(1);
    }

    // Step 6: Count affected records
    log('Affected Records:', 'bold');

    const userCount = await client.query(
      'SELECT COUNT(*) as count FROM user_profiles WHERE community_code = $1',
      [oldCode]
    );
    log(`  Users: ${userCount.rows[0].count}`);

    const slotCount = await client.query(
      'SELECT COUNT(*) as count FROM parking_slots WHERE community_code = $1',
      [oldCode]
    );
    log(`  Parking Slots: ${slotCount.rows[0].count}`);

    const bookingCount = await client.query(
      `SELECT COUNT(*) as count FROM bookings b
       INNER JOIN parking_slots ps ON b.slot_id = ps.slot_id
       WHERE ps.community_code = $1`,
      [oldCode]
    );
    log(`  Bookings (via slots): ${bookingCount.rows[0].count}\n`);

    // Step 7: Generate rollback SQL
    const rollbackSql = `
-- ROLLBACK SQL (save this before executing!)
-- If rotation fails or needs to be reversed, run:

BEGIN;

UPDATE communities
  SET community_code = '${oldCode}'
  WHERE community_code = '${finalNewCode}';

-- Foreign keys will CASCADE the update back to user_profiles and parking_slots

COMMIT;

-- Verify rollback:
SELECT community_code, name FROM communities WHERE community_code = '${oldCode}';
`;

    log('Rollback Instructions:', 'bold');
    log('─'.repeat(70));
    log(rollbackSql.trim());
    log('─'.repeat(70) + '\n');

    // Step 8: Dry run mode - stop here
    if (dryRun) {
      warning('DRY RUN MODE - No changes will be made');
      info('Remove --dry-run flag to execute rotation');
      process.exit(0);
    }

    // Step 9: Confirmation prompt
    warning('This operation will update the community code in the database.');
    warning('Foreign keys will CASCADE the update to user_profiles and parking_slots.');
    log('');

    const confirmation = await promptConfirmation(
      `Type 'yes' to proceed with rotation:`
    );

    if (confirmation.toLowerCase() !== 'yes') {
      info('Rotation cancelled by user');
      process.exit(0);
    }

    // Step 10: Execute rotation in transaction
    log('\n' + '─'.repeat(70));
    log('EXECUTING ROTATION', 'bold');
    log('─'.repeat(70) + '\n');

    await client.query('BEGIN');

    try {
      info('Updating communities table...');
      const updateResult = await client.query(
        'UPDATE communities SET community_code = $1, updated_at = NOW() WHERE community_code = $2 RETURNING *',
        [finalNewCode, oldCode]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('No rows updated - community may have been deleted');
      }

      success('Communities table updated');

      // Verify CASCADE updates
      info('Verifying CASCADE updates...');

      const newUserCount = await client.query(
        'SELECT COUNT(*) as count FROM user_profiles WHERE community_code = $1',
        [finalNewCode]
      );
      success(`User profiles updated: ${newUserCount.rows[0].count}`);

      const newSlotCount = await client.query(
        'SELECT COUNT(*) as count FROM parking_slots WHERE community_code = $1',
        [finalNewCode]
      );
      success(`Parking slots updated: ${newSlotCount.rows[0].count}`);

      // Check for orphaned records (should be zero)
      const orphanedUsers = await client.query(
        'SELECT COUNT(*) as count FROM user_profiles WHERE community_code = $1',
        [oldCode]
      );

      if (parseInt(orphanedUsers.rows[0].count) > 0) {
        throw new Error(`CASCADE failed: ${orphanedUsers.rows[0].count} orphaned user records`);
      }

      const orphanedSlots = await client.query(
        'SELECT COUNT(*) as count FROM parking_slots WHERE community_code = $1',
        [oldCode]
      );

      if (parseInt(orphanedSlots.rows[0].count) > 0) {
        throw new Error(`CASCADE failed: ${orphanedSlots.rows[0].count} orphaned slot records`);
      }

      // Commit transaction
      await client.query('COMMIT');
      log('');
      success('Transaction committed successfully\n');

      // Step 11: Display summary
      log('='.repeat(70), 'bold');
      log('ROTATION SUMMARY', 'bold');
      log('='.repeat(70), 'bold');
      log(`Timestamp: ${new Date().toISOString()}`);
      log(`Old Code: ${oldCode}`);
      log(`New Code: ${finalNewCode}`);
      log(`Users Updated: ${newUserCount.rows[0].count}`);
      log(`Slots Updated: ${newSlotCount.rows[0].count}`);
      log(`Status: SUCCESS\n`, 'green');

      // Step 12: Next steps
      log('Next Steps:', 'bold');
      log('  1. Update community code in group chat (Telegram/WhatsApp/Viber)');
      log('  2. Announce to users: "New community code effective immediately"');
      log('  3. Existing users can continue using the app (sessions still valid)');
      log('  4. New signups must use the new code\n');

      // Step 13: Save rollback SQL to file
      const rollbackFile = `rollback_${oldCode}_to_${finalNewCode}_${Date.now()}.sql`;
      const fs = await import('fs');
      fs.writeFileSync(rollbackFile, rollbackSql);
      info(`Rollback SQL saved to: ${rollbackFile}\n`);

    } catch (txError) {
      await client.query('ROLLBACK');
      error('Transaction rolled back due to error');
      throw txError;
    }

  } catch (err) {
    error(`Rotation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    log('\nCommunity Code Rotation Tool', 'bold');
    log('============================\n');
    log('Usage:');
    log('  npm run rotate-code -- <old_code> [new_code] [--dry-run]\n');
    log('Arguments:');
    log('  old_code    Current community code (required)');
    log('  new_code    New community code (optional - auto-generated if omitted)');
    log('  --dry-run   Preview changes without executing (optional)\n');
    log('Examples:');
    log('  npm run rotate-code -- lmr_x7k9p2');
    log('  npm run rotate-code -- lmr_x7k9p2 lmr_j8m3n5');
    log('  npm run rotate-code -- lmr_x7k9p2 --dry-run\n');
    log('Environment Variables:');
    log('  DATABASE_URL or NEON_CONNECTION_STRING (required)\n');
    process.exit(0);
  }

  const oldCode = args[0];
  const dryRun = args.includes('--dry-run');

  // Check if second arg is new code or flag
  let newCode: string | null = null;
  if (args.length > 1 && !args[1].startsWith('--')) {
    newCode = args[1];
  }

  await rotateCommunityCode(oldCode, newCode, dryRun);
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

export { rotateCommunityCode, validateCodeFormat, generateRandomCode };
