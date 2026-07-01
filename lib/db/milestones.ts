import { asc, eq, sql } from 'drizzle-orm'
import { db } from './index'
import { milestones } from './schema'
import type { Milestone } from './schema'
import type { CreateMilestoneInput, UpdateMilestoneInput } from '@/lib/validation/milestones'

/**
 * Milestones for a project, in display order. `position ASC NULLS LAST, created_at ASC`
 * keeps any legacy null-position rows (seed data) deterministic behind the ordered ones.
 */
export async function listMilestonesForProject(projectId: string): Promise<Milestone[]> {
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(sql`${milestones.position} asc nulls last`, asc(milestones.createdAt))
}

export async function getMilestoneById(id: string): Promise<Milestone | null> {
  const [row] = await db.select().from(milestones).where(eq(milestones.id, id)).limit(1)
  return row ?? null
}

/**
 * Create a milestone, auto-assigning `position = MAX(position) + 1` within the project so the
 * client never sends a position on create. The subquery runs in the same statement — no race
 * window between reading the max and inserting.
 */
export async function createMilestone(
  projectId: string,
  data: CreateMilestoneInput,
): Promise<Milestone> {
  const nextPosition = sql<number>`(
    select coalesce(max(${milestones.position}), 0) + 1
    from ${milestones}
    where ${milestones.projectId} = ${projectId}
  )`
  const [row] = await db
    .insert(milestones)
    .values({ ...data, projectId, position: nextPosition })
    .returning()
  return row
}

export async function updateMilestone(
  id: string,
  data: UpdateMilestoneInput,
): Promise<Milestone | null> {
  const [row] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning()
  return row ?? null
}

export async function deleteMilestone(id: string): Promise<Milestone | null> {
  const [row] = await db.delete(milestones).where(eq(milestones.id, id)).returning()
  return row ?? null
}
