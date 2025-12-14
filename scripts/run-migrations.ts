#!/usr/bin/env tsx

/**
 * DATABASE MIGRATION RUNNER
 *
 * TypeScript-based migration executor for Neon PostgreSQL database.
 * Executes idempotent migrations from db/migrations/ directory.
 *
 * Features:
 * - Connects to Neon using DATABASE_URL environment variable
 * - Tracks executed migrations in schema_migrations table
 * - Skips already-executed migrations (idempotent)
 * - Provides colored console output with execution times
 * - Handles errors gracefully with rollback support
 * - Supports --dry-run flag to preview without executing
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts           # Run pending migrations
 *   npx tsx scripts/run-migrations.ts --dry-run # Preview what would execute
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const MIGRATION_TABLE = 'schema_migrations';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

function logInfo(message: string): void {
  console.log(`${colors.blue}🔍${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}⊙${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function logExecuting(message: string): void {
  console.log(`${colors.cyan}→${colors.reset} ${message}`);
}

function logHeader(message: string): void {
  console.log('\n' + message);
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

function getDatabaseUrl(): string {
  const dbUrl = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;

  if (!dbUrl) {
    logError('NEON_CONNECTION_STRING or DATABASE_URL environment variable not set');
    console.log('\nSet NEON_CONNECTION_STRING in your .env.local file:');
    console.log('  NEON_CONNECTION_STRING=postgresql://user:password@host/database?sslmode=require');
    process.exit(1);
  }

  return dbUrl;
}

async function createClient(): Promise<Client> {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }, // Neon requires SSL
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    logError('Failed to connect to database');
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// MIGRATION TRACKING
// ============================================================================

async function ensureMigrationTable(client: Client): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      execution_time_ms INTEGER,
      checksum TEXT
    );

    COMMENT ON TABLE ${MIGRATION_TABLE} IS 'Tracks which database migrations have been executed';
  `;

  try {
    await client.query(sql);
    logSuccess('Migration tracking table ready');
  } catch (error) {
    logError('Failed to create migration tracking table');
    throw error;
  }
}

async function getExecutedMigrations(client: Client): Promise<Set<string>> {
  try {
    const result = await client.query(
      `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id`
    );
    return new Set(result.rows.map(row => row.migration_name));
  } catch (error) {
    // If table doesn't exist yet, return empty set
    return new Set();
  }
}

async function recordMigration(
  client: Client,
  migrationName: string,
  executionTimeMs: number
): Promise<void> {
  const sql = `
    INSERT INTO ${MIGRATION_TABLE} (migration_name, execution_time_ms)
    VALUES ($1, $2)
    ON CONFLICT (migration_name) DO NOTHING;
  `;

  await client.query(sql, [migrationName, executionTimeMs]);
}

// ============================================================================
// MIGRATION FILE HANDLING
// ============================================================================

interface MigrationFile {
  name: string;
  path: string;
  order: number;
}

function getMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logError(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR);

  // Filter forward migrations only (exclude rollback and test files)
  const migrationFiles = files
    .filter(file =>
      file.endsWith('.sql') &&
      !file.includes('_rollback.sql') &&
      !file.startsWith('test_')
    )
    .map(file => {
      // Extract order number from filename (e.g., "001_..." -> 1)
      const match = file.match(/^(\d+)_/);
      const order = match ? parseInt(match[1], 10) : 999;

      return {
        name: file,
        path: path.join(MIGRATIONS_DIR, file),
        order,
      };
    })
    .sort((a, b) => a.order - b.order);

  return migrationFiles;
}

function readMigrationContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    logError(`Failed to read migration file: ${filePath}`);
    throw error;
  }
}

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

async function executeMigration(
  client: Client,
  migration: MigrationFile,
  dryRun: boolean
): Promise<number> {
  const sql = readMigrationContent(migration.path);

  if (dryRun) {
    logWarning(`${migration.name} (would execute)`);
    return 0;
  }

  logExecuting(`${migration.name} (executing...)`);

  const startTime = Date.now();

  try {
    // Execute migration in a transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const executionTime = Date.now() - startTime;

    // Record migration
    await recordMigration(client, migration.name, executionTime);

    logSuccess(`${migration.name} (${executionTime}ms)`);

    return executionTime;
  } catch (error) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logError('Failed to rollback transaction');
    }

    logError(`Migration failed: ${migration.name}`);
    console.error(error);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runMigrations(dryRun: boolean = false): Promise<void> {
  let client: Client | null = null;
  let exitCode = 0;

  try {
    // Connect to database
    client = await createClient();

    logHeader('🔍 Checking migration status...');

    // Ensure migration tracking table exists
    await ensureMigrationTable(client);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(client);

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    logInfo(`Found ${migrationFiles.length} migration files`);

    // Determine pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.has(migration.name)
    );

    if (pendingMigrations.length === 0) {
      console.log(''); // Blank line
      logSuccess(`All migrations complete! (0 executed, ${migrationFiles.length} skipped)`);
      return;
    }

    // Execute pending migrations
    if (dryRun) {
      logHeader('\n📋 Dry-run mode - showing what would execute:');
    } else {
      logHeader('\n🔄 Executing pending migrations:');
    }

    let totalExecutionTime = 0;
    let executedCount = 0;

    for (const migration of migrationFiles) {
      if (executedMigrations.has(migration.name)) {
        logWarning(`${migration.name} (already executed)`);
      } else {
        const executionTime = await executeMigration(client, migration, dryRun);
        totalExecutionTime += executionTime;
        executedCount++;
      }
    }

    console.log(''); // Blank line

    if (dryRun) {
      logSuccess(`Dry-run complete! Would execute ${executedCount} migrations, ` +
                 `skip ${migrationFiles.length - executedCount}`);
    } else {
      logSuccess(`All migrations complete! (${executedCount} executed, ` +
                 `${migrationFiles.length - executedCount} skipped)`);

      if (totalExecutionTime > 0) {
        logInfo(`Total execution time: ${totalExecutionTime}ms`);
      }
    }

  } catch (error) {
    logError('Migration execution failed');
    console.error(error);
    exitCode = 1;
  } finally {
    // Close database connection
    if (client) {
      try {
        await client.end();
      } catch (error) {
        logWarning('Failed to close database connection gracefully');
      }
    }

    process.exit(exitCode);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

function showHelp(): void {
  console.log(`
Database Migration Runner

Usage:
  npx tsx scripts/run-migrations.ts [options]

Options:
  --dry-run    Show what would execute without running migrations
  --help       Show this help message

Examples:
  npx tsx scripts/run-migrations.ts              # Run pending migrations
  npx tsx scripts/run-migrations.ts --dry-run    # Preview without executing
`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const showHelpFlag = args.includes('--help') || args.includes('-h');

if (showHelpFlag) {
  showHelp();
  process.exit(0);
}

// Load environment variables from .env.local or .env file
try {
  const dotenv = require('dotenv');
  const fs = require('fs');
  const path = require('path');

  // Try .env.local first, then fall back to .env
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envPath = path.join(__dirname, '..', '.env');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config(); // Try default .env
  }
} catch (error) {
  // dotenv is already a dependency, but if it fails, continue anyway
}

// Run migrations
runMigrations(dryRun);
