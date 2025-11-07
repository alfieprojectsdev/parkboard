// ============================================================================
// DATABASE CONNECTION ABSTRACTION LAYER
// ============================================================================
// Platform-independent database connection that auto-detects:
// - Supabase (via NEXT_PUBLIC_SUPABASE_URL)
// - Neon (via DATABASE_URL containing neon.tech)
// - Local PostgreSQL (via DATABASE_URL pointing to localhost)
//
// Design Philosophy:
// - Simple interface for common operations
// - No breaking changes to existing code until explicitly migrated
// - TypeScript strict mode compliant
// - Auto-detection based on environment variables
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Pool, PoolClient, QueryResult } from 'pg'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DatabaseType = 'supabase' | 'neon' | 'local'

export interface DatabaseConnection {
  type: DatabaseType
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>
  close: () => Promise<void>
}

export interface QueryOptions {
  returnFirst?: boolean // Return first row only
  timeout?: number // Query timeout in ms
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detects which database type to use based on environment variables
 *
 * Priority order (ROOT APPROVED 2025-10-31):
 * 1. DATABASE_TARGET (explicit choice for beta testing - "local" | "neon" | "supabase")
 * 2. Supabase (if NEXT_PUBLIC_SUPABASE_URL present)
 * 3. Neon (if DATABASE_URL contains "neon.tech")
 * 4. Local PostgreSQL (if DATABASE_URL or DB_HOST present)
 *
 * The DATABASE_TARGET override allows Sister Elena to easily switch databases
 * for beta testing without code changes (just update .env.local).
 */
export function getDatabaseType(): DatabaseType {
  // Check for explicit DATABASE_TARGET override (beta testing feature)
  const target = process.env.DATABASE_TARGET
  if (target) {
    const validTargets: DatabaseType[] = ['local', 'neon', 'supabase']
    if (validTargets.includes(target as DatabaseType)) {
      return target as DatabaseType
    } else {
      console.warn(
        `Invalid DATABASE_TARGET="${target}". Must be "local", "neon", or "supabase". ` +
        `Falling back to auto-detection.`
      )
    }
  }

  // Auto-detection (original behavior)

  // Check for Supabase (public env var indicates Supabase)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return 'supabase'
  }

  // Check for Neon or local Postgres (via DATABASE_URL)
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    // Detect Neon by checking if URL contains neon.tech
    if (databaseUrl.includes('neon.tech')) {
      return 'neon'
    }
    // DATABASE_URL present but not Neon = local Postgres
    return 'local'
  }

  // Check for individual DB_* environment variables (local Postgres)
  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME) {
    return 'local'
  }

  // No database configuration found
  throw new Error(
    'No database connection configured. Set either:\n' +
    '  - DATABASE_TARGET=local|neon|supabase (explicit choice, recommended for beta testing)\n' +
    '  - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (for Supabase)\n' +
    '  - DATABASE_URL (for Neon or local PostgreSQL)\n' +
    '  - DB_HOST + DB_USER + DB_NAME + DB_PASSWORD (for local PostgreSQL)'
  )
}

/**
 * Validates environment variables for detected database type
 * Throws descriptive error if required vars are missing
 */
export function validateEnvironment(type: DatabaseType): void {
  if (type === 'supabase') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
    }
  } else {
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing required environment variable: DATABASE_URL')
    }
  }
}

// ============================================================================
// CONNECTION POOLING
// ============================================================================

// Global connection pools (singleton pattern)
let supabasePool: ReturnType<typeof createSupabaseClient> | null = null
let postgresPool: Pool | null = null

/**
 * Gets or creates Supabase client (singleton)
 * Uses service role key for server-side operations
 */
function getSupabaseClient() {
  if (!supabasePool) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    supabasePool = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return supabasePool
}

/**
 * Gets or creates PostgreSQL connection pool (singleton)
 * Supports Neon (NEON_CONNECTION_STRING or DATABASE_URL) and local PostgreSQL (DATABASE_URL or DB_* vars)
 */
