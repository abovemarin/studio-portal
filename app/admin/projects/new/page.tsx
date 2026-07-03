import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProjectCreateForm } from './project-create-form'

export default function NewProjectPage() {
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
            New project
          </p>
          <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-text sm:text-7xl">
            Create
          </h1>
        </div>

        <ProjectCreateForm />
      </main>
    </>
  )
}
