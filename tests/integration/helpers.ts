import { db } from '@/lib/db'
import { users, projects, projectMembers, milestones } from '@/lib/db/schema'
import type { User, Project, Milestone, NewUser, NewProject, NewMilestone } from '@/lib/db/schema'

// Monotonic suffix so unique columns (users.email, projects.slug) never collide within a run, even
// though beforeEach truncation already clears rows between tests.
let seq = 0
const uniq = () => `${Date.now().toString(36)}-${seq++}`

export async function seedUser(overrides: Partial<NewUser> = {}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ email: `user-${uniq()}@example.com`, name: 'Test User', role: 'client', ...overrides })
    .returning()
  return row
}

export async function seedProject(overrides: Partial<NewProject> = {}): Promise<Project> {
  const [row] = await db
    .insert(projects)
    .values({ name: 'Test Project', slug: `proj-${uniq()}`, ...overrides })
    .returning()
  return row
}

export async function seedMembership(projectId: string, userId: string): Promise<void> {
  await db.insert(projectMembers).values({ projectId, userId })
}

export async function seedMilestone(
  projectId: string,
  overrides: Partial<NewMilestone> = {},
): Promise<Milestone> {
  const [row] = await db
    .insert(milestones)
    .values({ projectId, title: 'Test Milestone', ...overrides })
    .returning()
  return row
}
