# Studio Portal

Client project portal for The Scaler Studio. Next.js (App Router) + Postgres.

See [SPECS.md](SPECS.md) for what to build and [CLAUDE.md](CLAUDE.md) for how to work in this repo.

## Getting started

1. Clone the repo and install dependencies (Node version is pinned in `.nvmrc`):
   ```
   pnpm install
   ```
2. Set up your environment — see [Environment setup](#environment-setup) below.
3. Apply migrations and load demo data — see [Database](#database) below.
4. `pnpm dev` — runs at `http://localhost:3000`.

## Prerequisites

- **`DATABASE_URL` must be exported in your shell environment** (not just in
  `.env.local`) for the Postgres MCP to load correctly at Claude Code startup.
  The `.mcp.json` in this repo reads `${DATABASE_URL}` from your shell, so add it
  to your shell profile — e.g. `export DATABASE_URL=postgresql://...`.

## Environment setup

Copy `.env.example` to `.env.local` and fill in each value. The app validates these
at boot with a zod schema (`lib/env.ts`) and fails fast with a clear message if
anything is missing or malformed — that schema is the source of truth if this table
ever drifts out of date.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string (`postgresql://...`). |
| `BETTER_AUTH_SECRET` | Yes | Signs/encrypts session tokens. Min 32 chars — generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Yes | Public origin used to build magic-link callback URLs (no trailing slash), e.g. `http://localhost:3000` locally. |
| `RESEND_API_KEY` | Only in production | See the dev-vs-prod email fork below. |
| `EMAIL_FROM` | Yes | Sender address, e.g. `Studio Portal <onboarding@resend.dev>`. |

**The dev-vs-prod email fork**: sign-in is magic-link only (no passwords). In dev
(`NODE_ENV !== 'production'`), the link is logged to your terminal instead of emailed
(`lib/email/index.ts`) — so you can sign in without a real `RESEND_API_KEY` or spamming
an inbox. Only a production boot (`NODE_ENV=production`) actually sends via Resend, and
the env schema enforces `RESEND_API_KEY` being set in that case.

Running the integration test suite is a separate, deliberately isolated env setup — see
[Testing](#testing) below.

## Database

- `pnpm db:migrate` — applies the schema (Drizzle migrations under `lib/db/migrations`).
- `pnpm db:seed` — loads realistic demo data (a studio with two admins, four client
  projects, milestones, comments, approvals). **This is destructive**: it truncates
  every table before reinserting, so never run it against a database holding real data.
- First admin account: sign-up is invite-only, so there's no self-serve way to become an
  admin. Run `pnpm bootstrap:admin <email> [name]` — a non-destructive upsert-by-email
  that grants `role: 'admin'` without touching anything else. This is the only path to a
  first admin in any environment, including production.

## Run it

```
pnpm dev
```

Then sign in at `/login` with the email you bootstrapped as admin — the magic link
prints to your terminal in dev.

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

`pnpm lint && pnpm typecheck` should also pass before considering any change done — both
run in CI (`.github/workflows/ci.yml`) alongside the test suite and `pnpm build`; a red
run blocks merge.

## Deploy

Hosted on [Railway](https://railway.app) — two environments, **staging** and
**production**, each with its own Postgres plugin and env vars set directly in Railway's
dashboard/CLI (there's no `railway.json` or config committed in this repo; it all lives
on Railway's side).

- **Env vars**: same variables as the [Environment setup](#environment-setup) table
  above, set per-environment in Railway. All of them are required in a production boot —
  the same zod schema in `lib/env.ts` that validates locally also gates the deployed app,
  so a missing/malformed var fails the boot with a clear error rather than running
  half-configured.
- **Running one-off commands against a hosted database** (migrations, `bootstrap:admin`)
  from your own machine: use `DATABASE_PUBLIC_URL`, not the service's own internal
  `DATABASE_URL`. `railway run --service <name> --environment <env> -- <cmd>` injects that
  environment's vars into your local process, but it does not tunnel into Railway's
  private network — the internal `DATABASE_URL` hostname is unreachable from outside
  Railway, while `DATABASE_PUBLIC_URL` (the `*.proxy.rlwy.net` address) is reachable. For
  example:
  ```
  railway run --service Postgres --environment staging -- bash -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" pnpm db:migrate'
  ```
- **First admin in a new environment**: same as local — `pnpm bootstrap:admin
  <email> [name]` run against that environment's database (via `DATABASE_PUBLIC_URL` as
  above). There is no other way to create or promote an admin.
- **Pre-real-client checklist — read before inviting anyone who isn't the account
  owner.** Resend's sandbox sender (`onboarding@resend.dev`) only delivers to the
  account owner's own verified email address. Staging is meant to stay on the sandbox
  sender permanently — it makes staging physically unable to email a real client even by
  accident. **Production cannot ship this way**: since sign-in is magic-link only, a
  production sender still on the sandbox means an invited client's sign-in email silently
  never arrives (the request-link route always returns a uniform success response, by
  design, so nothing surfaces the failure). Before inviting any real client, verify a real
  sending domain in Resend (SPF/DKIM DNS records + dashboard confirmation), then confirm
  it works by inviting one real non-owner test recipient. See SPECS.md's decisions log for
  the full writeup of this gate.

## Known gaps

Admin CRUD has an incomplete UI surface: `DELETE /api/projects/:slug` and other
admin-only API routes exist and are tested, but the admin screens don't currently expose
a delete-project or delete-user action anywhere. If you're looking for that button, it
isn't missing by accident — it's a tracked, deferred gap. See SPECS.md's decisions log for
the full context.
