import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { getSession } from '@/lib/auth/session'
import { listProjectsForClientWithReview } from '@/lib/db/projects'
import { relativeTime } from '@/lib/utils'

// Session + per-request DB read: never prerender (the build has no DB). Explicit so root
// loading.tsx/error.tsx boundaries can't destabilise dynamic inference into a build-time query.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role === 'admin') redirect('/admin')

  const projects = await listProjectsForClientWithReview(session.user.id)
  const heroName = session.user.name?.trim() || 'Your Projects'
  const reviewTotal = projects.reduce((sum, p) => sum + p.inReviewCount, 0)

  return (
    <div className="min-h-screen bg-surface-bg">
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="font-sans text-xs uppercase tracking-widest text-text-muted">
            The Scaler Studio
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        {reviewTotal > 0 && (
          <div className="mb-8 flex items-center gap-3 rounded-xl bg-accent-subtle px-4 py-3">
            <Bell size={20} strokeWidth={1.5} className="shrink-0 text-accent-subtle-fg" aria-hidden="true" />
            <p className="font-sans text-sm font-semibold text-accent-subtle-fg">
              {reviewTotal} {reviewTotal === 1 ? 'milestone is' : 'milestones are'} awaiting your review
            </p>
          </div>
        )}

        <div className="mb-10">
          <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            {heroName}
          </h1>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={20} strokeWidth={1.5} />}
            title="No projects yet"
            description="Your projects will appear here once the studio shares one with you."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-sans text-sm font-semibold text-text">{project.name}</h2>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.inReviewCount > 0 && (
                      <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-2.5 py-0.5 font-sans text-xs font-semibold text-accent-subtle-fg">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                        {project.inReviewCount} {project.inReviewCount === 1 ? 'milestone needs' : 'milestones need'} your review
                      </p>
                    )}
                    <p className="font-sans text-sm text-text-secondary">
                      {project.summary || 'No summary yet.'}
                    </p>
                    {project.lastActivityAt && (
                      <p className="mt-3 font-sans text-xs text-text-muted">
                        Updated {relativeTime(project.lastActivityAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
