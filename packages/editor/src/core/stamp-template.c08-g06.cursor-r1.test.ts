/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G06：stamp-template 选区裁切（不重复 L map-transform/placement）。
 * 排重：stamp-template.test 快照/空视觉/collision 排除；boundaries 越界层/nextStampTemplateId NFKC
 * 已证——本文件补 defaultStampTemplateAnchor 与 build 锚点/缺来源错误轴。
 */
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { MapSelection } from './map-selection.js'
import {
  buildStampTemplateFromSelection,
  defaultStampTemplateAnchor,
  nextStampTemplateId,
} from './stamp-template.js'

function mapWithObjects() {
  const base = buildBlankProjectMap(3, 2, 'tileset-003')
  const withObjects = insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件'))
  return paintProjectMapTiles(withObjects, [
    { layerId: 'floor', row: 1, col: 1, tileId: 4, tilesetId: 'tileset-003', height: 0 },
    { layerId: 'objects', row: 0, col: 2, tileId: 5, tilesetId: 'tileset-003', height: 4 },
  ])
}

describe('C08-G06 stamp-template 锚点与拒绝路径', () => {
  test('C08-G06-01 defaultStampTemplateAnchor 取最小 row 再最小 latticeU', () => {
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [
        { layerId: 'floor', row: 2, col: 1 },
        { layerId: 'floor', row: 0, col: 2 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    }
    expect(defaultStampTemplateAnchor(selection)).toEqual({ row: 0, col: 2 })
  })

  test('C08-G06-02 defaultStampTemplateAnchor 空选区返回 undefined', () => {
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [],
      gridPoints: [],
    }
    expect(defaultStampTemplateAnchor(selection)).toBeUndefined()
  })

  test('C08-G06-03 buildStampTemplateFromSelection 锚点出界精确拒绝', () => {
    const map = mapWithObjects()
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'floor', row: 1, col: 1 }],
      gridPoints: [],
    }
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection,
        id: 'x',
        name: 'x',
        anchor: { row: 99, col: 0 },
        includeCollision: false,
      }),
    ).toThrow('组合锚点必须位于当前地图内。')
  })

  test('C08-G06-04 buildStampTemplateFromSelection 引用缺失图层精确拒绝', () => {
    const map = mapWithObjects()
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'ghost', row: 0, col: 0 }],
      gridPoints: [],
    }
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection,
        id: 'x',
        name: 'x',
        anchor: { row: 0, col: 0 },
        includeCollision: false,
      }),
    ).toThrow('引用的图层 "ghost" 不存在')
  })

  test('C08-G06-05 buildStampTemplateFromSelection 视觉槽缺 tileset 来源拒绝', () => {
    const map = mapWithObjects()
    map.layers[0]!.sources[1]![1] = null
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'floor', row: 1, col: 1 }],
      gridPoints: [],
    }
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection,
        id: 'x',
        name: 'x',
        anchor: { row: 1, col: 1 },
        includeCollision: false,
      }),
    ).toThrow('缺少瓦片集来源')
  })

  test('C08-G06-06 nextStampTemplateId 中文 preferred 归一后可用', () => {
    expect(nextStampTemplateId('屋角 01', [])).toBe('屋角-01')
  })

  test('C08-G06-07 nextStampTemplateId stem 占用时返回 stem-2', () => {
    expect(nextStampTemplateId('gate', ['gate'])).toBe('gate-2')
  })

  test('C08-G06-08 build 输出 origin 恒为 authored', () => {
    const map = mapWithObjects()
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'floor', row: 1, col: 1 }],
      gridPoints: [],
    }
    const template = buildStampTemplateFromSelection({
      map,
      selection,
      id: 'c08-pack',
      name: '打包',
      anchor: { row: 1, col: 1 },
      includeCollision: false,
    })
    expect(template.origin).toBe('authored')
  })

  test('C08-G06-09 build 保留 height 矩阵于 objects 层', () => {
    const map = mapWithObjects()
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'objects', row: 0, col: 2 }],
      gridPoints: [],
    }
    const template = buildStampTemplateFromSelection({
      map,
      selection,
      id: 'c08-height',
      name: '高',
      anchor: { row: 0, col: 2 },
      includeCollision: false,
    })
    const objects = template.layers.find((layer) => layer.id === 'objects')
    expect(objects?.heights?.some((row) => row.some((value) => value === 4))).toBe(true)
  })

  test('C08-G06-10 build includeCollision=false 时 collision 全 null', () => {
    const map = mapWithObjects()
    map.collision[1]![1] = 1
    const selection: Extract<MapSelection, { kind: 'cells' }> = {
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [{ layerId: 'floor', row: 1, col: 1 }],
      gridPoints: [{ row: 1, col: 1 }],
    }
    const template = buildStampTemplateFromSelection({
      map,
      selection,
      id: 'c08-no-col',
      name: '无碰撞',
      anchor: { row: 1, col: 1 },
      includeCollision: false,
    })
    expect(template.collision.flat().every((cell) => cell === null)).toBe(true)
  })
})
