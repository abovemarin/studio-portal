export default function ProjectDetailLoading() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-surface-raised" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14" aria-busy="true" aria-live="polite">
        <div className="mb-10">
          <div className="mb-3 h-3 w-20 animate-pulse rounded bg-surface-raised" />
          <div className="h-12 w-80 animate-pulse rounded bg-surface-raised sm:h-16" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-border bg-surface-card"
            />
          ))}
        </div>
        <span className="sr-only">Loading project…</span>
      </main>
    </div>
  )
}
