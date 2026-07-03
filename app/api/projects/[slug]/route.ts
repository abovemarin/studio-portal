import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { slugParamSchema, updateProjectSchema } from '@/lib/validation/projects'
import {
  getProjectBySlug,
  getProjectMember,
  updateProject,
  deleteProject,
} from '@/lib/db/projects'

type Ctx = { params: Promise<{ slug: string }> }

// GET /api/projects/:slug — project members + admin only.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const parsed = slugParamSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()

    const project = await getProjectBySlug(parsed.data.slug)
    if (!project) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        { status: 404 },
      )
    }

    // No-existence-leak (7.1 GAP-1): a non-member gets the SAME 404 as a nonexistent project,
    // so the API can't be used to enumerate which slugs are real projects. Mirrors the page
    // layer's notFound() for non-members (6.3). Admin bypasses.
    const membership = await getProjectMember(project.id, user.id)
    if (!membership && (user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, data: project }, { status: 200 })
  } catch (error) {
    return mapError(error)
  }
}

// PATCH /api/projects/:slug — admin only.
export async function PATCH(request: NextRequest, { params }: Ctx) {
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

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    // A slug change must not collide with another project.
    if (parsed.data.slug && parsed.data.slug !== parsedParams.data.slug) {
      const clash = await getProjectBySlug(parsed.data.slug)
      if (clash) {
        return NextResponse.json(
          { ok: false, error: { code: 'VALIDATION', message: 'Slug already taken.' } },
          { status: 400 },
        )
      }
    }

    const updated = await updateProject(parsedParams.data.slug, parsed.data)
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 })
  } catch (error) {
    return mapError(error)
  }
}

// DELETE /api/projects/:slug — admin only. Hard delete (cascades per schema FKs).
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const parsed = slugParamSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid parameters.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const deleted = await deleteProject(parsed.data.slug)
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
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
  console.error('[projects]', error)
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  )
}
