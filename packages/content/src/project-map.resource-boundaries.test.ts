import { expect, test } from 'vitest'
import { resourceSnapshot } from './__tests__/codex-resource-contract-fixtures.js'
import {
  formatProjectMap,
  parseProjectMap,
  validateIsometricMapContent,
  validateProjectMap,
} from './project-map.js'

function map() {
  return validateProjectMap({
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: ['tiles'],
    layers: [{ id: 'ground', name: '地面', tiles: [[3], [null]] }],
    collision: [[0], [2]],
    authoring: {
      version: 1,
      stampPlacements: [
        {
          id: 'p',
          sourceStampId: 'stamp',
          sourceStampName: '桥',
          anchor: { row: 0, col: 0 },
          visualSlots: [{ layerId: 'ground', row: 0, col: 0 }],
          gridPoints: [],
        },
      ],
    },
  })
}

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
  const good = map()
  expect(parseProjectMap(formatProjectMap(good))).toEqual(good)
  const input = invalid()
  const before = resourceSnapshot(input)
  expect(() => validateProjectMap(input)).toThrow(new Error(message))
  expect(input).toEqual(before)
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
      stampPlacements: [{ ...good.authoring?.stampPlacements[0], ...patch }],
    },
  }
  const before = resourceSnapshot(input)
  expect(() => validateProjectMap(input)).toThrow(
    new Error(`projectMap.authoring.stampPlacements[0]${message}`),
  )
  expect(input).toEqual(before)
})

test('shared content object boundary rejects independently of project version validation', () => {
  expect(validateIsometricMapContent(map(), { path: 'content', collision: 'dense' })).toMatchObject(
    { width: 1, height: 1 },
  )
  expect(() => validateIsometricMapContent(null, { path: 'content', collision: 'dense' })).toThrow(
    new Error('content: 期望对象'),
  )
})
