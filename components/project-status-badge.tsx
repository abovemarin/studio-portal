import { cn } from "@/lib/utils"

export type ProjectStatus = "active" | "paused" | "completed" | "archived"

const labels: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
}

/**
 * Neutral, token-based badge for PROJECT status. Deliberately not `StatusPill` — that
 * component is typed to the four milestone statuses and carries milestone semantics/colors.
 * Project status uses a quiet outlined treatment so it reads as metadata, not a call-out.
 */
export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface-raised px-2.5 py-0.5",
        "font-sans text-xs font-medium uppercase tracking-wide text-text-secondary",
        className,
      )}
    >
      {labels[status]}
    </span>
  )
}
