import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getSession } from '@/lib/auth/session'
import { listUsers } from '@/lib/db/users'
import { UsersEditor } from './users-editor'

// Session + per-request DB read: never prerender (the build has no DB). Explicit so root
// loading.tsx/error.tsx boundaries can't destabilise dynamic inference into a build-time query.
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([getSession(), listUsers()])

  return (
    <>
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg font-sans text-xs uppercase tracking-widest text-text-muted transition-colors duration-200 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            All projects
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10">
          <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            Users
          </h1>
        </div>

        <UsersEditor users={users} currentUserId={session!.user.id} />
      </main>
    </>
  )
}
