# Studio Portal — SPECS

A client-facing project portal for The Scaler Studio. Clients log in, see their
active projects, view milestones/deliverables, leave comments, and approve work.
Admin (you) manages everything behind the same app.

This file is the source of truth for *what* we're building. Keep it tight, keep it
current. Each build session should scope itself to ONE section below.

---

## Non-goals (read this first)

Explicitly NOT in v1, to keep scope honest:

- No file uploads/storage. Deliverables are referenced by URL (Figma, Drive, etc.), not hosted.
- No billing/payments.
- No real-time (no websockets). Polling/refresh is fine.
- No email notifications beyond the magic-link auth email.
- No multi-tenancy/agencies. One studio, many clients.
- No native mobile app. Responsive web only — but responsive is in scope and gets verified.

If a feature isn't listed under "Scope" below, it does not get built without updating this file first.

---

## Roles

- **admin** — you. Full CRUD on everything. One or two accounts.
- **client** — sees only projects they're assigned to. Read-only except comments + approvals.

Authorization is enforced server-side on every query, not just in the UI.

---

## Data model

Tables (Postgres). IDs are uuid. All tables have `created_at`, `updated_at` (timestamptz).

### users
- id (uuid, pk)
- email (text, unique, not null)
- name (text)
- role (enum: 'admin' | 'client', not null, default 'client')
- created_at, updated_at

### projects
- id (uuid, pk)
- name (text, not null)
- slug (text, unique, not null)
- status (enum: 'active' | 'paused' | 'completed' | 'archived', default 'active')
- summary (text)
- created_at, updated_at

### project_members  (which clients can see which projects)
- id (uuid, pk)
- project_id (uuid, fk -> projects, on delete cascade)
- user_id (uuid, fk -> users, on delete cascade)
- unique(project_id, user_id)

### milestones
- id (uuid, pk)
- project_id (uuid, fk -> projects, on delete cascade)
- title (text, not null)
- description (text)
- status (enum: 'pending' | 'in_progress' | 'in_review' | 'approved', default 'pending')
- deliverable_url (text, nullable)
- position (int, for ordering within a project)
- created_at, updated_at

### comments
- id (uuid, pk)
- milestone_id (uuid, fk -> milestones, on delete cascade)
- author_id (uuid, fk -> users)
- body (text, not null)
- created_at, updated_at

### approvals
- id (uuid, pk)
- milestone_id (uuid, fk -> milestones, on delete cascade)
- approved_by (uuid, fk -> users)
- note (text, nullable)
- created_at
- unique(milestone_id)  -- one approval per milestone; re-approving updates the note

---

## Design system

Established up front (session 1.5), before features, so every screen inherits one
visual language instead of accumulating ad-hoc styles.

- **Tokens:** a small fixed palette, spacing scale, radius, shadow — defined once as
  CSS variables / Tailwind theme, never hardcoded per component.
- **Typography:** a defined type scale and font pairing. Studio-quality, not default.
- **Core components:** Button, Card, Badge/StatusPill, Input, EmptyState. Everything
  else composes from these.
- **Direction:** clean, confident, client-facing. This is a deliverable a client logs
  into — it represents the studio.
- A **design-conventions skill** encodes the above so the agent applies it consistently.

Accessibility baseline (not a full audit, but required): semantic HTML, labelled
inputs, visible focus states, keyboard-navigable interactive elements.

---

## States (the unhappy paths — first-class, not afterthoughts)

Every data-driven screen must define all four:

- **Loading** — what shows while data is in flight.
- **Empty** — what a brand-new client sees with no projects yet. This is the FIRST
  impression for a new user; it gets real design attention.
- **Error** — what shows when a request fails. Never a raw error or a blank screen.
- **Populated** — the normal case.

---

## API surface

All routes under `/api`. JSON in/out. Standard response shape (see CLAUDE.md).
Every route checks auth + role + ownership before touching data.

### Auth
- POST /api/auth/request-link   { email }            -> sends magic link (via email provider)
- GET  /api/auth/callback?token=...                  -> sets session, redirects
- POST /api/auth/logout

