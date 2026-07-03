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

vi.mock('@/lib/db/projects', () => ({ getProjectBySlug: vi.fn() }))

vi.mock('@/lib/db/milestones', () => ({
  createMilestone: vi.fn(),
  getMilestoneById: vi.fn(),
  updateMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
}))

import { POST } from '@/app/api/projects/[slug]/milestones/route'
import { PATCH, DELETE } from '@/app/api/milestones/[id]/route'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import { getProjectBySlug } from '@/lib/db/projects'
import {
  createMilestone,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
} from '@/lib/db/milestones'

const mockRequireRole = vi.mocked(requireRole)
const UUID = '11111111-1111-4111-8111-111111111111'

function jsonReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

function slugCtx(slug: string) {
  return { params: Promise.resolve({ slug }) }
}
function idCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/projects/:slug/milestones (create, admin only)', () => {
  it('client → 403 (no insert)', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await POST(jsonReq({ title: 'Kickoff' }), slugCtx('acme-site'))
    expect(res.status).toBe(403)
    expect(createMilestone).not.toHaveBeenCalled()
  })

  it('unauthenticated → 401', async () => {
    mockRequireRole.mockRejectedValue(new UnauthorizedError())
    const res = await POST(jsonReq({ title: 'Kickoff' }), slugCtx('acme-site'))
    expect(res.status).toBe(401)
  })

  it('malformed JSON → 400 INVALID_JSON', async () => {
    const res = await POST(jsonReq('not json{', true), slugCtx('acme-site'))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_JSON')
  })

  it('empty title → 400 VALIDATION', async () => {
    const res = await POST(jsonReq({ title: '' }), slugCtx('acme-site'))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
  })

  it('bad deliverableUrl → 400 VALIDATION', async () => {
    const res = await POST(jsonReq({ title: 'Kickoff', deliverableUrl: 'not-a-url' }), slugCtx('acme-site'))
    expect(res.status).toBe(400)
  })

  // 7.1 scheme allow-list: a clickable deliverable link must be http/https only.
  it('javascript: deliverableUrl → 400 VALIDATION (scheme allow-list, no insert)', async () => {
    const res = await POST(
      jsonReq({ title: 'Kickoff', deliverableUrl: 'javascript:alert(1)' }),
      slugCtx('acme-site'),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
    expect(createMilestone).not.toHaveBeenCalled()
  })

  it('https deliverableUrl → 201 (allowed scheme passes)', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(createMilestone).mockResolvedValue({ id: UUID, title: 'Kickoff' } as never)

    const res = await POST(
      jsonReq({ title: 'Kickoff', deliverableUrl: 'https://figma.com/file/abc' }),
      slugCtx('acme-site'),
    )
    expect(res.status).toBe(201)
    expect(createMilestone).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ deliverableUrl: 'https://figma.com/file/abc' }),
    )
  })

  it('admin, unknown project slug → 404 (no insert)', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue(null)

    const res = await POST(jsonReq({ title: 'Kickoff' }), slugCtx('ghost'))
    expect(res.status).toBe(404)
    expect(createMilestone).not.toHaveBeenCalled()
  })

  it('admin, valid → 201 and empty deliverableUrl stored as null', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(createMilestone).mockResolvedValue({ id: UUID, title: 'Kickoff' } as never)

    const res = await POST(jsonReq({ title: 'Kickoff', deliverableUrl: '' }), slugCtx('acme-site'))
    expect(res.status).toBe(201)
    expect(createMilestone).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Kickoff', deliverableUrl: null }),
    )
  })
})

describe('PATCH /api/milestones/:id (admin only)', () => {
  function patchReq(body: unknown) {
    return new NextRequest('http://localhost', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('client → 403 (no update)', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await PATCH(patchReq({ status: 'approved' }), idCtx(UUID))
    expect(res.status).toBe(403)
    expect(updateMilestone).not.toHaveBeenCalled()
  })

  it('non-uuid id → 400 VALIDATION', async () => {
    const res = await PATCH(patchReq({ status: 'approved' }), idCtx('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('empty body → 400 VALIDATION (refine: no fields)', async () => {
    const res = await PATCH(patchReq({}), idCtx(UUID))
    expect(res.status).toBe(400)
  })

  it('invalid status value → 400 VALIDATION', async () => {
    const res = await PATCH(patchReq({ status: 'done' }), idCtx(UUID))
    expect(res.status).toBe(400)
  })

  it('admin, unknown id → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(null)

    const res = await PATCH(patchReq({ status: 'approved' }), idCtx(UUID))
    expect(res.status).toBe(404)
    expect(updateMilestone).not.toHaveBeenCalled()
  })

  it('admin, valid → 200 and reorder position persisted', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue({ id: UUID } as never)
    vi.mocked(updateMilestone).mockResolvedValue({ id: UUID, position: 2 } as never)

    const res = await PATCH(patchReq({ position: 2 }), idCtx(UUID))
    expect(res.status).toBe(200)
    expect(updateMilestone).toHaveBeenCalledWith(UUID, { position: 2 })
  })
})

describe('DELETE /api/milestones/:id (admin only)', () => {
  it('client → 403 (no delete)', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await DELETE(new NextRequest('http://localhost'), idCtx(UUID))
    expect(res.status).toBe(403)
    expect(deleteMilestone).not.toHaveBeenCalled()
  })

  it('admin, unknown id → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(deleteMilestone).mockResolvedValue(null)

    const res = await DELETE(new NextRequest('http://localhost'), idCtx(UUID))
    expect(res.status).toBe(404)
  })

  it('admin, existing → 200', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(deleteMilestone).mockResolvedValue({ id: UUID } as never)

    const res = await DELETE(new NextRequest('http://localhost'), idCtx(UUID))
    expect(res.status).toBe(200)
    expect(deleteMilestone).toHaveBeenCalledWith(UUID)
  })
})
