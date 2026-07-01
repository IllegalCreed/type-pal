import { expect, test } from 'vitest'
import { entityAtCell } from './hit-test.js'
import type { EntityDef } from '@type-pal/content'

const es: EntityDef[] = [
  { id: 'a', pos: { col: 5, row: 6, height: 0 }, sprite: 'x' },
  { id: 'b', pos: { col: 9, row: 9, height: 0 }, sprite: 'y' },
]

test('entityAtCell:命中同 col/row 的实体,否则 null', () => {
  expect(entityAtCell(es, { col: 5, row: 6 })?.id).toBe('a')
  expect(entityAtCell(es, { col: 9, row: 9 })?.id).toBe('b')
  expect(entityAtCell(es, { col: 0, row: 0 })).toBeNull()
  // 只比 col/row(height 不参与命中 —— 同格不同 height 也算命中)
  expect(entityAtCell(es, { col: 5, row: 6 })?.id).toBe('a')
})

test('entityAtCell:空数组 → null', () => {
  expect(entityAtCell([], { col: 1, row: 1 })).toBeNull()
})

test('entityAtCell:多个同格实体 → 取首个(MVP;最上层语义待后续定)', () => {
  const dup: EntityDef[] = [
    { id: 'a', pos: { col: 5, row: 6, height: 0 }, sprite: 'x' },
    { id: 'b', pos: { col: 5, row: 6, height: 0 }, sprite: 'y' },
  ]
  expect(entityAtCell(dup, { col: 5, row: 6 })?.id).toBe('a')
})
