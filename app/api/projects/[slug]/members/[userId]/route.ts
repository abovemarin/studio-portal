import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { memberParamSchema } from '@/lib/validation/projects'
import { getProjectBySlug, removeProjectMember } from '@/lib/db/projects'
import { logError } from '@/lib/log'

type Ctx = { params: Promise<{ slug: string; userId: string }> }

// DELETE /api/projects/:slug/members/:userId — admin only.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const parsed = memberParamSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const project = await getProjectBySlug(parsed.data.slug)
    if (!project) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        { status: 404 },
      )
    }

    const removed = await removeProjectMember(project.id, parsed.data.userId)
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Membership not found.' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, data: removed }, { status: 200 })
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
