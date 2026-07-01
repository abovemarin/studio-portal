import { asc } from 'drizzle-orm'
import { db } from './index'
import { users } from './schema'
import type { User } from './schema'

/** All users, for the admin member picker. Ordered by name (nulls last), then email. */
export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name), asc(users.email))
}
