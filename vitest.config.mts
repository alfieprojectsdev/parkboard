import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // PGlite boots a WASM Postgres per test file.
    testTimeout: 20000,
    hookTimeout: 30000,
    maxWorkers: 2,
  },
  resolve: {
    alias: [
      { find: /^@\/lib\/db\/client$/, replacement: path.resolve(__dirname, 'test/helpers/test-db.ts') },
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
})
