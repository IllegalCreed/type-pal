/**
 * TEST-CONTENT-CONTRACTS-1 B7/B8：stamp nullable 碰撞矩阵与 migrated/authored 多条目往返（stamp.ts）。
 * 与地图 dense collision 分栏：stamp 碰撞是 number|null（nullable）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { StampTemplate } from './stamp.js'
import { formatStampTemplates, parseStampTemplates, validateStampTemplates } from './stamp.js'

const stamp = (): StampTemplate => ({
  id: 'tree',
  name: '树',
  origin: 'authored',
  width: 2,
  height: 1,
  anchor: { row: 0, col: 0 },
  tilesetRefs: ['tiles-main'],
  layers: [
    {
      id: 'visual',
      name: '视觉',
      tiles: [
        [1, null],
        [null, null],
      ],
      sources: [
        [0, null],
        [null, null],
      ],
    },
  ],
  collision: [
    [null, 1],
    [null, null],
  ],
})

describe('B7 validateStampTemplates · nullable 碰撞与值对象归属', () => {
  test('合法模板通过且返回新数组；输入不变', () => {
    const raw = [stamp()]
    const before = deepSnapshot(raw)
    const validated = validateStampTemplates(raw)
    expect(validated).not.toBe(raw)
    expect(validated).toEqual([stamp()])
    expect(raw).toEqual(before)
  })
  test('nullable 碰撞矩阵保持 null/1，拒绝行数不足', () => {
    expect(validateStampTemplates([stamp()])[0]!.collision).toEqual([
      [null, 1],
      [null, null],
    ]) // null 不参与放置；0 才表示显式可通行
    const badRows = stamp()
    badRows.collision = [[1, 1]]
    expect(() => validateStampTemplates([badRows])).toThrow('stamps[0].collision: 期望 2 行')
  })
})

describe('B8 formatStampTemplates/parseStampTemplates · 完整往返', () => {
  test('format→parse 保真；两次 format 确定性；输入不被污染', () => {
    const raw = [stamp(), { ...stamp(), id: 'rock', name: '岩', origin: 'migrated' as const }]
    const before = deepSnapshot(raw)
    const text1 = formatStampTemplates(raw)
    const text2 = formatStampTemplates(raw)
    expect(text1).toBe(text2)
    const parsed = parseStampTemplates(text1)
    expect(parsed).toEqual(raw)
    expect(raw).toEqual(before)
    expect(formatStampTemplates(parsed)).toBe(text1)
  })
})
