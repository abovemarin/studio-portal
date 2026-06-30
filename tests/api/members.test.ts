import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }))

vi.mock('@/lib/auth/session', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth/session')>()
  return { ...actual, requireUser: vi.fn(), requireRole: vi.fn() }
})

vi.mock('@/lib/db/projects', () => ({
  getProjectBySlug: vi.fn(),
  getUserById: vi.fn(),
  getProjectMember: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
}))

import { POST } from '@/app/api/projects/[slug]/members/route'
import { DELETE } from '@/app/api/projects/[slug]/members/[userId]/route'
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import {
  getProjectBySlug,
  getUserById,
  getProjectMember,
  addProjectMember,
  removeProjectMember,
} from '@/lib/db/projects'

const mockRequireRole = vi.mocked(requireRole)
const USER_ID = '11111111-1111-4111-8111-111111111111'

function addReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/projects/acme-site/members', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

function memberCtx() {
  return { params: Promise.resolve({ slug: 'acme-site' }) }
}
function delCtx(userId = USER_ID) {
  return { params: Promise.resolve({ slug: 'acme-site', userId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/projects/:slug/members (add, admin only)', () => {
  it('admin, new member → 201', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getUserById).mockResolvedValue({ id: USER_ID, role: 'client' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)
    vi.mocked(addProjectMember).mockResolvedValue({ id: 'm1' } as never)

    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(201)
    expect(addProjectMember).toHaveBeenCalledWith('p1', USER_ID)
  })

  it('admin, already a member → 200 idempotent (no second insert)', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getUserById).mockResolvedValue({ id: USER_ID, role: 'client' } as never)
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm-existing' } as never)

    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(200)
    expect((await res.json()).data.id).toBe('m-existing')
    expect(addProjectMember).not.toHaveBeenCalled()
  })

  it('client → 403', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(403)
    expect(addProjectMember).not.toHaveBeenCalled()
  })

  it('unauthenticated → 401', async () => {
    mockRequireRole.mockRejectedValue(new UnauthorizedError())
    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(401)
  })

  it('project missing → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue(null)

    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('Project not found.')
  })

  it('user_id not a real user → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getUserById).mockResolvedValue(null)

    const res = await POST(addReq({ user_id: USER_ID }), memberCtx())
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('User not found.')
    expect(addProjectMember).not.toHaveBeenCalled()
  })

  it('invalid uuid body → 400 (before auth)', async () => {
    const res = await POST(addReq({ user_id: 'not-a-uuid' }), memberCtx())
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
    expect(mockRequireRole).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/projects/:slug/members/:userId (remove, admin only)', () => {
  it('client → 403', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await DELETE(new NextRequest('http://localhost'), delCtx())
    expect(res.status).toBe(403)
    expect(removeProjectMember).not.toHaveBeenCalled()
  })

  it('admin, non-member → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(removeProjectMember).mockResolvedValue(null)

    const res = await DELETE(new NextRequest('http://localhost'), delCtx())
    expect(res.status).toBe(404)
  })

  it('admin, existing member → 200', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(removeProjectMember).mockResolvedValue({ id: 'm1' } as never)

    const res = await DELETE(new NextRequest('http://localhost'), delCtx())
    expect(res.status).toBe(200)
    expect(removeProjectMember).toHaveBeenCalledWith('p1', USER_ID)
  })
})
