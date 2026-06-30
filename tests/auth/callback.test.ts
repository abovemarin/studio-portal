import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  auth: { api: { magicLinkVerify: vi.fn() } },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

import { GET } from '@/app/api/auth/callback/route'
import { auth } from '@/lib/auth'

const mockVerify = vi.mocked(auth.api.magicLinkVerify)

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/callback?token=${encodeURIComponent(token)}`
    : 'http://localhost/api/auth/callback'
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/callback', () => {
  it('missing token param → redirects to /login?error=invalid-link', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=invalid-link')
  })

  it('empty token string → redirects to /login?error=invalid-link', async () => {
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=invalid-link')
  })

  it('valid token → forwards the redirect+cookie response from Better Auth', async () => {
    const baResponse = new Response(null, {
      status: 302,
      headers: {
        Location: 'http://localhost/',
        'Set-Cookie': 'better-auth.session_token=abc123; HttpOnly; Path=/; SameSite=Lax',
      },
    })
    mockVerify.mockResolvedValue(baResponse as never)

    const res = await GET(makeRequest('valid-token-abc'))
    expect(res.status).toBe(302)
    expect(res.headers.get('set-cookie')).toContain('better-auth.session_token')
  })

  it('reused token → magicLinkVerify throws → redirects to /login?error=invalid-link', async () => {
    mockVerify.mockRejectedValue(new Error('TOKEN_ALREADY_USED'))

    const res = await GET(makeRequest('already-used-token'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=invalid-link')
  })

  it('expired token → magicLinkVerify throws → redirects to /login?error=invalid-link', async () => {
    mockVerify.mockRejectedValue(new Error('TOKEN_EXPIRED'))

    const res = await GET(makeRequest('expired-token'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=invalid-link')
  })
})
