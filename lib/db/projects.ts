import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from './index'
import { projects, projectMembers, milestones, users } from './schema'
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

export type ClientProjectWithReview = Project & {
  inReviewCount: number
  lastActivityAt: Date | null
}

/**
 * The client's projects, each enriched for the self-explaining dashboard:
 *   - `inReviewCount` — milestones awaiting this client's review ("needs your review").
 *   - `lastActivityAt` — recency cue. **Deliberately `max(milestone.updated_at)` only, NOT the
 *     project row's `updated_at`.** For a client reading "what changed", milestone activity
 *     (status flips, new deliverable) is the meaningful signal; project-row edits are
 *     administrative and would otherwise dominate and drown out the useful cue. `null` when the
 *     project has no milestones yet.
 *
 * Membership scoping is the **same `innerJoin(projectMembers)` + `where(userId)`** as
 * `listProjectsForClient` — the two must agree on what a client can see. The milestones join is a
 * **LEFT** join so a project with zero milestones is NOT dropped: it returns one row with
 * `inReviewCount: 0` and `lastActivityAt: null`. `groupBy(projects.id)` (the PK) collapses the
 * per-milestone fan-out; other project columns are functionally dependent on the PK (Postgres).
 *
 * Non-async on purpose — do NOT convert to `async`: returning the lazy builder is what lets the
 * scoping test read the compiled SQL via `.toSQL()` (an async fn would hand back a Promise with no
 * `.toSQL`, breaking tests/db/projects.test.ts). It executes identically when awaited by callers,
 * and the `Promise<…>` return type means any caller using the result as an array must await it.
 */
export function listProjectsForClientWithReview(
  userId: string,
): Promise<ClientProjectWithReview[]> {
  return db
    .select({
      ...getTableColumns(projects),
      // count(milestones.id), NOT count(*): on the null side of the LEFT join a milestone-less
      // project has one phantom all-null row — count(*) would tally it as 1, count(id) yields 0.
      // (The status filter already excludes it here, but count(id) makes the 0 unconditional.)
      inReviewCount: sql<number>`count(${milestones.id}) filter (where ${milestones.status} = 'in_review')`.mapWith(
        Number,
      ),
      // `.mapWith(milestones.updatedAt)` is load-bearing: a raw sql aggregate skips the column's
      // mode:'date' parsing, so max() would return a timestamptz STRING. Reusing the column's
      // decoder converts it to a Date (and drizzle keeps null as null for milestone-less projects).
      lastActivityAt: sql<Date | null>`max(${milestones.updatedAt})`.mapWith(milestones.updatedAt),
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
    .leftJoin(milestones, eq(milestones.projectId, projects.id))
    .where(eq(projectMembers.userId, userId))
    .groupBy(projects.id)
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

/** Members of a project joined to their user (for the admin member list). */
export async function listProjectMembers(projectId: string): Promise<
  Array<{ id: string; userId: string; name: string | null; email: string }>
> {
  return db
    .select({
      id: projectMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(desc(projectMembers.id))
}

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
