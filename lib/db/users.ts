import { asc, eq } from 'drizzle-orm'
import { db } from './index'
import { users } from './schema'
import type { User } from './schema'
import type { InviteUserInput, UpdateUserRoleInput } from '@/lib/validation/users'

/** All users, for the admin member picker. Ordered by name (nulls last), then email. */
export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name), asc(users.email))
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email))
  return row ?? null
}

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id))
  return row ?? null
}

/** Pre-provisions a user row so the invite-only magic-link flow can send them a real link. */
export async function insertUser(data: InviteUserInput): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ email: data.email, name: data.name ?? null, role: data.role })
    .returning()
  return row
}

export async function updateUserRole(
  id: string,
  data: UpdateUserRoleInput,
): Promise<User | null> {
  const [row] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return row ?? null
}
