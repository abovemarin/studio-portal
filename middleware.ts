// TODO: rename middleware.ts → proxy.ts (Next 16.2.9 deprecation)
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Optimistic, edge-safe gate: presence of the session cookie only. This is NOT the
// security boundary — real session/role/ownership checks run server-side in route
// handlers and server components via lib/auth/session.ts.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth API routes and the login page are public.
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except Next internals and static files (anything with an extension).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
