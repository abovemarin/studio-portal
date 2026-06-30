# API Conventions — Studio Portal

Use this skill when writing any route handler under `/app/api/`.
Read it in full before writing a new route. Do not deviate without flagging it.

---

## 1. Response Envelope

Every JSON route returns exactly one of these two shapes.
HTTP status is always set correctly — the envelope alone is not the status signal.

```ts
// Success
{ ok: true, data: <payload> }

// Error
{ ok: false, error: { code: string, message: string } }
```

### Status codes

| Status | When |
|--------|------|
| 200    | Successful GET, PATCH, DELETE |
| 201    | Successful POST that creates a resource |
| 400    | Bad input — malformed JSON or validation failure |
| 401    | Not authenticated (`requireUser` threw) |
| 403    | Authenticated but wrong role or ownership denied |
| 404    | Resource not found |
| 429    | Rate limited |
| 500    | Unexpected server error |

Envelope `code` strings: `INVALID_JSON`, `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`.

---

## 2. Zod Validation Pattern

Parse at the top of the handler, before auth or DB access. A failure exits
immediately — nothing below the parse lines sees unvalidated data.

### POST / PATCH routes (JSON body)

Two steps: raw JSON parse first (the body may not be JSON at all), then zod.

```ts
let body: unknown
try {
  body = await request.json()
} catch {
  return NextResponse.json(
    { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
    { status: 400 }
  )
}

const parsed = mySchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
    { status: 400 }
  )
}
// parsed.data is safe below this line
```

### GET routes (query / path params)

```ts
const parsed = mySchema.safeParse({
  slug: params.slug,
})
if (!parsed.success) {
  return NextResponse.json(
    { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
    { status: 400 }
  )
}
```

**Schema location:** define all schemas in `/lib/validation/` (one file per domain:
`projects.ts`, `milestones.ts`, `comments.ts`). Never define zod schemas inline in
route files.

Always use `safeParse` — never `parse()`. Throwing from zod is not part of this
pattern; it bypasses the typed error mapping below.

---

## 3. Auth Pattern

```ts
import { requireUser, requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
```

- **Admin-only route:** `const user = await requireRole('admin')`
- **Any authenticated user:** `const user = await requireUser()`
- Both throw typed errors on failure — caught by the outer try/catch (§4).
- **Call auth before any DB access.** Middleware is not the security boundary.

---

## 4. Error Handling Pattern

Validation (§2) and JSON parsing are handled inline with early returns.
Everything else — auth, DB access, business logic — lives inside one try/catch
at the route boundary.

```ts
try {
  const user = await requireRole('admin') // or requireUser()

  // ... ownership check if needed (see §7)
  // ... DB access via /lib/db/ functions

  return NextResponse.json({ ok: true, data: result }, { status: 200 })
} catch (error) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
      { status: 401 }
    )
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
      { status: 403 }
    )
  }
  console.error('[route-name]', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 }
  )
}
```

The `console.error` prefix uses the route file's name in brackets: `[projects]`,
`[milestones]`, `[comments]`. This matches the pattern in the existing auth routes.

Never leak raw error messages, stack traces, or DB error text to the client.

### Not-found case

The data layer returns `null` when a resource does not exist (it does not throw).
Check for null at the route boundary before entering the try/catch result block:

```ts
const project = await getProjectBySlug(parsed.data.slug)
if (!project) {
  return NextResponse.json(
    { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
    { status: 404 }
  )
}
```

---

## 5. Worked Example

A complete route handler showing all four patterns applied together.
This endpoint (`POST /api/reports`) is fictional — it exists only to show the shape.

```ts
// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { createReportSchema } from '@/lib/validation/reports'
import { createReport } from '@/lib/db/reports'

export async function POST(request: NextRequest) {
  // 1. Parse body — catch malformed JSON before zod sees it
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  // 2. Validate with zod — never trust input below this line
  const parsed = createReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 }
    )
  }

  try {
    // 3. Auth — throws UnauthorizedError or ForbiddenError; caught below
    await requireRole('admin')

    // 4. DB access — only reached after auth passes
    const report = await createReport(parsed.data)

    return NextResponse.json({ ok: true, data: report }, { status: 201 })
  } catch (error) {
    // 5. Map typed errors to envelope + HTTP status at the route boundary
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    console.error('[reports]', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 }
    )
  }
}
```

---

## 6. Route File Structure

```
app/api/
  projects/
    route.ts               # GET (list), POST (create)
    [slug]/
      route.ts             # GET (single), PATCH (update), DELETE
      members/
        route.ts           # POST (add member)
        [userId]/
          route.ts         # DELETE (remove member)
  milestones/
    [id]/
      route.ts             # PATCH, DELETE
      comments/
        route.ts           # POST
      approve/
        route.ts           # POST
  comments/
    [id]/
      route.ts             # DELETE
```

**One named export per HTTP method** in the file that handles it:

```ts
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
export async function PATCH(request: NextRequest, { params }: { params: { slug: string } }) { ... }
export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) { ... }
```

**Route handlers are thin.** Parse → auth → call `/lib/db/` function → return envelope.
No business logic, no raw SQL, no direct Drizzle calls in route files.

---

## 7. Ownership Check Pattern

After establishing identity with `requireUser()` / `requireRole()`, verify that the
caller is allowed to access the specific resource being requested.

**Where this applies:**

| Route | Check |
|-------|-------|
| `GET /api/projects/:slug` | caller is a project member, or admin |
| `DELETE /api/comments/:id` | caller is the comment author, or admin |
| `POST /api/milestones/:id/comments` | caller is a project member, or admin |
| `POST /api/milestones/:id/approve` | caller is a project member, or admin |

**Pattern (applied from session 4.2 onwards):**

```ts
const user = await requireUser()

// Load the resource first to establish the context
const project = await getProjectBySlug(slug)
if (!project) {
  return NextResponse.json(
    { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
    { status: 404 }
  )
}

// Then check membership
const membership = await getProjectMember(project.id, user.id)
if (!membership && (user as { role?: string }).role !== 'admin') {
  return NextResponse.json(
    { ok: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } },
    { status: 403 }
  )
}
```

The membership check is explicit in route code, not buried in a middleware layer.
Never skip `requireUser()` and go straight to the membership check — identity must
be established first.

---

## Drift from existing auth routes

The three auth routes were written before this skill was codified. They follow the
same patterns but with two intentional exemptions to note:

1. **`GET /api/auth/callback`** returns redirects (`NextResponse.redirect`) instead
   of JSON envelopes. Correct for a browser redirect flow — the client is never
   parsing a JSON response here. This is an intentional exemption.

2. **`POST /api/auth/logout`** has no outer try/catch around `auth.api.signOut`.
   Better Auth handles its own errors internally and the failure modes don't produce
   user-visible outcomes. Intentional — not worth changing.

Do not "fix" these in Module 4 sessions.
