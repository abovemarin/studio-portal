import type { ReactNode } from 'react'

/** Shared section divider used across the admin detail editors (mirrors the design gallery). */
export function SectionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2
        id={id}
        className="shrink-0 font-sans text-xs font-semibold uppercase tracking-widest text-text-muted"
      >
        {children}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
