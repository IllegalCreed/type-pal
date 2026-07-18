import { describe, expect, test } from 'vitest'
import { serializeMigrationJson } from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

const v2 = (): MigrationJson => ({
  version: 2,
  width: 1,
  height: 1,
  tilesetId: 'tileset-001',
  layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles: [[1], [null]] }],
  collision: [[0], [0]],
})

describe('serializeMigrationJson W7G', () => {
  test('v2 继续使用原有逐行矩阵字节格式', () => {
    expect(serializeMigrationJson(v2(), 'content/maps/map-001.json')).toBe(`{
  "version": 2,
  "width": 1,
  "height": 1,
  "tilesetId": "tileset-001",
  "layers": [
    {
      "id": "floor",
      "name": "地板",
      "depthMode": "flat",
      "tiles": [
        [1],
        [null]
      ]
    }
  ],
  "collision": [
    [0],
    [0]
  ]
}
`)
  })

  test('G1：v3 authoring 不丢失且与二次 formatter 字节幂等', () => {
    const map = {
      ...(v2() as Record<string, MigrationJson>),
      version: 3,
      authoring: {
        version: 1,
        stampPlacements: [
          {
            id: 'placement-1',
            anchor: { row: 0, col: 0 },
            visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
            gridPoints: [{ row: 0, col: 0 }],
          },
        ],
      },
    } as MigrationJson
    const first = serializeMigrationJson(map, 'content/maps/map-001.json')
    expect(first).toContain('"authoring"')
    expect(
      serializeMigrationJson(JSON.parse(first) as MigrationJson, 'content/maps/map-001.json'),
    ).toBe(first)
  })

  test('stamps 表使用共享确定性 formatter', () => {
    const stamps: MigrationJson = [
      {
        id: 'tree',
        name: '树',
        tilesetId: 'tileset-001',
        origin: 'migrated',
        layerSlots: [{ id: 'ground', name: '地面', depthMode: 'flat' }],
        visual: [{ layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
        collision: [{ offset: { dRow: 0, du: 0 }, value: 0 }],
      },
    ]
    const first = serializeMigrationJson(stamps, 'content/stamps.json')
    expect(serializeMigrationJson(JSON.parse(first) as MigrationJson, 'content/stamps.json')).toBe(
      first,
    )
  })
})
