import { describe, it, expect } from 'vitest'
import { listProjectsForClientWithReview } from '@/lib/db/projects'

// This suite has no live database (the API suites mock the db layer). The new client query is
// consumed by a server component, not a route, so there is no handler to assert through. Instead
// we inspect the compiled SQL via drizzle's `.toSQL()` — enough to lock the two non-negotiables:
// (1) membership scoping is the canonical project_members clause (identical to the existing
// listProjectsForClient), and (2) milestones is a LEFT join so zero-milestone projects survive.
// `.toSQL()` builds the query, it never runs it. (listProjectsForClient stays async/untouched per
// the task, so it isn't introspectable here; the two clauses below are exactly what it emits.)

// listProjectsForClientWithReview returns the lazy builder (it is non-async); the declared Promise
// return type hides `.toSQL()`, so we reach it through a narrow cast.
function compile(query: unknown): { sql: string; params: unknown[] } {
  return (query as { toSQL: () => { sql: string; params: unknown[] } }).toSQL()
}

// The canonical "what can this client see" scoping — byte-for-byte what listProjectsForClient
// emits from `.innerJoin(projectMembers, eq(projectMembers.projectId, projects.id)).where(eq(projectMembers.userId, userId))`.
const MEMBERSHIP_JOIN =
  'inner join "project_members" on "project_members"."project_id" = "projects"."id"'
const MEMBERSHIP_WHERE = 'where "project_members"."user_id" = $1'

describe('listProjectsForClientWithReview (membership scoping + left join)', () => {
  it('scopes to the given user by project_members, parameterized, and only that', () => {
    const enriched = compile(listProjectsForClientWithReview('u1'))
    // The sole bound param is the userId — nothing else (e.g. the in_review literal) leaks in.
    expect(enriched.params).toEqual(['u1'])
    expect(enriched.sql).toContain(MEMBERSHIP_JOIN)
    expect(enriched.sql).toContain(MEMBERSHIP_WHERE)
  })

  it('LEFT joins milestones so zero-milestone projects are not dropped', () => {
    const enriched = compile(listProjectsForClientWithReview('u1'))
    expect(enriched.sql).toContain('left join "milestones"')
    // Aggregates that must yield 0 / null for a project with no milestone rows.
    expect(enriched.sql).toContain('filter (where "milestones"."status" = \'in_review\')')
    expect(enriched.sql).toContain('max("milestones"."updated_at")')
    expect(enriched.sql).toContain('group by "projects"."id"')
  })
})
