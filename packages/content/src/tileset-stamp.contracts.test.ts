/**
 * TEST-CONTENT-CONTRACTS-1 B7/B8：stamp nullable 碰撞矩阵与 format/parse 往返（stamp.ts）。
 * 与地图 dense collision 分栏：stamp 碰撞是 number|null（nullable）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
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

describe('B7 validateStampTemplates · nullable 碰撞与 anchor 边界', () => {
  test('合法模板通过且返回新数组；输入不变', () => {
    const raw = [stamp()]
    const before = deepSnapshot(raw)
    const validated = validateStampTemplates(raw)
    expect(validated).toEqual([stamp()])
    expect(raw).toEqual(before)
  })
  test('碰撞矩阵为 nullable：null=无碰撞、数字=碰撞；行数=height×2', () => {
    expect(stamp().collision).toHaveLength(2) // height 1 × 2
    const badRows = stamp()
    ;(badRows as { collision: number[][] }).collision = [[1, 1]]
    expect(() => validateStampTemplates([badRows])).toThrow()
  })
  test('anchor 越界拒绝（超出 height×width）', () => {
    const badAnchor = stamp()
    ;(badAnchor as { anchor: { row: number; col: number } }).anchor = { row: 5, col: 5 }
    expect(() => validateStampTemplates([badAnchor])).toThrow()
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
