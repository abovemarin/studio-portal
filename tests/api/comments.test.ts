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
vi.mock('@/lib/db/comments', () => ({
  createComment: vi.fn(),
  getCommentById: vi.fn(),
  deleteComment: vi.fn(),
}))

// Mocked so we control pass/fail per test without fighting module-level Map state
// (mirrors tests/auth/request-link.test.ts).
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue(true),
}))

import { POST } from '@/app/api/milestones/[id]/comments/route'
import { DELETE } from '@/app/api/comments/[id]/route'
import { requireUser, UnauthorizedError } from '@/lib/auth/session'
import { getMilestoneById } from '@/lib/db/milestones'
import { getProjectMember } from '@/lib/db/projects'
import { createComment, getCommentById, deleteComment } from '@/lib/db/comments'
import { rateLimit } from '@/lib/rate-limit'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const mockRequireUser = vi.mocked(requireUser)
const mockRateLimit = vi.mocked(rateLimit)
const UUID = '11111111-1111-4111-8111-111111111111'
const MILESTONE_ID = '22222222-2222-4222-8222-222222222222'
const AUTHOR_ID = '33333333-3333-4333-8333-333333333333'
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

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue(true)
})

describe('POST /api/milestones/:id/comments (create, member or admin)', () => {
  it('rate-limited user → 429 RATE_LIMITED (no insert)', async () => {
    mockRequireUser.mockResolvedValue({ id: AUTHOR_ID, role: 'client' } as never)
    mockRateLimit.mockReturnValue(false)

    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(createComment).not.toHaveBeenCalled()
  })

  it('unauthenticated → 401 (no insert)', async () => {
    mockRequireUser.mockRejectedValue(new UnauthorizedError())
    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(401)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('non-uuid milestone id → 400 VALIDATION', async () => {
    const res = await POST(jsonReq({ body: 'hi' }), idCtx('not-a-uuid'))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
  })

  it('malformed JSON → 400 INVALID_JSON', async () => {
    const res = await POST(jsonReq('not json{', true), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_JSON')
  })

  it('empty body → 400 VALIDATION (no insert)', async () => {
    const res = await POST(jsonReq({ body: '' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('whitespace-only body → 400 VALIDATION (trim then min)', async () => {
    const res = await POST(jsonReq({ body: '   \n\t ' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('over-max body (>5000) → 400 VALIDATION', async () => {
    const res = await POST(jsonReq({ body: 'x'.repeat(5001) }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(400)
  })

  // 7.1 GAP-1 (no existence leak): a non-member gets the same 404 as a nonexistent milestone.
  // Asserted against the MOCKED not-a-member case; the real-membership adversarial proof is
  // NEEDS-TEST-1, deferred to the test-DB harness pass. No adversarial claim here.
  it('authed non-member, non-admin → 404 (no existence leak, no insert)', async () => {
    mockRequireUser.mockResolvedValue({ id: OTHER_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue({ id: MILESTONE_ID, projectId: 'p1' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)

    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(404)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('unknown milestone id → 404 (no insert)', async () => {
    mockRequireUser.mockResolvedValue({ id: AUTHOR_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue(null)

    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(404)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('member → 201, createComment called with milestone + author id', async () => {
    mockRequireUser.mockResolvedValue({ id: AUTHOR_ID, role: 'client' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue({ id: MILESTONE_ID, projectId: 'p1' } as never)
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)
    vi.mocked(createComment).mockResolvedValue({ id: UUID, body: 'hi' } as never)

    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(createComment).toHaveBeenCalledWith(MILESTONE_ID, AUTHOR_ID, { body: 'hi' })
  })

  it('admin with no membership → 201', async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue({ id: MILESTONE_ID, projectId: 'p1' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)
    vi.mocked(createComment).mockResolvedValue({ id: UUID, body: 'hi' } as never)

    const res = await POST(jsonReq({ body: 'hi' }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(createComment).toHaveBeenCalled()
  })

  it('stores the body raw (no write-time sanitization)', async () => {
    const payload = "<script>alert('xss')</script>"
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getMilestoneById).mockResolvedValue({ id: MILESTONE_ID, projectId: 'p1' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)
    vi.mocked(createComment).mockResolvedValue({ id: UUID, body: payload } as never)

    const res = await POST(jsonReq({ body: payload }), idCtx(MILESTONE_ID))
    expect(res.status).toBe(201)
    expect(createComment).toHaveBeenCalledWith(MILESTONE_ID, 'a1', { body: payload })
  })
})

describe('DELETE /api/comments/:id (author or admin)', () => {
  function delReq() {
    return new NextRequest('http://localhost', { method: 'DELETE' })
  }

  it('unauthenticated → 401', async () => {
    mockRequireUser.mockRejectedValue(new UnauthorizedError())
    const res = await DELETE(delReq(), idCtx(UUID))
    expect(res.status).toBe(401)
    expect(deleteComment).not.toHaveBeenCalled()
  })

  it('non-uuid id → 400 VALIDATION', async () => {
    const res = await DELETE(delReq(), idCtx('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('unknown id → 404 (no delete)', async () => {
    mockRequireUser.mockResolvedValue({ id: AUTHOR_ID, role: 'client' } as never)
    vi.mocked(getCommentById).mockResolvedValue(null)

    const res = await DELETE(delReq(), idCtx(UUID))
    expect(res.status).toBe(404)
    expect(deleteComment).not.toHaveBeenCalled()
  })

  it('author deletes own → 200', async () => {
    mockRequireUser.mockResolvedValue({ id: AUTHOR_ID, role: 'client' } as never)
    vi.mocked(getCommentById).mockResolvedValue({ id: UUID, authorId: AUTHOR_ID } as never)
    vi.mocked(deleteComment).mockResolvedValue({ id: UUID } as never)

    const res = await DELETE(delReq(), idCtx(UUID))
    expect(res.status).toBe(200)
    expect(deleteComment).toHaveBeenCalledWith(UUID)
  })

  it("admin deletes another's → 200", async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getCommentById).mockResolvedValue({ id: UUID, authorId: AUTHOR_ID } as never)
    vi.mocked(deleteComment).mockResolvedValue({ id: UUID } as never)

    const res = await DELETE(delReq(), idCtx(UUID))
    expect(res.status).toBe(200)
    expect(deleteComment).toHaveBeenCalledWith(UUID)
  })

  it('non-author, non-admin → 403 (no delete)', async () => {
    mockRequireUser.mockResolvedValue({ id: OTHER_ID, role: 'client' } as never)
    vi.mocked(getCommentById).mockResolvedValue({ id: UUID, authorId: AUTHOR_ID } as never)

    const res = await DELETE(delReq(), idCtx(UUID))
    expect(res.status).toBe(403)
    expect(deleteComment).not.toHaveBeenCalled()
  })
})

describe('JSX auto-escaping verified (the actual comment-render XSS defense)', () => {
  // milestone-list.tsx renders comment bodies as the JSX text child {comment.body}. React
  // auto-escapes text children — that (not any escape util) is the XSS defense. These lock the
  // guarantee the render path depends on: an HTML/script payload comes out inert.
  it('renders an HTML/script payload as inert escaped text, not markup', () => {
    const payload = "<script>alert('xss')</script>"
    const html = renderToStaticMarkup(createElement('p', null, payload))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes ampersands in a comment body', () => {
    const html = renderToStaticMarkup(createElement('p', null, 'terms & conditions'))
    expect(html).toContain('terms &amp; conditions')
  })
})
