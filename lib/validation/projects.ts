import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug.')
const projectStatus = z.enum(['active', 'paused', 'completed', 'archived'])

export const createProjectSchema = z.object({
  name: z.string().min(1),
  slug,
  status: projectStatus.optional(), // DB defaults to 'active'
  summary: z.string().optional(),
})

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: slug.optional(),
    status: projectStatus.optional(),
    summary: z.string().nullable().optional(), // allow clearing
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

export const slugParamSchema = z.object({ slug })

// Wire field is snake_case (`user_id`) to match the SPECS request contract; the route
// maps it to camelCase before touching the data layer.
export const addMemberSchema = z.object({ user_id: z.string().uuid() })

export const memberParamSchema = z.object({ slug, userId: z.string().uuid() })

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
