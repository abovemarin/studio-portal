import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { auth } from '@/lib/auth'
import { inviteUserSchema } from '@/lib/validation/users'
import { getUserByEmail, insertUser } from '@/lib/db/users'
import { logError } from '@/lib/log'

// POST /api/users — admin only. Invite = create the user row (pre-provisioning, since
// magic-link sign-up is disabled) then send them a real magic link via the same path
// request-link uses. If the send fails, the row is left in place rather than rolled
// back — creation is harmless and recoverable, unlike losing a half-completed invite.
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

  const parsed = inviteUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input.' } },
      { status: 400 },
    )
  }

  try {
    await requireRole('admin')

    const existing = await getUserByEmail(parsed.data.email)
    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'User already exists.' } },
        { status: 400 },
      )
    }

    const user = await insertUser(parsed.data)

    try {
      await auth.api.signInMagicLink({
        body: {
          email: parsed.data.email,
          callbackURL: '/',
          errorCallbackURL: '/login?error=invalid-link',
        },
        headers: await headers(),
      })
    } catch (error) {
      logError('users:invite-send', error)
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INTERNAL',
            message: 'User created, but the invite email failed to send.',
          },
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, data: user }, { status: 201 })
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
    logError('users', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    )
  }
}
