import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocked so we control cookie presence per test without knowing Better Auth's
// internal cookie name format.
vi.mock('better-auth/cookies', () => ({
  getSessionCookie: vi.fn(),
}))

import { middleware } from '@/middleware'
import { getSessionCookie } from 'better-auth/cookies'

const mockGetSessionCookie = vi.mocked(getSessionCookie)

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('middleware', () => {
  describe('public routes — cookie check is skipped', () => {
    it('/login passes through', () => {
      const res = middleware(makeRequest('/login'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('/api/auth/request-link passes through', () => {
      const res = middleware(makeRequest('/api/auth/request-link'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('/api/auth/callback passes through', () => {
      const res = middleware(makeRequest('/api/auth/callback'))
      expect(res.headers.get('location')).toBeNull()
    })
  })

  describe('protected routes — no session cookie', () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue(null)
    })

    it('/dashboard → 307 redirect to /login', () => {
      const res = middleware(makeRequest('/dashboard'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('/admin → 307 redirect to /login', () => {
      const res = middleware(makeRequest('/admin'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('/ → 307 redirect to /login', () => {
      const res = middleware(makeRequest('/'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })
  })

  describe('protected routes — session cookie present', () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue('session-token-value')
    })

    it('/dashboard with cookie → passes through (not a redirect)', () => {
      const res = middleware(makeRequest('/dashboard'))
      expect(res.status).not.toBe(307)
      expect(res.headers.get('location')).toBeNull()
    })

    it('/admin with cookie → passes through (role check is not middleware\'s job)', () => {
      const res = middleware(makeRequest('/admin'))
      expect(res.status).not.toBe(307)
      expect(res.headers.get('location')).toBeNull()
    })
  })
})
