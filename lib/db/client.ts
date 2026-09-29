// lib/db/client.ts
// ============================================================================
// SHARED NEON / POSTGRES CLIENT
// ============================================================================
// Single pg Pool reused by every API route and by NextAuth (auth.ts).
// Node runtime only; proxy.ts must not import this (it uses auth.config.ts).
//
// Tests replace this module with test/helpers/test-db.ts (PGlite) via the
// alias in vitest.config.mts.
// ============================================================================

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

let pool: Pool | null = null

/** Lazily-created singleton Pool backed by DATABASE_URL. */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // TLS comes from the connection string: Neon URLs carry sslmode=require,
    // which verifies the certificate. (This used to pass
    // ssl.rejectUnauthorized=false, which turned verification off.)
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000, // Neon can take a few seconds to wake
    })
    pool.on('error', (err) => console.error('Idle database client error:', err.message))
  }
  return pool
}

/**
 * Run a parameterized query against the shared pool.
 * Always use $1, $2, … placeholders; never interpolate user input.
 */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never[])
}

/** Check out a client for a transaction. Always release() it. */
export function getClient(): Promise<PoolClient> {
  return getPool().connect()
}
