// Stand-in for lib/db/client.ts in tests (see the alias in vitest.config.mts).
// PGlite is Postgres compiled to WASM; the real migrations are applied, so
// constraints and triggers behave as on Neon. One connection, so access is
// serialised like a one-connection pg Pool.
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { QueryResult, QueryResultRow } from 'pg'

const dir = path.join(process.cwd(), 'db', 'migrations')

export const pglite = new PGlite({ parsers: { 20: (v: string) => v, 1700: (v: string) => v } })

const ready = (async () => {
  for (const file of readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort()) {
    await pglite.exec(readFileSync(path.join(dir, file), 'utf8'))
  }
})()

let queue: Promise<void> = Promise.resolve()
function lock(): Promise<() => void> {
  let release!: () => void
  const next = new Promise<void>((resolve) => (release = resolve))
  const acquired = queue.then(() => release)
  queue = queue.then(() => next)
  return acquired
}

async function run<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  await ready
  const result = await pglite.query<T>(text, params as unknown[])
  return {
    rows: result.rows,
    rowCount: result.affectedRows ? result.affectedRows : result.rows.length,
    command: '',
    oid: 0,
    fields: [],
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  const release = await lock()
  try {
    return await run<T>(text, params)
  } finally {
    release()
  }
}

export async function getClient() {
  const release = await lock()
  return { query: run, release }
}

export function getPool() {
  return { query, connect: getClient }
}

export async function resetDb() {
  await query('TRUNCATE feedback, rate_limits, parking_slots, user_profiles CASCADE')
}
