import { z } from 'zod'

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
        'DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)'
      ),
    // Auth (Better Auth) — secret signs/encrypts session tokens.
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 chars'),
    // Public origin used to build magic-link callback URLs (no trailing slash).
    BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
    // Email (Resend). Optional in dev (links are logged to the console); required to
    // actually send in production. Treat an empty `RESEND_API_KEY=` line as unset so the
    // committed .env.example placeholder doesn't fail boot in dev.
    RESEND_API_KEY: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().min(1).optional()
    ),
    EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || !!env.RESEND_API_KEY, {
    path: ['RESEND_API_KEY'],
    message: 'RESEND_API_KEY is required in production',
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const lines = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${lines}\n\nCopy .env.example to .env.local and fill in the values.`)
}

export const env = parsed.data
