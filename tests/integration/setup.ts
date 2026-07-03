import { afterAll, beforeEach } from 'vitest'
import { resolveTestDatabaseUrl } from './test-db-url'

// Point the app's db singleton (lib/db/index.ts) at the throwaway test DB BEFORE any app module
// (route -> lib/db -> lib/env) is imported by a test file. setupFiles run before test modules, and
// this file imports no app code at top level, so this assignment lands first; `db` is reached via
// dynamic import in the hooks below (after the env is set).
const TEST_URL = resolveTestDatabaseUrl()
process.env.DATABASE_URL = TEST_URL
// lib/env validates ALL required vars at import. Auth is mocked in the integration tests, so these
// are schema-satisfying dummies (mirrors tests/setup.ts); only DATABASE_URL is real.
process.env.BETTER_AUTH_SECRET ||= 'test-secret-that-is-at-least-32-characters-long'
process.env.BETTER_AUTH_URL ||= 'http://localhost:3000'
process.env.EMAIL_FROM ||= 'test@example.com'

// Child-before-parent is irrelevant under CASCADE, but listed leaf-first for readability.
// __drizzle_migrations is intentionally excluded — truncating it would discard migration state.
const TABLES = [
  'comments',
  'approvals',
  'milestones',
  'project_members',
  'projects',
  'sessions',
  'accounts',
  'verifications',
  'users',
]

// Truncate (not transaction-rollback): the routes issue queries through the pooled singleton, so a
// test-owned transaction on one connection could not isolate the handlers' pooled queries. For a
// leak proof, a row bled through from a prior test could produce a false pass — isolation wins.
beforeEach(async () => {
  const { db } = await import('@/lib/db')
  await db.$client.unsafe(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
  const { db } = await import('@/lib/db')
  await db.$client.end({ timeout: 5 })
})
