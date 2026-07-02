import { ChevronRight, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/card'
import { StatusPill } from '@/components/status-pill'
import { cn, relativeTime } from '@/lib/utils'
import type { Milestone } from '@/lib/db/schema'
import type { ProjectComment } from '@/lib/db/comments'
import { ApproveAction } from './approve-action'
import { CommentComposer } from './comment-composer'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function MilestoneList({
  milestones,
  commentsByMilestone,
}: {
  milestones: Milestone[]
  commentsByMilestone: Map<string, ProjectComment[]>
}) {
  return (
    <div className="flex flex-col gap-3">
      {milestones.map((m) => {
        const comments = commentsByMilestone.get(m.id) ?? []
        const needsReview = m.status === 'in_review'
        return (
          // in_review dominance: accent ring + open by default (native <details>, so the row
          // stays keyboard-toggleable — the in_review one just starts expanded).
          <Card key={m.id} className={cn(needsReview && 'ring-2 ring-accent')}>
            <details className="group" open={needsReview}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-start gap-2">
                  <ChevronRight
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-90"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-sm font-semibold text-text">{m.title}</h2>
                      {needsReview && (
                        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wide text-accent-fg">
                          Needs your review
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-sans text-xs text-text-muted">
                      Updated {relativeTime(m.updatedAt)}
                    </p>
                  </div>
                </div>
                <StatusPill status={m.status} className="mt-0.5 shrink-0" />
              </summary>

              <CardContent className="pt-0">
                <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
                  {m.description && (
                    <p className="whitespace-pre-wrap font-sans text-sm text-text-secondary">
                      {m.description}
                    </p>
                  )}

                  {m.deliverableUrl && (
                    <a
                      href={m.deliverableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-1.5 rounded font-sans text-xs font-medium text-accent transition-colors duration-200 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />
                      Deliverable
                    </a>
                  )}

                  <div className="flex flex-col gap-3">
                    <p className="font-sans text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Comments
                    </p>
                    {comments.length === 0 ? (
                      <p className="font-sans text-sm text-text-secondary">No comments yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {comments.map((comment) => (
                          <li
                            key={comment.id}
                            className="rounded-lg border border-border bg-surface-bg px-3 py-2"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-sans text-sm font-medium text-text">
                                {comment.authorName?.trim() || comment.authorEmail}
                              </span>
                              <span
                                className="font-sans text-xs text-text-muted"
                                title={dateFormatter.format(comment.createdAt)}
                              >
                                {relativeTime(comment.createdAt)}
                              </span>
                            </div>
                            {/* Rendered as text — JSX auto-escapes, satisfying the XSS rule.
                                Comment body is primary user content → text-text (not the muted
                                secondary it wore before), for legibility. */}
                            <p className="whitespace-pre-wrap font-sans text-sm text-text">
                              {comment.body}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <CommentComposer milestoneId={m.id} />
                  </div>

                  {m.status === 'in_review' && (
                    <div>
                      <ApproveAction milestoneId={m.id} />
                    </div>
                  )}
                </div>
              </CardContent>
            </details>
          </Card>
        )
      })}
    </div>
  )
}
