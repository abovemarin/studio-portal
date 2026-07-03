/**
 * One structured JSON line per error, read via Railway's log viewer/CLI. Built as an
 * explicit object rather than JSON.stringify(error) directly — Error instances serialize
 * to `{}` otherwise, so message/stack are pulled out by hand.
 */
export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const payload = {
    level: 'error' as const,
    scope,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    ...context,
  }
  console.error(JSON.stringify(payload))
}
