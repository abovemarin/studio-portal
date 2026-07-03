import { NextRequest, NextResponse } from 'next/server'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { updateUserRoleSchema, userParamSchema } from '@/lib/validation/users'
import { updateUserRole } from '@/lib/db/users'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/users/:id — admin only. Sets a user's role.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const parsedParams = userParamSchema.safeParse(await params)
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

  const parsed = updateUserRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    const admin = await requireRole('admin')

    // Prevent an admin from demoting themselves — this is the only admin account in a
    // studio-portal-sized deployment, and there is no other route back to admin access.
    if (admin.id === parsedParams.data.id && parsed.data.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'You cannot change your own role.' } },
        { status: 400 },
      )
    }

    const user = await updateUserRole(parsedParams.data.id, parsed.data)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, data: user }, { status: 200 })
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
    console.error('[users]', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    )
  }
}
