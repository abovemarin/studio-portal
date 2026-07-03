'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/card'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import type { ProjectStatus } from '@/components/project-status-badge'

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

export function ProjectCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, status, summary: summary || undefined }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'Could not create project.')
        return
      }
      router.push(`/admin/projects/${slug}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={saving}
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-website-redesign"
            required
            disabled={saving}
          />
          <p className="-mt-2 font-sans text-xs text-text-muted">
            Lowercase letters and digits, hyphen-separated. Used in the project&apos;s URL.
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-summary"
              className="font-sans text-sm font-medium text-text"
            >
              Summary
            </label>
            <textarea
              id="project-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-bg px-3 py-2 font-sans text-sm text-text placeholder:text-text-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Short description of the project."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-status"
              className="font-sans text-sm font-medium text-text"
            >
              Status
            </label>
            <select
              id="project-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-surface-bg px-3 font-sans text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-56"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="font-sans text-xs text-danger">
              {error}
            </p>
          )}
          <div>
            <Button type="submit" variant="primary" disabled={saving || !name.trim() || !slug.trim()}>
              {saving ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