### Projects
- GET    /api/projects                  -> admin: all; client: only their own
- POST   /api/projects                  -> admin only
- GET    /api/projects/:slug            -> members + admin only
- PATCH  /api/projects/:slug            -> admin only
- DELETE /api/projects/:slug            -> admin only

### Members
- POST   /api/projects/:slug/members    { user_id }  -> admin only
- DELETE /api/projects/:slug/members/:userId         -> admin only

### Milestones
- POST   /api/projects/:slug/milestones              -> admin only
- PATCH  /api/milestones/:id                         -> admin only
- DELETE /api/milestones/:id                         -> admin only

### Comments
- POST   /api/milestones/:id/comments   { body }     -> members + admin
- DELETE /api/comments/:id                           -> author or admin

### Approvals
- POST   /api/milestones/:id/approve    { note? }    -> members + admin
  (sets milestone status -> 'approved')

---

## Screens

### Public
- /login — email entry, "check your inbox" state.

### Client
- /  — list of their projects with status. (Empty state matters here.)
- /projects/:slug — milestones list, each expandable to show description,
  deliverable link, comments, and an Approve button if status is 'in_review'.

### Admin
- /admin — all projects, quick status.
- /admin/projects/:slug — full edit: milestones CRUD, member management, status.
- /admin/users — list users, set roles, invite (creates user + sends link).

---

## Email

Magic-link auth depends on sending real email.

- **Provider:** a transactional email service (e.g. Resend / Postmark). Decision in log.
- **Local dev:** do NOT send real emails in development. Log the magic link to the
  console (or use a catch-all/preview inbox) so you can develop without spamming.
- API key in env, never in code.

---

## Security requirements (enforced continuously, audited in Module 7)

Security is built in as you go — not a final phase. The security module verifies this
work; it does not introduce it. Requirements:

- Server-side authorization on EVERY data access. No "the UI hides it" as a defense.
- All input validated with a schema (zod) at the route boundary.
- Rate limit all abusable endpoints (magic-link requests AND comment posting).
- Session tokens: httpOnly, secure, sameSite. Magic-link tokens single-use + short TTL.
- No secrets in the repo. `.env` gitignored, `.env.example` committed.
- Parameterized queries only (the ORM handles this — never string-build SQL).
- Escape/sanitize comment bodies on render (XSS).

---

## Operability (so "deployed" also means "operable")

- **CI:** lint + typecheck + tests run automatically on every push; red blocks merge.
- **Environments:** local, staging/preview, and production — each with its own
  database and secrets. Never test against production.
- **Migrations:** forward-only in production; back up the prod DB before migrating.
- **Config:** validated at boot via a zod schema over env; fail fast if misconfigured.
- Structured error logging AND error monitoring (Sentry-style) in production; know
  where to read logs on the host.
- A README that lets anyone (or future you) run the project from scratch.
- Seed script for realistic local/demo data.

---

## Build order

See SESSIONS.md for the full session-by-session breakdown. High level:

0. Framing
1. Scaffold → DB wiring → **design system** → schema → migrations + seed
2. Auth (incl. email wiring) + RBAC
3. Admin CRUD
4. Comments + approvals
5. Client dashboard + states/responsive/a11y polish
6. Security pass
7. Deploy + observability + README
   Tests woven throughout.

---

## Open questions / decisions log

Record the decision AND the *why* as you make each call — this log is course content.

- [x] **ORM: Drizzle.** Closer to SQL (you learn what's actually happening), lighter
      than Prisma, clean migration story. Prisma's DX hides more, which cut against the
      learning goal.
- [x] **Auth lib: Better Auth.** Proper session/token handling, supports magic link,
      actively maintained, less ceremony than Lucia. Not hand-rolled.
- [x] **Email provider: Resend.** Simplest transactional DX, generous free tier, clean
      React-email path later. Postmark was the runner-up.
- [x] **Host: Railway.** Postgres + app + env in one place, real infra mental model,
      easy preview environments. Fly was more power than needed.
- [x] **Styling: Tailwind + hand-built primitives** (Button/Card/StatusPill/Input/
      EmptyState), NOT a component library. Keeps the portal looking like the studio's,
      not a recognizable template — and protects the design-system session (1.3).
