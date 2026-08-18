import { describe, expect, test } from 'vitest'
import {
  formatStampTemplates,
  parseStampTemplates,
  type StampTemplate,
  validateStampTemplates,
} from './stamp.js'

function fixture(): StampTemplate[] {
  return [
    {
      id: 'tree-large',
      name: '大树',
      category: 'vegetation',
      origin: 'authored',
      width: 2,
      height: 1,
      anchor: { row: 0, col: 0 },
      tilesetRefs: ['tileset-003', 'tileset-004'],
      layers: [
        {
          id: 'ground',
          name: '地面',
          tiles: [
            [1, null],
            [null, null],
          ],
          sources: [
            [0, null],
            [null, null],
          ],
        },
        {
          id: 'canopy',
          name: '树冠',
          tiles: [
            [null, 2],
            [null, null],
          ],
          sources: [
            [null, 1],
            [null, null],
          ],
          heights: [
            [0, 5],
            [0, 0],
          ],
        },
      ],
      collision: [
        [1, 0],
        [null, null],
      ],
    },
  ]
}

describe('StampTemplate shared isometric content', () => {
  test('多层、多来源、相对高度与 nullable collision 确定性往返', () => {
    const templates = validateStampTemplates(fixture())
    expect(templates[0]?.layers).toHaveLength(2)
    expect(templates[0]?.collision[0]).toEqual([1, 0])
    const first = formatStampTemplates(templates)
    expect(parseStampTemplates(first)).toEqual(templates)
    expect(formatStampTemplates(parseStampTemplates(first))).toBe(first)
  })

  test('null 与显式 0 碰撞不同，锚点可位于空格但不得越界', () => {
    const templates = fixture()
    templates[0]!.anchor = { row: 1, col: 1 }
    const stamp = validateStampTemplates(templates)[0]!
    expect(stamp.collision[0]![1]).toBe(0)
    expect(stamp.collision[1]![1]).toBeNull()

    templates[0]!.anchor = { row: 2, col: 0 }
    expect(() => validateStampTemplates(templates)).toThrow('锚点超出')
  })

  test('拒绝重复 id、无视觉实例和来源 lockstep 破坏', () => {
    expect(() => validateStampTemplates([...fixture(), ...fixture()])).toThrow('重复 id')
    const empty = fixture()
    for (const layer of empty[0]!.layers) {
      layer.tiles = layer.tiles.map((row) => row.map(() => null))
      layer.sources = layer.sources.map((row) => row.map(() => null))
      delete layer.heights
    }
    expect(() => validateStampTemplates(empty)).toThrow('至少包含一个视觉')

    const broken = fixture()
    broken[0]!.layers[0]!.sources[0]![0] = null
    expect(() => validateStampTemplates(broken)).toThrow('tiles/sources 必须同时')
  })
})
