import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../lib/db/schema'

const [email, name] = process.argv.slice(2)

if (!email) {
  console.error('Usage: tsx scripts/bootstrap-admin.ts <email> [name]')
  process.exit(1)
}

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function main() {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) })

  if (!existing) {
    const [created] = await db
      .insert(schema.users)
      .values({ email, name, role: 'admin' })
      .returning()
    console.log(`Created admin user ${email} (id=${created.id}).`)
    return
  }

  if (existing.role === 'admin') {
    console.log(`${email} is already an admin (id=${existing.id}). No changes made.`)
    return
  }

  const [updated] = await db
    .update(schema.users)
    .set({ role: 'admin' })
    .where(eq(schema.users.id, existing.id))
    .returning()
  console.log(`Promoted ${email} to admin (id=${updated.id}).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('bootstrap-admin failed:', err)
    process.exit(1)
  })
