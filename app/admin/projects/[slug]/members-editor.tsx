'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/card'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import type { User } from '@/lib/db/schema'
import { SectionLabel } from './section-label'

type Member = { id: string; userId: string; name: string | null; email: string }

export function MembersEditor({
  slug,
  members,
  users,
}: {
  slug: string
  members: Member[]
  users: User[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memberIds = new Set(members.map((m) => m.userId))
  const candidates = users.filter((u) => !memberIds.has(u.id))

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

  async function add() {
    if (!selected) return
    const ok = await send(`/api/projects/${slug}/members`, 'POST', { user_id: selected })
    if (ok) setSelected('')
  }

  async function remove(userId: string, who: string) {
    if (!window.confirm(`Remove ${who} from this project?`)) return
    await send(`/api/projects/${slug}/members/${userId}`, 'DELETE')
  }

  return (
    <section aria-labelledby="section-members">
      <SectionLabel id="section-members">Members</SectionLabel>

      {error && (
        <p role="alert" className="mb-4 font-sans text-xs text-red-500">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={20} strokeWidth={1.5} />}
            title="No members yet"
            description="Add a client below to give them access to this project."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-medium text-text">
                        {m.name ?? m.email}
                      </p>
                      {m.name && (
                        <p className="truncate font-sans text-xs text-text-muted">{m.email}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${m.name ?? m.email}`}
                      title="Remove member"
                      disabled={busy}
                      onClick={() => remove(m.userId, m.name ?? m.email)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors duration-200 hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40"
                    >
                      <X size={16} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="member-picker" className="font-sans text-sm font-medium text-text">
              Add member
            </label>
            <select
              id="member-picker"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy || candidates.length === 0}
              className="h-10 w-full rounded-lg border border-border bg-surface-bg px-3 font-sans text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              <option value="">
                {candidates.length === 0 ? 'No users available' : 'Select a user…'}
              </option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} — ${u.email}` : u.email}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" onClick={add} disabled={busy || !selected}>
            <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>
    </section>
  )
}
