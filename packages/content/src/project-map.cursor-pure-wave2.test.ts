/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C4：多来源即使全是下标 0 也必须落盘 sources。
 * 单来源省略与「有 1 格」的多来源往返已由旧测证明。isProjectMap 无行为消费者。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { formatProjectMap, parseProjectMap, validateProjectMap } from './project-map.js'

const legal = {
  version: 4 as const,
  width: 1,
  height: 1,
  tilesetRefs: ['tiles-a', 'tiles-b'],
  layers: [
    {
      id: 'ground',
      name: '地面',
      tiles: [[3], [null]],
      sources: [[0], [null]],
    },
  ],
  collision: [[0], [1]],
}

describe('C4 project-map 剩余合同', () => {
  test('多来源全 0 格 format 仍写 sources，往返保真且输入不变', () => {
    const snap = inputSnap(legal)
    const map = validateProjectMap(legal)
    expect(legal).toEqual(snap)
    const text = formatProjectMap(map)
    expect(text).toContain('"sources"')
    expect(text).toContain('"tiles-b"')
    expect(parseProjectMap(text)).toEqual(map)
    expect(formatProjectMap(parseProjectMap(text))).toBe(text)
    expect(legal).toEqual(snap)
  })
})
