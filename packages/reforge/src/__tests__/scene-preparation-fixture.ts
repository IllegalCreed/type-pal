import {
  type AuthorItemCore,
  type AuthorSceneDef,
  buildWorld,
  type SpriteDef,
} from '@type-pal/content'
import { expect, vi } from 'vitest'
import { loadStandardPalette, SpriteAssetCache } from '../assets.js'
import { expectDefined } from '../defined.js'
import { loadAllScenes, loadCurrentProjectFrom, loadScene } from '../project-loader.js'
import { loadSceneMap } from '../scene-map.js'
import { ScenePreparer, type SceneSpriteOverride } from '../scene-preparer.js'
import { type SceneResourceReaders, SceneResources } from '../scene-resources.js'
import { projectData, shellProject, shellScene } from './runtime-shell/project.js'

export function deferredScene<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** Full current project/scene/map/sprite guard path, then resource adapters with observable IO. */
export async function scenePreparationFixture() {
  const raw = await shellProject()
  const scene: AuthorSceneDef = {
    ...shellScene('a'),
    entities: [
      {
        id: 'npc',
        sprite: 'walker',
        hidden: true,
        pos: { col: 3, row: 3, height: 0 },
        initialPage: 'idle',
        pages: [
          {
            id: 'idle',
            label: 'Idle',
            animation: { sprite: 'walker', action: 'idle', loop: true },
          },
        ],
      },
      { id: 'zone', zone: true, pos: { col: 1, row: 1, height: 0 } },
    ],
    hooks: {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: 'Main',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [{ id: 'first', body: [], entry: { prepare: [], reveal: { kind: 'cut' } } }],
            },
          },
        },
      },
    },
  }
  raw.files['content/scenes/a.json'] = scene
  const walker: SpriteDef = {
    ...expectDefined(raw.project.spritesById.walker),
    poses: {
      idle: {
        label: 'Idle',
        steps: [
          { frame: 0, durationMs: 100 },
          { frame: 1, durationMs: 100 },
        ],
      },
    },
  }
  raw.files['content/sprites.json'] = [
    walker,
    {
      id: 'other',
      label: 'Other',
      asset: 'sprite',
      layout: { kind: 'static' },
    } satisfies SpriteDef,
  ]
  const maps = structuredClone(raw.project.mapIndex)
  for (let i = 0; i < 18; i++) {
    maps.maps.push({
      id: `map-extra-${i}`,
      name: `Extra ${i}`,
      path: `content/maps/extra-${i}.json`,
    })
    raw.files[`content/maps/extra-${i}.json`] = structuredClone(raw.files['content/maps/a.json'])
  }
  raw.files['content/maps/index.json'] = maps
  raw.files['content/items.json'] = [
    {
      id: 'tonic',
      name: 'Tonic',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
    },
    {
      id: 'blade',
      name: 'Blade',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'statBonus', stat: 'attack', delta: 1 }],
      },
    },
  ] satisfies AuthorItemCore[]
  const project = await loadCurrentProjectFrom(raw.source)
  const before = structuredClone(projectData(project))
  const inputFiles = structuredClone(raw.files)
  const readCalls: string[] = []
  const readers: SceneResourceReaders = {
    loadScene: vi.fn(async (id) => {
      readCalls.push(`scene:${id}`)
      return loadScene(project, id)
    }),
    loadAllScenes: vi.fn(async () => {
      readCalls.push('scenes:all')
      return loadAllScenes(project)
    }),
    loadMap: vi.fn(async (id) => {
      readCalls.push(`map:${id}`)
      return loadSceneMap(project.assetBase, id, project.tilesets, project.mapIndex)
    }),
    loadPalette: vi.fn(async () => {
      readCalls.push('palette')
      return loadStandardPalette(project.assetBase)
    }),
  }
  const resources = new SceneResources(project.entryScene, readers)
  const start = expectDefined(
    project.manifest.entryPoints.find((entry) => entry.id === project.manifest.defaultEntryId)
      ?.startWorld,
  )
  const world = buildWorld(start, project.actorsById)
  const overrides = new Map<string, SceneSpriteOverride>()
  const sprites = new SpriteAssetCache(96)
  const ports = {
    actorOverrides: () => overrides,
    canonicalScene: (id: string) => resources.canonical(id),
    map: (id: string) => resources.map(id),
    palette: () => resources.palette(),
    requireSprite: (id: string | undefined, where: string) => {
      if (!id || !project.spritesById[id]) throw new Error(`${where}: missing sprite ${id}`)
      return expectDefined(project.spritesById[id])
    },
    loadSprite: vi.fn((id: string) => sprites.load(project.assetResolver, id)),
    prepareSounds: vi.fn(async (_scene: unknown, _world: typeof world) => {}),
    createRenderer: vi.fn(
      (
        palette: Awaited<ReturnType<typeof loadStandardPalette>>,
        assets: Awaited<ReturnType<typeof loadSceneMap>>,
      ) => ({ palette, tiles: assets.tilesets }),
    ),
  }
  const preparer = new ScenePreparer(project.actorsById, ports)
  return {
    raw,
    project,
    resources,
    readers,
    readCalls,
    world,
    overrides,
    sprites,
    ports,
    preparer,
    assertInputs() {
      expect(projectData(project)).toEqual(before)
      expect(raw.files).toEqual(inputFiles)
    },
  }
}
