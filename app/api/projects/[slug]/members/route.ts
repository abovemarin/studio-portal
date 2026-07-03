import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { slugParamSchema, addMemberSchema } from '@/lib/validation/projects'
import { logError } from '@/lib/log'
import {
  getProjectBySlug,
  getUserById,
  getProjectMember,
  addProjectMember,
} from '@/lib/db/projects'

type Ctx = { params: Promise<{ slug: string }> }

// POST /api/projects/:slug/members  { user_id } — admin only. Idempotent: re-adding an
// existing member returns the existing row (200) instead of erroring on the unique constraint.
export async function POST(request: NextRequest, { params }: Ctx) {
  const parsedParams = slugParamSchema.safeParse(await params)
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    )
  }

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const project = await getProjectBySlug(parsedParams.data.slug)
    if (!project) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        { status: 404 },
      )
    }

    const target = await getUserById(parsed.data.user_id)
    if (!target) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      )
    }

    const existing = await getProjectMember(project.id, parsed.data.user_id)
    if (existing) {
      return NextResponse.json({ ok: true, data: existing }, { status: 200 })
    }

    const member = await addProjectMember(project.id, parsed.data.user_id)
    return NextResponse.json({ ok: true, data: member }, { status: 201 })
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
    logError('members', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    )
  }
}
