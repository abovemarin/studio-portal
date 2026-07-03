# Studio Portal

Client project portal for The Scaler Studio. Next.js (App Router) + Postgres.

See [SPECS.md](SPECS.md) for what to build and [CLAUDE.md](CLAUDE.md) for how to work in this repo.

## Prerequisites

- **`DATABASE_URL` must be exported in your shell environment** (not just in
  `.env.local`) for the Postgres MCP to load correctly at Claude Code startup.
  The `.mcp.json` in this repo reads `${DATABASE_URL}` from your shell, so add it
  to your shell profile — e.g. `export DATABASE_URL=postgresql://...`.

## Testing

`pnpm test` runs two Vitest projects: `unit` (fast, DB-mocked) and `integration`
(real Postgres). The integration suite needs a **throwaway** database whose name ends
in `_test` — it truncates all tables between tests, so it must never be your dev/seed DB.

1. Create the test database on your local Postgres, e.g.:
   `createdb studio_portal_test` (or `CREATE DATABASE studio_portal_test;`).
2. Copy `.env.test.example` to `.env.test.local` (gitignored) and set
   `TEST_DATABASE_URL` to that database.
3. Run `pnpm test`. The harness applies the real migrations to the test DB on first run.

A safety rail refuses to run if `TEST_DATABASE_URL` is unset, equals `DATABASE_URL`, or
its database name doesn't end in `_test`. In CI, a `postgres` services container supplies
`TEST_DATABASE_URL` — see `.github/workflows/ci.yml`.
