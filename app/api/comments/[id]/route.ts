import { NextRequest, NextResponse } from 'next/server'
import { requireUser, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { commentIdParamSchema } from '@/lib/validation/comments'
import { getCommentById, deleteComment } from '@/lib/db/comments'
import { logError } from '@/lib/log'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/comments/:id — comment author or admin.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const parsed = commentIdParamSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()

    const comment = await getCommentById(parsed.data.id)
    if (!comment) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Comment not found.' } },
        { status: 404 },
      )
    }

    // The resource exists, so a non-author non-admin is 403 (not 404): author-or-admin rule.
    if (comment.authorId !== user.id && (user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } },
        { status: 403 },
      )
    }

    const deleted = await deleteComment(parsed.data.id)
    return NextResponse.json({ ok: true, data: deleted }, { status: 200 })
  } catch (error) {
    return mapError(error)
  }
}

function mapError(error: unknown) {
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
  logError('comments', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  )
}