function getPostgresPool() {
  if (!postgresPool) {
    // Priority: NEON_CONNECTION_STRING > DATABASE_URL > DB_* variables
    let connectionString = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL

    // If neither connection string present, build from individual DB_* variables
    if (!connectionString) {
      const dbUser = process.env.DB_USER || 'postgres'
      const dbPassword = process.env.DB_PASSWORD || ''
      const dbHost = process.env.DB_HOST || 'localhost'
      const dbPort = process.env.DB_PORT || '5432'
      const dbName = process.env.DB_NAME || 'parkboard_db'

      connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`
    }

    const isNeon = connectionString.includes('neon.tech')

    postgresPool = new Pool({
      connectionString,
      ssl: isNeon
        ? { rejectUnauthorized: false } // Neon requires SSL
        : undefined, // Local doesn't need SSL
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    // Handle pool errors
    postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err)
    })
  }

  return postgresPool
}

// ============================================================================
// CONNECTION INTERFACE IMPLEMENTATIONS
// ============================================================================

/**
 * Creates a Supabase-backed database connection
 * Uses Supabase's postgrest API for queries
 *
 * Note: For complex SQL operations, consider using PostgreSQL connection directly
 * or creating specific RPC functions in Supabase
 */
async function createSupabaseConnection(): Promise<DatabaseConnection> {
  const client = getSupabaseClient()

  return {
    type: 'supabase',

    query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
      // For Supabase, we execute raw SQL via rpc
      // This requires the execute_sql function to exist in Supabase
      // See: app/db/migrations/supabase_helpers/execute_sql_function.sql

      try {
        const { data, error } = await client.rpc('execute_sql', {
          query_text: text,
          query_params: params || []
        })

        if (error) {
          // If execute_sql doesn't exist yet, provide helpful error message
          if (error.message.includes('function execute_sql')) {
            throw new Error(
              'Supabase helper function not installed. ' +
              'Run: app/db/migrations/supabase_helpers/execute_sql_function.sql ' +
              'Or switch to direct PostgreSQL connection using DATABASE_URL'
            )
          }
          throw new Error(`Supabase query error: ${error.message}`)
        }

        // Convert Supabase response to pg QueryResult format
        return {
          rows: (data as any) || [],
          rowCount: Array.isArray(data) ? data.length : 0,
          command: '',
          oid: 0,
          fields: []
        } as QueryResult<T>
      } catch (error) {
        const err = error as Error
        throw new Error(`Supabase query failed: ${err.message}`)
      }
    },

    close: async () => {
      // Supabase client doesn't need explicit closing
      return Promise.resolve()
    }
  }
}

/**
 * Creates a PostgreSQL-backed database connection (Neon or local)
 * Uses standard pg library with connection pooling
 */
async function createPostgresConnection(): Promise<DatabaseConnection> {
  const pool = getPostgresPool()
  const type = getDatabaseType()

  return {
    type,

    query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
      try {
        const result = await pool.query<T>(text, params)
        return result
      } catch (error) {
        const err = error as Error
        throw new Error(`PostgreSQL query error: ${err.message}`)
      }
    },

    close: async () => {
      if (postgresPool) {
        await postgresPool.end()
        postgresPool = null
      }
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Gets a database connection based on environment configuration
 * Auto-detects Supabase, Neon, or local PostgreSQL
 *
 * @returns DatabaseConnection interface for executing queries
 *
 * @example
 * ```typescript
 * const db = await getConnection()
 * const result = await db.query('SELECT * FROM users WHERE id = $1', [userId])
 * console.log(result.rows)
 * ```
 */
export async function getConnection(): Promise<DatabaseConnection> {
  const type = getDatabaseType()
  validateEnvironment(type)

  if (type === 'supabase') {
    return createSupabaseConnection()
  } else {
    return createPostgresConnection()
  }
}

/**
 * Executes a query and returns results
 * Convenience wrapper around getConnection().query()
 *
 * @param text SQL query string (use $1, $2 for parameters)
 * @param params Array of parameter values
 * @returns Query result with rows and metadata
 *
 * @example
 * ```typescript
 * const result = await query('SELECT * FROM users WHERE email = $1', ['user@example.com'])
 * console.log(result.rows[0])
 * ```
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = await getConnection()
  return db.query<T>(text, params)
}

/**
 * Executes a query and returns the first row
 * Returns null if no rows found
 *
 * @example
 * ```typescript
 * const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId])
 * if (user) {
 *   console.log(user.name)
 * }
 * ```
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params)
  return result.rows[0] || null
}

/**
 * Closes all database connections
 * Should be called on application shutdown
 */
export async function closeConnections(): Promise<void> {
  if (postgresPool) {
    await postgresPool.end()
    postgresPool = null
  }

  // Supabase client doesn't need explicit closing
  supabasePool = null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Executes a function within a transaction
 * Automatically commits on success, rolls back on error
 *
 * Note: Currently only supports PostgreSQL/Neon
 * Supabase transactions should use Supabase client directly
 *
 * @example
 * ```typescript
 * await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users (...) VALUES (...)')
 *   await client.query('INSERT INTO parking_slots (...) VALUES (...)')
 * })
 * ```
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const type = getDatabaseType()

  if (type === 'supabase') {
    throw new Error(
      'Transactions not yet implemented for Supabase. ' +
      'Use Supabase client directly for transactional operations.'
    )
  }

  const pool = getPostgresPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Tests database connection
 * Returns true if connection successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as test')
    return result.rows[0]?.test === 1
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getConnection,
  getDatabaseType,
  query,
  queryOne,
  closeConnections,
  withTransaction,
  testConnection,
  validateEnvironment
}
