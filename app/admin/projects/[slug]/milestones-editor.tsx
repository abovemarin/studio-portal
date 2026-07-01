'use client'

import { useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, ExternalLink, ListChecks } from 'lucide-react'
import { Card, CardContent } from '@/components/card'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { StatusPill, type MilestoneStatus } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import type { Milestone } from '@/lib/db/schema'
import { SectionLabel } from './section-label'

const MILESTONE_STATUSES: MilestoneStatus[] = ['pending', 'in_progress', 'in_review', 'approved']
const STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  in_review: 'In Review',
  approved: 'Approved',
}

type Draft = {
  title: string
  description: string
  deliverableUrl: string
  status: MilestoneStatus
}

const emptyDraft: Draft = { title: '', description: '', deliverableUrl: '', status: 'pending' }

export function MilestonesEditor({
  slug,
  milestones,
}: {
  slug: string
  milestones: Milestone[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'Something went wrong.')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Network error. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function create(draft: Draft) {
    const ok = await send(`/api/projects/${slug}/milestones`, 'POST', draftToBody(draft))
    if (ok) setAdding(false)
  }

  async function update(id: string, draft: Draft) {
    const ok = await send(`/api/milestones/${id}`, 'PATCH', draftToBody(draft))
    if (ok) setEditingId(null)
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete milestone “${title}”? This cannot be undone.`)) return
    await send(`/api/milestones/${id}`, 'DELETE')
  }

  // Swap two adjacent milestones by assigning each its new 1-based display position.
  // Two non-transactional PATCHes (see SPECS decisions log); refresh reveals true state.
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= milestones.length) return
    const a = milestones[index]
    const b = milestones[target]
    setBusy(true)
    setError(null)
    try {
      const results = await Promise.all([
        fetch(`/api/milestones/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: target + 1 }),
        }),
        fetch(`/api/milestones/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: index + 1 }),
        }),
      ])
      if (results.some((r) => !r.ok)) {
        setError('Reorder failed. The list has been refreshed to its current state.')
      }
      router.refresh()
    } catch {
      setError('Network error while reordering.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="section-milestones">
      <SectionLabel id="section-milestones">Milestones</SectionLabel>

      {error && (
        <p role="alert" className="mb-4 font-sans text-xs text-red-500">
          {error}
        </p>
      )}

      {milestones.length === 0 && !adding ? (
        <EmptyState
          icon={<ListChecks size={20} strokeWidth={1.5} />}
          title="No milestones yet"
          description="Add the first milestone to start tracking this project's deliverables."
          action={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              Add milestone
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {milestones.map((m, i) =>
            editingId === m.id ? (
              <MilestoneForm
                key={m.id}
                initial={{
                  title: m.title,
                  description: m.description ?? '',
                  deliverableUrl: m.deliverableUrl ?? '',
                  status: m.status,
                }}
                busy={busy}
                submitLabel="Save"
                onSubmit={(draft) => update(m.id, draft)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card key={m.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans text-sm font-semibold text-text">{m.title}</h3>
                        <StatusPill status={m.status} />
                      </div>
                      {m.description && (
                        <p className="mt-1.5 font-sans text-sm text-text-secondary">
                          {m.description}
                        </p>
                      )}
                      {m.deliverableUrl && (
                        <a
                          href={m.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded font-sans text-xs font-medium text-accent transition-colors duration-200 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />
                          Deliverable
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label={`Move ${m.title} up`}
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Move ${m.title} down`}
                        disabled={busy || i === milestones.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Edit ${m.title}`}
                        disabled={busy}
                        onClick={() => setEditingId(m.id)}
                      >
                        <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${m.title}`}
                        disabled={busy}
                        onClick={() => remove(m.id, m.title)}
                      >
                        <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}

          {adding ? (
            <MilestoneForm
              initial={emptyDraft}
              busy={busy}
              submitLabel="Add milestone"
              onSubmit={create}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <div>
              <Button variant="secondary" size="sm" onClick={() => setAdding(true)} disabled={busy}>
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                Add milestone
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function draftToBody(draft: Draft) {
  return {
    title: draft.title,
    description: draft.description || null,
    deliverableUrl: draft.deliverableUrl,
    status: draft.status,
  }
}

function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors duration-200 hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}

function MilestoneForm({
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  busy: boolean
  submitLabel: string
  onSubmit: (draft: Draft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const descId = useId()
  const statusId = useId()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(draft)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
            disabled={busy}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={descId} className="font-sans text-sm font-medium text-text">
              Description
            </label>
            <textarea
              id={descId}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              disabled={busy}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface-bg px-3 py-2 font-sans text-sm text-text placeholder:text-text-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <Input
            label="Deliverable URL"
            type="url"
            placeholder="https://…"
            value={draft.deliverableUrl}
            onChange={(e) => setDraft({ ...draft, deliverableUrl: e.target.value })}
            disabled={busy}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={statusId} className="font-sans text-sm font-medium text-text">
              Status
            </label>
            <select
              id={statusId}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as MilestoneStatus })}
              disabled={busy}
              className="h-10 w-full rounded-lg border border-border bg-surface-bg px-3 font-sans text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-56"
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={busy || !draft.title.trim()}>
              {busy ? 'Saving…' : submitLabel}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
