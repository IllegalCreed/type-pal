import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  formatProjectMap,
  mapInstanceHeight,
  mapInstanceTilesetId,
  type ProjectMap,
  parseProjectMap,
  validateIsometricMapContent,
  validateProjectMap,
} from './project-map.js'

function map(): ProjectMap {
  const value: ProjectMap = {
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
    authoring: {
      version: 1,
      stampPlacements: [
        {
          id: 'group-b',
          sourceStampId: 'stamp-b',
          sourceStampName: '路径',
          anchor: { row: 0, col: 0 },
          visualSlots: [
            { layerId: 'b', row: 1, col: 0 },
            { layerId: 'a', row: 0, col: 1 },
            { layerId: 'b', row: 0, col: 1 },
            { layerId: 'a', row: 0, col: 0 },
          ],
          gridPoints: [
            { row: 1, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 0 },
          ],
        },
        {
          id: 'group-a',
          anchor: { row: 0, col: 0 },
          visualSlots: [{ layerId: 'b', row: 0, col: 0 }],
          gridPoints: [],
        },
      ],
    },
  }
  expect(() => validateProjectMap(value)).not.toThrow()
  return value
}

test('map authoring sorts identities and owned slots deterministically without sorting the actual input', () => {
  const input = map()
  const before = deepSnapshot(input)
  const validated = validateProjectMap(input)
  expect(validated.authoring).toEqual({
    version: 1,
    stampPlacements: [
      before.authoring!.stampPlacements[1],
      {
        ...before.authoring!.stampPlacements[0],
        visualSlots: [
          { layerId: 'a', row: 0, col: 0 },
          { layerId: 'a', row: 0, col: 1 },
          { layerId: 'b', row: 0, col: 1 },
          { layerId: 'b', row: 1, col: 0 },
        ],
        gridPoints: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 },
        ],
      },
    ],
  })
  const text = formatProjectMap(input)
  expect(parseProjectMap(text)).toEqual(validated)
  expect(formatProjectMap(parseProjectMap(text))).toBe(text)
  expect(text).toContain('"sourceStampName": "路径"')
  expect(input).toEqual(before)
  validated.authoring!.stampPlacements[1]!.anchor.row = 1
  validated.layers[0]!.tiles[0]![0] = 99
  validated.collision[0]![0] = 99
  expect(input).toEqual(before)
})

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
    '不得包含重复瓦片集 id',
  ],
  ['no layers', (m) => ({ ...m, layers: [] }), '至少需要一个视觉层'],
  ['non-object layer', (m) => ({ ...m, layers: [null] }), 'projectMap.layers[0]: 期望对象'],
  [
    'implicit multi-source',
    (m) => {
      const { sources: _sources, ...layer } = m.layers[0]!
      return { ...m, layers: [layer] }
    },
    '多来源内容必须保存逐格来源矩阵',
  ],
  ['authoring object', (m) => ({ ...m, authoring: [] }), 'projectMap.authoring: 期望对象'],
  [
    'authoring version',
    (m) => ({ ...m, authoring: { ...m.authoring, version: 2 } }),
    'projectMap.authoring.version: 仅支持 1',
  ],
  [
    'empty placements',
    (m) => ({ ...m, authoring: { version: 1, stampPlacements: [] } }),
    'authoring 必须包含至少一个放置组',
  ],
  [
    'placement object',
    (m) => ({ ...m, authoring: { version: 1, stampPlacements: [null] } }),
    'stampPlacements[0]: 期望对象',
  ],
  [
    'placement id duplicate',
    (m) => {
      m.authoring!.stampPlacements[1]!.id = 'group-b'
      return m
    },
    '重复放置组 id',
  ],
  [
    'anchor row bound',
    (m) => {
      m.authoring!.stampPlacements[0]!.anchor.row = 2
      return m
    },
    'anchor: 坐标 (2,0) 超出地图边界',
  ],
  [
    'anchor column bound',
    (m) => {
      m.authoring!.stampPlacements[0]!.anchor.col = 2
      return m
    },
    'anchor: 坐标 (0,2) 超出地图边界',
  ],
  [
    'empty visual ownership',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots = []
      return m
    },
    '放置组必须至少拥有一个视觉槽',
  ],
  [
    'missing layer',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots[0]!.layerId = 'missing'
      return m
    },
    '图层 "missing" 不存在',
  ],
  [
    'null tile',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots[0]!.col = 1
      return m
    },
    '放置组视觉成员不得指向空瓦片',
  ],
  [
    'local visual duplicate',
    (m) => {
      const p = m.authoring!.stampPlacements[0]!
      p.visualSlots.push({ ...p.visualSlots[0]! })
      return m
    },
    '组内重复视觉槽',
  ],
  [
    'cross-group visual owner',
    (m) => {
      m.authoring!.stampPlacements[1]!.visualSlots = [{ layerId: 'a', row: 0, col: 0 }]
      return m
    },
    '视觉槽已属于放置组 "group-b"',
  ],
  [
    'local collision duplicate',
    (m) => {
      m.authoring!.stampPlacements[0]!.gridPoints.push({ row: 0, col: 0 })
      return m
    },
    '组内重复碰撞格点',
  ],
  [
    'cross-group collision owner',
    (m) => {
      m.authoring!.stampPlacements[1]!.gridPoints.push({ row: 0, col: 0 })
      return m
    },
    '碰撞格点已属于放置组 "group-b"',
  ],
]
test.each(
  rejections,
)('map rejects %s while preserving the entire rejected input', (_label, mutate, error) => {
  const input = mutate(map())
  const before = deepSnapshot(input)
  expect(() => validateProjectMap(input)).toThrow(error)
  expect(input).toEqual(before)
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
    'map.collision[0][0]',
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
