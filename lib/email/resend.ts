import { Resend } from 'resend'
import { env } from '@/lib/env'

let client: Resend | null = null

/**
 * Lazily construct the Resend client. Only called on the production send path, so
 * the SDK is never instantiated in dev (where links are logged to the console).
 * Throws a clear error if the API key is missing.
 */
export function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — cannot send email')
  }
  client ??= new Resend(env.RESEND_API_KEY)
  return client
}
