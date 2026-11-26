import { type ProjectMap, type StampPlacementGroupV1, validateProjectMap } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  moveProjectMapLayer,
  nextProjectMapLayerId,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
  removeProjectMapLayer,
  resizeProjectMap,
  updateProjectMapLayer,
  withProjectMapStampPlacements,
} from './project-map.js'

const SOURCE_A = 'tileset-001'
const SOURCE_B = 'tileset-002'

/** 视觉成员引用的格子要先铺瓦片；作者态校验会核对。 */
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

test('空 placements 不物化 authoring；非空 placements 过守卫后可读回', () => {
  const base = buildBlankProjectMap(4, 4, 'tiles')
  const current = withProjectMapStampPlacements(paintedBase(), [placement()])
  const empty = withProjectMapStampPlacements(current, [])
  expect('authoring' in empty).toBe(false)
  expect(projectMapStampPlacements(empty)).toEqual([])
  const stamped = withProjectMapStampPlacements(paintedBase(), [placement()])
  expect(projectMapStampPlacements(stamped)).toEqual([placement()])
  expect(stamped.width).toBe(4)
  expect(stamped.tilesetRefs).toEqual(base.tilesetRefs)
})

test('placements 非法轴被地图守卫拒绝：负 row anchor / 空 visualSlots', () => {
  expect(() =>
    withProjectMapStampPlacements(paintedBase(), [placement({ anchor: { row: -1, col: 2 } })]),
  ).toThrow(/anchor|锚点/)
  expect(() =>
    withProjectMapStampPlacements(paintedBase(), [placement({ visualSlots: [] })]),
  ).toThrow(/visualSlots|视觉/)
})

test('resize 缩小：行列截断且 collision 一并重建', () => {
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

test('resize 会破坏组合时精确拒绝并点名组合 id', () => {
  const stamped = withProjectMapStampPlacements(paintedBase(), [placement()])
  expect(() => resizeProjectMap(stamped, 1, 1)).toThrow(
    '缩小地图会破坏 1 个组合（grp1）；请先解组或删除整组。',
  )
  // 组合完全落在新尺寸内时放行。
  const safe = resizeProjectMap(stamped, 3, 2)
  expect([safe.width, safe.height]).toEqual([3, 2])
  expect(projectMapStampPlacements(safe)).toEqual([placement()])
})

test('removeProjectMapLayer 会破坏组合时精确拒绝；无关图层可删', () => {
  const base = paintedBase()
  const extra = buildProjectMapLayer(base, 'decor', '装饰')
  const two = insertProjectMapLayer(base, extra)
  const stamped = withProjectMapStampPlacements(two, [placement()])
  expect(() => removeProjectMapLayer(stamped, 'floor')).toThrow(/删除图层会破坏 1 个组合/)
  const removed = removeProjectMapLayer(stamped, 'decor')
  expect(removed.layers.map((layer) => layer.id)).toEqual(['floor'])
})

test('insertProjectMapLayer 重复 id 原引用返回；越界 index 钳制', () => {
  const base = buildBlankProjectMap(2, 2, 'tiles')
  const layer = buildProjectMapLayer(base, 'decor', '装饰')
  const once = insertProjectMapLayer(base, layer)
  expect(insertProjectMapLayer(once, layer)).toBe(once) // 重复 id 不动
  const atTop = insertProjectMapLayer(base, layer, 99)
  expect(atTop.layers[atTop.layers.length - 1]?.id).toBe('decor')
  const atBottom = insertProjectMapLayer(base, layer, -5)
  expect(atBottom.layers[0]?.id).toBe('decor')
})

test('moveProjectMapLayer 未知 id 与同位不动；越界钳制后落位', () => {
  const base = buildBlankProjectMap(2, 2, 'tiles')
  const layer = buildProjectMapLayer(base, 'decor', '装饰')
  const two = insertProjectMapLayer(base, layer)
  expect(moveProjectMapLayer(two, 'ghost', 0)).toBe(two)
  expect(moveProjectMapLayer(two, 'decor', 1)).toBe(two)
  const moved = moveProjectMapLayer(two, 'floor', 99)
  expect(moved.layers.map((layer2) => layer2.id)).toEqual(['decor', 'floor'])
})

test('updateProjectMapLayer 未知 id 原引用返回；命名 patch 生效且不改图层序', () => {
  const base: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
  expect(updateProjectMapLayer(base, 'ghost', { name: 'x' })).toBe(base)
  const renamed = updateProjectMapLayer(base, 'floor', { name: '地面' })
  expect(renamed.layers[0]?.name).toBe('地面')
  expect(renamed.layers.map((layer) => layer.id)).toEqual(['floor'])
})

test('缩放同步处理 tiles/sources/heights/collision', () => {
  let map = paintProjectMapTiles(buildBlankProjectMap(2, 2, SOURCE_A), [
    { layerId: 'floor', col: 1, row: 1, tileId: 9, tilesetId: SOURCE_B, height: 6 },
  ])
  map = paintProjectMapCollision(map, [{ col: 1, row: 2, value: 1 }])
  const big = resizeProjectMap(map, 4, 3)
  expect(big.layers[0]?.tiles[1]?.[1]).toBe(9)
  expect(big.layers[0]?.sources[1]?.[1]).toBe(1)
  expect(big.layers[0]?.heights?.[1]?.[1]).toBe(6)
  expect(big.layers[0]?.sources[5]?.[3]).toBeNull()
  expect(big.collision[2]?.[1]).toBe(1)
  expect(validateProjectMap(big)).toBeDefined()
  expect(resizeProjectMap(map, 2, 2)).toBe(map)
})

test('图层稳定 id 支持增、移、改、删', () => {
  const base = buildBlankProjectMap(1, 1, SOURCE_A)
  const added = insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件'))
  const moved = moveProjectMapLayer(added, 'objects', 0)
  expect(moved.layers.map(({ id }) => id)).toEqual(['objects', 'floor'])
  expect(updateProjectMapLayer(moved, 'objects', { name: '遮挡物' }).layers[0]?.name).toBe('遮挡物')
  expect(removeProjectMapLayer(moved, 'objects').layers.map(({ id }) => id)).toEqual(['floor'])
  expect(removeProjectMapLayer(base, 'floor')).toBe(base)
})

test('new layer ID uses the smallest free serial after each real layer insertion', () => {
  const map = buildBlankProjectMap(2, 2, SOURCE_A)
  const first = insertProjectMapLayer(map, buildProjectMapLayer(map, 'layer-1', 'First'))
  const gap = insertProjectMapLayer(first, buildProjectMapLayer(first, 'layer-3', 'Third'))
  const filled = insertProjectMapLayer(gap, buildProjectMapLayer(gap, 'layer-2', 'Second'))
  expect([
    nextProjectMapLayerId(map),
    nextProjectMapLayerId(gap),
    nextProjectMapLayerId(filled),
  ]).toEqual(['layer-1', 'layer-2', 'layer-4'])
})
