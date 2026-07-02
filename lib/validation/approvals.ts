import { z } from 'zod'

// SPECS request contract: POST /api/milestones/:id/approve { note? }.
export const approveSchema = z.object({
  // note is optional (an approval needs no comment). Trim + max mirrors the comment-body
  // rules; unlike comments there is no .min(1) — a blank/absent note is a valid approval.
  note: z.string().trim().max(5000).optional(),
})

export const milestoneIdParamSchema = z.object({ id: z.string().uuid() })

export type ApproveInput = z.infer<typeof approveSchema>
