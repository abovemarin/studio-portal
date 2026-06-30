import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted: prevents lib/auth/index.ts from running betterAuth() at import time.
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))

// Hoisted: headers() throws outside a Next.js request context.
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

import { requireUser, requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { auth } from '@/lib/auth'

const mockGetSession = vi.mocked(auth.api.getSession)

function makeSession(role: 'admin' | 'client') {
  return {
    user: { id: 'u1', email: 'user@example.com', role },
    session: { id: 's1' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireUser()', () => {
  it('returns session.user when a valid session exists', async () => {
    mockGetSession.mockResolvedValue(makeSession('client') as never)
    const user = await requireUser()
    expect(user.email).toBe('user@example.com')
  })

  it('throws UnauthorizedError when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow(UnauthorizedError)
  })

  it('thrown UnauthorizedError has code UNAUTHORIZED', async () => {
    mockGetSession.mockResolvedValue(null)
    try {
      await requireUser()
    } catch (e) {
      expect((e as UnauthorizedError).code).toBe('UNAUTHORIZED')
    }
  })
})

describe('requireRole("admin")', () => {
  it('returns user when session.user.role === "admin"', async () => {
    mockGetSession.mockResolvedValue(makeSession('admin') as never)
    const user = await requireRole('admin')
    expect(user.email).toBe('user@example.com')
  })

  it('throws ForbiddenError when session.user.role === "client"', async () => {
    mockGetSession.mockResolvedValue(makeSession('client') as never)
    await expect(requireRole('admin')).rejects.toThrow(ForbiddenError)
  })

  it('thrown ForbiddenError has code FORBIDDEN', async () => {
    mockGetSession.mockResolvedValue(makeSession('client') as never)
    try {
      await requireRole('admin')
    } catch (e) {
      expect((e as ForbiddenError).code).toBe('FORBIDDEN')
    }
  })

  it('throws UnauthorizedError when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(requireRole('admin')).rejects.toThrow(UnauthorizedError)
  })
})
