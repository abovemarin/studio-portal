# CLAUDE.md

Operating instructions for working in this repo. Read before making changes.

## What this is

Studio Portal — a client project portal for The Scaler Studio.
Next.js (App Router) + Postgres. See SPECS.md for the full spec; this file is *how*
to work, SPECS.md is *what* to build.

## Commands

(Keep this list accurate. An inaccurate CLAUDE.md is worse than a short one — the
agent runs these confidently and they fail. Update the moment tooling changes.)

- `pnpm dev` — run locally
- `pnpm build` — production build
- `pnpm lint && pnpm typecheck` — must pass before any work is "done"
- `pnpm db:generate` — generate migration from schema changes (Drizzle)
- `pnpm db:migrate` — apply pending migrations
- `pnpm db:studio` — open Drizzle Studio DB browser

Commands added in later sessions (not wired yet):
- `pnpm db:seed` — load realistic demo data (session 2.3)
- `pnpm test` — run tests (session 3+)

## Hard constraints

- **Surgical changes only.** Touch only the code relevant to the current task.
  Do not refactor, reformat, rename, or "tidy" unrelated code. If you spot
  something worth changing elsewhere, mention it — don't do it.
- **Stay in scope.** One session = one section of the build order in SESSIONS.md.
  If a task pulls you toward another section, stop and flag it.
- **Never edit a migration after it has been applied.** Write a new one. In
  production, migrations are forward-only — never down-migrate or edit; ship a new
  forward migration to fix a mistake.
- **Validate config at boot.** Required env vars are parsed by a zod schema at
  startup; the app fails fast with a clear message if any are missing/malformed.
  Never read raw `process.env` deep in the code.
- **All database access goes through the repo/data layer** (`/lib/db/*`), never
  raw queries scattered in routes or components.
- **Authorization is server-side, always.** Every route handler verifies session +
  role + resource ownership before touching data. Hiding a button is not security.
- **No secrets in code.** Read from env. If you need a new var, add it to
  `.env.example` with a placeholder and tell me.
- **No real emails in dev.** Log magic links to the console locally; only the
  configured provider sends in production.
- **Don't add dependencies casually.** Propose the dependency and a lighter
  alternative before installing. Justify it.
- **Use the design system.** Pull from the defined tokens/components (see the
  design-conventions skill). Never hardcode colors, spacing, or one-off styles.

## Conventions

### API response shape
Every API route returns this envelope:

```ts
// success
{ ok: true, data: <payload> }
// error
{ ok: false, error: { code: string, message: string } }
```

HTTP status still set correctly (200/201/400/401/403/404/409/500).

### Validation
Every route validates input with a zod schema at the top of the handler. No
hand-rolled `if (!body.email)` checks. Parse, then proceed.

### Errors
Throw typed errors from the data layer; map them to the envelope at the route
boundary. Never leak raw DB errors or stack traces to the client.

### UI states
Every data-driven screen handles loading, empty, and error states — not just the
happy path. Empty states are designed, not blank. (See SPECS "States".)

### Accessibility baseline
Semantic HTML, labelled inputs, visible focus states, keyboard-navigable controls.
Not a full audit, but these are required, not optional.

### Naming
- Files: kebab-case. React components: PascalCase. Functions/vars: camelCase.
- DB columns: snake_case. TS fields: camelCase (ORM maps between them).
- Route handlers thin; logic lives in `/lib`.

### File layout
```
/app            route handlers + pages (App Router)
  layout.tsx    root layout
  page.tsx      home page
  globals.css   global styles + Tailwind entry point

Added in later sessions:
/lib/db         schema, migrations, seed, repo functions
/lib/auth       session, magic link, RBAC helpers
/lib/email      provider client + dev console transport
/lib/validation zod schemas
/components     shared UI (design-system primitives + composed)
/tests          tests mirroring /lib and /app
```

## Verification habits (do these, don't just claim them)

- After writing code, RUN it. Paste the actual output/error, don't assert it works.
- After a feature, run `pnpm lint && pnpm typecheck` and show the result.
- For bug fixes: write a failing test first, then fix, then show it passing.
- Check the screen on a narrow (mobile) viewport before calling UI done.
- Don't say "done" until lint, typecheck, and the relevant test pass for real.
- CI runs lint + typecheck + tests on every push; a red pipeline blocks merge. Don't
  merge around it.
- Deploy to staging before production. Never test against the production database.

## How to work with me

- Use plan mode before: schema, auth, and the security pass. Show the plan; wait.
- When something is ambiguous, ask one sharp question rather than guessing.
- Prefer the boring, well-understood option over the clever one unless I ask.
- Honest assessments over reassurance. If an approach is bad, say so.
