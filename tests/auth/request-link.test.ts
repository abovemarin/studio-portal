import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  auth: { api: { signInMagicLink: vi.fn() } },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Mocked so we can't accidentally send email, and to avoid Resend client init
// (which transitively imports @/lib/env).
vi.mock('@/lib/email', () => ({
  sendMagicLinkEmail: vi.fn(),
}))

// Mocked so we control pass/fail per test without fighting module-level Map state.
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue(true),
}))

import { POST } from '@/app/api/auth/request-link/route'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

const mockSignIn = vi.mocked(auth.api.signInMagicLink)
const mockRateLimit = vi.mocked(rateLimit)

function makeRequest(body: unknown, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/auth/request-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue(true)
})

describe('POST /api/auth/request-link', () => {
  it('valid known-user email → 200 uniform response', async () => {
    mockSignIn.mockResolvedValue(undefined as never)

    const res = await POST(makeRequest({ email: 'client@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.message).toMatch(/sign-in link has been sent/i)
  })

  it('valid unknown-user email → signInMagicLink throws → still 200 uniform response', async () => {
    mockSignIn.mockRejectedValue(new Error('USER_NOT_FOUND'))

    const res = await POST(makeRequest({ email: 'stranger@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('known-email and unknown-email responses are byte-identical (anti-enumeration)', async () => {
    mockSignIn.mockResolvedValue(undefined as never)
    const knownRes = await POST(makeRequest({ email: 'client@example.com' }))
    const knownBody = await knownRes.json()

    mockSignIn.mockRejectedValue(new Error('USER_NOT_FOUND'))
    const unknownRes = await POST(makeRequest({ email: 'stranger@example.com' }))
    const unknownBody = await unknownRes.json()

    expect(knownRes.status).toBe(unknownRes.status)
    expect(JSON.stringify(knownBody)).toBe(JSON.stringify(unknownBody))
  })

  it('invalid JSON body → 400 INVALID_JSON', async () => {
    const req = new NextRequest('http://localhost/api/auth/request-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: 'not json {{{',
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('INVALID_JSON')
  })

  it('missing email field → 400 VALIDATION', async () => {
    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('VALIDATION')
  })

  it('invalid email format → 400 VALIDATION', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('VALIDATION')
  })

  it('rate-limited IP → 429 RATE_LIMITED', async () => {
    mockRateLimit.mockReturnValue(false)

    const res = await POST(makeRequest({ email: 'client@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('RATE_LIMITED')
  })
})
