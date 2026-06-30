import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 px-8 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-fg">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-sans text-base font-semibold text-text">
          {title}
        </h3>
        <p className="font-sans text-sm text-text-secondary max-w-xs">
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
