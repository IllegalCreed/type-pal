import { gridToPixel } from '@type-pal/content'
import { expect, test } from 'vitest'
import { areEntityPositionsNear } from './entity-proximity.js'

const origin = { col: 1, row: 1, height: 0 }
test.each([
  [0, 0, true],
  [0.499, 0, true],
  [-0.499, 0.499, true],
  [0.5, 0, false],
  [0, -0.5, false],
  [-0.5, 0.5, false],
  [0.501, 0, false],
] as const)('planar distance (%s,%s) preserves the strict half-grid boundary', (col, row, expected) => {
  const target = { col: origin.col + col, row: origin.row + row, height: 100 }
  expect(areEntityPositionsNear(origin, target, 0.5)).toBe(expected)
  const fromPixel = gridToPixel(origin)
  const toPixel = gridToPixel(target)
  expect(Math.abs(fromPixel.x - toPixel.x) + 2 * Math.abs(fromPixel.y - toPixel.y) < 16).toBe(
    expected,
  )
})
test('missing entities and zero radius fail without using a visibility or height fallback', () => {
  expect(areEntityPositionsNear(undefined, origin, 1)).toBe(false)
  expect(areEntityPositionsNear(origin, undefined, 1)).toBe(false)
  expect(areEntityPositionsNear(origin, origin, 0)).toBe(false)
})
