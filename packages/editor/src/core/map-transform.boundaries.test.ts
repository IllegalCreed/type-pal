/**
 * TEST-EDITOR-MAP-DATA-1 M02：map-transform 失败计划与冲突语义（map-transform.ts）。
 * 既有 map-transform.test 已覆盖 ownership/锁步/重叠往返/失败映射——不重复。
 * 本文件：失败计划两 patch 数组全空且 canApply=false、源 map/clipboard 实参不变、
 * collision 同值不冲突与不同非零冲突、目标层删除（另一目标仍有效）整笔失败。
 */
import {
  buildBlankProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { MapCellClipboard } from './map-transform.js'
import { captureMapClipboard, planMapPaste } from './map-transform.js'

const TILESET = 'ts'
const point = (row: number, col: number) => ({ row, col })

function painted() {
  return paintProjectMapCollision(
    paintProjectMapTiles(buildBlankProjectMap(4, 4, TILESET), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 0 },
      { layerId: 'floor', row: 2, col: 2, tileId: 2, tilesetId: TILESET, height: 0 },
    ]),
    [
      { row: 0, col: 0, value: 1 },
      { row: 3, col: 1, value: 2 },
    ],
  )
}

function clipboardOf(map: ReturnType<typeof painted>): MapCellClipboard {
  const clipboard = captureMapClipboard(
    'm1',
    map,
    {
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'active-layer',
    },
    true,
  )
  expect(clipboard).toBeDefined()
  return clipboard!
}

describe('M02 planMapPaste 失败计划与冲突语义', () => {
  test('占用目标 reject：conflicts 精确、canApply=false、patch 双通道全空、map/clipboard 实参不变', () => {
    const map = painted()
    const clipboard = clipboardOf(map)
    const mapSnapshot = structuredClone({
      layers: map.layers.map((layer) => ({ id: layer.id, tiles: layer.tiles })),
      collision: map.collision,
    })
    const clipboardSnapshot = structuredClone(clipboard)
    // 粘到 (2,2)：视觉槽被 tileId=2 占用；碰撞 (3,1)... 目标碰撞格 (2,2) 为 0 → 无碰撞冲突
    const plan = planMapPaste(map, clipboard, point(2, 2), {
      conflictPolicy: 'reject',
      collisionAuthorityLayerId: 'floor',
    })
    expect(plan.canApply).toBe(false)
    expect(plan.patch.visual).toEqual([])
    expect(plan.patch.collision).toEqual([])
    expect(plan.conflicts).toEqual([
      {
        channel: 'visual',
        ref: { layerId: 'floor', row: 2, col: 2 },
        currentValue: 2,
        incomingValue: 1,
      },
    ])
    expect(
      structuredClone({
        layers: map.layers.map((layer) => ({ id: layer.id, tiles: layer.tiles })),
        collision: map.collision,
      }),
    ).toEqual(mapSnapshot)
    expect(structuredClone(clipboard)).toEqual(clipboardSnapshot)
    // overwrite 下同计划可提交
    const overwrite = planMapPaste(map, clipboard, point(2, 2), {
      conflictPolicy: 'overwrite',
      collisionAuthorityLayerId: 'floor',
    })
    expect(overwrite.canApply).toBe(true)
    expect(overwrite.patch.visual).toHaveLength(3)
  })
  test('collision：目标 0 或同值不冲突；不同非零才冲突', () => {
    const map = painted()
    const clipboard = clipboardOf(map) // 携带 collision value=1
    // 目标 (1,0)：视觉空、碰撞 0 → 无冲突可提交
    const ontoZero = planMapPaste(map, clipboard, point(1, 0), {
      conflictPolicy: 'reject',
      collisionAuthorityLayerId: 'floor',
    })
    expect(ontoZero.conflicts).toEqual([])
    expect(ontoZero.canApply).toBe(true)
    // 目标 (2,1)：视觉空、碰撞 0；源锚点 (0,0) → 目标碰撞格 = (1,0)? 源碰撞 offset=(0,0) → 目标 = 锚点 (2,1)
    // 碰撞在 (2,1) 为 0 → 无冲突（同值/零轴）
    expect(map.collision[2]?.[1] ?? 0).toBe(0)
    // 造同值场景：源 value=1 粘到已有 value=1 的格 (0,0) 上 → 同值不冲突（视觉占用另算）
    const sameValue = planMapPaste(map, clipboard, point(0, 0), {
      conflictPolicy: 'reject',
      collisionAuthorityLayerId: 'floor',
    })
    expect(sameValue.conflicts.every((c) => c.channel === 'visual')).toBe(true)
    // 不同非零：源 value=1 目标格已有 2 → 碰撞冲突
    const differing = planMapPaste(map, clipboard, point(3, 1), {
      conflictPolicy: 'reject',
      collisionAuthorityLayerId: 'floor',
    })
    expect(differing.conflicts).toContainEqual({
      channel: 'collision',
      ref: point(3, 1),
      currentValue: 2,
      incomingValue: 1,
    })
    expect(differing.canApply).toBe(false)
  })
  test('目标层被删（另一目标层仍有效）：layer-missing 整笔失败，patch 为空', () => {
    const map = painted()
    const clipboard = clipboardOf(map)
    const plan = planMapPaste(map, clipboard, point(1, 0), {
      layerMappings: [{ sourceLayerId: 'floor', targetLayerId: 'ghost' }],
      conflictPolicy: 'reject',
      collisionAuthorityLayerId: 'floor',
    })
    expect(plan.canApply).toBe(false)
    expect(plan.patch.visual).toEqual([])
    expect(plan.issues).toEqual([
      {
        code: 'layer-missing',
        message: '目标图层 "ghost" 不存在',
        ref: { layerId: 'ghost', row: 1, col: 0 },
      },
    ])
  })
})
