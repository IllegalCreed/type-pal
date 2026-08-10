import type { ManifestV13 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { assembleProjectV13, loadProjectV13From } from './loader-v13.js'
import { loadRunnableProjectFrom } from './runnable-project-loader.js'

const scene = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const baseJsons = {
  actors: [],
  sceneIds: ['s001'],
  entryScene: scene,
  skills: { skills: [], levelUp: {} },
  items: [],
  locale: {},
  sprites: [],
  battleSprites: [],
  tilesets: [],
  maps: {
    version: 1,
    maps: [{ id: 'map-001', name: '地图', path: 'content/maps/map-001.json' }],
  },
  assetCatalog: { version: 1, assets: {} },
  sharedScripts: {},
}

function manifest(over: Partial<ManifestV13> = {}): ManifestV13 {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 13,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {
      actors: 'content/actors.json',
      scenes: 'content/scenes/',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      sprites: 'content/sprites.json',
      battleSprites: 'content/battle-sprites.json',
      tilesets: 'content/tilesets.json',
      maps: 'content/maps/index.json',
      sharedScripts: 'content/shared-scripts.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
    ...over,
  }
}

function memorySource(files: Record<string, unknown>): FileSource {
  return {
    async readText(path) {
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return `${JSON.stringify(value)}\n`
    },
    async readJson<T>(path: string) {
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return structuredClone(value) as T
    },
    async readBytes(path) {
      throw new Error(`unexpected migration read ${path}`)
    },
    async urlFor(path) {
      return path
    },
  }
}

describe('canonical contentVersion 13 loader boundary', () => {
  test('assembles v13 scene and preserves the lifecycle-capable hostile policy', () => {
    const target = { scene: 's001', entity: 'enemy-1' }
    const project = assembleProjectV13(manifest(), {
      ...baseJsons,
      entryScene: {
        ...scene,
        entities: [
          {
            id: 'enemy-1',
            pos: { col: 1, row: 1, height: 0 },
            zone: true,
            hostile: {
              team: 1,
              onLose: [{ kind: 'hideEntity', target, ticks: 3 }],
              onVictory: { kind: 'hide', ticks: 8 },
              onPlayerFlee: { kind: 'suspend', ticks: 15 },
            },
          },
        ],
      },
    })

    expect(project.manifest.contentVersion).toBe(13)
    expect(project.entryScene.entities[0]?.hostile?.onVictory).toEqual({ kind: 'hide', ticks: 8 })
    expect(project.entryScene.entities[0]?.hostile?.onPlayerFlee).toEqual({
      kind: 'suspend',
      ticks: 15,
    })
  })

  test('rejects legacy vanishEntity recursively before a v13 scene can enter runtime', () => {
    const invalidScene = {
      ...scene,
      entities: [
        {
          id: 'enemy-1',
          pos: { col: 1, row: 1, height: 0 },
          zone: true,
          behaviors: {
            auto: {
              loop: {
                label: 'loop',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    {
                      id: 'start',
                      body: [
                        {
                          kind: 'branch',
                          cond: { kind: 'flag', flag: 'x', is: true },
                          then: [{ kind: 'vanishEntity', entity: 'enemy-1' }],
                          else: [{ kind: 'wait', ms: 0 }],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    }

    expect(() => assembleProjectV13(manifest(), { ...baseJsons, entryScene: invalidScene })).toThrow(
      /禁止 vanishEntity/,
    )
  })

  test.each([12, 14])('fails closed for contentVersion %s', (contentVersion) => {
    expect(() =>
      assembleProjectV13(
        manifest({ contentVersion: contentVersion as 13 }),
        baseJsons,
      ),
    ).toThrow(/contentVersion 13/)
  })

  test('fails closed when a v13 hostile still carries the legacy respawnSeconds field', () => {
    const invalidScene = {
      ...scene,
      entities: [
        {
          id: 'enemy-1',
          pos: { col: 1, row: 1, height: 0 },
          zone: true,
          hostile: {
            team: 1,
            respawnSeconds: 2,
            onVictory: { kind: 'hide', ticks: 20 },
            onPlayerFlee: { kind: 'remain' },
          },
        },
      ],
    }
    expect(() => assembleProjectV13(manifest(), { ...baseJsons, entryScene: invalidScene })).toThrow(
      /respawnSeconds|未知字段/,
    )
  })

  test('public loader reads the canonical v13 file set without consulting a legacy sidecar', async () => {
    const projectManifest = manifest()
    const content = projectManifest.content
    const files: Record<string, unknown> = {
      'manifest.json': projectManifest,
      [content.actors!]: baseJsons.actors,
      [content.scenes! + 'index.json']: baseJsons.sceneIds,
      [content.scenes! + 's001.json']: baseJsons.entryScene,
      [content.skills!]: baseJsons.skills,
      [content.items!]: baseJsons.items,
      [content.locale!]: baseJsons.locale,
      [content.sprites!]: baseJsons.sprites,
      [content.battleSprites!]: baseJsons.battleSprites,
      [content.tilesets!]: baseJsons.tilesets,
      [content.maps!]: baseJsons.maps,
      [content.sharedScripts!]: baseJsons.sharedScripts,
      [projectManifest.assets.catalog]: baseJsons.assetCatalog,
    }
    const loaded = await loadProjectV13From(memorySource(files))
    expect(loaded.manifest.contentVersion).toBe(13)
    expect(loaded.entryScene.id).toBe('s001')
    expect(loaded.migrationRegistry).toEqual({})
  })

  test('runtime dispatcher selects the native v13 loader from manifest version', async () => {
    const projectManifest = manifest()
    const content = projectManifest.content
    const loaded = await loadRunnableProjectFrom(
      memorySource({
        'manifest.json': projectManifest,
        [content.actors!]: baseJsons.actors,
        [content.scenes! + 'index.json']: baseJsons.sceneIds,
        [content.scenes! + 's001.json']: baseJsons.entryScene,
        [content.skills!]: baseJsons.skills,
        [content.items!]: baseJsons.items,
        [content.locale!]: baseJsons.locale,
        [content.sprites!]: baseJsons.sprites,
        [content.battleSprites!]: baseJsons.battleSprites,
        [content.tilesets!]: baseJsons.tilesets,
        [content.maps!]: baseJsons.maps,
        [content.sharedScripts!]: baseJsons.sharedScripts,
        [projectManifest.assets.catalog]: baseJsons.assetCatalog,
      }),
    )
    expect(loaded.manifest.contentVersion).toBe(13)
    expect(loaded.entryScene).toEqual(baseJsons.entryScene)
  })

  test('runtime dispatcher fails closed before loading unsupported content', async () => {
    let reads = 0
    const source = memorySource({
      'manifest.json': manifest({ contentVersion: 14 as 13 }),
    })
    const readJson = source.readJson.bind(source)
    source.readJson = async (...args) => {
      reads += 1
      return readJson(...args)
    }
    await expect(loadRunnableProjectFrom(source)).rejects.toThrow(/只接受 contentVersion 12 或 13/)
    expect(reads).toBe(1)
  })

  test('public loader rejects v12 before reading any content file', async () => {
    let reads = 0
    const source = memorySource({
      'manifest.json': manifest({ contentVersion: 12 as 13 }),
    })
    const readJson = source.readJson.bind(source)
    source.readJson = async (...args) => {
      reads += 1
      return readJson(...args)
    }
    await expect(loadProjectV13From(source)).rejects.toThrow(/contentVersion 13/)
    expect(reads).toBe(1)
  })
})
