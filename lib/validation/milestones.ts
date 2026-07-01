import { z } from 'zod'

// Wire fields are camelCase (`deliverableUrl`, `position`) by deliberate choice: SPECS gave
// Members an explicit snake_case contract (`{ user_id }`) but specified no body contract for
// milestones, so these follow the general TS naming convention (camelCase) instead of guessing.
const milestoneStatus = z.enum(['pending', 'in_progress', 'in_review', 'approved'])

// deliverableUrl: a valid URL, null, or '' (to clear). The route normalizes '' → null before
// the data layer.
const deliverableUrl = z.union([z.string().url(), z.literal('')]).nullable().optional()

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: milestoneStatus.optional(), // DB defaults to 'pending'
  deliverableUrl,
  // position is intentionally omitted — auto-assigned server-side on create.
})

export const updateMilestoneSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: milestoneStatus.optional(),
    deliverableUrl,
    position: z.number().int().optional(), // set during reorder (two-PATCH swap)
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

export const milestoneIdParamSchema = z.object({ id: z.string().uuid() })

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
