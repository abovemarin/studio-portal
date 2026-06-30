import { and, desc, eq, getTableColumns } from 'drizzle-orm'
import { db } from './index'
import { projects, projectMembers, users } from './schema'
import type {
  Project,
  ProjectMember,
  User,
  NewProject,
} from './schema'
import type { UpdateProjectInput } from '@/lib/validation/projects'

// ── Projects ────────────────────────────────────────────────────────────────

/** All projects, newest first. Admin-only view. */
export async function listProjectsForAdmin(): Promise<Project[]> {
  return db.select().from(projects).orderBy(desc(projects.createdAt))
}

/**
 * Projects the given user is a member of, newest first. Scoping is enforced by the
 * inner join on project_members — a client never sees a project they have no
 * membership row for. This is the boundary, not a post-query filter.
 */
export async function listProjectsForClient(userId: string): Promise<Project[]> {
  return db
    .select(getTableColumns(projects))
    .from(projects)
    .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, userId))
    .orderBy(desc(projects.createdAt))
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  return row ?? null
}

export async function createProject(data: NewProject): Promise<Project> {
  const [row] = await db.insert(projects).values(data).returning()
  return row
}

export async function updateProject(
  slug: string,
  data: UpdateProjectInput,
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set(data)
    .where(eq(projects.slug, slug))
    .returning()
  return row ?? null
}

/**
 * Hard delete (decision #2 — archiving is reachable via PATCH status='archived').
 * Cascades to project_members and milestones → comments/approvals per the schema FKs.
 * Returns the deleted row, or null if no project had that slug.
 */
export async function deleteProject(slug: string): Promise<Project | null> {
  const [row] = await db.delete(projects).where(eq(projects.slug, slug)).returning()
  return row ?? null
}

// ── Members ─────────────────────────────────────────────────────────────────

export async function getProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMember | null> {
  const [row] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function addProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMember> {
  const [row] = await db.insert(projectMembers).values({ projectId, userId }).returning()
  return row
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMember | null> {
  const [row] = await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .returning()
  return row ?? null
}

/** Validate a member target exists before insert, so a bad user_id is a clean 404
 *  rather than a leaked FK violation. */
export async function getUserById(userId: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return row ?? null
}
