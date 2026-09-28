import { describe, expect, test } from 'vitest'
import {
  mapAssetById,
  mapIdStem,
  nextMapAssetId,
  nextMapAssetIdentity,
  normalizeMapAssetPath,
  validateMapIndex,
} from './map-index.js'

const index = validateMapIndex({
  version: 1,
  maps: [
    { id: 'map-001', name: '初始地图', path: 'content/maps/map-001.json' },
    { id: 'map-002', name: '第二张', path: 'content/maps/map-002.json' },
  ],
})

describe('map-index 剩余合同', () => {
  test('normalize collapses duplicate separators and rejects absolute or escaping paths', () => {
    expect(normalizeMapAssetPath('content/maps//a.json')).toBe('content/maps/a.json')
    expect(normalizeMapAssetPath('content/./maps/a.json')).toBe('content/maps/a.json')
    expect(() => normalizeMapAssetPath('/content/maps/a.json')).toThrow('工程相对路径')
    expect(() => normalizeMapAssetPath('content/../a.json')).toThrow('..')
  })

  test('lookup by id returns the record and unknown ids yield undefined', () => {
    expect(mapAssetById(index, 'map-001')?.name).toBe('初始地图')
    expect(mapAssetById(index, 'map-404')).toBeUndefined()
  })

  test('mapIdStem extracts the file stem and nextMapAssetId dedupes existing ids', () => {
    expect(mapIdStem('content/maps/map-001.json')).toBe('map-001')
    expect(mapIdStem('content/maps/nested/map-9.json')).toBe('map-9')
    expect(nextMapAssetId(index, 'map-001')).toBe('map-001-2')
    expect(nextMapAssetId(index, 'map-003')).toBe('map-003')
  })

  test('nextMapAssetIdentity pairs a fresh id with the canonical path', () => {
    const identity = nextMapAssetIdentity(index, 'map-001')
    expect(identity.id).not.toBe('map-001')
    expect(identity.path).toBe(`content/maps/${identity.id}.json`)
  })

  test('validateMapIndex rejects duplicate ids, duplicate normalized paths and bad fields', () => {
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [
          { id: 'map-001', name: 'A', path: 'content/maps/a.json' },
          { id: 'map-001', name: 'B', path: 'content/maps/b.json' },
        ],
      }),
    ).toThrow()
    expect(() =>
      validateMapIndex({ version: 1, maps: [{ id: 'map-001', name: 'A', path: 42 }] }),
    ).toThrow()
    expect(() =>
      validateMapIndex({ version: 1, maps: [{ id: 'map-001', name: '  ', path: 'x.json' }] }),
    ).toThrow()
  })
})
