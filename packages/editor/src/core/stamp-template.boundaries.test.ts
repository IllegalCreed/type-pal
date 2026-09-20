/**
 * TEST-EDITOR-MAP-DATA-1 M08：buildStampTemplateFromSelection 边界（stamp-template.ts）。
 * 既有 stamp-template.test 已覆盖多层/height/显式 0/无视觉拒绝/名字 ID——不重复。
 * 本文件：过期选区（越界/删层）精确拒绝、重复 ref 去重、layerSlotNames 回退与 category trim、
 * 层序按 map 而非 selection、输出矩阵不别名、nextStampTemplateId 规范化。
 */
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { buildStampTemplateFromSelection, nextStampTemplateId } from './stamp-template.js'

const TILESET = 'ts'
const cells = (
  visualSlots: Array<{ layerId: string; row: number; col: number }>,
  gridPoints: Array<{ row: number; col: number }> = [],
) => ({
  kind: 'cells' as const,
  visualSlots,
  gridPoints,
  hitScope: 'active-layer' as const,
})

function paintedTwoLayer() {
  const base = buildBlankProjectMap(3, 3, TILESET)
  const withExtra = insertProjectMapLayer(base, buildProjectMapLayer(base, 'extra', '第二层'), 0)
  return paintProjectMapCollision(
    paintProjectMapTiles(withExtra, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 0 },
      { layerId: 'extra', row: 2, col: 1, tileId: 7, tilesetId: TILESET, height: 4 },
    ]),
    [{ row: 1, col: 0, value: 3 }],
  )
}

describe('M08 buildStampTemplateFromSelection 边界', () => {
  test('越界视觉槽与已删层精确拒绝；重复 ref 去重；无视觉仍拒绝', () => {
    const map = paintedTwoLayer()
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection: cells([{ layerId: 'floor', row: 99, col: 0 }]),
        id: 't',
        name: 'T',
        anchor: { row: 0, col: 0 },
        includeCollision: false,
      }),
    ).toThrow('视觉槽 floor:99:0 已超出地图边界。')
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection: cells([{ layerId: 'ghost', row: 0, col: 0 }]),
        id: 't',
        name: 'T',
        anchor: { row: 0, col: 0 },
        includeCollision: false,
      }),
    ).toThrow('选区引用的图层 "ghost" 不存在。')
    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection: cells([{ layerId: 'floor', row: 0, col: 1 }]), // 空槽
        id: 't',
        name: 'T',
        anchor: { row: 0, col: 0 },
        includeCollision: false,
      }),
    ).toThrow('选区没有可保存的非空视觉实例。')
    // 重复 ref 去重后仍合法（同槽两次 = 一份）
    const template = buildStampTemplateFromSelection({
      map,
      selection: cells([
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'floor', row: 0, col: 0 },
      ]),
      id: 't',
      name: 'T',
      anchor: { row: 0, col: 0 },
      includeCollision: false,
    })
    const floor = template.layers.find((layer) => layer.id === 'floor')!
    expect(floor.tiles.flat().filter((tile) => tile !== null)).toEqual([1])
  })
  test('层序按 map 层序而非 selection 序；layerSlotNames 回退与 trim；category trim/缺省；输出不别名', () => {
    const map = paintedTwoLayer() // extra 在数组前、floor 在后
    const template = buildStampTemplateFromSelection({
      map,
      selection: cells(
        [
          { layerId: 'floor', row: 0, col: 0 }, // selection 先 floor
          { layerId: 'extra', row: 2, col: 1 },
        ],
        [{ row: 1, col: 0 }],
      ),
      id: 't',
      name: '  T  ',
      category: '  cat  ',
      anchor: { row: 0, col: 0 },
      includeCollision: true,
      layerSlotNames: { extra: '  自定义  ', floor: '' }, // 空 trim 后回退源名
    })
    expect(template.layers.map((layer) => layer.id)).toEqual(['extra', 'floor']) // map 序
    expect(template.layers.map((layer) => layer.name)).toEqual(['自定义', '地板'])
    expect(template.name).toBe('T')
    expect(template.category).toBe('cat')
    expect(template.collision.flat().filter((value) => value !== null)).toEqual([3])
    // 输出矩阵与源层数组不别名：改模板不动 map
    const floorBefore = map.layers.find((layer) => layer.id === 'floor')!.tiles.map((r) => [...r])
    const target = template.layers.find((layer) => layer.id === 'floor')!
    const tileRow = target.tiles[0]!
    tileRow[0] = 999
    expect(map.layers.find((layer) => layer.id === 'floor')!.tiles[0]![0]).toBe(1)
    expect(floorBefore[0]![0]).toBe(1)
  })
  test('nextStampTemplateId：NFKC/trim/小写/非法字符归一；空归 stamp；占用 -2 递增', () => {
    expect(nextStampTemplateId('  Hello World!  ', [])).toBe('hello-world')
    expect(nextStampTemplateId('①②③', [])).toBe('123') // NFKC
    expect(nextStampTemplateId('   ', [])).toBe('stamp')
    expect(nextStampTemplateId('tree', ['tree'])).toBe('tree-2')
    expect(nextStampTemplateId('tree', ['tree', 'tree-2'])).toBe('tree-3')
  })
})
