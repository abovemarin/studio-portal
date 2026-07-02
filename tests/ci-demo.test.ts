import { it, expect } from 'vitest'
// TEMPORARY — demonstrates CI blocking a red PR. Deleted before merge.
it('demo: CI must block a red check', () => {
  expect(1).toBe(2)
})
