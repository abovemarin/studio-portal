export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ")
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const absoluteFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/**
 * Human "updated N ago" recency label from an existing timestamp. Uses
 * Intl.RelativeTimeFormat (so it yields "yesterday"/"last week" where natural) up to ~4 weeks,
 * then falls back to an absolute date — a relative label that far out reads worse than "Mar 3, 2026".
 * A signed diff is passed to the formatter (past → negative), so it renders "… ago".
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime()
  const abs = Math.abs(diffMs)

  if (abs < MINUTE) return "just now"
  if (abs < HOUR) return relativeFormatter.format(Math.round(diffMs / MINUTE), "minute")
  if (abs < DAY) return relativeFormatter.format(Math.round(diffMs / HOUR), "hour")
  if (abs < WEEK) return relativeFormatter.format(Math.round(diffMs / DAY), "day")
  if (abs < 4 * WEEK) return relativeFormatter.format(Math.round(diffMs / WEEK), "week")
  return absoluteFormatter.format(date)
}
