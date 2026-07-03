import { loadEnvConfig } from '@next/env'

/**
 * Resolve TEST_DATABASE_URL for the integration harness.
 *
 * Local: `.env.test.local` is loaded via @next/env (Vitest sets NODE_ENV=test, so .env.local is
 * intentionally skipped — the test DB is opt-in, never inherited from dev). CI supplies the value
 * via the job/step env, which @next/env does not override.
 *
 * Hard-fails rather than risk truncating the wrong database — this harness resets tables between
 * every test, so a misconfigured URL pointed at the dev/seed DB would wipe it.
 */
export function resolveTestDatabaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. The integration suite needs a REAL, throwaway Postgres.\n' +
        '  Local: create a *_test database and put TEST_DATABASE_URL in .env.test.local (see .env.test.example).\n' +
        '  CI: the postgres services container supplies it.',
    )
  }

  // Safety rails — never point the truncating harness at the dev/seed DB.
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must not equal DATABASE_URL — refusing to run against the dev DB.')
  }

  let dbName: string
  try {
    dbName = new URL(url).pathname.replace(/^\//, '')
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid connection string.')
  }
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run: TEST_DATABASE_URL database name "${dbName}" must end in "_test" (harness safety rail).`,
    )
  }

  return url
}
