import { NextRequest, NextResponse } from 'next/server'
import { requireUser, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { approveSchema, milestoneIdParamSchema } from '@/lib/validation/approvals'
import { getMilestoneById } from '@/lib/db/milestones'
import { getProjectMember } from '@/lib/db/projects'
import { approveMilestone } from '@/lib/db/approvals'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/milestones/:id/approve — project members + admin. Sets milestone status ->
// 'approved'. Ownership is project membership (via the milestone's project), mirroring
// the comments route.
//
// Two guards: (1) membership/admin, and (2) a status guard — approval is only valid from
// 'in_review' (the transition) or 'approved' (an idempotent re-approve that just updates
// the note). 'pending'/'in_progress' are rejected 409. The idempotent upsert lives in the
// data layer; here the source status also picks the response code: 201 on the transition,
// 200 on a re-approve.
export async function POST(request: NextRequest, { params }: Ctx) {
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

  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()

    const milestone = await getMilestoneById(parsedParams.data.id)
    if (!milestone) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } },
        { status: 404 },
      )
    }

    const membership = await getProjectMember(milestone.projectId, user.id)
    if (!membership && (user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } },
        { status: 403 },
      )
    }

    // Status guard — "wrong-status rejected". Only a milestone in review (or already
    // approved, for an idempotent re-approve) can be approved.
    if (milestone.status !== 'in_review' && milestone.status !== 'approved') {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: 'Milestone is not ready for approval.' } },
        { status: 409 },
      )
    }

    const result = await approveMilestone(milestone.id, user.id, parsed.data)
    // 201 when this call performs the in_review -> approved transition (creates the
    // approval); 200 when re-approving an already-approved milestone (idempotent note update).
    const status = milestone.status === 'in_review' ? 201 : 200
    return NextResponse.json({ ok: true, data: result }, { status })
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
  console.error('[approvals]', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  )
}
