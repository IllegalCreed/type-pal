import { expect, test } from 'vitest'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  formatProjectMap,
  type ProjectMap,
  parseProjectMap,
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
  ['authoring object', (m) => ({ ...m, authoring: [] }), 'projectMap.authoring: 期望对象'],
  [
    'authoring version',
    (m) => ({ ...m, authoring: { ...m.authoring, version: 2 } }),
    'projectMap.authoring.version: 仅支持 1，收到 2',
  ],
  [
    'empty placements',
    (m) => ({ ...m, authoring: { version: 1, stampPlacements: [] } }),
    'projectMap.authoring.stampPlacements: authoring 必须包含至少一个放置组',
  ],
  [
    'placement object',
    (m) => ({ ...m, authoring: { version: 1, stampPlacements: [null] } }),
    'projectMap.authoring.stampPlacements[0]: 期望对象',
  ],
  [
    'placement id duplicate',
    (m) => {
      m.authoring!.stampPlacements[1]!.id = 'group-b'
      return m
    },
    'projectMap.authoring.stampPlacements[1].id: 重复放置组 id "group-b"',
  ],
  [
    'anchor row bound',
    (m) => {
      m.authoring!.stampPlacements[0]!.anchor.row = 2
      return m
    },
    'projectMap.authoring.stampPlacements[0].anchor: 坐标 (2,0) 超出地图边界',
  ],
  [
    'anchor column bound',
    (m) => {
      m.authoring!.stampPlacements[0]!.anchor.col = 2
      return m
    },
    'projectMap.authoring.stampPlacements[0].anchor: 坐标 (0,2) 超出地图边界',
  ],
  [
    'empty visual ownership',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots = []
      return m
    },
    'projectMap.authoring.stampPlacements[0].visualSlots: 放置组必须至少拥有一个视觉槽',
  ],
  [
    'missing layer',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots[0]!.layerId = 'missing'
      return m
    },
    'projectMap.authoring.stampPlacements[0].visualSlots[0].layerId: 图层 "missing" 不存在',
  ],
  [
    'null tile',
    (m) => {
      m.authoring!.stampPlacements[0]!.visualSlots[0]!.col = 1
      return m
    },
    'projectMap.authoring.stampPlacements[0].visualSlots[0]: 放置组视觉成员不得指向空瓦片',
  ],
  [
    'local visual duplicate',
    (m) => {
      const p = m.authoring!.stampPlacements[0]!
      p.visualSlots.push({ ...p.visualSlots[0]! })
      return m
    },
    'projectMap.authoring.stampPlacements[0].visualSlots[4]: 组内重复视觉槽',
  ],
  [
    'cross-group visual owner',
    (m) => {
      m.authoring!.stampPlacements[1]!.visualSlots = [{ layerId: 'a', row: 0, col: 0 }]
      return m
    },
    'projectMap.authoring.stampPlacements[1].visualSlots[0]: 视觉槽已属于放置组 "group-b"',
  ],
  [
    'local collision duplicate',
    (m) => {
      m.authoring!.stampPlacements[0]!.gridPoints.push({ row: 0, col: 0 })
      return m
    },
    'projectMap.authoring.stampPlacements[0].gridPoints[3]: 组内重复碰撞格点',
  ],
  [
    'cross-group collision owner',
    (m) => {
      m.authoring!.stampPlacements[1]!.gridPoints.push({ row: 0, col: 0 })
      return m
    },
    'projectMap.authoring.stampPlacements[1].gridPoints[0]: 碰撞格点已属于放置组 "group-b"',
  ],
]
test.each(
  rejections,
)('map rejects %s while preserving the entire rejected input', (_label, mutate, error) => {
  const valid = map()
  expectRejectUnchanged(validateProjectMap, mutate(valid), error)
})

test.each([
  ['source name empty', { sourceStampName: '' }, '.sourceStampName: 期望非空字符串'],
  ['anchor array', { anchor: [] }, '.anchor: 期望对象'],
  ['grid list type', { gridPoints: {} }, '.gridPoints: 期望数组'],
  ['visual member null', { visualSlots: [null] }, '.visualSlots[0]: 期望对象'],
])('project map placement boundary: %s', (_label, patch, message) => {
  const good = map()
  const input = {
    ...good,
    authoring: {
      version: 1,
      stampPlacements: [
        { ...good.authoring?.stampPlacements[0], ...patch },
        good.authoring?.stampPlacements[1],
      ],
    },
  }
  expectRejectUnchanged(
    validateProjectMap,
    input,
    `projectMap.authoring.stampPlacements[0]${message}`,
  )
})
