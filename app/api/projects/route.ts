import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { createProjectSchema } from '@/lib/validation/projects'
import { logError } from '@/lib/log'
import {
  listProjectsForAdmin,
  listProjectsForClient,
  getProjectBySlug,
  createProject,
} from '@/lib/db/projects'

// GET /api/projects — admin: all projects; client: only their own (query-enforced).
export async function GET() {
  try {
    const user = await requireUser()
    const role = (user as { role?: string }).role

    const data =
      role === 'admin' ? await listProjectsForAdmin() : await listProjectsForClient(user.id)

    return NextResponse.json({ ok: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 },
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 },
      )
    }
    logError('projects', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    )
  }
}

// POST /api/projects — admin only.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    )
  }

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    // Slug must be unique. Pre-check so a collision is a clean 400 rather than a leaked
    // DB unique-violation 500. (No CONFLICT code exists in the api-conventions skill.)
    const existing = await getProjectBySlug(parsed.data.slug)
    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'Slug already taken.' } },
        { status: 400 },
      )
    }

    const project = await createProject(parsed.data)
    return NextResponse.json({ ok: true, data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 },
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 },
      )
    }
    logError('projects', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    )
  }
}
