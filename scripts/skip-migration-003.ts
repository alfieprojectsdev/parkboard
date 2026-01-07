import { Pool } from 'pg'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const connectionString = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL

if (!connectionString) {
  console.error('No DATABASE_URL or NEON_CONNECTION_STRING found')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function markMigrationSkipped() {
  try {
    const result = await pool.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING RETURNING *',
      ['003_community_rls_policies_idempotent.sql']
    )

    console.log('✓ Migration 003 marked as skipped')
    if (result.rowCount && result.rowCount > 0) {
      console.log('  Inserted new record')
    } else {
      console.log('  Already marked (no changes)')
    }
  } catch (error) {
    console.error('✗ Failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

markMigrationSkipped()
