import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    // Two projects run under one `pnpm test`:
    //   unit        — fast, DB-mocked; unchanged from before the harness pass.
    //   integration — real ephemeral Postgres (see tests/integration/*), needs TEST_DATABASE_URL.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'tests/integration/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          globalSetup: ['./tests/integration/global-setup.ts'],
          setupFiles: ['./tests/integration/setup.ts'],
          include: ['tests/integration/**/*.test.ts'],
        },
      },
    ],
  },
})
