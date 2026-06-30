import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'

loadEnvConfig(process.cwd())

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required for database operations.\nCopy .env.example to .env.local and fill in the value.'
  )
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
