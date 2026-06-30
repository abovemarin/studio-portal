import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:ring-accent",
  secondary:
    "border border-border bg-surface-card text-text hover:bg-surface-raised hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:ring-accent",
  ghost:
    "text-text-secondary hover:text-text hover:bg-surface-card focus-visible:ring-accent",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-sans font-medium transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}
