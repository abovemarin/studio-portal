import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { slugParamSchema } from '@/lib/validation/projects'
import { createMilestoneSchema } from '@/lib/validation/milestones'
import { getProjectBySlug } from '@/lib/db/projects'
import { createMilestone } from '@/lib/db/milestones'

type Ctx = { params: Promise<{ slug: string }> }

// POST /api/projects/:slug/milestones — admin only.
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

  const parsed = createMilestoneSchema.safeParse(body)
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

    const milestone = await createMilestone(project.id, {
      ...parsed.data,
      // Empty string clears the URL — store null, not ''.
      deliverableUrl: parsed.data.deliverableUrl || null,
    })

    return NextResponse.json({ ok: true, data: milestone }, { status: 201 })
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
