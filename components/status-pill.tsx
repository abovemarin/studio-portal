import { cn } from "@/lib/utils"

export type MilestoneStatus = "pending" | "in_progress" | "in_review" | "approved"

const labels: Record<MilestoneStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  in_review: "In Review",
  approved: "Approved",
}

const pillClasses: Record<MilestoneStatus, string> = {
  pending: "bg-status-pending-bg text-status-pending-fg",
  in_progress: "bg-status-in-progress-bg text-status-in-progress-fg",
  in_review: "bg-status-in-review-bg text-status-in-review-fg",
  approved: "bg-status-approved-bg text-status-approved-fg",
}

const dotClasses: Record<MilestoneStatus, string> = {
  pending: "bg-status-pending-dot",
  in_progress: "bg-status-in-progress-dot",
  in_review: "bg-status-in-review-dot",
  approved: "bg-status-approved-dot",
}

interface StatusPillProps {
  status: MilestoneStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-sans",
        "transition-colors duration-200",
        pillClasses[status],
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[status])}
        aria-hidden="true"
      />
      {labels[status]}
    </span>
  )
}
