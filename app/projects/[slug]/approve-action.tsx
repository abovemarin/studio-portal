'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'

// Wires the Approve button left inert in 6.1. Rendered per-milestone by the (server)
// milestone-list only when status is 'in_review'. Two-step reveal: Approve -> optional note
// -> Confirm, mirroring the setAdding toggle in the admin milestones-editor.
export function ApproveAction({ milestoneId }: { milestoneId: string }) {
  const router = useRouter()
  const noteId = useId()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Always send a JSON body — the route calls request.json() and 400s on an empty body.
        // An absent note serialises to {}, which approveSchema accepts.
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        // A real 409 means the milestone is no longer in_review. Do NOT refresh: that would
        // unmount this component and the message would flash then vanish unread. Show a
        // persistent, self-explaining message and let the user reload to reconcile.
        if (res.status === 409) {
          setError('This milestone is no longer awaiting approval — reload the page to see its current state.')
        } else {
          setError(json?.error?.message ?? 'Something went wrong.')
        }
        return
      }
      // Success: status flips to 'approved' server-side; the refresh re-renders the list, the
      // in_review block (and this component) stops rendering — no local reset needed.
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            Approve
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-sans text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="font-sans text-sm font-medium text-text">
          Note <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          rows={2}
          placeholder="Add a note with your approval."
          className="w-full rounded-lg border border-border bg-surface-bg px-3 py-2 font-sans text-sm text-text placeholder:text-text-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      {error && (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={confirm} disabled={busy}>
          {busy ? 'Approving…' : 'Confirm approval'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
