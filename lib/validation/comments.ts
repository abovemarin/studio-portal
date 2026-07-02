import { z } from 'zod'

// Wire field is `body` to match the SPECS request contract (POST { body }).
export const createCommentSchema = z.object({
  // .trim() first so whitespace-only bodies fail .min(1) (comments.body is NOT NULL;
  // a blank comment is meaningless). The trimmed value is what gets stored.
  body: z.string().trim().min(1, 'Comment cannot be empty.').max(5000),
})

export const commentIdParamSchema = z.object({ id: z.string().uuid() })

export type CreateCommentInput = z.infer<typeof createCommentSchema>
