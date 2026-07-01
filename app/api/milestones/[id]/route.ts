import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { milestoneIdParamSchema, updateMilestoneSchema } from '@/lib/validation/milestones'
import { getMilestoneById, updateMilestone, deleteMilestone } from '@/lib/db/milestones'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/milestones/:id — admin only.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const parsedParams = milestoneIdParamSchema.safeParse(await params)
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

  const parsed = updateMilestoneSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const existing = await getMilestoneById(parsedParams.data.id)
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } },
        { status: 404 },
      )
    }

    const data = { ...parsed.data }
    // Empty string clears the URL — store null, not ''.
    if (data.deliverableUrl === '') data.deliverableUrl = null

    const updated = await updateMilestone(parsedParams.data.id, data)
    return NextResponse.json({ ok: true, data: updated }, { status: 200 })
  } catch (error) {
    return mapError(error)
  }
}

// DELETE /api/milestones/:id — admin only.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const parsed = milestoneIdParamSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const deleted = await deleteMilestone(parsed.data.id)
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } },
        { status: 404 },
      )
    }

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
  console.error('[milestones]', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  )
}
