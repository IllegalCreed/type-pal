import { expect, test } from 'vitest'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  mapInstanceHeight,
  mapInstanceTilesetId,
  type ProjectMap,
  validateIsometricMapContent,
  validateProjectMap,
} from './project-map.js'

function map(): ProjectMap {
  return {
    version: 4,
    width: 2,
    height: 1,
    tilesetRefs: ['tiles-a', 'tiles-b'],
    layers: ['a', 'b'].map((id) => ({
      id,
      name: id,
      tiles: [
        [0, 1],
        [2, null],
      ],
      sources: [
        [0, 1],
        [0, null],
      ],
    })),
    collision: [
      [0, 1],
      [2, 0],
    ],
  }
}

type MapMutation = (value: ProjectMap) => unknown
const rejections: [string, MapMutation, string][] = [
  ['width', (m) => ({ ...m, width: 0 }), 'projectMap.width: 期望正安全整数'],
  [
    'column count',
    (m) => {
      m.layers[0]!.tiles[0]!.pop()
      return m
    },
    'projectMap.layers[0].tiles[0]: 期望 2 列',
  ],
  [
    'negative collision',
    (m) => {
      m.collision[0]![0] = -1
      return m
    },
    'projectMap.collision[0][0]: 期望非负安全整数',
  ],
  [
    'duplicate sources',
    (m) => ({ ...m, tilesetRefs: ['tiles-a', 'tiles-a'] }),
    'projectMap.tilesetRefs: 不得包含重复瓦片集 id',
  ],
  ['no layers', (m) => ({ ...m, layers: [] }), 'projectMap.layers: 至少需要一个视觉层'],
  ['non-object layer', (m) => ({ ...m, layers: [null] }), 'projectMap.layers[0]: 期望对象'],
  [
    'implicit multi-source',
    (m) => {
      const { sources: _sources, ...layer } = m.layers[0]!
      return { ...m, layers: [layer, ...m.layers.slice(1)] }
    },
    'projectMap.layers[0].sources: 多来源内容必须保存逐格来源矩阵',
  ],
]
test.each(
  rejections,
)('map rejects %s while preserving the entire rejected input', (_label, mutate, error) => {
  expectRejectUnchanged(validateProjectMap, mutate(map()), error)
})

test('nullable stamp collision preserves omission while dense map collision rejects the same null', () => {
  const input = {
    ...map(),
    collision: [
      [null, 0],
      [2, null],
    ],
  }
  const before = deepSnapshot(input)
  expect(
    validateIsometricMapContent(input, { path: 'stamp', collision: 'nullable' }).collision,
  ).toEqual([
    [null, 0],
    [2, null],
  ])
  expect(() => validateIsometricMapContent(input, { path: 'map', collision: 'dense' })).toThrow(
    new Error('map.collision[0][0]: 期望非负安全整数'),
  )
  expect(input).toEqual(before)
})

test('map instance reads distinguish null or missing cells from source index zero and default height', () => {
  const input = map()
  const layer = input.layers[0]!
  expect(mapInstanceTilesetId(input, layer, 0, 0)).toBe('tiles-a')
  expect(mapInstanceTilesetId(input, layer, 1, 1)).toBeUndefined()
  expect(mapInstanceTilesetId(input, layer, 3, 0)).toBeUndefined()
  expect(mapInstanceHeight(layer, 0, 0)).toBe(0)
  layer.heights = [
    [2, 0],
    [0, 0],
  ]
  expect(mapInstanceHeight(layer, 0, 0)).toBe(2)
  expect(mapInstanceHeight(layer, 3, 0)).toBe(0)
})

test.each([
  ['null root', () => null, 'projectMap: 期望对象'],
  ['array root', () => [], 'projectMap: 期望对象'],
  [
    'refs object',
    () => ({ ...map(), tilesetRefs: {} }),
    'projectMap.tilesetRefs: 至少需要一个瓦片集来源',
  ],
  [
    'refs empty',
    () => ({ ...map(), tilesetRefs: [] }),
    'projectMap.tilesetRefs: 至少需要一个瓦片集来源',
  ],
  [
    'name wrong type',
    () => ({ ...map(), layers: [{ ...map().layers[0], name: 3 }] }),
    'projectMap.layers[0].name: 期望非空字符串',
  ],
])('project map boundary: %s', (_label, invalid, message) => {
  expectRejectUnchanged(validateProjectMap, invalid(), message)
})

test('shared content object boundary rejects independently of project version validation', () => {
  const { version: _version, ...content } = map()
  expect(validateIsometricMapContent(content, { path: 'content', collision: 'dense' })).toEqual({
    width: 2,
    height: 1,
    tilesetRefs: ['tiles-a', 'tiles-b'],
    layers: content.layers,
    collision: [
      [0, 1],
      [2, 0],
    ],
  })
  expect(() => validateIsometricMapContent(null, { path: 'content', collision: 'dense' })).toThrow(
    new Error('content: 期望对象'),
  )
})
