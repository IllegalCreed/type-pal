import type { ProjectMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  floodFillProjectMapTiles,
  insertProjectMapLayer,
  isLatticeInside,
  latticeInMapRect,
  latticeInRect,
  moveProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  projectMapTilesInView,
  resizeProjectMap,
  updateProjectMapLayer,
  withProjectMapStampPlacements,
} from './project-map.js'

const SOURCE_A = 'tileset-001'
const SOURCE_B = 'tileset-002'

const blank = (): ProjectMap => buildBlankProjectMap(2, 1, SOURCE_A)

describe('N01 lattice 边界与界外裁剪', () => {
  test('isLatticeInside 四边精确拒绝；界外像素命中最近格', () => {
    const map = blank()
    expect(isLatticeInside(map, { col: 0, row: 0 })).toBe(true)
    expect(isLatticeInside(map, { col: 1, row: 1 })).toBe(true)
    expect(isLatticeInside(map, { col: 2, row: 0 })).toBe(false)
    expect(isLatticeInside(map, { col: 0, row: 2 })).toBe(false)
    expect(isLatticeInside(map, { col: -1, row: 0 })).toBe(false)
    // 视口外的负坐标像素折回最近错排格（模运算归一）。
    expect(pixelToLattice(-1, -1)).toEqual({ col: 0, row: 0 })
  })

  test('latticeInRect 全图外矩形与 -0 规范化', () => {
    // 界外枚举允许负 row/col（调用方写入函数负责忽略）。
    expect(latticeInRect(-100, -100, -90, -90)).toEqual([{ col: -3, row: -12 }])
    // 端点落在 -0 时不产生 -0 键。
    const got = latticeInRect(-0, 0, 0, 0)
    expect(got).toEqual([{ col: 0, row: 0 }])
    expect(Object.is(got[0]?.col, -0)).toBe(false)
    expect(Object.is(got[0]?.row, -0)).toBe(false)
  })

  test('latticeInMapRect 先裁到图内再枚举，不产出界外格', () => {
    const map = blank() // width 2, height 1 → rows 0..1
    expect(latticeInMapRect(map, -50, -50, 500, 500)).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ])
    expect(latticeInMapRect(map, 100, 100, 200, 200)).toEqual([])
  })
})

describe('N01 瓦片/碰撞编辑非法输入 fail-loud', () => {
  test('负高度、空瓦片带来源、非整数 tileId、缺来源分别精确拒绝', () => {
    const map = blank()
    expect(() =>
      paintProjectMapTiles(map, [
        { col: 0, row: 0, layerId: 'floor', tileId: 1, tilesetId: SOURCE_A, height: -1 },
      ]),
    ).toThrow('地图实例高度必须是非负整数，收到 -1')
    expect(() =>
      paintProjectMapTiles(map, [
        { col: 0, row: 0, layerId: 'floor', tileId: null, tilesetId: SOURCE_A, height: 0 },
      ]),
    ).toThrow('空瓦片不能保留瓦片集来源')
    expect(() =>
      paintProjectMapTiles(map, [
        { col: 0, row: 0, layerId: 'floor', tileId: 1.5, tilesetId: SOURCE_A, height: 0 },
      ]),
    ).toThrow('tileId 必须是非负安全整数，收到 1.5')
    expect(() =>
      paintProjectMapTiles(map, [
        { col: 0, row: 0, layerId: 'floor', tileId: 3, tilesetId: null, height: 0 },
      ]),
    ).toThrow('非空瓦片必须给出稳定瓦片集 id')
    expect(() => paintProjectMapCollision(map, [{ col: 0, row: 0, value: -1 }])).toThrow(
      '碰撞值必须是非负整数，收到 -1',
    )
  })

  test('高度归零时 heights 层整体退役；非零时随行写入', () => {
    const withHeight = paintProjectMapTiles(blank(), [
      { col: 0, row: 0, layerId: 'floor', tileId: 1, tilesetId: SOURCE_A, height: 3 },
    ])
    expect(withHeight.layers[0]?.heights?.[0]?.[0]).toBe(3)
    const cleared = paintProjectMapTiles(withHeight, [
      { col: 0, row: 0, layerId: 'floor', tileId: null, tilesetId: null, height: 0 },
    ])
    expect(cleared.layers[0]?.heights).toBeUndefined()
  })
})

describe('N01 填充/视图的退化输入', () => {
  test('floodFill：目标层缺席、起点图外、起点已是目标态均返回空', () => {
    const map = paintProjectMapTiles(blank(), [
      { col: 0, row: 0, layerId: 'floor', tileId: 1, tilesetId: SOURCE_A, height: 0 },
    ])
    expect(floodFillProjectMapTiles(map, 'ghost', { col: 0, row: 0 }, 2, SOURCE_B, 0)).toEqual([])
    expect(floodFillProjectMapTiles(map, 'floor', { col: 9, row: 9 }, 2, SOURCE_B, 0)).toEqual([])
    // 起点已是目标身份（同 tileId/来源/高度）→ 无编辑。
    expect(floodFillProjectMapTiles(map, 'floor', { col: 0, row: 0 }, 1, SOURCE_A, 0)).toEqual([])
  })

  test('tilesInView 缺行缺列与隐藏层都不产出；null 瓦片跳过', () => {
    const map = paintProjectMapTiles(blank(), [
      { col: 0, row: 0, layerId: 'floor', tileId: 1, tilesetId: SOURCE_A, height: 2 },
    ])
    const draws = projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 })
    expect(draws).toHaveLength(1)
    expect(draws[0]).toMatchObject({
      col: 0,
      row: 0,
      tileId: 1,
      tilesetId: SOURCE_A,
      height: 2,
      centerX: 0,
      centerY: 0,
    })
    expect(projectMapTilesInView(map, { col: 5, row: 5, cols: 2, rows: 2 })).toEqual([])
    expect(
      projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 }, new Set(['floor'])),
    ).toEqual([])
  })
})

describe('N01 图层操作幂等与保护', () => {
  test('插入重名 id 幂等、移动未知层/原位移动幂等、更新未知层返回原图', () => {
    const map = blank()
    const layer = { id: 'floor', name: 'F', tiles: [[null, null]], sources: [[null, null]] }
    expect(insertProjectMapLayer(map, layer, 0)).toBe(map) // 重名 id
    expect(moveProjectMapLayer(map, 'ghost', 0)).toBe(map)
    expect(moveProjectMapLayer(map, 'floor', 0)).toBe(map)
    expect(updateProjectMapLayer(map, 'ghost', { name: 'X' })).toBe(map)
    const renamed = updateProjectMapLayer(map, 'floor', { name: '地板层' })
    expect(renamed.layers[0]?.name).toBe('地板层')
  })
})

describe('N01 缩放保护与作者态', () => {
  test('同尺寸缩放返回原引用；空作者态不物化 authoring 字段', () => {
    const map = blank()
    expect(resizeProjectMap(map, map.width, map.height)).toBe(map)
    const placed = withProjectMapStampPlacements(map, [])
    expect(placed.authoring).toBeUndefined()
    expect(placed).toMatchObject({ version: 4, width: map.width })
  })
})
