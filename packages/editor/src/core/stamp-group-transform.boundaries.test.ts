/**
 * TEST-EDITOR-MAP-DATA-1 M07：captureStampGroupClipboard 空缺组轴（stamp-group-transform.ts）。
 * 既有 stamp-group-transform.test 九例已覆盖 copy/cut 身份、ownership、原子移动、no-op、
 * stale plan——不重复。本文件：空 id 列表与缺失组返回 undefined、重复 id 去重、
 * 真实组捕获的字段保真与 identity 传递、map 实参不变。
 */
import {
  buildBlankProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { captureStampGroupClipboard } from './stamp-group-transform.js'

const TILESET = 'ts'

function mapWithGroup() {
  const painted = paintProjectMapCollision(
    paintProjectMapTiles(buildBlankProjectMap(4, 4, TILESET), [
      { layerId: 'floor', row: 0, col: 0, tileId: 9, tilesetId: TILESET, height: 0 },
    ]),
    [{ row: 0, col: 0, value: 2 }],
  )
  return withProjectMapStampPlacements(painted, [
    {
      id: 'g1',
      sourceStampId: 'stamp-a',
      sourceStampName: '甲',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    },
  ])
}

describe('M07 captureStampGroupClipboard 空缺与保真', () => {
  test('空列表 / 缺失组 → undefined；重复 id 去重仍捕获一份', () => {
    const map = mapWithGroup()
    expect(captureStampGroupClipboard('m1', map, [])).toBeUndefined()
    expect(captureStampGroupClipboard('m1', map, ['ghost'])).toBeUndefined()
    expect(captureStampGroupClipboard('m1', map, ['g1', 'ghost'])).toBeUndefined()
    const clipboard = captureStampGroupClipboard('m1', map, ['g1', 'g1'])
    expect(clipboard).toBeDefined()
    expect(clipboard!.placements).toHaveLength(1) // 去重
  })
  test('真实组捕获：identity 传递、来源字段与视觉/碰撞成员保真、map 实参不变', () => {
    const map = mapWithGroup()
    const snapshot = structuredClone((map as unknown as { authoring?: unknown }).authoring)
    const clipboard = captureStampGroupClipboard('m1', map, ['g1'], 'preserve')
    expect(clipboard!.identity).toBe('preserve')
    expect(clipboard!.sourceMapId).toBe('m1')
    expect(clipboard!.placements[0]).toMatchObject({
      sourceId: 'g1',
      sourceStampId: 'stamp-a',
      sourceStampName: '甲',
      anchorOffset: { dRow: 0, du: 0 },
    })
    expect(clipboard!.placements[0]!.visual[0]).toMatchObject({
      tileId: 9,
      tilesetId: TILESET,
      height: 0,
      offset: { dRow: 0, du: 0 },
    })
    expect(clipboard!.placements[0]!.collision[0]).toEqual({
      sourceRef: { row: 0, col: 0 },
      offset: { dRow: 0, du: 0 },
      value: 2,
    })
    expect(structuredClone((map as unknown as { authoring?: unknown }).authoring)).toEqual(snapshot)
  })
})
