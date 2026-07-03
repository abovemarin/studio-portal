'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'
import { createCommentSchema } from '@/lib/validation/comments'

// Comment compose box left unbuilt in 6.1 (comments were read-only). Rendered per-milestone
// by the (server) milestone-list. Client-side validation reuses createCommentSchema so the
// empty + max-length constraints have a single definition; the route stays the source of truth.
export function CommentComposer({ milestoneId }: { milestoneId: string }) {
  const router = useRouter()
  const fieldId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on each successful post. The effect focuses the (now cleared, now re-enabled) textarea
  // after the re-render — focusing inline would hit the still-disabled field. Skips first mount.
  const [postedCount, setPostedCount] = useState(0)

  useEffect(() => {
    if (postedCount > 0) textareaRef.current?.focus()
  }, [postedCount])

  const valid = createCommentSchema.safeParse({ body }).success

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'Something went wrong.')
        return
      }
      // Clear the local field before refreshing — the refresh re-renders the server list (the
      // new comment appears) but does not remount this client component, so its state persists.
      setBody('')
      setPostedCount((c) => c + 1)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="sr-only">
        Add a comment
      </label>
      <textarea
        id={fieldId}
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={busy}
        rows={2}
        placeholder="Add a comment…"
        className="w-full rounded-lg border border-border bg-surface-bg px-3 py-2 font-sans text-sm text-text placeholder:text-text-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {error && (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={busy || !valid}>
          {busy ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </form>
  )
}
