// lib/db/client.ts
// ============================================================================
// SHARED NEON / POSTGRES CLIENT
// ============================================================================
// Single pg Pool reused by every API route and by NextAuth (auth.ts).
// v2 is Neon-only — there is no Supabase client anywhere in shipped code.
//
// Node runtime only. Do NOT import this from middleware or any edge route
// (pg is not edge-compatible — middleware uses lib/auth/auth.config.ts).
// ============================================================================

import { Pool, type QueryResult, type QueryResultRow } from 'pg'

let pool: Pool | null = null

/** Lazily-created singleton Pool backed by DATABASE_URL / NEON_CONNECTION_STRING. */
export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL or NEON_CONNECTION_STRING environment variable is required'
      )
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Neon
      max: 10,
    })
  }
  return pool
}

/**
 * Run a parameterized query against the shared pool.
 * Always use $1, $2, … placeholders — never string-interpolate user input.
 */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never[])
}
