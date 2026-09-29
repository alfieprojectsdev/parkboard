#!/usr/bin/env node
// Apply pending SQL migrations from db/migrations/ in filename order.
//
//   DATABASE_URL=postgres://... npm run db:migrate            apply pending
//   DATABASE_URL=postgres://... npm run db:migrate -- --status
//   node scripts/migrate.mjs --vercel                     used by `npm run build`
//
// With --vercel it only runs when Vercel is building Production
// (VERCEL_ENV=production), so merging to main applies pending migrations
// before the new code goes live. If a migration fails, the build fails and
// the previous deployment stays up. Local, CI and preview builds skip it, so
// a pull request can never change the production database.
//
// Refuses to run against a database that still has the v1 marketplace
// tables: point DATABASE_URL at a fresh Neon branch, or run
// db/reset_v1_tables.sql first if the old data is disposable. On Vercel that
// refusal fails the build, so v2 never goes live against the v1 schema.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const statusOnly = process.argv.includes('--status');

if (process.argv.includes('--vercel') && process.env.VERCEL_ENV !== 'production') {
  console.log('migrate: skipped (not a Vercel production build)');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const v1 = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('bookings', 'communities')
    UNION ALL
    SELECT 1 FROM information_schema.columns WHERE table_name = 'parking_slots' AND column_name = 'slot_number'`);
  if (v1.rows.length > 0) {
    console.error(
      'This database still has the v1 marketplace schema (bookings / communities / slot_number).\n' +
        'Use a fresh Neon branch, or if its data is disposable run db/reset_v1_tables.sql first.'
    );
    process.exit(1);
  }

  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));

  for (const file of readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort()) {
    if (applied.has(file)) {
      console.log(`  applied  ${file}`);
      continue;
    }
    if (statusOnly) {
      console.log(`  pending  ${file}`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ran      ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FAILED   ${file}: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
