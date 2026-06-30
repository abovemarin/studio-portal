import type { ReactNode } from "react"
import { FolderOpen } from "lucide-react"
import { Button } from "@/components/button"
import { Card, CardHeader, CardContent } from "@/components/card"
import { StatusPill } from "@/components/status-pill"
import { Input } from "@/components/input"
import { EmptyState } from "@/components/empty-state"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DesignGallery() {
  return (
    <div className="min-h-screen bg-surface-bg">

      {/* Minimal top bar */}
      <header className="border-b border-border bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="font-sans text-xs uppercase tracking-widest text-text-muted">
            Design System — Session 1.3
          </p>
          <ThemeToggle />
        </div>
      </header>

      {/* Editorial hero — signature brand moment */}
      <div className="border-b border-border bg-surface-card px-6 pb-10 pt-8">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 font-sans text-xs uppercase tracking-widest text-text-muted">
            The Scaler Studio
          </p>
          <h1 className="font-display text-7xl font-bold uppercase leading-none tracking-tight text-text sm:text-8xl">
            Studio<br />Portal
          </h1>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <div className="flex flex-col gap-14">

          {/* Typography */}
          <section aria-labelledby="section-typography">
            <SectionLabel id="section-typography">Typography</SectionLabel>
            <div className="flex flex-col gap-8">
              <div>
                <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
                  Barlow Condensed 700 — display headings (uppercase, tight)
                </p>
                <p className="font-display text-5xl font-bold uppercase leading-none tracking-tight text-text">
                  The Scaler Studio
                </p>
                <p className="mt-2 font-display text-3xl font-bold uppercase leading-none tracking-tight text-text-secondary">
                  Client Portal
                </p>
              </div>
              <div>
                <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
                  Barlow — body, UI, labels, buttons
                </p>
                <p className="font-sans text-base text-text">
                  Body text. The quick brown fox jumps over the lazy dog.
                </p>
                <p className="font-sans text-sm text-text-secondary">
                  Secondary — smaller supporting copy and descriptions.
                </p>
                <p className="mt-1 font-sans text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Label / Caption
                </p>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section aria-labelledby="section-buttons">
            <SectionLabel id="section-buttons">Buttons</SectionLabel>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>
          </section>

          {/* Status Pills */}
          <section aria-labelledby="section-status">
            <SectionLabel id="section-status">Status Pills</SectionLabel>
            <div className="flex flex-wrap gap-3">
              <StatusPill status="pending" />
              <StatusPill status="in_progress" />
              <StatusPill status="in_review" />
              <StatusPill status="approved" />
            </div>
          </section>

          {/* Cards */}
          <section aria-labelledby="section-cards">
            <SectionLabel id="section-cards">Cards</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sans text-sm font-semibold text-text">
                      Brand Identity
                    </h3>
                    <StatusPill status="in_progress" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-text-secondary">
                    Logo system, color palette, and typography guidelines for
                    the new brand direction.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sans text-sm font-semibold text-text">
                      Website Redesign
                    </h3>
                    <StatusPill status="in_review" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-text-secondary">
                    Full redesign of the marketing site with updated messaging
                    and visual language.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sans text-sm font-semibold text-text">
                      Social Campaign
                    </h3>
                    <StatusPill status="approved" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-text-secondary">
                    Q3 campaign assets delivered and approved by the client.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sans text-sm font-semibold text-text">
                      Packaging Design
                    </h3>
                    <StatusPill status="pending" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-text-secondary">
                    Retail packaging exploration — awaiting project kickoff.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Inputs */}
          <section aria-labelledby="section-inputs">
            <SectionLabel id="section-inputs">Inputs</SectionLabel>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
              />
              <Input
                label="Project name"
                placeholder="Untitled project"
                error="This field is required"
              />
            </div>
          </section>

          {/* Empty State */}
          <section aria-labelledby="section-empty">
            <SectionLabel id="section-empty">Empty State</SectionLabel>
            <EmptyState
              icon={<FolderOpen size={20} strokeWidth={1.5} />}
              title="No projects yet"
              description="Once a project is created and shared with you, it will appear here."
              action={
                <Button variant="primary" size="sm">
                  Request access
                </Button>
              }
            />
          </section>

        </div>
      </main>
    </div>
  )
}

function SectionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2
        id={id}
        className="shrink-0 font-sans text-xs font-semibold uppercase tracking-widest text-text-muted"
      >
        {children}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
