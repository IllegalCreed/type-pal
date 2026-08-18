import { describe, expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  floodFillProjectMapTiles,
  insertProjectMapLayer,
  latticeCenter,
  latticeInMapRect,
  latticeInRect,
  moveProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  projectMapStampPlacements,
  projectMapTileBlitRect,
  projectMapTilesInView,
  removeProjectMapLayer,
  resizeProjectMap,
  updateProjectMapLayer,
  withProjectMapStampPlacements,
} from './project-map.js'

describe('buildBlankProjectMap', () => {
  test('产出 v2、稳定 tilesetId、2H×W 空 lattice 与独立碰撞层', () => {
    const map = buildBlankProjectMap(3, 2, 'tileset-012')
    expect(map).toMatchObject({
      version: 2,
      width: 3,
      height: 2,
      tilesetId: 'tileset-012',
    })
    expect(map.layers.map((layer) => layer.id)).toEqual(['floor'])
    expect(map.layers[0]).toMatchObject({ depthMode: 'flat' })
    expect(map.layers[0]?.heights).toBeUndefined()
    expect(map.layers[0]?.tiles).toHaveLength(4)
    expect(map.layers[0]?.tiles[3]?.[2]).toBeNull()
    expect(map.collision[3]?.[2]).toBe(0)
  })
})

describe('lattice 几何', () => {
  test('中心 → 像素命中往返；奇数行右错半格', () => {
    for (const pos of [
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 2, row: 4 },
      { col: 3, row: 5 },
    ]) {
      const center = latticeCenter(pos)
      expect(pixelToLattice(center.x, center.y)).toEqual(pos)
    }
    expect(latticeCenter({ col: 1, row: 2 })).toEqual({ x: 32, y: 16 })
    expect(latticeCenter({ col: 1, row: 3 })).toEqual({ x: 48, y: 24 })
  })

  test('矩形枚举两类错排行，端点反序等价', () => {
    const got = latticeInRect(15, 7, 49, 17)
    expect(got).toContainEqual({ col: 0, row: 1 })
    expect(got).toContainEqual({ col: 1, row: 1 })
    expect(got).toContainEqual({ col: 1, row: 2 })
    expect(latticeInRect(49, 17, 15, 7)).toEqual(got)
  })

  test('矩形与 tile blit 几何规范化负零并共享渲染边界', () => {
    const nearOrigin = latticeInRect(-1, -1, 1, 1)
    expect(nearOrigin.some((pos) => Object.is(pos.row, -0) || Object.is(pos.col, -0))).toBe(false)
    expect(projectMapTileBlitRect({ col: 2, row: 3 }, { width: 48, height: 40 })).toEqual({
      x: 64,
      y: 16,
      width: 48,
      height: 40,
    })
  })

  test('地图边界矩形先裁剪再枚举，极端界外端点不会产生超量中间格点', () => {
    const map = buildBlankProjectMap(3, 2, 'tiles')
    const got = latticeInMapRect(map, -1e9, -1e9, 1e9, 1e9)
    expect(got).toHaveLength(map.width * map.height * 2)
    expect(got[0]).toEqual({ col: 0, row: 0 })
    expect(got.at(-1)).toEqual({ col: 2, row: 3 })
    expect(latticeInMapRect(map, 1e9, 1e9, -1e9, -1e9)).toEqual(got)
  })
})

