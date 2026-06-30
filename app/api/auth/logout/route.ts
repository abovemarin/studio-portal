import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function POST() {
  // Better Auth deletes the session row and returns a response that clears the cookie.
  const baResponse = await auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  })

  const res = NextResponse.json({ ok: true, data: null })
  for (const cookie of baResponse.headers.getSetCookie()) {
    res.headers.append('set-cookie', cookie)
  }
  return res
}
