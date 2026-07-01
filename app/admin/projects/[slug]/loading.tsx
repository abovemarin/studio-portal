export default function AdminProjectLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14" aria-busy="true" aria-live="polite">
      <div className="mb-10">
        <div className="mb-3 h-3 w-20 animate-pulse rounded bg-surface-raised" />
        <div className="h-16 w-72 animate-pulse rounded bg-surface-raised" />
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface-card" />
        ))}
      </div>
      <span className="sr-only">Loading project…</span>
    </main>
  )
}
