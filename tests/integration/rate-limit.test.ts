import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Proves the REAL in-memory limiter (lib/rate-limit.ts) against real route handlers and a
// real Postgres DB — not the mocked-true/mocked-false stand-in the unit tests use. Only
// identity is mocked, same pattern as cross-client-access.test.ts.

let currentUser: { id: string; role: string } | null = null

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }))
vi.mock('@/lib/auth/session', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth/session')>()
  return {
    ...actual,
    getSession: vi.fn(async () => (currentUser ? { user: currentUser } : null)),
    requireUser: vi.fn(async () => {
      if (!currentUser) throw new actual.UnauthorizedError()
      return currentUser
    }),
  }
})

import { POST as postComment } from '@/app/api/milestones/[id]/comments/route'
import { POST as postApprove } from '@/app/api/milestones/[id]/approve/route'
import { db } from '@/lib/db'
import { comments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { seedUser, seedProject, seedMembership, seedMilestone } from './helpers'

function jsonReq(body: unknown) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) })

async function seedMember() {
  const user = await seedUser()
  const project = await seedProject()
  await seedMembership(project.id, user.id)
  return { user, project }
}

beforeEach(() => {
  currentUser = null
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rate limiting: comments and approve run against the real in-memory limiter', () => {
  it('POST /api/milestones/:id/comments — 10 calls pass, 11th is 429, no 11th row written', async () => {
    const { user, project } = await seedMember()
    const milestone = await seedMilestone(project.id)
    currentUser = { id: user.id, role: 'client' }

    for (let i = 0; i < 10; i++) {
      const res = await postComment(jsonReq({ body: `comment ${i}` }), idCtx(milestone.id))
      expect(res.status).toBe(201)
    }

    const blocked = await postComment(jsonReq({ body: 'one too many' }), idCtx(milestone.id))
    const body = await blocked.json()
    expect(blocked.status).toBe(429)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('RATE_LIMITED')

    const rows = await db.select().from(comments).where(eq(comments.milestoneId, milestone.id))
    expect(rows).toHaveLength(10)
  })

  it('POST /api/milestones/:id/comments — window resets after 60s, next call passes again', async () => {
    const { user, project } = await seedMember()
    const milestone = await seedMilestone(project.id)
    currentUser = { id: user.id, role: 'client' }

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date())

    for (let i = 0; i < 10; i++) {
      const res = await postComment(jsonReq({ body: `comment ${i}` }), idCtx(milestone.id))
      expect(res.status).toBe(201)
    }
    const blocked = await postComment(jsonReq({ body: 'blocked' }), idCtx(milestone.id))
    expect(blocked.status).toBe(429)

    vi.setSystemTime(new Date(Date.now() + 61_000))

    const afterReset = await postComment(jsonReq({ body: 'fresh window' }), idCtx(milestone.id))
    expect(afterReset.status).toBe(201)
  })

  it('POST /api/milestones/:id/approve — same 10/60s shape, 11th call is 429', async () => {
    const { user, project } = await seedMember()
    const milestone = await seedMilestone(project.id, { status: 'in_review' })
    currentUser = { id: user.id, role: 'client' }

    for (let i = 0; i < 10; i++) {
      const res = await postApprove(jsonReq({ note: `pass ${i}` }), idCtx(milestone.id))
      expect(res.status).toBeLessThan(300)
    }

    const blocked = await postApprove(jsonReq({ note: 'one too many' }), idCtx(milestone.id))
    const body = await blocked.json()
    expect(blocked.status).toBe(429)
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('comment and approve limits are independent — exhausting one does not block the other', async () => {
    const { user, project } = await seedMember()
    const milestone = await seedMilestone(project.id, { status: 'in_review' })
    currentUser = { id: user.id, role: 'client' }

    for (let i = 0; i < 10; i++) {
      const res = await postComment(jsonReq({ body: `comment ${i}` }), idCtx(milestone.id))
      expect(res.status).toBe(201)
    }
    const blockedComment = await postComment(jsonReq({ body: 'blocked' }), idCtx(milestone.id))
    expect(blockedComment.status).toBe(429)

    const approveRes = await postApprove(jsonReq({ note: 'still allowed' }), idCtx(milestone.id))
    expect(approveRes.status).toBeLessThan(300)
  })
})
