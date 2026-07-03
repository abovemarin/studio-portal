import { z } from 'zod'

const role = z.enum(['admin', 'client'])

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role,
})

export const updateUserRoleSchema = z.object({ role })

export const userParamSchema = z.object({ id: z.string().uuid() })

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
