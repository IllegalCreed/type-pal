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

const SOURCE_A = 'tileset-001'
const SOURCE_B = 'tileset-002'

describe('buildBlankProjectMap', () => {
  test('产出当前 canonical 地图与 lockstep 空矩阵', () => {
    const map = buildBlankProjectMap(3, 2, SOURCE_A)
    expect(map).toMatchObject({ version: 4, width: 3, height: 2, tilesetRefs: [SOURCE_A] })
    expect(map.layers.map(({ id }) => id)).toEqual(['floor'])
    expect(map.layers[0]?.tiles).toHaveLength(4)
    expect(map.layers[0]?.tiles[3]?.[2]).toBeNull()
    expect(map.layers[0]?.sources[3]?.[2]).toBeNull()
    expect(map.layers[0]?.heights).toBeUndefined()
    expect(map.collision[3]?.[2]).toBe(0)
  })
})

describe('lattice 几何', () => {
  test('中心命中往返；奇数行右错半格', () => {
    for (const pos of [
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 2, row: 4 },
      { col: 3, row: 5 },
    ])
      expect(pixelToLattice(latticeCenter(pos).x, latticeCenter(pos).y)).toEqual(pos)
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

  test('命中矩形与 tile blit 几何规范化负零', () => {
    const nearOrigin = latticeInRect(-1, -1, 1, 1)
    expect(nearOrigin.some((pos) => Object.is(pos.row, -0) || Object.is(pos.col, -0))).toBe(false)
    expect(projectMapTileBlitRect({ col: 2, row: 3 }, { width: 48, height: 40 })).toEqual({
      x: 64,
      y: 16,
      width: 48,
      height: 40,
    })
  })

  test('地图边界矩形先裁剪再枚举', () => {
    const map = buildBlankProjectMap(3, 2, SOURCE_A)
    const got = latticeInMapRect(map, -1e9, -1e9, 1e9, 1e9)
    expect(got).toHaveLength(map.width * map.height * 2)
    expect(got[0]).toEqual({ col: 0, row: 0 })
    expect(got.at(-1)).toEqual({ col: 2, row: 3 })
  })
})

describe('瓦片来源、高度与碰撞编辑', () => {
  test('同 tileId 可在同层指向不同来源，新增来源稳定排序并重映射旧 source', () => {
    let map = buildBlankProjectMap(2, 1, SOURCE_B)
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 7, tilesetId: SOURCE_B, height: 0 },
      { layerId: 'floor', col: 1, row: 0, tileId: 7, tilesetId: SOURCE_A, height: 5 },
    ])
    expect(map.tilesetRefs).toEqual([SOURCE_A, SOURCE_B])
    expect(map.layers[0]?.tiles[0]).toEqual([7, 7])
    expect(map.layers[0]?.sources[0]).toEqual([1, 0])
    expect(map.layers[0]?.heights?.[0]).toEqual([0, 5])
    expect(projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 })).toEqual([
      expect.objectContaining({ col: 0, tileId: 7, tilesetId: SOURCE_B, height: 0 }),
      expect.objectContaining({ col: 1, tileId: 7, tilesetId: SOURCE_A, height: 5 }),
    ])
  })

  test('擦除同步清空 tile/source/height，全零高度重新省略', () => {
    let map = paintProjectMapTiles(buildBlankProjectMap(1, 1, SOURCE_A), [
      { layerId: 'floor', col: 0, row: 0, tileId: 1, tilesetId: SOURCE_A, height: 4 },
    ])
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: null, tilesetId: null, height: 99 },
    ])
    expect(map.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(map.layers[0]?.sources[0]?.[0]).toBeNull()
    expect(map.layers[0]?.heights).toBeUndefined()
  })

  test('非法 tile/source 组合 fail loud', () => {
    const map = buildBlankProjectMap(1, 1, SOURCE_A)
    expect(() =>
      paintProjectMapTiles(map, [
        { layerId: 'floor', col: 0, row: 0, tileId: 1, tilesetId: null, height: 0 },
      ]),
    ).toThrow('瓦片集')
    expect(() =>
      paintProjectMapTiles(map, [
        { layerId: 'floor', col: 0, row: 0, tileId: null, tilesetId: SOURCE_A, height: 0 },
      ]),
    ).toThrow('空瓦片')
  })

  test('碰撞写入不触碰视觉层', () => {
    const map = buildBlankProjectMap(2, 1, SOURCE_A)
    const out = paintProjectMapCollision(map, [{ col: 1, row: 1, value: 2 }])
    expect(out.collision[1]?.[1]).toBe(2)
    expect(out.layers).toBe(map.layers)
  })

  test('填充区域身份包含 tileId、来源和高度；空格同样可填充', () => {
    let map = buildBlankProjectMap(2, 1, SOURCE_A)
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 7, tilesetId: SOURCE_A, height: 1 },
      { layerId: 'floor', col: 0, row: 1, tileId: 7, tilesetId: SOURCE_B, height: 1 },
    ])
    expect(floodFillProjectMapTiles(map, 'floor', { col: 0, row: 0 }, 9, SOURCE_B, 4)).toEqual([
      { layerId: 'floor', col: 0, row: 0, tileId: 9, tilesetId: SOURCE_B, height: 4 },
    ])
    const blank = buildBlankProjectMap(2, 1, SOURCE_A)
    expect(
      floodFillProjectMapTiles(blank, 'floor', { col: 0, row: 0 }, 6, SOURCE_A, 3),
    ).toHaveLength(4)
  })
})

describe('图层、缩放与作者态', () => {
  test('图层稳定 id 支持增、移、改、删', () => {
    const base = buildBlankProjectMap(1, 1, SOURCE_A)
    const added = insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件'))
    const moved = moveProjectMapLayer(added, 'objects', 0)
    expect(moved.layers.map(({ id }) => id)).toEqual(['objects', 'floor'])
    expect(updateProjectMapLayer(moved, 'objects', { name: '遮挡物' }).layers[0]?.name).toBe(
      '遮挡物',
    )
    expect(removeProjectMapLayer(moved, 'objects').layers.map(({ id }) => id)).toEqual(['floor'])
    expect(removeProjectMapLayer(base, 'floor')).toBe(base)
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
    expect(resizeProjectMap(map, 2, 2)).toBe(map)
  })

  test('authoring 可选但版本始终保持 current', () => {
    const base = paintProjectMapTiles(buildBlankProjectMap(1, 1, SOURCE_A), [
      { layerId: 'floor', row: 0, col: 0, tileId: 3, tilesetId: SOURCE_A, height: 0 },
    ])
    const authored = withProjectMapStampPlacements(base, [
      {
        id: 'placement-1',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    expect(authored.version).toBe(4)
    expect(projectMapStampPlacements(authored)).toHaveLength(1)
    const plain = withProjectMapStampPlacements(authored, [])
    expect(plain.version).toBe(4)
    expect(plain.authoring).toBeUndefined()
  })
})
