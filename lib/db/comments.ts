import { asc, eq } from 'drizzle-orm'
import { db } from './index'
import { comments } from './schema'
import type { Comment } from './schema'
import type { CreateCommentInput } from '@/lib/validation/comments'

/** Comments for a milestone, oldest first (thread order). Consumed by the Module 6.1
 *  project detail; no route exposes this in session 5.1. */
export async function listCommentsForMilestone(milestoneId: string): Promise<Comment[]> {
  return db
    .select()
    .from(comments)
    .where(eq(comments.milestoneId, milestoneId))
    .orderBy(asc(comments.createdAt))
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const [row] = await db.select().from(comments).where(eq(comments.id, id)).limit(1)
  return row ?? null
}

/** Store the body verbatim — sanitization is read-time (escaped on render), not write-time. */
export async function createComment(
  milestoneId: string,
  authorId: string,
  data: CreateCommentInput,
): Promise<Comment> {
  const [row] = await db
    .insert(comments)
    .values({ milestoneId, authorId, body: data.body })
    .returning()
  return row
}

export async function deleteComment(id: string): Promise<Comment | null> {
  const [row] = await db.delete(comments).where(eq(comments.id, id)).returning()
  return row ?? null
}