describe('视觉层、实例高度与碰撞层编辑', () => {
  test('高度属于每个放置实例，同 tileId 可有不同高度', () => {
    const base = buildBlankProjectMap(2, 1, 'tileset-001')
    const raised = buildProjectMapLayer(base, 'objects', '物件', 'height')
    const map = insertProjectMapLayer(base, raised)
    const out = paintProjectMapTiles(map, [
      { layerId: 'objects', col: 0, row: 0, tileId: 4096, height: 1 },
      { layerId: 'objects', col: 1, row: 1, tileId: 4096, height: 7 },
    ])
    expect(out.layers[1]?.tiles[0]?.[0]).toBe(4096)
    expect(out.layers[1]?.tiles[1]?.[1]).toBe(4096)
    expect(out.layers[1]?.heights?.[0]?.[0]).toBe(1)
    expect(out.layers[1]?.heights?.[1]?.[1]).toBe(7)
    expect(map.layers[1]?.tiles[0]?.[0]).toBeNull()
    expect(out.collision).toBe(map.collision)
  })

  test('flat 层拒绝非零高度；擦除瓦片同时清零实例高度', () => {
    const base = buildBlankProjectMap(1, 1, 'tileset-001')
    expect(() =>
      paintProjectMapTiles(base, [{ layerId: 'floor', col: 0, row: 0, tileId: 1, height: 1 }]),
    ).toThrow('flat')
    let map = insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件', 'height'))
    map = paintProjectMapTiles(map, [{ layerId: 'objects', col: 0, row: 0, tileId: 1, height: 4 }])
    map = paintProjectMapTiles(map, [
      { layerId: 'objects', col: 0, row: 0, tileId: null, height: 99 },
    ])
    expect(map.layers[1]?.tiles[0]?.[0]).toBeNull()
    expect(map.layers[1]?.heights?.[0]?.[0]).toBe(0)
  })

  test('碰撞写入不触碰视觉层；界外全忽略', () => {
    const map = buildBlankProjectMap(2, 1, 'tileset-001')
    const out = paintProjectMapCollision(map, [{ col: 1, row: 1, value: 2 }])
    expect(out.collision[1]?.[1]).toBe(2)
    expect(out.layers).toBe(map.layers)
    expect(paintProjectMapCollision(map, [{ col: 9, row: 9, value: 1 }])).toBe(map)
  })

  test('填充仅作用选中层的同 tileId + height 四邻域，空瓦片也可填充', () => {
    let map = buildBlankProjectMap(3, 1, 'tileset-001')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 1, row: 0, tileId: 8, height: 0 },
      { layerId: 'floor', col: 0, row: 1, tileId: 8, height: 0 },
    ])
    expect(floodFillProjectMapTiles(map, 'floor', { col: 0, row: 0 }, 5, 0)).toEqual([
      { layerId: 'floor', col: 0, row: 0, tileId: 5, height: 0 },
    ])

    const heightMap = insertProjectMapLayer(
      map,
      buildProjectMapLayer(map, 'objects', '物件', 'height'),
    )
    const edits = floodFillProjectMapTiles(heightMap, 'objects', { col: 0, row: 0 }, 6, 3)
    expect(edits).toHaveLength(3 * 2)
    expect(edits.every((edit) => edit.height === 3)).toBe(true)

    const splitHeightBase = buildBlankProjectMap(2, 1, 'tileset-001')
    let splitHeightMap = insertProjectMapLayer(
      splitHeightBase,
      buildProjectMapLayer(splitHeightBase, 'raised', '高度', 'height'),
    )
    splitHeightMap = paintProjectMapTiles(splitHeightMap, [
      { layerId: 'raised', col: 0, row: 0, tileId: 7, height: 1 },
      { layerId: 'raised', col: 0, row: 1, tileId: 7, height: 2 },
    ])
    expect(floodFillProjectMapTiles(splitHeightMap, 'raised', { col: 0, row: 0 }, 9, 4)).toEqual([
      { layerId: 'raised', col: 0, row: 0, tileId: 9, height: 4 },
    ])
  })
})

describe('N 层操作与渲染计划', () => {
  test('新增/重排/更新/删除均按稳定 id', () => {
    const base = buildBlankProjectMap(1, 1, 'tileset-001')
    const layer = buildProjectMapLayer(base, 'objects', '物件')
    const added = insertProjectMapLayer(base, layer)
    expect(added.layers.map((item) => item.id)).toEqual(['floor', 'objects'])
    const moved = moveProjectMapLayer(added, 'objects', 0)
    expect(moved.layers.map((item) => item.id)).toEqual(['objects', 'floor'])
    const updated = updateProjectMapLayer(moved, 'objects', { name: '遮挡物' })
    expect(updated.layers[0]).toMatchObject({ id: 'objects', name: '遮挡物' })
    expect(removeProjectMapLayer(updated, 'objects').layers.map((item) => item.id)).toEqual([
      'floor',
    ])
    expect(removeProjectMapLayer(base, 'floor')).toBe(base)
  })

  test('含非零实例高度的层不能转 flat', () => {
    const base = buildBlankProjectMap(1, 1, 'tileset-001')
    let map = insertProjectMapLayer(base, buildProjectMapLayer(base, 'cover', '遮挡'))
    map = paintProjectMapTiles(map, [{ layerId: 'cover', col: 0, row: 0, tileId: 7, height: 2 }])
    expect(() => updateProjectMapLayer(map, 'cover', { depthMode: 'flat' })).toThrow('非零实例高度')
  })

  test('null 不产渲染项；隐藏层不产项；渲染项携带实例高度', () => {
    const base = buildBlankProjectMap(2, 1, 'tileset-001')
    let map = insertProjectMapLayer(base, buildProjectMapLayer(base, 'cover', '遮挡'))
    map = paintProjectMapTiles(map, [{ layerId: 'cover', col: 1, row: 0, tileId: 7, height: 5 }])
    const draws = projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 })
    expect(draws).toEqual([
      expect.objectContaining({ layerId: 'cover', col: 1, row: 0, tileId: 7, height: 5 }),
    ])
    expect(
      projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 }, new Set(['cover'])),
    ).toEqual([])
  })
})

