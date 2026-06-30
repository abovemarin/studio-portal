# Studio Portal

Client project portal for The Scaler Studio. Next.js (App Router) + Postgres.

See [SPECS.md](SPECS.md) for what to build and [CLAUDE.md](CLAUDE.md) for how to work in this repo.

## Prerequisites

- **`DATABASE_URL` must be exported in your shell environment** (not just in
  `.env.local`) for the Postgres MCP to load correctly at Claude Code startup.
  The `.mcp.json` in this repo reads `${DATABASE_URL}` from your shell, so add it
  to your shell profile — e.g. `export DATABASE_URL=postgresql://...`.
