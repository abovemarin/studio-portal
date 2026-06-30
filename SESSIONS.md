# Studio Portal — SESSIONS

The complete session-by-session build plan. Each numbered session ≈ one video.
A "session" is one scoped, context-fresh sitting (you `/clear` between them).

Test beats and recurring segments (idiosyncrasies, CLI/MCP, context management) are
folded into specific sessions rather than filmed standalone — noted inline.

Total: **24 build sessions + 1 framing = 25 videos.**

═══════════════════════════════════════════════════════════════
MODULE 0 — FRAMING
═══════════════════════════════════════════════════════════════
0.1  Walk through SPECS.md, CLAUDE.md, SESSIONS.md, and the meta-goal. No code.

═══════════════════════════════════════════════════════════════
MODULE 1 — FOUNDATION
═══════════════════════════════════════════════════════════════
1.1  Scaffold Next.js (App Router, TS, pnpm). Get `pnpm dev` serving an empty page.
     Fix CLAUDE.md's command list to match reality.
     [idiosyncrasy aside: agent over-reaching past scope, and the redirect]

1.2  Resolve the ORM decision (log it). Install it, connect local Postgres,
     generate + apply one empty migration. Add a zod schema over env/config that
     fails fast at boot if anything required is missing or malformed.
     [principle: fail-fast config validation — no mysterious runtime failures]

1.3  DESIGN SYSTEM & visual direction. Resolve the styling decision.
     Establish tokens (palette, spacing, radius, type scale), font pairing, and
     core components (Button, Card, StatusPill, Input, EmptyState). Build the
     design-conventions skill. Accessibility baseline established here.
     [introduces the frontend-design skill; this is the marquee taste session]

═══════════════════════════════════════════════════════════════
MODULE 2 — DATA MODEL
═══════════════════════════════════════════════════════════════
2.1  PLAN MODE. Produce and critique the schema plan against SPECS. No code —
     reject/refine on camera.

2.2  Write the schema, generate the first real migration, apply it, verify tables.
     Demonstrate the "never edit an applied migration" failure + the new-migration fix.

2.3  SEED SCRIPT. Realistic demo data (named projects, clients, milestones) so every
     later session and demo has credible data to work against. `pnpm db:seed`.

═══════════════════════════════════════════════════════════════
MODULE 3 — AUTHENTICATION
═══════════════════════════════════════════════════════════════
3.1  Resolve auth-lib + email-provider decisions (log both). PLAN MODE for the
     magic-link + session flow.

3.2  EMAIL wiring. Provider client for production; console-log transport for dev.
     Prove a magic link gets generated and "sent" (to console) locally.

3.3  Build magic-link request + callback + session cookies (httpOnly, single-use,
     TTL). Review every line — this is the load-bearing session.

3.4  RBAC middleware. Test the negative cases (expired token, reused token, wrong
     role). [TEST BEAT: adversarial auth tests]

═══════════════════════════════════════════════════════════════
MODULE 4 — ADMIN CRUD
═══════════════════════════════════════════════════════════════
4.1  Build the API-conventions skill (envelope, zod validation, error shape) before
     writing endpoints.

4.2  Projects + members CRUD endpoints, applying the skill.
     [CLI/MCP segment: wire Postgres MCP + gh] [TEST BEAT: ownership tests]

4.3  Milestones CRUD + admin UI screens, applying the DESIGN SYSTEM (not raw UI).
     [context-management segment: show degradation, then /clear recovery]

4.4  CONTINUOUS INTEGRATION. A GitHub Actions pipeline that runs lint + typecheck +
     tests on every push, before merge. Now that tests exist (Module 3 onward), wire
     the gate that runs them automatically. Demonstrate a failing check blocking a PR.
     [principle: checks run automatically, not on the honor system; pairs with the
     gh CLI from 4.2 and the tagged-commit workflow]

═══════════════════════════════════════════════════════════════
MODULE 5 — INTERACTION
═══════════════════════════════════════════════════════════════
5.1  Comments: create/delete, author-or-admin rule, XSS sanitization on render
     (demo the attack live).

