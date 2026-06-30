import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)'
    ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const lines = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${lines}\n\nCopy .env.example to .env.local and fill in the values.`)
}

export const env = parsed.data
