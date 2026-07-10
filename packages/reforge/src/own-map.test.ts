import { describe, expect, test } from 'vitest'
import {
  buildBlankOwnMap,
  buildOwnMapLayer,
  floodFillOwnMapTiles,
  insertOwnMapLayer,
  latticeCenter,
  latticeInRect,
  moveOwnMapLayer,
  ownMapTilesInView,
  paintOwnMapCollision,
  paintOwnMapTiles,
  pixelToLattice,
  removeOwnMapLayer,
  updateOwnMapLayer,
} from './own-map.js'

describe('buildBlankOwnMap', () => {
  test('产出 v1、缺省地板层、2H×W 空 lattice 与独立碰撞层', () => {
    const map = buildBlankOwnMap(3, 2, 'tileset/12.rle')
    expect(map).toMatchObject({ version: 1, width: 3, height: 2, tileset: 'tileset/12.rle' })
    expect(map.layers.map((layer) => layer.id)).toEqual(['floor'])
    expect(map.layers[0]?.tiles).toHaveLength(4)
    expect(map.layers[0]?.tiles[0]).toHaveLength(3)
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
})

describe('视觉层与碰撞层编辑', () => {
  test('按稳定 layer.id 写无上限 tileId；源图与旁层不变', () => {
    const base = buildBlankOwnMap(2, 1, 't')
    const upper = buildOwnMapLayer(base, 'upper', '上方', true)
    const map = insertOwnMapLayer(base, upper)
    const out = paintOwnMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 4096 },
      { layerId: 'upper', col: 1, row: 1, tileId: 9 },
    ])
    expect(out.layers[0]?.tiles[0]?.[0]).toBe(4096)
    expect(out.layers[1]?.tiles[1]?.[1]).toBe(9)
    expect(map.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(out.collision).toBe(map.collision)
  })

  test('碰撞写入不触碰任何视觉层；界外全忽略', () => {
    const map = buildBlankOwnMap(2, 1, 't')
    const out = paintOwnMapCollision(map, [{ col: 1, row: 1, value: 2 }])
    expect(out.collision[1]?.[1]).toBe(2)
    expect(out.layers).toBe(map.layers)
    expect(paintOwnMapCollision(map, [{ col: 9, row: 9, value: 1 }])).toBe(map)
  })

  test('填充只作用选中层的同 tileId 四邻域', () => {
    let map = buildBlankOwnMap(3, 1, 't')
    map = paintOwnMapTiles(map, [
      { layerId: 'floor', col: 1, row: 0, tileId: 8 },
      { layerId: 'floor', col: 0, row: 1, tileId: 8 },
    ])
    const edits = floodFillOwnMapTiles(map, 'floor', { col: 0, row: 0 }, 5)
    expect(edits).toEqual([{ layerId: 'floor', col: 0, row: 0, tileId: 5 }])
  })

  test('空白层四邻域覆盖全部 W × 2H 子格', () => {
    const map = buildBlankOwnMap(3, 2, 't')
    const edits = floodFillOwnMapTiles(map, 'floor', { col: 0, row: 0 }, 6)
    expect(edits).toHaveLength(3 * 2 * 2)
    expect(new Set(edits.map((edit) => `${edit.col},${edit.row}`)).size).toBe(edits.length)
  })
})

describe('N 层操作与渲染计划', () => {
  test('新增/重排/更新/删除均按稳定 id', () => {
    const base = buildBlankOwnMap(1, 1, 't')
    const layer = buildOwnMapLayer(base, 'objects', '物件')
    const added = insertOwnMapLayer(base, layer)
    expect(added.layers.map((item) => item.id)).toEqual(['floor', 'objects'])
    const moved = moveOwnMapLayer(added, 'objects', 0)
    expect(moved.layers.map((item) => item.id)).toEqual(['objects', 'floor'])
    const updated = updateOwnMapLayer(moved, 'objects', { name: '遮挡物', occlude: true })
    expect(updated.layers[0]).toMatchObject({ id: 'objects', name: '遮挡物', occlude: true })
    expect(removeOwnMapLayer(updated, 'objects').layers.map((item) => item.id)).toEqual(['floor'])
    expect(removeOwnMapLayer(base, 'floor')).toBe(base)
  })

  test('occlude 层 null 不产渲染/cover 项；隐藏层也不产项', () => {
    const base = buildBlankOwnMap(2, 1, 't')
    let map = insertOwnMapLayer(base, buildOwnMapLayer(base, 'cover', '遮挡', true))
    map = paintOwnMapTiles(map, [{ layerId: 'cover', col: 1, row: 0, tileId: 7 }])
    const draws = ownMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 })
    expect(draws.filter((draw) => draw.occlude)).toEqual([
      expect.objectContaining({ layerId: 'cover', col: 1, row: 0, tileId: 7 }),
    ])
    expect(
      ownMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 }, new Set(['cover'])),
    ).toEqual([])
  })
})
