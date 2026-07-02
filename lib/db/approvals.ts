import { eq } from 'drizzle-orm'
import { db } from './index'
import { approvals, milestones } from './schema'
import type { Approval, Milestone } from './schema'
import type { ApproveInput } from '@/lib/validation/approvals'

export async function getApprovalForMilestone(milestoneId: string): Promise<Approval | null> {
  const [row] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.milestoneId, milestoneId))
    .limit(1)
  return row ?? null
}

/**
 * Approve a milestone: upsert the single approval row and flip the milestone to 'approved',
 * both in one transaction so they cannot diverge.
 *
 * Idempotency lives in the `unique(milestone_id)` constraint: `onConflictDoUpdate` means a
 * repeated approve never inserts a second row — it re-affirms the approval and updates the
 * note (SPECS "re-approving updates the note"). This is why the caller can safely re-POST.
 */
export async function approveMilestone(
  milestoneId: string,
  approverId: string,
  data: ApproveInput,
): Promise<{ approval: Approval; milestone: Milestone }> {
  const note = data.note ?? null
  return db.transaction(async (tx) => {
    const [approval] = await tx
      .insert(approvals)
      .values({ milestoneId, approvedBy: approverId, note })
      .onConflictDoUpdate({
        target: approvals.milestoneId,
        // updatedAt is set explicitly — Drizzle's $onUpdate fires on .update(), not on upsert.
        set: { note, updatedAt: new Date() },
      })
      .returning()
    const [milestone] = await tx
      .update(milestones)
      .set({ status: 'approved' })
      .where(eq(milestones.id, milestoneId))
      .returning()
    return { approval, milestone }
  })
}