describe('resizeProjectMap', () => {
  test('扩展同步处理 tiles/heights/collision，重叠区保留', () => {
    let map = buildBlankProjectMap(2, 2, 'tileset-001')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', '遮挡'))
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 1, row: 1, tileId: 9, height: 0 },
      { layerId: 'cover', col: 0, row: 3, tileId: 4, height: 6 },
    ])
    map = paintProjectMapCollision(map, [{ col: 1, row: 2, value: 1 }])
    const big = resizeProjectMap(map, 4, 3)
    expect(big.layers[1]?.heights?.[3]?.[0]).toBe(6)
    expect(big.layers[1]?.heights?.[5]?.[3]).toBe(0)
    expect(big.layers[0]?.tiles[1]?.[1]).toBe(9)
    expect(big.collision[2]?.[1]).toBe(1)
    expect(big.collision[5]?.[3]).toBe(0)
  })

  test('裁剪丢弃界外内容；尺寸不变返回原引用', () => {
    let map = buildBlankProjectMap(3, 3, 'tileset-001')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 1, height: 0 },
      { layerId: 'floor', col: 2, row: 5, tileId: 7, height: 0 },
    ])
    const small = resizeProjectMap(map, 2, 2)
    expect(small.layers[0]?.tiles[0]?.[0]).toBe(1)
    expect(map.layers[0]?.tiles[5]?.[2]).toBe(7)
    expect(resizeProjectMap(map, 3, 3)).toBe(map)
    expect(resizeProjectMap(small, 3, 3).layers[0]?.tiles[5]?.[2]).toBeNull()
  })

  test('v3 公共入口默认拒绝裁掉 anchor/visual/collision 成员', () => {
    const base = paintProjectMapTiles(buildBlankProjectMap(3, 2, 'tileset-001'), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'floor', row: 3, col: 2, tileId: 2, height: 0 },
    ])
    for (const placement of [
      {
        id: 'anchor-out',
        anchor: { row: 3, col: 2 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
      {
        id: 'visual-out',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 3, col: 2 }],
        gridPoints: [],
      },
      {
        id: 'collision-out',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 3, col: 2 }],
      },
    ]) {
      const map = withProjectMapStampPlacements(base, [placement])
      expect(() => resizeProjectMap(map, 2, 1)).toThrow(placement.id)
      expect(projectMapStampPlacements(resizeProjectMap(map, 4, 3))).toEqual(
        projectMapStampPlacements(map),
      )
    }
  })
})

describe('ProjectMap v2/v3 作者态转换', () => {
  test('首个 placement 升 v3，普通矩阵编辑保留 authoring，删最后一组降回 v2', () => {
    const base = paintProjectMapTiles(buildBlankProjectMap(2, 1, 'tileset-001'), [
      { layerId: 'floor', row: 0, col: 0, tileId: 7, height: 0 },
    ])
    const v3 = withProjectMapStampPlacements(base, [
      {
        id: 'placement-1',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    expect(v3.version).toBe(3)
    expect(projectMapStampPlacements(v3)).toHaveLength(1)

    const edited = paintProjectMapCollision(v3, [{ row: 0, col: 0, value: 2 }])
    expect(edited.version).toBe(3)
    if (edited.version !== 3) throw new Error('期望 v3')
    expect(edited.authoring).toEqual(v3.version === 3 ? v3.authoring : undefined)

    const v2 = withProjectMapStampPlacements(edited, [])
    expect(v2).toMatchObject({
      version: 2,
      collision: [
        [2, 0],
        [0, 0],
      ],
    })
    expect('authoring' in v2).toBe(false)
  })

  test('相同普通矩阵的 v2/v3 产出完全相同渲染计划', () => {
    const base = paintProjectMapTiles(buildBlankProjectMap(1, 1, 'tileset-001'), [
      { layerId: 'floor', row: 0, col: 0, tileId: 3, height: 0 },
    ])
    const v3 = withProjectMapStampPlacements(base, [
      {
        id: 'placement-1',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    const view = { col: 0, row: 0, cols: 1, rows: 1 }
    expect(projectMapTilesInView(v3, view)).toEqual(projectMapTilesInView(base, view))
  })

  test('v3 公共删层入口拒绝制造悬空 layerId', () => {
    const base = buildBlankProjectMap(1, 1, 'tileset-001')
    const layered = paintProjectMapTiles(
      insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件')),
      [{ layerId: 'objects', row: 0, col: 0, tileId: 1, height: 0 }],
    )
    const map = withProjectMapStampPlacements(layered, [
      {
        id: 'tree',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    expect(() => removeProjectMapLayer(map, 'objects')).toThrow('tree')
    expect(removeProjectMapLayer(map, 'floor').layers.map(({ id }) => id)).toEqual(['objects'])
  })
})
