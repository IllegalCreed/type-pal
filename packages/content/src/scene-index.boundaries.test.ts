import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  nextSceneAssetIdentity,
  normalizeSceneAssetPath,
  sceneAssetById,
  validateSceneIndex,
} from './scene-index.js'

test.each([
  ['root', null, 'sceneIndex: 期望对象'],
  ['scenes list', { version: 1, scenes: {} }, 'sceneIndex.scenes: 期望数组'],
  ['entry record', { version: 1, scenes: [null] }, 'sceneIndex.scenes[0]: 期望对象'],
  [
    'path type',
    { version: 1, scenes: [{ id: 'home', name: '家', path: 1 }] },
    'sceneIndex.scenes[0].path: 期望字符串',
  ],
] as const)('scene index rejects malformed %s without input mutation', (_label, input, error) => {
  expect(
    validateSceneIndex({
      version: 1,
      scenes: [{ id: 'home', name: '家', path: 'scenes/home.json' }],
    }).scenes,
  ).toHaveLength(1)
  const before = deepSnapshot(input)
  expect(() => validateSceneIndex(input)).toThrow(error)
  expect(input).toEqual(before)
})

test.each([
  'https:remote.json',
  'C:local.json',
  'folder\\home.json',
  ' ',
  'folder/home.png',
])('scene path rejects non-project JSON path %s', (path) => {
  expect(() => normalizeSceneAssetPath(path)).toThrow(/期望工程相对路径|必须指向 .json/)
  expect(normalizeSceneAssetPath(' ./folder//home.json ')).toBe('folder/home.json')
})

test('scene identity fallback avoids normalized path collisions and custom index self-overwrite', () => {
  const input = {
    version: 1,
    scenes: [{ id: 'elsewhere', name: '别处', path: './chapters//scene.json' }],
  }
  const before = deepSnapshot(input)
  const index = validateSceneIndex(input, './chapters/index.json')
  expect(nextSceneAssetIdentity(index, ' 中文 ', 'chapters')).toEqual({
    id: 'scene-2',
    path: 'chapters/scene-2.json',
  })
  expect(nextSceneAssetIdentity(index, ' __Room A__ ', 'chapters/')).toEqual({
    id: 'room-a',
    path: 'chapters/room-a.json',
  })
  expect(sceneAssetById(index, 'elsewhere')).toBe(index.scenes[0])
  expect(sceneAssetById(index, 'missing')).toBeUndefined()
  expect(input).toEqual(before)
  expect(() =>
    validateSceneIndex(
      { version: 1, scenes: [{ id: 'self', name: '自身', path: 'chapters/./index.json' }] },
      './chapters//index.json',
    ),
  ).toThrow('不得覆盖 scene index 自身')
})
