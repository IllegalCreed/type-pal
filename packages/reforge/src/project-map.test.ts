import { describe, expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  floodFillProjectMapTiles,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapTilesInView,
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

describe('瓦片来源、高度与碰撞编辑', () => {
  test('同 tileId 可在同层指向不同来源，新增来源稳定排序并重映射旧 source', () => {
    const blank = buildBlankProjectMap(2, 1, SOURCE_B)
    const base = insertProjectMapLayer(blank, buildProjectMapLayer(blank, 'objects', '物件'))
    const old = paintProjectMapTiles(base, [
      { layerId: 'floor', col: 0, row: 0, tileId: 7, tilesetId: SOURCE_B, height: 0 },
      { layerId: 'objects', col: 0, row: 1, tileId: 10, tilesetId: SOURCE_B, height: 2 },
    ])
    const map = paintProjectMapTiles(old, [
      { layerId: 'floor', col: 1, row: 0, tileId: 7, tilesetId: SOURCE_A, height: 5 },
    ])
    expect(map.layers[1]?.sources[1]?.[0]).toBe(1)
    expect(old.tilesetRefs).toEqual([SOURCE_B])
    expect(old.layers[1]?.sources[1]?.[0]).toBe(0)
    expect(map.tilesetRefs).toEqual([SOURCE_A, SOURCE_B])
    expect(map.layers[0]?.tiles[0]).toEqual([7, 7])
    expect(map.layers[0]?.sources[0]).toEqual([1, 0])
    expect(map.layers[0]?.heights?.[0]).toEqual([0, 5])
    expect(projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 })).toEqual([
      expect.objectContaining({ col: 0, tileId: 7, tilesetId: SOURCE_B, height: 0 }),
      expect.objectContaining({ col: 1, tileId: 7, tilesetId: SOURCE_A, height: 5 }),
      expect.objectContaining({ layerId: 'objects', tileId: 10, tilesetId: SOURCE_B, height: 2 }),
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

  test('碰撞写入不触碰视觉层', () => {
    const map = buildBlankProjectMap(2, 1, SOURCE_A)
    const out = paintProjectMapCollision(map, [{ col: 1, row: 1, value: 2 }])
    expect(out.collision[1]?.[1]).toBe(2)
    expect(out.layers).toBe(map.layers)
  })

  test('填充区域身份包含 tileId、来源和高度；空格同样可填充', () => {
    const map = paintProjectMapTiles(buildBlankProjectMap(3, 2, SOURCE_A), [
      { layerId: 'floor', col: 1, row: 1, tileId: 7, tilesetId: SOURCE_A, height: 1 },
      { layerId: 'floor', col: 1, row: 0, tileId: 7, tilesetId: SOURCE_A, height: 2 },
      { layerId: 'floor', col: 2, row: 0, tileId: 7, tilesetId: SOURCE_B, height: 1 },
      { layerId: 'floor', col: 1, row: 2, tileId: 7, tilesetId: SOURCE_A, height: 1 },
    ])
    expect(floodFillProjectMapTiles(map, 'floor', { col: 1, row: 1 }, 9, SOURCE_B, 4)).toEqual([
      { layerId: 'floor', col: 1, row: 1, tileId: 9, tilesetId: SOURCE_B, height: 4 },
      { layerId: 'floor', col: 1, row: 2, tileId: 9, tilesetId: SOURCE_B, height: 4 },
    ])
    const blank = buildBlankProjectMap(2, 1, SOURCE_A)
    expect(
      floodFillProjectMapTiles(blank, 'floor', { col: 0, row: 0 }, 6, SOURCE_A, 3),
    ).toHaveLength(4)
  })
})

const blank = () => buildBlankProjectMap(2, 1, SOURCE_A)

describe('瓦片/碰撞编辑非法输入 fail-loud', () => {
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
})

describe('填充/视图的退化输入', () => {
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

describe('瓦片绘制过滤', () => {
  test('隐藏层不进入 tilesInView，同格可见层完整保留 layerId/tileset/height', () => {
    let map = buildBlankProjectMap(2, 1, SOURCE_A)
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 1, tilesetId: SOURCE_A, height: 0 },
      { layerId: 'objects', col: 0, row: 0, tileId: 2, tilesetId: SOURCE_A, height: 3 },
    ])
    const hidden = new Set(['floor'])
    const mapSnap = structuredClone(map)
    const hiddenSnap = [...hidden]
    const draws = projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 }, hidden)
    expect(map).toEqual(mapSnap)
    expect([...hidden]).toEqual(hiddenSnap)
    expect(draws).toEqual([
      expect.objectContaining({
        layerId: 'objects',
        tileId: 2,
        tilesetId: SOURCE_A,
        height: 3,
        col: 0,
        row: 0,
      }),
    ])
    expect(draws.some((draw) => draw.layerId === 'floor')).toBe(false)
    expect(map.layers.find((layer) => layer.id === 'floor')!.tiles[0]![0]).toBe(1)
  })
})
