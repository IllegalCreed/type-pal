import { expect, test } from 'vitest'
import { filterDsCollection } from './collection-search.js'

const candidates = [
  { id: 'window', label: 'Open window', aliases: [undefined, 'Window'] },
  { id: 'restore', label: 'Restore', aliases: [null, 'Opens old project'] },
  { id: 'current', label: 'Current entry', aliases: [0] },
] as const

test('an empty query preserves the original collection', () => {
  expect(filterDsCollection(candidates, '  ', () => [])).toBe(candidates)
})

test('searches the normalized query across string and numeric parts and skips absent parts', () => {
  const query = (value: string) =>
    filterDsCollection(candidates, value, (candidate) => [
      candidate.id,
      candidate.label,
      ...candidate.aliases,
    ]).map((candidate) => candidate.id)

  expect(query(' OPen ')).toEqual(['window', 'restore'])
  expect(query('0')).toEqual(['current'])
  expect(query('null')).toEqual([])
  expect(query('undefined')).toEqual([])
})
