/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C4：isProjectMap 谓词。
 * validate/format/authoring 已由 project-map.test 与 boundaries/contracts 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { isProjectMap, validateProjectMap } from './project-map.js'

const legal = {
  version: 4 as const,
  width: 2,
  height: 1,
  tilesetRefs: ['tiles-a', 'tiles-b'],
  layers: [
    {
      id: 'floor',
      name: '地板',
      tiles: [
        [0, 0],
        [null, null],
      ],
      sources: [
        [0, 1],
        [null, null],
      ],
    },
  ],
  collision: [
    [0, 1],
    [2, 0],
  ],
}

describe('C4 project-map 剩余合同', () => {
  test('validate 后 isProjectMap 为真；缺 layers 或非 4 为假', () => {
    const snap = inputSnap(legal)
    const map = validateProjectMap(legal)
    expect(legal).toEqual(snap)
    expect(isProjectMap(map)).toBe(true)
    expect(isProjectMap({ version: 3, layers: [] })).toBe(false)
    expect(isProjectMap({ version: 4 })).toBe(false)
    expect(isProjectMap(legal)).toBe(true)
  })
})
