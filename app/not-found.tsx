import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'

// Rendered by any `notFound()` — including a non-member (or signed-out) hitting a project they
// can't see. Copy is deliberately existence-neutral: "not found OR no access" reads the same, so
// membership isn't leaked. Distinct from error.tsx, which is for genuine 500s with a retry.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <main className="mx-auto max-w-4xl px-6 py-14">
        <EmptyState
          icon={<FileQuestion size={20} strokeWidth={1.5} />}
          title="Page not found"
          description="We couldn't find that page. It may have moved, or you may not have access to it."
          action={
            <Link
              href="/"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 font-sans text-sm font-medium text-accent-fg transition-all duration-300 hover:-translate-y-px hover:bg-accent-hover hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back to projects
            </Link>
          }
        />
      </main>
    </div>
  )
}