5.2  Approval state transition, unique-constraint idempotency lesson, status flip.
     [TEST BEAT: double-approve blocked, wrong-status rejected]

═══════════════════════════════════════════════════════════════
MODULE 6 — CLIENT EXPERIENCE
═══════════════════════════════════════════════════════════════
6.1  Client project list + project detail (read-only), wired to real RBAC, using
     the design system.

6.2  Approve/comment UI for clients.

6.3  STATES & POLISH. Loading, empty, and error states across all client screens —
     the empty "no projects yet" first-impression especially. Responsive/mobile
     verification. Accessibility pass (keyboard nav, focus, labels).
     [this is the "make it feel finished" session — your studio differentiator]

═══════════════════════════════════════════════════════════════
MODULE 7 — SECURITY (a VERIFICATION audit, not where security starts)
═══════════════════════════════════════════════════════════════
NOTE: Security is enforced continuously across Modules 2–6 (server-side authz,
validation at boundaries, XSS sanitization, single-use tokens). This module is the
audit that VERIFIES that work — it is not where security gets bolted on. Say this
to camera so students don't learn security as a final phase. (See guide: shift-left.)

7.1  PLAN MODE. Agent produces an audit checklist; RBAC audit + validation audit
     against it. [TEST BEAT: cross-client access denied]

7.2  Rate limiting on ALL abusable endpoints (auth magic-link AND comment posting —
     anything cheap to spam), secrets/`.env.example` hygiene check; fix findings.

═══════════════════════════════════════════════════════════════
MODULE 8 — SHIP
═══════════════════════════════════════════════════════════════
8.1  Resolve host decision (log it). Set up TWO environments: a staging/preview env
     and production, with separate databases and secrets. Deploy to staging first.
     [principle: never test in prod; staging is where the scary stuff is rehearsed]

8.2  Migrations against the STAGING db first, then production (the "this one's for
     real" beat). Back up the prod db before migrating. Teach forward-fix: when a
     migration is wrong in prod you ship a NEW migration forward — you do not edit or
     down-migrate in prod. Run seed or create the first real admin. Smoke-test live.
     [principle: backups before destructive ops; forward-only migrations in prod]

8.3  OBSERVABILITY + README. Structured error logging AND error monitoring
     (Sentry-style capture, not just log files); find the logs on the host. Write the
     README so anyone can run it from scratch.
     [closing beat: Claude-assisted documentation]

═══════════════════════════════════════════════════════════════
COURSE INFRASTRUCTURE (not videos — set up before filming)
═══════════════════════════════════════════════════════════════
- Git repo with a tagged commit per session, so students can check out the exact
  starting state of any video. (High value, rarely done.)
- A prerequisites doc: Node version, pnpm, local Postgres, accounts needed
  (email provider, host). Linked from session 0.1.
- A "this will have changed" disclaimer: Claude Code, model names, and pricing move
  fast. State the date filmed and where to check for current info.

═══════════════════════════════════════════════════════════════
WHAT CHANGED FROM EARLIER DRAFTS (for your reference)
═══════════════════════════════════════════════════════════════
v1 → v2 (the "finished, not just functional" pass):
  Added 1.3 design system, 2.3 seed, 3.2 email, 6.3 states/responsive/a11y,
  8.3 observability + README, course infrastructure. Moved client dashboard after
  interaction. (~22 → ~24 videos.)

v2 → v3 (the "proper software engineering" pass):
  Added 4.4 CI pipeline (checks run automatically before merge) and staging/preview
  environment (folded into 8.1). Folded in: fail-fast config validation (1.2),
  forward-only migrations + backup-before-prod (8.2), broader rate limiting (7.2),
  error monitoring not just logging (8.3), and the shift-left framing on Module 7
  (security is continuous; the module verifies, it doesn't bolt on).
  Current total: 25 videos (24 build + 1 framing).

The v3 additions move the plan from "good principles taught as phases" toward "how a
senior engineer actually sequences a maintainable build."
