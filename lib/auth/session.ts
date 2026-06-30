import { headers } from 'next/headers'
import { auth } from './index'

export type Role = 'admin' | 'client'

/**
 * Typed auth errors thrown by the helpers below. Route boundaries map these onto the
 * API envelope ({ ok: false, error: { code, message } }) with the right HTTP status.
 */
export class UnauthorizedError extends Error {
  readonly code = 'UNAUTHORIZED'
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** Resolve the current session from request cookies (DB-backed, server-side). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Require an authenticated user, or throw UnauthorizedError. */
export async function requireUser() {
  const session = await getSession()
  if (!session) throw new UnauthorizedError()
  return session.user
}

/** Require an authenticated user with the given role, or throw. */
export async function requireRole(role: Role) {
  const user = await requireUser()
  if ((user as { role?: Role }).role !== role) throw new ForbiddenError()
  return user
}
