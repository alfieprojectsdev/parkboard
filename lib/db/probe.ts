// ============================================================================
// DATABASE PROBE UTILITY
// ============================================================================
// Detects database type, version, capabilities, and configuration
// Validates that required extensions and features are available
// Generates diagnostic report for troubleshooting
//
// Usage:
//   const report = await probeDatabase()
//   console.log(report)
// ============================================================================

import { getConnection, getDatabaseType, type DatabaseType } from './connection'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DatabaseProbeReport {
  // Connection info
  type: DatabaseType
  connected: boolean
  connectionTime: number // milliseconds

  // Database info
  version?: string
  isSupabase: boolean
  isNeon: boolean
  isLocal: boolean

  // Required features
  extensions: {
    uuid_ossp: boolean    // For UUID generation
    pgcrypto: boolean     // For cryptographic functions (if needed)
  }

  // Tables check
  tables: {
    users: boolean
    parking_slots: boolean
  }

  // RLS status
  rls: {
    enabled: boolean
    policies: {
      users_select?: boolean
      users_update?: boolean
      slots_select?: boolean
      slots_insert?: boolean
      slots_update?: boolean
      slots_delete?: boolean
    }
  }

  // Performance indicators
  performance: {
    indexCount: number
    indexesExist: string[]
  }

  // Overall status
  ready: boolean
  errors: string[]
  warnings: string[]
}

// ============================================================================
// PROBE FUNCTIONS
// ============================================================================

/**
 * Probes the database and generates a comprehensive report
 * Non-blocking - fails gracefully if database is not accessible
 */
