import Link from 'next/link'
import { FolderOpen, Plus } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/button'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { listProjectsForAdmin } from '@/lib/db/projects'

// Session + per-request DB read: never prerender (the build has no DB). Explicit so root
// loading.tsx/error.tsx boundaries can't destabilise dynamic inference into a build-time query.
export const dynamic = 'force-dynamic'

export default async function AdminProjectsPage() {
  const projects = await listProjectsForAdmin()

  return (
    <>
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="font-sans text-xs uppercase tracking-widest text-text-muted">
            The Scaler Studio — Admin
          </p>
          <div className="flex items-center gap-2">
            <Link href="/admin/projects/new">
              <Button variant="secondary" size="sm">
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                New project
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10">
          <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            Projects
          </h1>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={20} strokeWidth={1.5} />}
            title="No projects yet"
            description="Once a project is created it will appear here, ready to manage milestones and members."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.slug}`}
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
                    <p className="font-sans text-sm text-text-secondary">
                      {project.summary || 'No summary yet.'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
