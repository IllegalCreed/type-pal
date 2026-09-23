import type {
  ActorDef,
  AssetCatalogV1,
  AssetKind,
  AuthorCommand,
  AuthorSceneDef,
  CurrentManifest,
  SkillData,
} from '@type-pal/content'
import {
  collectAssetReferences,
  palMagicEffectSpriteAssetId,
  validateAssetFileClosure,
} from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { compressGzip } from '../../assets.js'
import type { FileSource } from '../../file-source.js'
import { sha256Bytes } from '../../hash.js'
import { type LoadedCurrentProject, loadCurrentProjectFrom } from '../../project-loader.js'

/** Project data actually handed to bootGame, excluding only the five explicit IO/cache owners. */
export function projectData(project: LoadedCurrentProject) {
  const {
    assetBase: _base,
    source: _source,
    assetResolver: _resolver,
    imageCache: _images,
    battleSpriteCache: _sprites,
    ...data
  } = project
  return data
}

export function shellActor(id: string): ActorDef {
  return {
    id,
    name: `name.${id}`,
    spriteId: 'walker',
    battler: {
      baseStats: {
        level: 1,
        hp: 80,
        maxHP: 100,
        mp: 30,
        maxMP: 40,
        attack: 10,
        defense: 8,
        magicAttack: 12,
        speed: 5,
        luck: 3,
      },
      initialEquipment: {},
      initialMagic: id === 'hero' ? ['heal'] : [],
      battleSprite: 'fighter',
    },
  }
}

export const shellScene = (id: string): AuthorSceneDef => ({
  id,
  mapId: `map-${id}`,
  entry: {
    pos: id === 'b' ? { col: 4, row: 3, height: 0 } : { col: 2, row: 2, height: 0 },
    facing: id === 'b' ? 'left' : 'down',
  },
  entities: [],
})

export function sceneWithCommands(id: string, body: AuthorCommand[]): AuthorSceneDef {
  return {
    ...shellScene(id),
    hooks: {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: 'Entry',
            order: 0,
            flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body }] },
          },
        },
      },
    },
  }
}

