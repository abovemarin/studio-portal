import { env } from '@/lib/env'
import { getResend } from './resend'

interface MagicLinkEmail {
  email: string
  url: string
}

/**
 * Send (or, in dev, log) a magic-link sign-in email.
 *
 * Per SPECS/CLAUDE.md: never send real email in development — the link is logged to
 * the console so the flow can be exercised without spamming. Only production sends
 * via Resend.
 */
export async function sendMagicLinkEmail({ email, url }: MagicLinkEmail): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    console.log(
      `\n🔗 Magic link for ${email}:\n   ${url}\n   (dev transport — no real email sent)\n`
    )
    return
  }

  const { error } = await getResend().emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Your Studio Portal sign-in link',
    text: `Click to sign in to Studio Portal:\n\n${url}\n\nThis link expires shortly and can only be used once. If you didn't request it, you can ignore this email.`,
  })

  if (error) {
    throw new Error(`Failed to send magic-link email: ${error.message}`)
  }
}
