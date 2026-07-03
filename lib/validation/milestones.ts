import { z } from 'zod'

// Wire fields are camelCase (`deliverableUrl`, `position`) by deliberate choice: SPECS gave
// Members an explicit snake_case contract (`{ user_id }`) but specified no body contract for
// milestones, so these follow the general TS naming convention (camelCase) instead of guessing.
const milestoneStatus = z.enum(['pending', 'in_progress', 'in_review', 'approved'])

// deliverableUrl: an http/https URL, null, or '' (to clear). The scheme allow-list rejects
// javascript:/data: and other schemes at the boundary (7.1 security audit): the client renders
// this as a clickable <a href>, so a non-http(s) scheme is a latent XSS/redirect vector. The
// route normalizes '' → null before the data layer.
const httpUrl = z
  .string()
  .url()
  // Guard the parse: zod v4 runs every check (no short-circuit), so this refine also fires on
  // inputs that already failed .url() (and on the '' branch of the union below) — new URL() would
  // throw a raw TypeError there. try/catch keeps it a clean validation failure.
  .refine((u) => {
    try {
      return /^https?:$/.test(new URL(u).protocol)
    } catch {
      return false
    }
  }, 'URL must use http or https.')
const deliverableUrl = z.union([httpUrl, z.literal('')]).nullable().optional()

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
