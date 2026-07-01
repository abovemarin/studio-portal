import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getProjectBySlug, listProjectMembers } from '@/lib/db/projects'
import { listMilestonesForProject } from '@/lib/db/milestones'
import { listUsers } from '@/lib/db/users'
import { ProjectEditor } from './project-editor'
import { MilestonesEditor } from './milestones-editor'
import { MembersEditor } from './members-editor'

type Ctx = { params: Promise<{ slug: string }> }

export default async function AdminProjectDetailPage({ params }: Ctx) {
  const { slug } = await params

  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const [milestones, members, users] = await Promise.all([
    listMilestonesForProject(project.id),
    listProjectMembers(project.id),
    listUsers(),
  ])

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
            /{project.slug}
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            {project.name}
          </h1>
        </div>

        <div className="flex flex-col gap-14">
          <ProjectEditor project={project} />
          <MilestonesEditor slug={project.slug} milestones={milestones} />
          <MembersEditor slug={project.slug} members={members} users={users} />
        </div>
      </main>
    </>
  )
}
