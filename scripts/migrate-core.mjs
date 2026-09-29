// Applies pending SQL migrations from db/migrations/. Used by
// scripts/migrate.mjs (the command Vercel's build runs) and by
// test/migrate.test.ts, which passes an in-memory PGlite client.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

/**
 * Runs each pending file in filename order, in its own transaction, and
 * records it in schema_migrations. Stops at the first failure. `client` needs
 * node-pg's query(text, params?), which runs a multi-statement file in one
 * call. Returns false if a migration failed or the database was refused.
 *
 * Refuses a database that still has the v1 marketplace tables: use a fresh
 * Neon branch, or run db/reset_v1_tables.sql first if the old data is
 * disposable. On Vercel that refusal fails the build, so v2 never goes live
 * against the v1 schema.
 */
export async function migrate(
  client,
  { dir = MIGRATIONS_DIR, statusOnly = false, log = console.log, logError = console.error } = {}
) {
  const v1 = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('bookings', 'communities')
    UNION ALL
    SELECT 1 FROM information_schema.columns WHERE table_name = 'parking_slots' AND column_name = 'slot_number'`);
  if (v1.rows.length > 0) {
    logError(
      'This database still has the v1 marketplace schema (bookings / communities / slot_number).\n' +
        'Use a fresh Neon branch, or if its data is disposable run db/reset_v1_tables.sql first.'
    );
    return false;
  }

  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));

  for (const file of readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort()) {
    if (applied.has(file)) {
      log(`  applied  ${file}`);
      continue;
    }
    if (statusOnly) {
      log(`  pending  ${file}`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`  ran      ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logError(`  FAILED   ${file}: ${err.message}`);
      return false;
    }
  }
  return true;
}
