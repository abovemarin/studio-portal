'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/card'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import type { Project } from '@/lib/db/schema'
import type { ProjectStatus } from '@/components/project-status-badge'
import { SectionLabel } from './section-label'

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [summary, setSummary] = useState(project.summary ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, summary: summary || null, status }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'Could not save changes.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="section-project">
      <SectionLabel id="section-project">Project details</SectionLabel>
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
              <p role="alert" className="font-sans text-xs text-red-500">
                {error}
              </p>
            )}
            <div>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
