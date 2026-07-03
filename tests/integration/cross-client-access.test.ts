import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// NEEDS-TEST-1 — the adversarial proof of the GAP-1 fix against REAL rows.
//
// The ONLY things mocked are identity (who the caller is) and next/navigation (to capture the page
// gate's notFound/redirect). Everything downstream runs for real — crucially, getProjectMember is
// NOT mocked: it queries real project_members rows and returns null for (Y, A) because that
// membership was genuinely never inserted. That is what makes this a real leak proof rather than
// the mocked-null unit test that assumes its own conclusion.

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
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn((url: string) => {
    throw new Error('NEXT_REDIRECT:' + url)
  }),
}))

import { GET as getProject } from '@/app/api/projects/[slug]/route'
import { POST as postComment } from '@/app/api/milestones/[id]/comments/route'
import { POST as postApprove } from '@/app/api/milestones/[id]/approve/route'
import ProjectDetailPage from '@/app/projects/[slug]/page'
import * as nav from 'next/navigation'
import { db } from '@/lib/db'
import { comments, approvals, milestones } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { seedUser, seedProject, seedMembership, seedMilestone } from './helpers'

function jsonReq(body: unknown) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const slugCtx = (slug: string) => ({ params: Promise.resolve({ slug }) })
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) })

// A is a member of X, NOT Y. B owns Y. Milestones exist under both.
async function seedScenario() {
  const A = await seedUser({ name: 'Client A' })
  const B = await seedUser({ name: 'Client B' })
  const X = await seedProject({ name: 'Project X', slug: 'project-x' })
  const Y = await seedProject({ name: 'Project Y', slug: 'project-y' })
  await seedMembership(X.id, A.id)
  await seedMembership(Y.id, B.id)
  const Mx = await seedMilestone(X.id, { title: 'X milestone', status: 'in_review' })
  const My = await seedMilestone(Y.id, { title: 'Y milestone', status: 'in_review' })
  return { A, B, X, Y, Mx, My }
}

beforeEach(() => {
  currentUser = null
  vi.clearAllMocks()
})

describe('NEEDS-TEST-1: cross-client access is a clean 404 (no existence leak) against real data', () => {
  it('GET /api/projects/:slug — A reaching Y by slug is 404, byte-identical to a nonexistent slug', async () => {
    const { A, Y } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }

    const real = await getProject(new NextRequest('http://localhost'), slugCtx(Y.slug))
    const ghost = await getProject(new NextRequest('http://localhost'), slugCtx('no-such-project'))

    expect(real.status).toBe(404)
    expect(ghost.status).toBe(404)
    // The leak would be ANY difference between "exists but you're not a member" and "does not exist".
    expect(await real.text()).toBe(await ghost.text())
  })

  it('GET /api/projects/:slug — A reaching X (their own) is 200 (positive control)', async () => {
    const { A, X } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }
    const res = await getProject(new NextRequest('http://localhost'), slugCtx(X.slug))
    expect(res.status).toBe(200)
  })

  it('POST /api/milestones/:id/comments — A commenting on Y milestone by id is 404, no row written', async () => {
    const { A, My } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }

    const res = await postComment(jsonReq({ body: 'sneaky' }), idCtx(My.id))

    expect(res.status).toBe(404)
    const rows = await db.select().from(comments).where(eq(comments.milestoneId, My.id))
    expect(rows).toHaveLength(0)
  })

  it('POST /api/milestones/:id/approve — A approving Y milestone by id is 404, no approval, status untouched', async () => {
    const { A, My } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }

    const res = await postApprove(jsonReq({ note: 'ok' }), idCtx(My.id))

    expect(res.status).toBe(404)
    const appr = await db.select().from(approvals).where(eq(approvals.milestoneId, My.id))
    expect(appr).toHaveLength(0)
    const [m] = await db.select().from(milestones).where(eq(milestones.id, My.id))
    expect(m.status).toBe('in_review')
  })

  it('page /projects/:slug — A reaching Y calls notFound()', async () => {
    const { A, Y } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }

    await expect(
      ProjectDetailPage({ params: Promise.resolve({ slug: Y.slug }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(nav.notFound).toHaveBeenCalled()
  })

  it('page /projects/:slug — A reaching X renders without notFound/redirect (positive control)', async () => {
    const { A, X } = await seedScenario()
    currentUser = { id: A.id, role: 'client' }

    await ProjectDetailPage({ params: Promise.resolve({ slug: X.slug }) })
    expect(nav.notFound).not.toHaveBeenCalled()
    expect(nav.redirect).not.toHaveBeenCalled()
  })
})
