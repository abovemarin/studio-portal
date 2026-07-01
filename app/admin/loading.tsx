export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14" aria-busy="true" aria-live="polite">
      <div className="mb-10">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-surface-raised" />
        <div className="h-16 w-64 animate-pulse rounded bg-surface-raised" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-surface-card" />
        ))}
      </div>
      <span className="sr-only">Loading projects…</span>
    </main>
  )
}
