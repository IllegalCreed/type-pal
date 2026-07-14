import { describe, expect, test } from 'vitest'
import {
  mapIdStem,
  nextMapAssetIdentity,
  normalizeMapAssetPath,
  validateMapIndex,
} from './index.js'
import { validateScenes, validateScenesForContentVersion } from './validate.js'

const scene = (mapId: unknown): unknown => ({
  id: 's',
  mapId,
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
})

describe('MapIndexV1', () => {
  test('规范化安全相对路径，并保持 id/name/path', () => {
    expect(
      validateMapIndex({
        version: 1,
        maps: [{ id: 'home', name: '家', path: 'content/maps/./home.json' }],
      }),
    ).toEqual({
      version: 1,
      maps: [{ id: 'home', name: '家', path: 'content/maps/home.json' }],
    })
  })

  test('拒绝非法版本、重复 id/path 和危险路径', () => {
    expect(() => validateMapIndex({ version: 2, maps: [] })).toThrow('仅支持 1')
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [
          { id: 'a', name: 'a', path: 'content/maps/a.json' },
          { id: 'a', name: 'b', path: 'content/maps/b.json' },
        ],
      }),
    ).toThrow('重复')
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [
          { id: 'a', name: 'a', path: 'content/maps/a.json' },
          { id: 'b', name: 'b', path: 'content/maps/./a.json' },
        ],
      }),
    ).toThrow('规范化后重复')
    expect(() => normalizeMapAssetPath('../outside.json')).toThrow('禁止')
    expect(() => normalizeMapAssetPath('/tmp/a.json')).toThrow('相对路径')
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [{ id: 'index', name: '错误', path: 'content/maps/index.json' }],
      }),
    ).toThrow('不得覆盖')
  })

  test('文件名可稳定派生 id stem', () => {
    expect(mapIdStem('content/maps/Home Room.json')).toBe('home-room')
    expect(mapIdStem('content/maps/legacy-home.json')).toBe('legacy-home')
  })

  test('新身份同时避开 id 与默认 path 冲突', () => {
    const index = validateMapIndex({
      version: 1,
      maps: [
        { id: 'home', name: '家', path: 'content/maps/custom.json' },
        { id: 'other', name: '别处', path: 'content/maps/home-2.json' },
      ],
    })
    expect(nextMapAssetIdentity(index, 'home')).toEqual({
      id: 'home-3',
      path: 'content/maps/home-3.json',
    })
  })
})

describe('SceneDef 地图边界', () => {
  test('只接受直接稳定 mapId', () => {
    expect(validateScenes([scene('home')])[0]?.mapId).toBe('home')
    expect(() => validateScenes([scene({ legacyMapId: 'home' })])).toThrow('合法稳定地图 id')
  })

  test('contentVersion 1 fail-loud，版本 2 正常', () => {
    expect(() => validateScenesForContentVersion([scene('home')], 1)).toThrow('请先迁移工程')
    expect(validateScenesForContentVersion([scene('home')], 2)[0]?.mapId).toBe('home')
  })
})
