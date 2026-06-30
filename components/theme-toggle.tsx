"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light/dark theme"
    >
      {/* CSS controls visibility — no JS state, no hydration mismatch */}
      <span className="dark:hidden">
        <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="hidden dark:inline-flex">
        <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
      </span>
    </Button>
  )
}
