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

vi.mock('@/lib/db/projects', () => ({
  listProjectsForAdmin: vi.fn(),
  listProjectsForClient: vi.fn(),
  getProjectBySlug: vi.fn(),
  getProjectMember: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

import { GET, POST } from '@/app/api/projects/route'
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/projects/[slug]/route'
import { requireUser, requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth/session'
import {
  listProjectsForAdmin,
  listProjectsForClient,
  getProjectBySlug,
  getProjectMember,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/db/projects'

const mockRequireUser = vi.mocked(requireUser)
const mockRequireRole = vi.mocked(requireRole)

function jsonPost(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/projects (role-branching)', () => {
  it('admin → returns all projects, never the client query', async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(listProjectsForAdmin).mockResolvedValue([{ id: 'p1' }] as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(listProjectsForAdmin).toHaveBeenCalledOnce()
    expect(listProjectsForClient).not.toHaveBeenCalled()
  })

  it('client → scoped to their own via the client query', async () => {
    mockRequireUser.mockResolvedValue({ id: 'c1', role: 'client' } as never)
    vi.mocked(listProjectsForClient).mockResolvedValue([] as never)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(listProjectsForClient).toHaveBeenCalledWith('c1')
    expect(listProjectsForAdmin).not.toHaveBeenCalled()
  })

  it('no session → 401', async () => {
    mockRequireUser.mockRejectedValue(new UnauthorizedError())
    const res = await GET()
    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('UNAUTHORIZED')
  })
})

describe('GET /api/projects/:slug (ownership)', () => {
  it('member → 200', async () => {
    mockRequireUser.mockResolvedValue({ id: 'c1', role: 'client' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getProjectMember).mockResolvedValue({ id: 'm1' } as never)

    const res = await GET_ONE(new NextRequest('http://localhost'), ctx('acme-site'))
    expect(res.status).toBe(200)
  })

  it('non-member client → 403 (cross-client denied)', async () => {
    mockRequireUser.mockResolvedValue({ id: 'c2', role: 'client' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)

    const res = await GET_ONE(new NextRequest('http://localhost'), ctx('acme-site'))
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('FORBIDDEN')
  })

  it('admin non-member → 200 (admin bypass)', async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)
    vi.mocked(getProjectMember).mockResolvedValue(null)

    const res = await GET_ONE(new NextRequest('http://localhost'), ctx('acme-site'))
    expect(res.status).toBe(200)
  })

  it('unknown slug → 404', async () => {
    mockRequireUser.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue(null)

    const res = await GET_ONE(new NextRequest('http://localhost'), ctx('ghost'))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/projects (create, admin only)', () => {
  it('client → 403', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await POST(jsonPost({ name: 'Acme', slug: 'acme-site' }))
    expect(res.status).toBe(403)
  })

  it('unauthenticated → 401', async () => {
    mockRequireRole.mockRejectedValue(new UnauthorizedError())
    const res = await POST(jsonPost({ name: 'Acme', slug: 'acme-site' }))
    expect(res.status).toBe(401)
  })

  it('malformed JSON → 400 INVALID_JSON', async () => {
    const res = await POST(jsonPost('not json{', true))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_JSON')
  })

  it('invalid body → 400 VALIDATION', async () => {
    const res = await POST(jsonPost({ name: '', slug: 'Bad Slug' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION')
  })

  it('admin, fresh slug → 201', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue(null)
    vi.mocked(createProject).mockResolvedValue({ id: 'p9', slug: 'acme-site' } as never)

    const res = await POST(jsonPost({ name: 'Acme', slug: 'acme-site' }))
    expect(res.status).toBe(201)
    expect(createProject).toHaveBeenCalledOnce()
  })

  it('admin, duplicate slug → 400 (no insert)', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(getProjectBySlug).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)

    const res = await POST(jsonPost({ name: 'Acme', slug: 'acme-site' }))
    expect(res.status).toBe(400)
    expect(createProject).not.toHaveBeenCalled()
  })
})

describe('PATCH / DELETE /api/projects/:slug (admin only)', () => {
  it('PATCH as client → 403', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    })
    const res = await PATCH(req, ctx('acme-site'))
    expect(res.status).toBe(403)
    expect(updateProject).not.toHaveBeenCalled()
  })

  it('DELETE as client → 403', async () => {
    mockRequireRole.mockRejectedValue(new ForbiddenError())
    const res = await DELETE(new NextRequest('http://localhost'), ctx('acme-site'))
    expect(res.status).toBe(403)
    expect(deleteProject).not.toHaveBeenCalled()
  })

  it('DELETE as admin, unknown slug → 404', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(deleteProject).mockResolvedValue(null)

    const res = await DELETE(new NextRequest('http://localhost'), ctx('ghost'))
    expect(res.status).toBe(404)
  })

  it('DELETE as admin, existing → 200 (hard delete)', async () => {
    mockRequireRole.mockResolvedValue({ id: 'a1', role: 'admin' } as never)
    vi.mocked(deleteProject).mockResolvedValue({ id: 'p1', slug: 'acme-site' } as never)

    const res = await DELETE(new NextRequest('http://localhost'), ctx('acme-site'))
    expect(res.status).toBe(200)
    expect(deleteProject).toHaveBeenCalledWith('acme-site')
  })
})
