import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Prevent lib/auth/index.ts from running betterAuth() at import time (session.ts imports it).
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }))

// Keep the real typed error classes (instanceof checks in the route catch depend on
// identity) but stub the auth gate functions.
vi.mock('@/lib/auth/session', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth/session')>()
  return { ...actual, requireUser: vi.fn(), requireRole: vi.fn() }
})

vi.mock('@/lib/db/milestones', () => ({ getMilestoneById: vi.fn() }))
vi.mock('@/lib/db/projects', () => ({ getProjectMember: vi.fn() }))
vi.mock('@/lib/db/approvals', () => ({
  approveMilestone: vi.fn(),
  getApprovalForMilestone: vi.fn(),
}))

import { POST } from '@/app/api/milestones/[id]/approve/route'
import { requireUser, UnauthorizedError } from '@/lib/auth/session'
import { getMilestoneById } from '@/lib/db/milestones'
import { getProjectMember } from '@/lib/db/projects'
import { approveMilestone } from '@/lib/db/approvals'

const mockRequireUser = vi.mocked(requireUser)
const MILESTONE_ID = '22222222-2222-4222-8222-222222222222'
const MEMBER_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'

function jsonReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
function idCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}
function milestone(status: string) {
  return { id: MILESTONE_ID, projectId: 'p1', status } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/milestones/:id/approve (member or admin)', () => {
  it('unauthenticated → 401 (no write)', async () => {
    mockRequireUser.mockRejectedValue(new UnauthorizedError())
    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(401)
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  it('non-uuid milestone id → 400 VALIDATION', async () => {
    const res = await POST(jsonReq({ note: 'ok' }), idCtx('not-a-uuid'))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
  })

  it('malformed JSON → 400 INVALID_JSON', async () => {
    const res = await POST(jsonReq('not json{', true), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_JSON')
  })

  it('over-max note (>5000) → 400 VALIDATION (no write)', async () => {
    const res = await POST(jsonReq({ note: 'x'.repeat(5001) }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  it('unknown milestone id → 404 (no write)', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(null)

    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(404)
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  // 7.1 GAP-1 (no existence leak): a non-member gets the same 404 as a nonexistent milestone.
  // Asserted against the MOCKED not-a-member case; the real-membership adversarial proof is
  // NEEDS-TEST-1, deferred to the test-DB harness pass. No adversarial claim here.
  it('authed non-member, non-admin → 404 (no existence leak, no write)', async () => {
    mockRequireUser.mockResolvedValue({ id: OTHER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('in_review'))
    vi.mocked(getProjectMember).mockResolvedValue(null)

    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(404)
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  // ── wrong-status rejected ────────────────────────────────────────────────────
  it('wrong-status rejected: pending → 409 CONFLICT (no write)', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('pending'))
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)

    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('CONFLICT')
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  it('wrong-status rejected: in_progress → 409 CONFLICT (no write)', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('in_progress'))
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)

    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(409)
    expect(approveMilestone).not.toHaveBeenCalled()
  })

  // ── happy path (in_review → approved transition) ─────────────────────────────
  it('member + in_review → 201, approveMilestone called with milestone + user id + note', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('in_review'))
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)
    vi.mocked(approveMilestone).mockResolvedValue({ approval: {}, milestone: {} } as never)

    const res = await POST(jsonReq({ note: 'looks good' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(approveMilestone).toHaveBeenCalledWith(MILESTONE_ID, MEMBER_ID, { note: 'looks good' })
  })

  it('admin non-member + in_review → 201', async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('in_review'))
    vi.mocked(getProjectMember).mockResolvedValue(null)
    vi.mocked(approveMilestone).mockResolvedValue({ approval: {}, milestone: {} } as never)

    const res = await POST(jsonReq({ note: 'ok' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(approveMilestone).toHaveBeenCalled()
  })

  it('no note supplied → 201, approveMilestone called with {}', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('in_review'))
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)
    vi.mocked(approveMilestone).mockResolvedValue({ approval: {}, milestone: {} } as never)

    const res = await POST(jsonReq({}), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(approveMilestone).toHaveBeenCalledWith(MILESTONE_ID, MEMBER_ID, {})
  })

  // ── double-approve is idempotent, not rejected ───────────────────────────────
  // The unique(milestone_id) constraint blocks the *duplicate row*, not the request:
  // re-approving an already-approved milestone returns 200 and updates the note.
  it('double-approve (idempotent): approved → 200, approveMilestone called (upsert note)', async () => {
    mockRequireUser.mockResolvedValue({ id: MEMBER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(milestone('approved'))
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)
    vi.mocked(approveMilestone).mockResolvedValue({ approval: {}, milestone: {} } as never)

    const res = await POST(jsonReq({ note: 'updated' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(200)
    expect(approveMilestone).toHaveBeenCalledWith(MILESTONE_ID, MEMBER_ID, { note: 'updated' })
  })
})
