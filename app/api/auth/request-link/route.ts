import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { requestLinkSchema } from '@/lib/validation/auth'
import { rateLimit } from '@/lib/rate-limit'

// Uniform response — never reveals whether an account exists (no enumeration).
function uniformOk() {
  return NextResponse.json({
    ok: true,
    data: { message: 'If that email exists, a sign-in link has been sent.' },
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (!rateLimit(`request-link:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  const parsed = requestLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'A valid email is required.' } },
      { status: 400 }
    )
  }

  // Per-IP alone doesn't stop an attacker rotating IPs to spam one invitee's inbox —
  // this closes that gap. Longer window than the IP check since email is the scarcer
  // resource (a real inbox) and legitimate resends are rare within 5 minutes.
  const emailKey = parsed.data.email.toLowerCase()
  if (!rateLimit(`request-link-email:${emailKey}`, 5, 300_000)) {
    return NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
      { status: 429 }
    )
  }

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
    // Invite-only: an unknown email throws here. Swallow so the response is identical
    // either way; log genuine failures (e.g. email provider errors) server-side.
    console.error('[request-link]', error)
  }

  return uniformOk()
}
