import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ListChecks } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ThemeToggle } from '@/components/theme-toggle'
import { getSession } from '@/lib/auth/session'
import { getProjectBySlug, getProjectMember } from '@/lib/db/projects'
import { listMilestonesForProject } from '@/lib/db/milestones'
import { listCommentsForProject, type ProjectComment } from '@/lib/db/comments'
import { MilestoneList } from './milestone-list'

// Session + per-request DB read: never prerender (the build has no DB). Explicit so root
// loading.tsx/error.tsx boundaries can't destabilise dynamic inference into a build-time query.
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export default async function ProjectDetailPage({ params }: Ctx) {
  const { slug } = await params

  // Identity first — pages redirect (they don't return JSON envelopes).
  const session = await getSession()
  if (!session) redirect('/login')
  const isAdmin = (session.user as { role?: string }).role === 'admin'

  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  // Membership gate: admin bypasses; a non-member gets a 404 (no existence leak).
  if (!isAdmin) {
    const member = await getProjectMember(project.id, session.user.id)
    if (!member) notFound()
  }

  const [milestones, comments] = await Promise.all([
    listMilestonesForProject(project.id),
    listCommentsForProject(project.id),
  ])

  const commentsByMilestone = new Map<string, ProjectComment[]>()
  for (const comment of comments) {
    const bucket = commentsByMilestone.get(comment.milestoneId)
    if (bucket) bucket.push(comment)
    else commentsByMilestone.set(comment.milestoneId, [comment])
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
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
            /{project.slug}
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            {project.name}
          </h1>
        </div>

        {milestones.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={20} strokeWidth={1.5} />}
            title="No milestones yet"
            description="The studio hasn't added any milestones to this project."
          />
        ) : (
          <MilestoneList milestones={milestones} commentsByMilestone={commentsByMilestone} />
        )}
      </main>
    </div>
  )
}
