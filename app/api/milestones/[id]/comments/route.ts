import { NextRequest, NextResponse } from 'next/server'
import { requireUser, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { commentIdParamSchema, createCommentSchema } from '@/lib/validation/comments'
import { getMilestoneById } from '@/lib/db/milestones'
import { getProjectMember } from '@/lib/db/projects'
import { createComment } from '@/lib/db/comments'
import { rateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/milestones/:id/comments — project members + admin.
// Ownership is project membership (via the milestone's project), not direct resource
// ownership: load the milestone first to reach its projectId.
export async function POST(request: NextRequest, { params }: Ctx) {
  const parsedParams = commentIdParamSchema.safeParse(await params)
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

  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()

    // Per-user, not per-IP: the caller is already authenticated here, so user.id is
    // precise and won't false-positive multiple legit users behind one office IP.
    if (!rateLimit(`comment:${user.id}`, 10, 60_000)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
        { status: 429 },
      )
    }

    const milestone = await getMilestoneById(parsedParams.data.id)
    if (!milestone) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } },
        { status: 404 },
      )
    }

    // No-existence-leak (7.1 GAP-1): a non-member gets the SAME 404 as a nonexistent milestone,
    // so the API can't reveal that a milestone exists in another client's project. Admin bypasses.
    const membership = await getProjectMember(milestone.projectId, user.id)
    if (!membership && (user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } },
        { status: 404 },
      )
    }

    const comment = await createComment(milestone.id, user.id, parsed.data)
    return NextResponse.json({ ok: true, data: comment }, { status: 201 })
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
  console.error('[comments]', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  )
}