export async function probeDatabase(): Promise<DatabaseProbeReport> {
  const startTime = Date.now()
  const type = getDatabaseType()

  const report: DatabaseProbeReport = {
    type,
    connected: false,
    connectionTime: 0,
    isSupabase: type === 'supabase',
    isNeon: type === 'neon',
    isLocal: type === 'local',
    extensions: {
      uuid_ossp: false,
      pgcrypto: false,
    },
    tables: {
      users: false,
      parking_slots: false,
    },
    rls: {
      enabled: false,
      policies: {},
    },
    performance: {
      indexCount: 0,
      indexesExist: [],
    },
    ready: false,
    errors: [],
    warnings: [],
  }

  try {
    // Test connection
    const db = await getConnection()
    const connectionTime = Date.now() - startTime
    report.connectionTime = connectionTime

    // Simple connectivity test
    const testResult = await db.query('SELECT 1 as test')
    if (testResult.rows[0]?.test === 1) {
      report.connected = true
    } else {
      report.errors.push('Connection test failed: unexpected result')
      return report
    }

    // Get database version
    const versionResult = await db.query('SELECT version() as version')
    if (versionResult.rows[0]) {
      report.version = versionResult.rows[0].version as string | undefined
    }

    // Check extensions
    const extensionsResult = await db.query(`
      SELECT extname
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `)

    extensionsResult.rows.forEach((row: Record<string, unknown>) => {
      if ((row.extname as string) === 'uuid-ossp') report.extensions.uuid_ossp = true
      if ((row.extname as string) === 'pgcrypto') report.extensions.pgcrypto = true
    })

    // Check tables exist
    const tablesResult = await db.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'parking_slots')
    `)

    tablesResult.rows.forEach((row: Record<string, unknown>) => {
      if ((row.tablename as string) === 'users') report.tables.users = true
      if ((row.tablename as string) === 'parking_slots') report.tables.parking_slots = true
    })

    // Check RLS is enabled
    const rlsResult = await db.query(`
      SELECT
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'parking_slots')
    `)

    const rlsEnabled = rlsResult.rows.every((row: Record<string, unknown>) => (row.rowsecurity as boolean) === true)
    report.rls.enabled = rlsEnabled

    if (!rlsEnabled) {
      report.warnings.push('Row Level Security (RLS) is not enabled on all tables')
    }

    // Check RLS policies exist
    const policiesResult = await db.query(`
      SELECT
        tablename,
        policyname
      FROM pg_policies
      WHERE tablename IN ('users', 'parking_slots')
    `)

    policiesResult.rows.forEach((row: Record<string, unknown>) => {
      const policyname = row.policyname as string
      const key = policyname as keyof typeof report.rls.policies
      report.rls.policies[key] = true
    })

    // Check indexes
    const indexesResult = await db.query(`
      SELECT
        indexname,
        tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'parking_slots')
    `)

    report.performance.indexCount = indexesResult.rows.length
    report.performance.indexesExist = indexesResult.rows.map((row: Record<string, unknown>) => row.indexname as string)

    // Validate overall readiness
    report.ready =
      report.connected &&
      report.tables.users &&
      report.tables.parking_slots &&
      report.rls.enabled &&
      report.extensions.uuid_ossp &&
      report.performance.indexCount > 0

    if (!report.ready) {
      if (!report.tables.users || !report.tables.parking_slots) {
        report.errors.push('Required tables are missing. Run migration: 001_core_schema.sql')
      }
      if (!report.extensions.uuid_ossp) {
        report.errors.push('Required extension uuid-ossp is missing. Run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
      }
      if (report.performance.indexCount === 0) {
        report.warnings.push('No indexes found. Performance may be degraded.')
      }
    }

  } catch (error) {
    const err = error as Error
    report.errors.push(`Database probe failed: ${err.message || 'Unknown error'}`)
    report.connected = false
  }

  return report
}

/**
 * Formats a probe report as human-readable text
 * Useful for logging and diagnostics
 */
export function formatProbeReport(report: DatabaseProbeReport): string {
  const lines: string[] = []

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('DATABASE PROBE REPORT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')

  // Connection info
  lines.push('CONNECTION:')
  lines.push(`  Type: ${report.type}`)
  lines.push(`  Status: ${report.connected ? '✅ Connected' : '❌ Disconnected'}`)
  lines.push(`  Connection Time: ${report.connectionTime}ms`)
  if (report.version) {
    lines.push(`  Version: ${report.version.split(',')[0]}`) // First part only
  }
  lines.push('')

  // Tables
  lines.push('TABLES:')
  lines.push(`  users: ${report.tables.users ? '✅' : '❌'}`)
  lines.push(`  parking_slots: ${report.tables.parking_slots ? '✅' : '❌'}`)
  lines.push('')

  // Extensions
  lines.push('EXTENSIONS:')
  lines.push(`  uuid-ossp: ${report.extensions.uuid_ossp ? '✅' : '❌'}`)
  lines.push(`  pgcrypto: ${report.extensions.pgcrypto ? '✅' : '⚠️  (optional)'}`)
  lines.push('')

  // RLS
  lines.push('ROW LEVEL SECURITY:')
  lines.push(`  Enabled: ${report.rls.enabled ? '✅' : '❌'}`)
  const policyCount = Object.keys(report.rls.policies).length
  lines.push(`  Policies: ${policyCount} found`)
  if (policyCount > 0) {
    Object.entries(report.rls.policies).forEach(([name, exists]) => {
      lines.push(`    ${name}: ${exists ? '✅' : '❌'}`)
    })
  }
  lines.push('')

  // Performance
  lines.push('PERFORMANCE:')
  lines.push(`  Indexes: ${report.performance.indexCount}`)
  if (report.performance.indexesExist.length > 0 && report.performance.indexCount <= 10) {
    report.performance.indexesExist.forEach(index => {
      lines.push(`    - ${index}`)
    })
  }
  lines.push('')

  // Status
  lines.push('OVERALL STATUS:')
  lines.push(`  Ready: ${report.ready ? '✅ YES' : '❌ NO'}`)
  lines.push('')

  // Errors
  if (report.errors.length > 0) {
    lines.push('ERRORS:')
    report.errors.forEach(error => {
      lines.push(`  ❌ ${error}`)
    })
    lines.push('')
  }

  // Warnings
  if (report.warnings.length > 0) {
    lines.push('WARNINGS:')
    report.warnings.forEach(warning => {
      lines.push(`  ⚠️  ${warning}`)
    })
    lines.push('')
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return lines.join('\n')
}

/**
 * Quick check if database is ready for application use
 * Returns true if all required features are available
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    const report = await probeDatabase()
    return report.ready
  } catch {
    return false
  }
}

/**
 * Gets a summary of database status (for health checks)
 */
export async function getDatabaseStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
}> {
  try {
    const report = await probeDatabase()

    if (report.ready) {
      return {
        status: 'healthy',
        message: `Connected to ${report.type} database (${report.connectionTime}ms)`
      }
    }

    if (report.connected && (report.tables.users || report.tables.parking_slots)) {
      return {
        status: 'degraded',
        message: `Database connected but missing features: ${report.errors.join(', ')}`
      }
    }

    return {
      status: 'unhealthy',
      message: report.errors[0] || 'Database connection failed'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: (error as Error).message
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const probeModule = {
  probeDatabase,
  formatProbeReport,
  isDatabaseReady,
  getDatabaseStatus,
}

export default probeModule
