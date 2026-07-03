'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/card'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { EmptyState } from '@/components/empty-state'
import type { User } from '@/lib/db/schema'

type Role = 'admin' | 'client'
const ROLES: Role[] = ['admin', 'client']

export function UsersEditor({
  users,
  currentUserId,
}: {
  users: User[]
  currentUserId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

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

  async function setRole(id: string, role: Role) {
    await send(`/api/users/${id}`, 'PATCH', { role })
  }

  async function invite(input: { email: string; name: string; role: Role }) {
    const ok = await send('/api/users', 'POST', {
      email: input.email,
      name: input.name || undefined,
      role: input.role,
    })
    if (ok) setInviting(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20} strokeWidth={1.5} />}
          title="No users yet"
          description="Invite the first client or admin to give them access."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-sm font-medium text-text">
                      {u.name ?? u.email}
                    </p>
                    {u.name && (
                      <p className="truncate font-sans text-xs text-text-muted">{u.email}</p>
                    )}
                  </div>
                  <select
                    aria-label={`Role for ${u.name ?? u.email}`}
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value as Role)}
                    disabled={busy || u.id === currentUserId}
                    title={u.id === currentUserId ? 'You cannot change your own role.' : undefined}
                    className="h-10 shrink-0 rounded-lg border border-border bg-surface-bg px-3 font-sans text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {inviting ? (
        <InviteForm busy={busy} onSubmit={invite} onCancel={() => setInviting(false)} />
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setInviting(true)} disabled={busy}>
            <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
            Invite user
          </Button>
        </div>
      )}
    </div>
  )
}

function InviteForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (input: { email: string; name: string; role: Role }) => void
  onCancel: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('client')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ email, name, role })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
          <Input
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="font-sans text-sm font-medium text-text">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={busy}
              className="h-10 w-full rounded-lg border border-border bg-surface-bg px-3 font-sans text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-56"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send invite'}
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
