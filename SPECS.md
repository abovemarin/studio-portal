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

Established up front (session 1.3), before features, so every screen inherits one
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
- [x] **`approvals.updated_at` included** even though the approvals table in SPECS lists
      only `created_at`. The global rule ("all tables have `created_at`, `updated_at`")
      wins, and re-approving mutates `note` — so `updated_at` is meaningful here.
- [x] **`comments.author_id` and `approvals.approved_by` use `ON DELETE RESTRICT`.**
      SPECS left the cascade behavior for user FKs on these tables unspecified. RESTRICT
      was chosen to preserve audit history — deleting a user must not silently erase their
      comments or approval records. Only `project_members.user_id` cascades on user delete.
- [x] **Milestone reordering is a non-transactional two-`PATCH` swap** (session 4.3). The
      admin editor reorders via up/down controls that issue two `PATCH /api/milestones/:id`
      calls (no dedicated reorder endpoint — stays within the SPECS API surface). Accepted for
      single/low-concurrency admin use; a partial failure is revealed on refresh and retried.
      Revisit with a transactional reorder endpoint if concurrent multi-admin editing becomes real.
- [x] **Approval idempotency + status transition** (session 5.2). Only `in_review` →
      `approved` is a valid first transition, enforced server-side (matching the SPECS
      Approve-button rule); `pending`/`in_progress` → 409 CONFLICT ("wrong-status rejected").
      Re-approving an already-`approved` milestone is **idempotent**: `INSERT ... ON CONFLICT
      (milestone_id) DO UPDATE` updates the note, status stays `approved`, and no duplicate row
      is created (SPECS "re-approving updates the note") — returns 200 vs 201 on the first
      transition. Chose idempotent re-approve over a hard "already approved" 409 because it
      matches SPECS and makes the unique constraint the actual idempotency mechanism, not
      race-only defense. Upsert + status flip run in one transaction so they cannot diverge.
- [x] **`redirect()`/`notFound()` in Suspense-streamed pages return HTTP 200, not 307/404**
      (session 6.1). Client pages sit behind `loading.tsx`, so Next streams the shell (200)
      before the async component resolves the redirect/not-found — behavior is correct (the
      browser lands on the right page and no data leaks), but external tools checking raw status
      codes should be aware. Flagging for Module 7's audit.
- [x] **Semantic `danger` token added (session 6.3a)** for error text/border (light `#b91c1c` ≈
      5.95:1, dark `#f87171`), replacing raw `text-red-500` (`#ef4444` ≈ 3.49:1, failed AA in
      light). Adopted in the shared `Input` + the client comment/approve error text. The three
      admin editors (`project-editor`, `milestones-editor`, `members-editor`) still use inline
      `text-red-500` — **deliberately left** per 6.3's admin audit-only boundary. **Admin-pass
      candidate: adopt `text-danger` there.** (The shared `Input` change already fixes admin
      field-level errors; only the section-level `<p>`s remain.)
- [x] **Admin comment capability — UI-only gap, not an authz bug (verified session 6.3b).** The
      `POST /api/milestones/:id/comments` route authorizes members **+ admin** per SPECS (403 only
      when `!membership && role !== 'admin'`), so an admin can comment via the API. The admin
      project detail UI simply renders no comment composer. Scoped task for a future admin pass
      (surface a composer); no priority fix needed — the API is spec-correct.
- [x] **Rate limiting stays in-memory, behind a `RateLimitStore` interface (session 7.2).**
      `lib/rate-limit.ts`'s fixed-window limiter is correct and adds no infrastructure for a
      single Railway instance; a shared store (Redis/Upstash) is the multi-instance-correct
      alternative but pulls infra into the stack before Module 8 needs it. Wrapped the
      implementation behind `RateLimitStore` so swapping in a shared store later is a contained
      change (implement the interface, replace one line), not a rewrite. **Known limitation,
      tracked explicitly**: the count lives in one process's memory — under >1 instance
      (horizontal scale, or an overlapping rolling deploy) the effective limit multiplies
      per-instance and stops holding. **Revisit at the moment a second instance is introduced**
      (Module 8 deploy pass or later). Closes the 7.1 audit's "7.2 preview" deferral note
      (`scratch/7.1-audit.md`), which also flagged the comment-POST route as unprotected —
      fixed this session (`comment:{userId}`, 10/60s), along with `approve` (same trust class,
      same limit) and a per-email check on `request-link` (per-IP alone doesn't stop an
      IP-rotating attacker from spamming one invitee's inbox).
