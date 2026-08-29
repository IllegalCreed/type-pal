import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getPalAuthoredMapName,
  PAL_AUTHORED_MAP_NAMES,
} from '@type-pal/shared/pal-authored-map-names'
import { describe, expect, test } from 'vitest'
import { buildPalMigration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('PAL map-name migration truth', () => {
  test('closes authored, playable, physical, fallback, and dynamic-map domains exactly', () => {
    const sources = loadPalMigrationSources(repo)
    const authoredMapNums = new Set(Object.keys(PAL_AUTHORED_MAP_NAMES).map(Number))
    const playableMapNums = new Set(sources.scenes.map(({ mapNum }) => mapNum))
    const physicalMapNums = new Set(sources.tilemaps.map(({ mapNum }) => mapNum))
    const unnamedPhysical = [...physicalMapNums].filter(
      (mapNum) => getPalAuthoredMapName(mapNum) === undefined,
    )

    expect(sources.scenes).toHaveLength(294)
    expect(playableMapNums.size).toBe(221)
    expect(
      [...authoredMapNums].filter((mapNum) => mapNum > 0).sort((a, b) => a - b),
    ).toEqual([...playableMapNums].sort((a, b) => a - b))
    expect([...playableMapNums].filter((mapNum) => !authoredMapNums.has(mapNum))).toEqual([])
    expect(physicalMapNums.size).toBe(223)
    expect(physicalMapNums.has(0)).toBe(false)
    expect(unnamedPhysical.sort((a, b) => a - b)).toEqual([104, 164])
    const staticOwners = (mapNum: number) =>
      sources.scenes.filter((scene) => scene.mapNum === mapNum).map((scene) => scene.sceneId)
    expect(staticOwners(104)).toEqual([])
    expect(staticOwners(164)).toEqual([])
    expect(staticOwners(165)).toEqual([244])

    const allDynamicMapOperands = sources.allJson.segments
      .flatMap((segment) => segment.commands)
      .filter((command) => command.opcode === 153)
      .map((command) => command.operands ?? [])
    expect(allDynamicMapOperands).toEqual([
      [0xffff, 164, 0],
      [0xffff, 165, 0],
    ])

    const dynamicMapChanges = [...sources.eventsByScene]
      .filter(([sceneId]) => sceneId !== -2)
      .flatMap(([sceneId, commands]) =>
        commands
          .filter((command) => command.opcode === 153)
          .map((command) => ({ sceneId, operands: command.operands ?? [] })),
      )
    expect(dynamicMapChanges).toEqual([
      { sceneId: 230, operands: [0xffff, 164, 0] },
      { sceneId: 243, operands: [0xffff, 165, 0] },
    ])

    const migration = buildPalMigration(sources)
    const index = migration.files.get('content/maps/index.json') as {
      version: number
      maps: Array<{ id: string; name: string; path: string }>
    }
    expect(index.maps).toHaveLength(223)
    expect(
      index.maps.map(({ id }) => Number(id.slice(4))).sort((a, b) => a - b),
    ).toEqual([...physicalMapNums].sort((a, b) => a - b))
    for (const entry of index.maps) {
      const mapNum = Number(entry.id.slice(4))
      expect(entry.id).toBe(`map-${String(mapNum).padStart(3, '0')}`)
      expect(entry.path).toBe(`content/maps/${entry.id}.json`)
      expect(entry.name).toBe(getPalAuthoredMapName(mapNum) ?? `PAL 地图 ${mapNum}`)
    }
    expect(index.maps.filter(({ name }) => name.startsWith('PAL 地图 ')).map(({ id }) => id)).toEqual([
      'map-104',
      'map-164',
    ])
    expect(index.maps.find(({ id }) => id === 'map-001')?.name).toBe('盛渔村')
    expect(index.maps.find(({ id }) => id === 'map-023')?.name).toBe('苏州城')
    expect(index.maps.find(({ id }) => id === 'map-174')?.name).toBe('女娲神庙外雨季')
    expect(index.maps.find(({ id }) => id === 'map-225')?.name).toBe('试炼窟遗迹')
    expect(index.maps.find(({ id }) => id === 'map-104')?.name).toBe('PAL 地图 104')
    expect(index.maps.find(({ id }) => id === 'map-164')?.name).toBe('PAL 地图 164')

    const duplicateNames = [
      [11, 13],
      [31, 50],
      [36, 37],
      [112, 113],
      [178, 211],
      [179, 194],
    ] as const
    for (const [left, right] of duplicateNames) {
      const leftEntry = index.maps.find(({ id }) => id === `map-${String(left).padStart(3, '0')}`)
      const rightEntry = index.maps.find(({ id }) => id === `map-${String(right).padStart(3, '0')}`)
      expect(leftEntry?.name).toBe(rightEntry?.name)
      expect(leftEntry?.id).not.toBe(rightEntry?.id)
    }

    expect(
      JSON.stringify(migration.files.get('content/scripts/chunks/scene/s230.json')),
    ).toContain('"mapId":"map-164"')
    expect(
      JSON.stringify(migration.files.get('content/scripts/chunks/scene/s243.json')),
    ).toContain('"mapId":"map-165"')
  })
})
