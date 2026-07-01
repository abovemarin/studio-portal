import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

/**
 * Server-side gate for the whole /admin subtree. Redirects non-admins before any admin
 * screen renders. This is defense-in-depth on top of the per-route authz — the API routes
 * still enforce `requireRole('admin')` independently (hiding a screen is not security).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  return <div className="min-h-screen bg-surface-bg">{children}</div>
}
