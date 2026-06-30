import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { users, sessions, accounts, verifications } from '@/lib/db/schema'
import { sendMagicLinkEmail } from '@/lib/email'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Map Better Auth's singular models onto our existing plural tables.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  user: {
    // Surface our existing role column to Better Auth read-only — clients can never
    // set their own role through the auth API.
    additionalFields: {
      role: { type: 'string', input: false },
    },
  },
  advanced: {
    // users.id is a Postgres uuid with a gen_random_uuid() default — let the DB mint
    // ids rather than Better Auth's default text ids.
    database: { generateId: false },
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
  },
  // Built-in limiter on abusable endpoints (magic-link requests). SPECS requirement.
  rateLimit: { enabled: true },
  plugins: [
    magicLink({
      // Invite-only: only pre-provisioned users can sign in. Strangers get no account.
      disableSignUp: true,
      expiresIn: 60 * 15, // 15-minute single-use token
      storeToken: 'hashed',
      sendMagicLink: async ({ email, token }) => {
        // Override the link to hit our SPECS callback route (not Better Auth's native
        // verify endpoint, which we don't mount).
        const url = `${env.BETTER_AUTH_URL}/api/auth/callback?token=${encodeURIComponent(token)}`
        await sendMagicLinkEmail({ email, url })
      },
    }),
    nextCookies(), // must be the last plugin
  ],
})
