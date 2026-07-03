import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { resolveTestDatabaseUrl } from './test-db-url'

/**
 * Vitest globalSetup — runs ONCE before the integration project.
 *
 * Builds the test schema by running the REAL migrations (lib/db/migrations, via the journal) — the
 * same artifacts production applies, NOT drizzle-kit push. This incidentally proves the migrations
 * apply cleanly on a fresh database (the Module-8 insurance). Uses its own short-lived client; the
 * per-worker `setup.ts` handles the app singleton and truncation.
 */
export default async function setup() {
  const url = resolveTestDatabaseUrl()
  // Silence postgres NOTICEs (e.g. "schema drizzle already exists") — harmless chatter when the
  // local test DB was migrated on a prior run; CI's fresh DB emits none.
  const client = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await migrate(drizzle(client), { migrationsFolder: 'lib/db/migrations' })
  } finally {
    await client.end()
  }
}
