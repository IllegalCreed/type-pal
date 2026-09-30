// Q02 · project-map stamp 组合放置与 resize 残差（排重：N01 已证 lattice 边界/-0、瓦片/碰撞
// 非法诊断、floodFill 退化、tilesInView 越界/隐藏层、同尺寸缩放原引用、图层操作幂等；
// 本文件只补 stamp placements 写读/校验、resize 增缩与组合保护、图层操作 stamp 联动臂）。

import type { ProjectMap, StampPlacementGroupV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  moveProjectMapLayer,
  projectMapStampPlacements,
  removeProjectMapLayer,
  resizeProjectMap,
  updateProjectMapLayer,
  withProjectMapStampPlacements,
} from './project-map.js'

/** 视觉成员必须落在已铺瓦片上：anchor 行铺 7 号瓦片。 */
function paintedBase(width = 4, height = 4): ProjectMap {
  const base = buildBlankProjectMap(width, height, 'tiles')
  return {
    ...base,
    layers: base.layers.map((layer) => ({
      ...layer,
      tiles: layer.tiles.map((row, i) => row.map(() => (i % 2 === 0 ? 7 : null))),
      sources: layer.tiles.map((row, i) => row.map(() => (i % 2 === 0 ? 0 : null))),
    })),
  }
}

function placement(overrides: Partial<StampPlacementGroupV1> = {}): StampPlacementGroupV1 {
  return {
    id: 'grp1',
    sourceStampId: 'stamp-9',
    sourceStampName: '树组合',
    anchor: { row: 2, col: 2 },
    visualSlots: [{ layerId: 'floor', row: 2, col: 2 }],
    gridPoints: [
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ],
    ...overrides,
  }
}

test('Q02 空 placements 不物化 authoring；非空 placements 过守卫后可读回', () => {
  const base = buildBlankProjectMap(4, 4, 'tiles')
  const empty = withProjectMapStampPlacements(base, [])
  expect('authoring' in empty).toBe(false)
  expect(projectMapStampPlacements(empty)).toEqual([])
  const stamped = withProjectMapStampPlacements(paintedBase(), [placement()])
  expect(projectMapStampPlacements(stamped)).toEqual([placement()])
  expect(stamped.width).toBe(4)
  expect(stamped.tilesetRefs).toEqual(base.tilesetRefs)
})

test('Q02 placements 非法轴被地图守卫拒绝：负 row anchor / 空 visualSlots', () => {
  expect(() =>
    withProjectMapStampPlacements(paintedBase(), [placement({ anchor: { row: -1, col: 2 } })]),
  ).toThrow()
  expect(() =>
    withProjectMapStampPlacements(paintedBase(), [placement({ visualSlots: [] })]),
  ).toThrow()
})

test('Q02 resize 放大：内容保留、新区为空且 heights 存在时重建', () => {
  const base = buildBlankProjectMap(2, 2, 'tiles')
  const painted = {
    ...base,
    layers: base.layers.map((layer) => ({
      ...layer,
      tiles: layer.tiles.map((row, i) => row.map((_, j) => (i === 0 && j === 0 ? 7 : null))),
      heights: layer.tiles.map((row, i) => row.map((_, j) => (i === 0 && j === 0 ? 3 : 0))),
    })),
  }
  const grown = resizeProjectMap(painted, 3, 3)
  expect(grown.width).toBe(3)
  expect(grown.height).toBe(3)
  expect(grown.layers[0]?.tiles[0]?.[0]).toBe(7)
  expect(grown.layers[0]?.heights?.[0]?.[0]).toBe(3)
  expect(grown.layers[0]?.tiles[5]?.[2]).toBeNull()
  expect(grown.collision[5]?.[2]).toBe(0)
})

test('Q02 resize 缩小：行列截断且 collision 一并重建', () => {
  const base = buildBlankProjectMap(4, 4, 'tiles')
  const painted = {
    ...base,
    collision: base.collision.map((row, i) => row.map((_, j) => (i === 7 && j === 3 ? 1 : 0))),
  }
  const shrunk = resizeProjectMap(painted, 2, 2)
  expect(shrunk.width).toBe(2)
  expect(shrunk.height).toBe(2)
  expect(shrunk.collision).toHaveLength(4)
  expect(shrunk.collision.every((row) => row.every((cell) => cell === 0))).toBe(true)
})

test('Q02 resize 会破坏组合时精确拒绝并点名组合 id', () => {
  const stamped = withProjectMapStampPlacements(paintedBase(), [placement()])
  expect(() => resizeProjectMap(stamped, 1, 1)).toThrow(
    '缩小地图会破坏 1 个组合（grp1）；请先解组或删除整组。',
  )
  // 组合完全落在新尺寸内时放行。
  const safe = resizeProjectMap(stamped, 4, 4)
  expect(safe.width).toBe(4)
})

test('Q02 removeProjectMapLayer 会破坏组合时精确拒绝；无关图层可删', () => {
  const base = paintedBase()
  const extra = buildProjectMapLayer(base, 'decor', '装饰')
  const two = insertProjectMapLayer(base, extra)
  const stamped = withProjectMapStampPlacements(two, [placement()])
  expect(() => removeProjectMapLayer(stamped, 'floor')).toThrow(/删除图层会破坏 1 个组合/)
  const removed = removeProjectMapLayer(stamped, 'decor')
  expect(removed.layers.map((layer) => layer.id)).toEqual(['floor'])
})

test('Q02 insertProjectMapLayer 重复 id 原引用返回；越界 index 钳制', () => {
  const base = buildBlankProjectMap(2, 2, 'tiles')
  const layer = buildProjectMapLayer(base, 'decor', '装饰')
  const once = insertProjectMapLayer(base, layer)
  expect(insertProjectMapLayer(once, layer)).toBe(once) // 重复 id 不动
  const atTop = insertProjectMapLayer(base, layer, 99)
  expect(atTop.layers[atTop.layers.length - 1]?.id).toBe('decor')
  const atBottom = insertProjectMapLayer(base, layer, -5)
  expect(atBottom.layers[0]?.id).toBe('decor')
})

test('Q02 moveProjectMapLayer 未知 id 与同位不动；越界钳制后落位', () => {
  const base = buildBlankProjectMap(2, 2, 'tiles')
  const layer = buildProjectMapLayer(base, 'decor', '装饰')
  const two = insertProjectMapLayer(base, layer)
  expect(moveProjectMapLayer(two, 'ghost', 0)).toBe(two)
  expect(moveProjectMapLayer(two, 'decor', 1)).toBe(two)
  const moved = moveProjectMapLayer(two, 'floor', 99)
  expect(moved.layers.map((layer2) => layer2.id)).toEqual(['decor', 'floor'])
})

test('Q02 updateProjectMapLayer 未知 id 原引用返回；命名 patch 生效且不改图层序', () => {
  const base: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
  expect(updateProjectMapLayer(base, 'ghost', { name: 'x' })).toBe(base)
  const renamed = updateProjectMapLayer(base, 'floor', { name: '地面' })
  expect(renamed.layers[0]?.name).toBe('地面')
  expect(renamed.layers.map((layer) => layer.id)).toEqual(['floor'])
})
