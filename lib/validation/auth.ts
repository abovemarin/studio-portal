import { z } from 'zod'

export const requestLinkSchema = z.object({
  email: z.string().email(),
})

export const callbackQuerySchema = z.object({
  token: z.string().min(1),
})

export type RequestLinkInput = z.infer<typeof requestLinkSchema>