export async function shellProject(
  options: {
    party?: string[]
    first?: AuthorSceneDef
    second?: AuthorSceneDef
    money?: number
    seedStats?: Record<string, { hp?: number; mp?: number }>
  } = {},
) {
  const manifest: CurrentManifest = {
    id: 'shell-project',
    name: 'Shell Project',
    contentVersion: 20,
    minimumSaveVersion: 8,
    defaultEntryId: 'start',
    entryPoints: [
      {
        id: 'start',
        label: 'entry.start',
        scene: 'a',
        startWorld: {
          party: options.party ?? ['hero', 'friend'],
          money: options.money ?? 50,
          inventory: [],
          ...(options.seedStats ? { seedStats: options.seedStats } : {}),
        },
      },
      {
        id: 'second',
        label: 'entry.second',
        scene: 'b',
        startWorld: { party: ['friend'], money: 90, inventory: [] },
      },
    ],
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
      worldVariables: 'content/world-variables.json',
    },
    assets: { catalog: 'assets/index.json', roles: { 'visual.standardColorTable': 'palette' } },
  }
  const skill: SkillData = {
    id: 'heal',
    name: 'skill.heal',
    desc: 'Healing',
    cost: { mp: 5 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 10 }],
    animation: { effectSprite: 0 },
  }
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const files: Record<string, unknown> = {
    'manifest.json': manifest,
    'assets/index.json': catalog,
    'content/actors.json': [shellActor('hero'), shellActor('friend')],
    'content/items.json': [],
    'content/skills.json': { skills: [skill], levelUp: {} },
    'content/locale.json': {
      'name.hero': 'Hero',
      'name.friend': 'Friend',
      'skill.heal': 'Heal',
      'entry.start': 'Start',
      'entry.second': 'Second',
      'line.one': 'First',
      'line.two': 'Second',
    },
    'content/shared-scripts.json': {},
    'content/world-variables.json': {},
    'content/scenes/index.json': {
      version: 1,
      scenes: ['a', 'b'].map((id) => ({ id, name: id, path: `content/scenes/${id}.json` })),
    },
    'content/scenes/a.json': options.first ?? shellScene('a'),
    'content/scenes/b.json': options.second ?? shellScene('b'),
    'content/sprites.json': [
      { id: 'walker', label: 'Walker', asset: 'sprite', layout: { kind: 'static' } },
    ],
    'content/battle-sprites.json': [
      {
        id: 'fighter',
        label: 'Fighter',
        asset: 'fighter',
        profile: {
          kind: 'player-fighter',
          frames: {
            idle: 0,
            dying: 1,
            dead: 2,
            defend: 3,
            hurt: 4,
            preMagic: 5,
            magic: 6,
            attackWindup: 7,
            attackRush: 8,
            attackStrike: 9,
            steal: 10,
          },
          castEffectBase: 0,
          attackEffectBase: 0,
        },
      },
    ],
    'content/tilesets.json': [{ id: 'tiles', name: 'Tiles', category: 'test', asset: 'tiles' }],
    'content/maps/index.json': {
      version: 1,
      maps: ['a', 'b'].map((id) => ({
        id: `map-${id}`,
        name: id,
        path: `content/maps/${id}.json`,
      })),
    },
  }
  const binaries = new Map<string, Uint8Array>()
  async function asset(
    id: string,
    kind: AssetKind,
    bytes: Uint8Array,
    mediaType = 'application/vnd.type-pal.rle',
  ) {
    const path = `assets/generated/${id}.${mediaType === 'application/json' ? 'json' : 'rle'}`
    binaries.set(path, bytes)
    catalog.assets[id] = {
      kind,
      path,
      mediaType,
      bytes: bytes.length,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
  }
  const sprite = await compressGzip(
    encodeSpriteChunk(
      Array.from({ length: 11 }, () => ({
        width: 2,
        height: 2,
        pixels: new Uint8Array([1, 2, 3, 4]),
        opaque: new Uint8Array([1, 1, 1, 1]),
      })),
    ),
  )
  await asset('sprite', 'sprite', sprite)
  await asset('fighter', 'battle-sprite', sprite)
  await asset(palMagicEffectSpriteAssetId(0), 'effect-sprite', sprite)
  await asset(
    'tiles',
    'tileset',
    await compressGzip(
      encodeSpriteChunk([
        {
          width: 32,
          height: 15,
          pixels: new Uint8Array(480).fill(2),
          opaque: new Uint8Array(480).fill(1),
        },
      ]),
    ),
  )
  const palette = { colors: Array.from({ length: 256 }, (_, v) => [v, v, v]), cycles: [] }
  await asset(
    'palette',
    'color-table',
    new TextEncoder().encode(JSON.stringify(palette)),
    'application/json',
  )
  files['assets/generated/palette.json'] = palette
  for (const id of ['a', 'b'])
    files[`content/maps/${id}.json`] = {
      version: 4,
      width: 8,
      height: 8,
      tilesetRefs: ['tiles'],
      layers: [
        {
          id: 'floor',
          name: 'Floor',
          tiles: Array.from({ length: 16 }, () => Array(8).fill(0)),
          sources: Array.from({ length: 16 }, () => Array(8).fill(0)),
        },
      ],
      collision: Array.from({ length: 16 }, () => Array(8).fill(0)),
    }
  const reads: string[] = []
  const hooks: { read?: (path: string) => Promise<void> | void } = {}
  async function read(path: string) {
    reads.push(path)
    await hooks.read?.(path)
    if (!(path in files) && !binaries.has(path))
      throw new DOMException(`missing ${path}`, 'NotFoundError')
  }
  const source: FileSource = {
    async readJson<T>(path: string): Promise<T> {
      const captured = structuredClone(files[path])
      await read(path)
      return captured as T
    },
    async readText(path) {
      await read(path)
      return JSON.stringify(files[path])
    },
    async readBytes(path) {
      await read(path)
      return (binaries.get(path)?.slice() ?? new TextEncoder().encode(JSON.stringify(files[path])))
        .buffer as ArrayBuffer
    },
    async urlFor(path) {
      await read(path)
      return `https://fixture.invalid/${path}`
    },
  }
  // The formal current loader validates the complete author tables and compiles runtime scenes.
  const project = await loadCurrentProjectFrom(source)
  const closure = await validateAssetFileClosure(
    catalog,
    collectAssetReferences({
      assets: project.manifest.assets,
      entryPoints: project.manifest.entryPoints,
      actors: Object.values(project.actorsById),
      skills: Object.values(project.skills),
      sprites: Object.values(project.spritesById),
      battleSprites: Object.values(project.battleSpritesById),
      tilesets: project.tilesets,
    }),
    {
      readBytes: async (path) => {
        const bytes = binaries.get(path)
        if (!bytes) throw new Error(`fixture asset absent: ${path}`)
        return bytes.slice()
      },
      sha256: sha256Bytes,
    },
  )
  if (closure.some((issue) => issue.severity === 'error')) throw new Error(JSON.stringify(closure))
  return { project, source, files, binaries, reads, hooks }
}
