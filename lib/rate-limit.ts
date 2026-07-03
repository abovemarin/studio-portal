interface Window {
  count: number
  resetAt: number
}

// Swappable behind RateLimitStore so a shared store (e.g. Redis) can replace the
// in-memory implementation as a contained change when the app goes multi-instance —
// see SPECS.md decisions log. Until then, in-memory is correct for a single Railway
// instance and adds no infrastructure.
export interface RateLimitStore {
  /** Returns true if the action is allowed for `key`, false if the limit is exceeded
   *  within the current window. */
  hit(key: string, limit: number, windowMs: number): boolean
  /** Test-only: clear all state. Production code never calls this. */
  reset(): void
}

class InMemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, Window>()

  hit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const existing = this.windows.get(key)

    if (!existing || now > existing.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (existing.count >= limit) return false

    existing.count += 1
    return true
  }

  reset(): void {
    this.windows.clear()
  }
}

const store: RateLimitStore = new InMemoryRateLimitStore()

/**
 * Returns true if the action is allowed for `key`, false if the limit is exceeded
 * within the current window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return store.hit(key, limit, windowMs)
}

// Test-only. No app/api route imports this.
export function __resetRateLimitsForTests(): void {
  store.reset()
}
