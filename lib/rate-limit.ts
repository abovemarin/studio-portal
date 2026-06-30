interface Window {
  count: number
  resetAt: number
}

// In-memory fixed-window limiter. Good enough for a single instance (dev/staging) and
// for SPECS' "rate limit abusable endpoints" baseline. A shared store (e.g. Redis) is
// the production/multi-instance path — revisit in the ops pass.
const windows = new Map<string, Window>()

/**
 * Returns true if the action is allowed for `key`, false if the limit is exceeded
 * within the current window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = windows.get(key)

  if (!existing || now > existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (existing.count >= limit) return false

  existing.count += 1
  return true
}
