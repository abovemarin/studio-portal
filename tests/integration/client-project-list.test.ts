import { describe, it, expect } from 'vitest'
import { listProjectsForClientWithReview } from '@/lib/db/projects'
import { seedUser, seedProject, seedMembership, seedMilestone } from './helpers'

// NEEDS-TEST-2 — the runtime leak proof the .toSQL() shape test cannot give. The dashboard query
// enriches each project with inReviewCount / lastActivityAt via a milestones join; this asserts that
// against REAL rows a client's list can neither contain another client's project nor absorb its
// milestone aggregates. (No auth mock: this exercises the data layer directly, as the server
// component does.)

describe("NEEDS-TEST-2: listProjectsForClientWithReview never surfaces another client's project", () => {
  it("A's enriched list contains X, never Y, and X's counts reflect only X's milestones", async () => {
    const A = await seedUser({ name: 'Client A' })
    const B = await seedUser({ name: 'Client B' })
    const X = await seedProject({ name: 'Project X', slug: 'proj-x' })
    const Y = await seedProject({ name: 'Project Y', slug: 'proj-y' })
    await seedMembership(X.id, A.id)
    await seedMembership(Y.id, B.id)

    // X: exactly ONE in_review milestone. Y: TWO in_review — if the join leaked, A's X row would
    // read inReviewCount 3 instead of 1.
    await seedMilestone(X.id, { title: 'X-1', status: 'in_review' })
    await seedMilestone(X.id, { title: 'X-2', status: 'approved' })
    await seedMilestone(Y.id, { title: 'Y-1', status: 'in_review' })
    await seedMilestone(Y.id, { title: 'Y-2', status: 'in_review' })

    const list = await listProjectsForClientWithReview(A.id)

    const ids = list.map((p) => p.id)
    expect(ids).toContain(X.id)
    expect(ids).not.toContain(Y.id)
    expect(list).toHaveLength(1)

    const x = list.find((p) => p.id === X.id)!
    expect(x.inReviewCount).toBe(1) // only X's in_review, NOT X's + Y's
    expect(x.lastActivityAt).toBeInstanceOf(Date)
  })

  it('a client who owns no projects gets an empty list (no bleed from other clients)', async () => {
    const A = await seedUser({ name: 'Lonely A' })
    const B = await seedUser({ name: 'Owner B' })
    const Y = await seedProject({ name: 'Project Y', slug: 'proj-y-only' })
    await seedMembership(Y.id, B.id)
    await seedMilestone(Y.id, { title: 'Y-1', status: 'in_review' })

    const list = await listProjectsForClientWithReview(A.id)

    expect(list).toHaveLength(0)
  })
})
