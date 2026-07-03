import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { callbackQuerySchema } from '@/lib/validation/auth'
import { logError } from '@/lib/log'

export async function GET(request: NextRequest) {
  const loginError = new URL('/login?error=invalid-link', request.url)

  const parsed = callbackQuerySchema.safeParse({
    token: request.nextUrl.searchParams.get('token'),
  })
  if (!parsed.success) {
    return NextResponse.redirect(loginError)
  }

  try {
    // Better Auth validates the token (unexpired, unused), creates the session row, and
    // returns a redirect Response with the httpOnly session cookie set. Forward it.
    return await auth.api.magicLinkVerify({
      query: { token: parsed.data.token, callbackURL: '/' },
      headers: await headers(),
      asResponse: true,
    })
  } catch (error) {
    // Invalid / expired / already-used token.
    logError('callback', error)
    return NextResponse.redirect(loginError)
  }
}
