import {
  normalizeScriptLibrary,
  ProjectScriptV4V5UpgradeError,
  type ScriptChunkV1,
} from '@type-pal/content'
import { compressGzip, decompressGzip } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  DeleteAssetCommand,
  RemoveTilesetCommand,
  UpdateManifestAssetRolesCommand,
  UpsertAssetCommand,
} from './commands.js'
import { EditSession } from './edit-session.js'
import { openLocalProject } from './open-local.js'
import { serializeProject, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { buildSeedAssets } from './seed-assets.js'
import { scanTilesetReferences, TilesetRemovalProof } from './tileset-references.js'
import type { SoundUpgradeProgress } from './upgrade-local-v2.js'
import { LocalProjectV4V5PreviewRequiredError } from './upgrade-local-v4-script-v5.js'

/** 内存 mock 目录句柄:覆盖 FSA 读、写、删，供 v2 一次性升级集成测试。 */
function mockDir(
  name: string,
  files: Record<string, string | ArrayBuffer>,
  writes: string[] = [],
  mockOptions: {
    failClose?: (path: string, attempt: number) => boolean
    failRemove?: (path: string, attempt: number) => boolean
  } = {},
): FileSystemDirectoryHandle {
  const closeAttempts = new Map<string, number>()
  const removeAttempts = new Map<string, number>()
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      name: prefix ? prefix.split('/').pop() : name,
      async getDirectoryHandle(n: string) {
        return make(prefix ? `${prefix}/${n}` : n)
      },
      async getFileHandle(n: string, options?: { create?: boolean }) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files) && !options?.create)
          throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        if (!(full in files)) files[full] = ''
        return {
          async getFile() {
            const value = files[full] ?? ''
            return {
              size:
                typeof value === 'string'
                  ? new TextEncoder().encode(value).byteLength
                  : value.byteLength,
              text: async () => {
                return typeof value === 'string' ? value : new TextDecoder().decode(value)
              },
              arrayBuffer: async () => {
                return typeof value === 'string' ? new TextEncoder().encode(value).buffer : value
              },
            }
          },
          async createWritable() {
            let pending: string | ArrayBuffer = ''
            return {
              async write(value: string | Blob) {
                pending = typeof value === 'string' ? value : await value.arrayBuffer()
              },
              async close() {
                const attempt = (closeAttempts.get(full) ?? 0) + 1
                closeAttempts.set(full, attempt)
                if (mockOptions.failClose?.(full, attempt))
                  throw new DOMException(`Injected close failure ${full}`, 'InvalidStateError')
                files[full] = pending
                writes.push(full)
              },
            }
          },
        }
      },
      async *values() {
        const base = prefix ? `${prefix}/` : ''
        const names = new Set(
          Object.keys(files).flatMap((path) => {
            if (!path.startsWith(base)) return []
            const relative = path.slice(base.length)
            return relative && !relative.includes('/') ? [relative] : []
          }),
        )
        for (const entry of [...names].sort())
          yield { kind: 'file', name: entry } as FileSystemFileHandle
      },
      async removeEntry(n: string) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        const attempt = (removeAttempts.get(full) ?? 0) + 1
        removeAttempts.set(full, attempt)
        if (mockOptions.failRemove?.(full, attempt))
          throw new DOMException(`Injected remove failure ${full}`, 'InvalidStateError')
        delete files[full]
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

const J = (v: unknown): string => JSON.stringify(v)
const hash = 'a'.repeat(64)

function waveBytes(marker = 0): ArrayBuffer {
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x05, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, marker])
    .buffer
}

function canonicalHookBody(
  opened: Awaited<ReturnType<typeof openLocalProject>>,
  slot: 'onEnter' | 'onTeleport' = 'onEnter',
): unknown[] {
  if (opened.kind !== 'v5') throw new Error('期望 v5 工程')
  const channel = opened.canonicalV5.scenes[0]?.hooks?.[slot]
  const hook = channel?.initial ? channel.variants[channel.initial] : undefined
  if (!hook || hook.flow.kind !== 'stages') throw new Error(`期望 canonical ${slot} stages`)
  return hook.flow.stages[0]?.body ?? []
}

/** 只供升级计划测试；真实像素解码由注入 validateStaticImage 代替。 */
function pngHeaderBytes(width: number, height: number, marker = 0): ArrayBuffer {
  const bytes = new Uint8Array(32)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  new DataView(bytes.buffer).setUint32(8, 13)
  bytes.set([73, 72, 68, 82], 12)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  bytes[24] = marker
  return bytes.buffer
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const seedAssets = await buildSeedAssets()
const tilesetBytes = seedAssets.tilesetRle
const spriteBytes = seedAssets.spriteRle
const battleSpriteBytes = seedAssets.battleSpriteRle
const alternateTilesetBytes = spriteBytes
const bareTilesetView = await decompressGzip(new Blob([tilesetBytes]))
const bareTilesetBytes = bareTilesetView.buffer.slice(
  bareTilesetView.byteOffset,
  bareTilesetView.byteOffset + bareTilesetView.byteLength,
) as ArrayBuffer
const bareSpriteView = await decompressGzip(new Blob([spriteBytes]))
const bareSpriteBytes = bareSpriteView.buffer.slice(
  bareSpriteView.byteOffset,
  bareSpriteView.byteOffset + bareSpriteView.byteLength,
) as ArrayBuffer

function changeFirstSpritePixel(bytes: ArrayBuffer): Uint8Array {
  const changed = new Uint8Array(bytes.slice(0))
  const view = new DataView(changed.buffer)
  const firstFrameOffset = view.getUint16(0, true) * 2
  let cursor = firstFrameOffset + 4
  while (cursor < changed.byteLength) {
    const command = changed[cursor++]!
    if (command >= 0x80) continue
    if (command > 0) {
      changed[cursor] = (changed[cursor]! + 1) & 0xff
      return changed
    }
  }
  throw new Error('测试精灵没有可修改的 opaque 像素')
}

const alternateSpriteView = await compressGzip(changeFirstSpritePixel(bareSpriteBytes))
const alternateSpriteBytes = alternateSpriteView.buffer.slice(
  alternateSpriteView.byteOffset,
  alternateSpriteView.byteOffset + alternateSpriteView.byteLength,
) as ArrayBuffer
const tilesetHash = await sha256Hex(tilesetBytes)
const spriteHash = await sha256Hex(spriteBytes)
const battleSpriteHash = await sha256Hex(battleSpriteBytes)
const tilesetRecord = {
  kind: 'tileset' as const,
  path: 'assets/generated/tilesets/starter.rle',
  mediaType: 'application/vnd.type-pal.rle',
  bytes: tilesetBytes.byteLength,
  sha256: tilesetHash,
  label: '瓦片集 1',
  origin: { kind: 'generated' as const },
}
const spriteRecord = {
  kind: 'sprite' as const,
  path: 'assets/generated/sprites/gs.rle',
  mediaType: 'application/vnd.type-pal.rle',
  bytes: spriteBytes.byteLength,
  sha256: spriteHash,
  label: '测试精灵',
  origin: { kind: 'generated' as const },
}
const battleSpriteRecord = {
  kind: 'battle-sprite' as const,
  path: 'assets/generated/battle-sprites/starter.rle',
  mediaType: 'application/vnd.type-pal.rle',
  bytes: battleSpriteBytes.byteLength,
  sha256: battleSpriteHash,
  label: '测试战斗精灵',
  origin: { kind: 'generated' as const },
}

function soundFamilyManifest(): {
  manifest: Record<string, unknown> & {
    assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
  }
  text: string
} {
  const manifest = JSON.parse(String(fullProject['manifest.json'])) as Record<string, unknown> & {
    assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
  }
  manifest.assets.legacy = {
    ...manifest.assets.legacy,
    families: ['sound', 'color-table'],
    sounds: 'assets/extracted/sounds',
  }
  return { manifest, text: J(manifest) }
}

const fullProject: Record<string, string | ArrayBuffer> = {
  'manifest.json': J({
    id: 'proj',
    name: 'P',
    contentVersion: 3,
    entryScene: 's1',
    content: {
      actors: 'content/actors.json',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      scenes: 'content/scenes/',
      maps: 'content/maps/index.json',
      tilesets: 'content/tilesets.json',
      sprites: 'content/sprites.json',
      battleSprites: 'content/battle-sprites.json',
    },
    assets: {
      catalog: 'assets/index.json',
      roles: {},
      legacy: {
        families: ['color-table'],
        root: 'assets/extracted/data',
        palettes: 'palette',
      },
    },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }),
  'content/actors.json': J([{ id: 'a', name: 'name.a', spriteId: 'gs' }]),
  'content/skills.json': J({ skills: [], levelUp: {} }),
  'content/items.json': J([]),
  'content/locale.json': J({}),
  'content/sprites.json': J([
    {
      id: 'gs',
      asset: 'sprite.generated.gs',
      label: '测试精灵',
      layout: { kind: 'static' },
    },
  ]),
  'content/battle-sprites.json': J([]),
  'content/scenes/index.json': J(['s1']),
  'content/scenes/s1.json': J({
    id: 's1',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }),
  'content/maps/index.json': J({
    version: 1,
    maps: [{ id: 'map-001', name: '地图 1', path: 'content/maps/map-001.json' }],
  }),
  'content/tilesets.json': J([
    {
      id: 'tileset-001',
      name: '瓦片集 1',
      category: 'builtin',
      asset: 'tileset.generated.starter',
    },
  ]),
  'assets/index.json': J({
    version: 1,
    assets: {
      'tileset.generated.starter': tilesetRecord,
      'sprite.generated.gs': spriteRecord,
    },
  }),
  [tilesetRecord.path]: tilesetBytes,
  [spriteRecord.path]: spriteBytes,
}

function currentProjectFiles(): Record<string, string | ArrayBuffer> {
  const files = { ...fullProject }
  const manifest = JSON.parse(String(files['manifest.json'])) as Record<string, unknown> & {
    contentVersion: number
  }
  manifest.contentVersion = 4
  files['manifest.json'] = J(manifest)
  return files
}

function legacyTilesetProject(options: { bytes?: ArrayBuffer; id?: string; path?: string } = {}): {
  files: Record<string, string | ArrayBuffer>
  sourcePath: string
  manifestText: string
  definitionsText: string
  catalogText: string
} {
  const files = { ...fullProject }
  const manifest = JSON.parse(String(files['manifest.json'])) as {
    assets: { legacy: { families: string[]; tilesets?: string } }
  }
  manifest.assets.legacy = {
    ...manifest.assets.legacy,
    families: ['tileset', ...manifest.assets.legacy.families],
    tilesets: 'tileset',
  }
  const id = options.id ?? 'tileset-001'
  const path = options.path ?? 'tileset/1.rle'
  const sourcePath = path.startsWith('assets/') ? path : `assets/extracted/data/${path}`
  const manifestText = J(manifest)
  const definitionsText = J([{ id, name: '旧瓦片集', category: 'builtin', path }])
  const catalogText = J({
    version: 1,
    assets: { 'sprite.generated.gs': spriteRecord },
  })
  files['manifest.json'] = manifestText
  files['content/tilesets.json'] = definitionsText
  files['assets/index.json'] = catalogText
  delete files[tilesetRecord.path]
  files[sourcePath] = options.bytes ?? tilesetBytes
  return { files, sourcePath, manifestText, definitionsText, catalogText }
}

function legacySpriteProject(
  options: {
    definitions?: Record<string, unknown>[]
    sources?: Record<string, ArrayBuffer>
    followers?: unknown[]
  } = {},
): {
  files: Record<string, string | ArrayBuffer>
  manifestText: string
  definitionsText: string
  sourcePath: string
} {
  const files = { ...fullProject }
  const manifest = JSON.parse(String(files['manifest.json'])) as {
    assets: { legacy: { families: string[]; root?: string; sprites?: string } }
  }
  manifest.assets.legacy = {
    ...manifest.assets.legacy,
    families: [
      'sprite',
      ...manifest.assets.legacy.families.filter((family) => family !== 'sprite'),
    ],
    root: 'assets/extracted/data',
    sprites: 'sprite',
  }
  const definitions = options.definitions ?? [
    {
      id: 'legacy-follower',
      spriteNum: 82,
      label: '旧跟随者',
      layout: { kind: 'directional', framesPerDir: 3 },
    },
  ]
  const sourcePath = 'assets/extracted/data/sprite/82.rle'
  const manifestText = J(manifest)
  const definitionsText = J(definitions)
  files['manifest.json'] = manifestText
  files['content/sprites.json'] = definitionsText
  files['assets/index.json'] = J({
    version: 1,
    assets: { 'tileset.generated.starter': tilesetRecord },
  })
  delete files[spriteRecord.path]
  Object.assign(files, options.sources ?? { [sourcePath]: spriteBytes })
  if (options.followers) {
    files['content/scenes/s1.json'] = J({
      id: 's1',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      onEnter: [{ id: 'followers', body: [{ kind: 'setFollowers', sprites: options.followers }] }],
    })
  }
  return { files, manifestText, definitionsText, sourcePath }
}

function legacyBattleProject(options: { descriptorId?: number; targetCollision?: boolean } = {}): {
  files: Record<string, string | ArrayBuffer>
  sourcePath: string
  targetPath: string
} {
  const files: Record<string, string | ArrayBuffer> = { ...fullProject }
  const manifest = JSON.parse(String(files['manifest.json'])) as {
    content: Record<string, string>
    assets: { legacy: { families: string[]; root: string } }
  }
  manifest.assets.legacy.families = [
    'battle-sprite',
    ...manifest.assets.legacy.families.filter((family) => family !== 'battle-sprite'),
  ]
  delete manifest.content.battleSprites
  files['manifest.json'] = J(manifest)
  delete files['content/battle-sprites.json']
  files['content/skills.json'] = J({
    skills: [
      {
        id: 'summon',
        name: 'name.summon',
        cost: { mp: 0 },
        target: 'self',
        effects: [{ kind: 'summon', godId: 0 }],
        animation: {},
      },
    ],
    levelUp: {},
  })
  const sourcePath = 'assets/extracted/data/battle-sprite/player/10.rle'
  const targetPath = 'assets/migrated/battle-sprites/player/010.rle'
  files['assets/extracted/data/battle-sprites.json'] = J({
    sprites: [{ kind: 'player', id: options.descriptorId ?? 10 }],
  })
  files[sourcePath] = battleSpriteBytes
  if (options.targetCollision) files[targetPath] = new Uint8Array([1, 2, 3]).buffer
  return { files, sourcePath, targetPath }
}

async function exactOldBlankBattleProject(
  options: { corruptActor?: boolean; emptyJournal?: boolean } = {},
) {
  const target = await buildBlankProject('旧空白工程')
  const manifest = structuredClone(target['manifest.json']) as Record<string, unknown> & {
    contentVersion: number
    content: Record<string, string>
  }
  manifest.contentVersion = 3
  const definitions = target['content/battle-sprites.json'] as Array<{ asset: string }>
  const asset = definitions[0]!.asset
  const catalog = structuredClone(target['assets/index.json']) as {
    assets: Record<string, { path: string }>
  }
  const battlePath = catalog.assets[asset]!.path
  delete manifest.content.battleSprites
  delete catalog.assets[asset]
  const actors = structuredClone(target['content/actors.json']) as Array<{
    name: string
    battler?: { battleSprite?: string }
  }>
  delete actors[0]?.battler?.battleSprite
  if (options.corruptActor) actors[0]!.name = 'name.user-edited'
  const files: Record<string, string | ArrayBuffer> = {}
  for (const [path, value] of Object.entries(target)) {
    if (path === 'content/battle-sprites.json' || path === battlePath) continue
    const next =
      path === 'manifest.json'
        ? manifest
        : path === 'assets/index.json'
          ? catalog
          : path === 'content/actors.json'
            ? actors
            : value
    files[path] = next instanceof ArrayBuffer ? next : typeof next === 'string' ? next : J(next)
  }
  if (options.emptyJournal) files['.type-pal/upgrade-local-v3-battle-sprites.json'] = ''
  return files
}

function legacyActorPathOnlyBattleProject(): Record<string, string | ArrayBuffer> {
  const { files } = legacyBattleProject()
  const manifest = JSON.parse(String(files['manifest.json'])) as {
    assets: { legacy: { root: string } }
  }
  files['content/skills.json'] = J({ skills: [], levelUp: {} })
  files['content/actors.json'] = J([
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'gs',
      battler: {
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 0,
          maxMP: 0,
          attack: 10,
          defense: 5,
          magicAttack: 5,
          speed: 10,
          luck: 10,
        },
        initialEquipment: {},
        initialMagic: [],
        battleSpritePath: 'custom/hero.rle',
      },
    },
  ])
  delete files['assets/extracted/data/battle-sprite/player/10.rle']
  files['assets/extracted/data/battle-sprites.json'] = J({
    sprites: [{ kind: 'player', id: 0 }],
  })
  files['assets/extracted/data/battle-sprite/player/0.rle'] = battleSpriteBytes
  files[`${manifest.assets.legacy.root}/custom/hero.rle`] = battleSpriteBytes
  files['assets/extracted/data/battle-effect-index.json'] = J([0, 0])
  return files
}

function staticPortraitFamilyProject(): {
  files: Record<string, string | ArrayBuffer>
  manifestText: string
  actorsText: string
} {
  const files: Record<string, string | ArrayBuffer> = { ...fullProject }
  const manifest = JSON.parse(String(files['manifest.json'])) as {
    assets: { legacy: Record<string, unknown> }
  }
  manifest.assets.legacy = {
    ...manifest.assets.legacy,
    families: ['color-table', 'portrait'],
    portraits: 'assets/legacy/portraits',
  }
  const manifestText = J(manifest)
  const actorsText = J([{ id: 'a', name: 'name.a', spriteId: 'gs', portraits: { default: 1 } }])
  files['manifest.json'] = manifestText
  files['content/actors.json'] = actorsText
  files['assets/legacy/portraits/1.png'] = pngHeaderBytes(80, 100, 1)
  return { files, manifestText, actorsText }
}

function v3MusicProject(musicIds: readonly string[], openingMenuMusic?: string) {
  const manifest = JSON.parse(String(fullProject['manifest.json'])) as Record<string, unknown> & {
    assets: { roles: Record<string, string> }
  }
  const fallback = musicIds[0]
  if (!fallback) throw new Error('测试工程至少需要一首音乐')
  manifest.assets.roles = {
    'audio.midiSoundfont': 'soundfont.default',
    'audio.defaultBattleMusic': fallback,
    'audio.bossVictoryMusic': fallback,
    'audio.normalVictoryMusic': fallback,
    ...(openingMenuMusic ? { 'audio.openingMenuMusic': openingMenuMusic } : {}),
  }
  const musicAssets = Object.fromEntries(
    musicIds.map((id) => [
      id,
      {
        kind: 'music',
        path: `assets/migrated/music/${id.slice(-3)}.mid`,
        mediaType: 'audio/midi',
        bytes: 3,
        sha256: hash,
        origin: { kind: 'legacy-migrated' },
      },
    ]),
  )
  return {
    ...fullProject,
    'manifest.json': J(manifest),
    'assets/index.json': J({
      version: 1,
      assets: {
        'tileset.generated.starter': tilesetRecord,
        'sprite.generated.gs': spriteRecord,
        ...musicAssets,
        'soundfont.default': {
          kind: 'soundfont',
          path: 'assets/runtime/soundfont.sf3',
          mediaType: 'audio/sf3',
          bytes: 3,
          sha256: hash,
          origin: { kind: 'licensed' },
        },
      },
    }),
  }
}

describe('openLocalProject', () => {
  test('content v5 以 canonical 工程加载，并只向旧编辑器外壳投影空脚本占位', async () => {
    const scene = {
      id: 's1',
      mapId: 'map-1',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'npc',
          sprite: 'missing-is-allowed-here',
          pos: { col: 1, row: 1, height: 0 },
          initialPage: 'default',
          pages: [
            {
              id: 'default',
              label: '默认',
              trigger: 'talk',
              triggerActivation: { on: 'interact' },
            },
          ],
          behaviors: {
            trigger: {
              talk: {
                label: '交谈',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    {
                      id: 'start',
                      body: [{ kind: 'setFlag', flag: 'canonical', value: true }],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    const files: Record<string, string | ArrayBuffer> = {
      'manifest.json': J({
        id: 'v5-project',
        name: 'V5',
        contentVersion: 5,
        entryScene: 's1',
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
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      }),
      'content/actors.json': '[]',
      'content/scenes/index.json': J(['s1']),
      'content/scenes/s1.json': J(scene),
      'content/skills.json': J({ skills: [], levelUp: {} }),
      'content/items.json': '[]',
      'content/locale.json': '{}',
      'content/sprites.json': '[]',
      'content/battle-sprites.json': '[]',
      'content/tilesets.json': '[]',
      'content/maps/index.json': J({
        version: 1,
        maps: [{ id: 'map-1', name: '地图', path: 'content/maps/map-1.json' }],
      }),
      'content/shared-scripts.json': '{}',
      'assets/index.json': J({ version: 1, assets: {} }),
    }
    const opened = await openLocalProject(mockDir('v5-project', files))
    expect(opened.kind).toBe('v5')
    if (opened.kind !== 'v5') throw new Error('没有进入 v5 loader')
    expect(opened.canonicalV5.scenes[0]!.entities[0]!.behaviors!.trigger!.talk!.flow).toEqual(
      scene.entities[0]!.behaviors.trigger.talk.flow,
    )
    expect(opened.scenes[0]!.entities[0]!.pages?.[0]?.trigger?.stages).toEqual([{ body: [] }])
    expect(opened.scriptChunks).toEqual({})
  })

  test('旧 v3 battle-sprite 全量登记、语义引用、manifest-last 与二次打开 no-op', async () => {
    const { files, sourcePath, targetPath } = legacyBattleProject()
    const writes: string[] = []
    const opened = await openLocalProject(mockDir('legacy-battle', files, writes))
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('battle-sprite')
    expect(opened.project.skills.summon?.effects).toEqual([
      { kind: 'summon', battleSprite: 'player-summon-10' },
    ])
    expect(opened.project.battleSpritesById['player-summon-10']).toMatchObject({
      asset: 'battle-sprite.pal.player.010',
      profile: { kind: 'summon' },
    })
    expect(opened.project.assetCatalog.assets['battle-sprite.pal.player.010']).toMatchObject({
      path: targetPath,
      kind: 'battle-sprite',
      origin: { kind: 'legacy-migrated', ref: 'battle-sprite/player/10.rle' },
    })
    expect(files[sourcePath]).toBeUndefined()
    expect(files['assets/extracted/data/battle-sprites.json']).toBeUndefined()
    expect(files[targetPath]).toBeInstanceOf(ArrayBuffer)
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(mockDir('legacy-battle', files, writes))
    expect(writes).toEqual([])
  })

  test('battle-sprite journal 在 manifest close 中断后只接受 old/target 前缀并可恢复', async () => {
    const { files, sourcePath } = legacyBattleProject()
    const writes: string[] = []
    const dir = mockDir('retry-battle', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()
    expect(files[sourcePath]).toBeDefined()
    await openLocalProject(dir)
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeUndefined()
    expect(files[sourcePath]).toBeUndefined()
  })

  test('manifest close 中断后 scene index 被用户修改时零写拒绝并保留 journal/旧源', async () => {
    const { files, sourcePath } = legacyBattleProject()
    const writes: string[] = []
    const dir = mockDir('retry-battle-scene-index-tamper', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()

    files['content/scenes/index.json'] = J(['s1', 's2'])
    files['content/scenes/s2.json'] = J({
      id: 's2',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      onEnter: [
        {
          id: 'appearance',
          body: [{ kind: 'setActorAppearance', actor: 'hero', battleSprite: 5 }],
        },
      ],
    })
    writes.length = 0
    await expect(openLocalProject(dir)).rejects.toThrow(
      'battle-sprite 升级恢复发现用户修改或未知中间态: content/scenes/index.json',
    )
    expect(writes).toEqual([])
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()
    expect(files[sourcePath]).toBeDefined()
  })

  test('manifest close 中断后 legacy 目录新增 RLE 时零写拒绝并保留 journal/旧源', async () => {
    const { files, sourcePath } = legacyBattleProject()
    const writes: string[] = []
    const dir = mockDir('retry-battle-inventory-tamper', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()

    const unexpected = 'assets/extracted/data/battle-sprite/player/11.rle'
    files[unexpected] = battleSpriteBytes.slice(0)
    writes.length = 0
    await expect(openLocalProject(dir)).rejects.toThrow(
      `battle-sprite 升级恢复发现 player 目录新增或未知 RLE: ${unexpected}`,
    )
    expect(writes).toEqual([])
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()
    expect(files[sourcePath]).toBeDefined()
  })

  test.each([
    {
      label: 'journal close',
      kind: 'close',
      path: '.type-pal/upgrade-local-v3-battle-sprites.json',
    },
    { label: '新二进制 close', kind: 'close', path: 'target' },
    { label: '新定义表 close', kind: 'close', path: 'content/battle-sprites.json' },
    { label: 'consumer close', kind: 'close', path: 'content/skills.json' },
    { label: 'catalog close', kind: 'close', path: 'assets/index.json' },
    { label: 'manifest close', kind: 'close', path: 'manifest.json' },
    { label: '旧二进制 remove', kind: 'remove', path: 'source' },
    {
      label: '旧 descriptor remove',
      kind: 'remove',
      path: 'assets/extracted/data/battle-sprites.json',
    },
    {
      label: 'journal remove',
      kind: 'remove',
      path: '.type-pal/upgrade-local-v3-battle-sprites.json',
    },
  ])('battle-sprite 升级在 $label 中断后单调恢复，再次打开 no-op', async (failure) => {
    const { files, sourcePath, targetPath } = legacyBattleProject()
    const failedPath =
      failure.path === 'target' ? targetPath : failure.path === 'source' ? sourcePath : failure.path
    const writes: string[] = []
    const dir = mockDir(`retry-battle-${failure.label}`, files, writes, {
      failClose:
        failure.kind === 'close'
          ? (path, attempt) => path === failedPath && attempt === 1
          : undefined,
      failRemove:
        failure.kind === 'remove'
          ? (path, attempt) => path === failedPath && attempt === 1
          : undefined,
    })

    await expect(openLocalProject(dir)).rejects.toThrow(`Injected ${failure.kind} failure`)
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()

    await openLocalProject(dir)
    expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeUndefined()
    expect(files[sourcePath]).toBeUndefined()
    expect(files['assets/extracted/data/battle-sprites.json']).toBeUndefined()
    expect(files[targetPath]).toBeInstanceOf(ArrayBuffer)

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('battle-sprite 升级在跨 chunk 重复 script id 时于 journal 前零写', async () => {
    const fixture = legacyBattleProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      content: Record<string, string>
    }
    manifest.content.scripts = 'content/scripts/'
    fixture.files['manifest.json'] = J(manifest)
    const chunks = {
      'scene/s1': {
        version: 1 as const,
        id: 'scene/s1',
        scripts: { 'shared/duplicate': [] },
      },
      'scene/s2': {
        version: 1 as const,
        id: 'scene/s2',
        scripts: { 'shared/duplicate': [] },
      },
    }
    const normalized = normalizeScriptLibrary(
      {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: {
          'scene/s1': { path: 'chunks/scene/s1.json', bytes: 0 },
          'scene/s2': { path: 'chunks/scene/s2.json', bytes: 0 },
        },
      },
      chunks,
    )
    fixture.files['content/scripts/index.json'] = J(normalized.index)
    fixture.files['content/scripts/chunks/scene/s1.json'] = J(chunks['scene/s1'])
    fixture.files['content/scripts/chunks/scene/s2.json'] = J(chunks['scene/s2'])
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir('battle-script-duplicate', fixture.files, writes)),
    ).rejects.toThrow('脚本 id 重复')
    expect(writes).toEqual([])
  })

  test('battle-sprite 升级在两个 chunk 复用同一路径时于 journal 前零写', async () => {
    const fixture = legacyBattleProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      content: Record<string, string>
    }
    manifest.content.scripts = 'content/scripts/'
    fixture.files['manifest.json'] = J(manifest)
    fixture.files['content/scripts/index.json'] = J({
      version: 1,
      shards: { shared: 16, global: {} },
      chunks: {
        'scene/s1': { path: 'chunks/shared.json', bytes: 0 },
        'scene/s2': { path: 'chunks/shared.json', bytes: 0 },
      },
    })
    fixture.files['content/scripts/chunks/shared.json'] = J({
      version: 1,
      id: 'scene/s1',
      scripts: {},
    })
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir('battle-script-path-duplicate', fixture.files, writes)),
    ).rejects.toThrow(/重复使用 chunks\/shared\.json/)
    expect(writes).toEqual([])
  })

  test('深层 script 旧 setActorAppearance 改写后重算 metadata，二开 no-op', async () => {
    const fixture = legacyBattleProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      content: Record<string, string>
    }
    manifest.content.scripts = 'content/scripts/'
    fixture.files['manifest.json'] = J(manifest)
    fixture.files['assets/extracted/data/battle-effect-index.json'] = J(Array(22).fill(0))
    const chunk = {
      version: 1 as const,
      id: 'shared/c07',
      scripts: {
        'shared/user/test': [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'test', is: true },
            then: [{ kind: 'setActorAppearance', actor: 'a', battleSprite: 10 }],
          },
        ],
      },
    }
    const normalized = normalizeScriptLibrary(
      {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: { 'shared/c07': { path: 'chunks/shared/c07.json', bytes: 0 } },
        library: {
          'shared/user/test': { name: '测试脚本', self: 'none' },
        },
      },
      { 'shared/c07': chunk as unknown as ScriptChunkV1 },
    )
    fixture.files['content/scripts/index.json'] = J(normalized.index)
    fixture.files['content/scripts/chunks/shared/c07.json'] = J(chunk)
    const writes: string[] = []
    const dir = mockDir('battle-script-positive', fixture.files, writes)
    const opened = await openLocalProject(dir)
    if (opened.kind !== 'v5') throw new Error('未升级为 v5')
    expect(opened.canonicalV5.project.sharedScripts['shared/user/test']?.body).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'test', is: true },
        then: [{ kind: 'setActorAppearance', actor: 'a', battleSprite: 'player-fighter-10' }],
      },
    ])
    expect(fixture.files['content/scripts/index.json']).toBeUndefined()
    expect(fixture.files['content/scripts/chunks/shared/c07.json']).toBeUndefined()
    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('battle-sprite descriptor/目录不一致与未登记目标碰撞都在 journal 前零写失败', async () => {
    const mismatch = legacyBattleProject({ descriptorId: 11 })
    const mismatchWrites: string[] = []
    await expect(
      openLocalProject(mockDir('bad-battle-inventory', mismatch.files, mismatchWrites)),
    ).rejects.toThrow('登记集合')
    expect(mismatchWrites).toEqual([])

    const collision = legacyBattleProject({ targetCollision: true })
    const collisionWrites: string[] = []
    await expect(
      openLocalProject(mockDir('battle-path-collision', collision.files, collisionWrites)),
    ).rejects.toThrow('目标路径已有未登记或不同字节')
    expect(collisionWrites).toEqual([])
  })

  test.each([
    'battle-sprites.json',
    'battle-effect-index.json',
  ])('legacy 元数据 %s 与 catalog 路径双重所有时 journal 前零写拒绝', async (file) => {
    const fixture = legacyBattleProject()
    const oldRoot = 'assets/extracted/data'
    const root = 'assets/migrated/legacy-data'
    for (const [path, value] of Object.entries(fixture.files)) {
      if (!path.startsWith(`${oldRoot}/`)) continue
      fixture.files[`${root}/${path.slice(oldRoot.length + 1)}`] = value
      delete fixture.files[path]
    }
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      assets: { legacy: { root: string } }
    }
    manifest.assets.legacy.root = root
    fixture.files['manifest.json'] = J(manifest)
    const catalog = JSON.parse(String(fixture.files['assets/index.json'])) as {
      assets: Record<string, unknown>
    }
    catalog.assets[`sprite.metadata-owner.${file}`] = {
      ...spriteRecord,
      path: `${root}/${file}`,
      origin: { kind: 'legacy-migrated', ref: `legacy-data/${file}` },
    }
    fixture.files['assets/index.json'] = J(catalog)
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir(`battle-metadata-owner-${file}`, fixture.files, writes)),
    ).rejects.toThrow(/旧元数据.*同时由 catalog AssetId.*持有.*双重所有权/)
    expect(writes).toEqual([])
  })

  test('待升级 consumer JSON 与 catalog 资产路径双重所有时 journal 前零写拒绝', async () => {
    const fixture = legacyBattleProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      content: Record<string, string>
    }
    const path = 'assets/authored/metadata/skills.json'
    fixture.files[path] = fixture.files['content/skills.json']!
    delete fixture.files['content/skills.json']
    manifest.content.skills = path
    fixture.files['manifest.json'] = J(manifest)
    const catalog = JSON.parse(String(fixture.files['assets/index.json'])) as {
      assets: Record<string, unknown>
    }
    catalog.assets['sprite.consumer-owner'] = {
      ...spriteRecord,
      path,
      mediaType: 'application/json',
      origin: { kind: 'authored' },
    }
    fixture.files['assets/index.json'] = J(catalog)
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir('battle-consumer-json-owner', fixture.files, writes)),
    ).rejects.toThrow(/升级目标 JSON.*同时由 catalog AssetId sprite\.consumer-owner 持有/)
    expect(writes).toEqual([])
  })

  test('legacy family 与已登记 battle asset，或旧引用与 canonical equip 混用时零写拒绝', async () => {
    const catalogMixed = legacyBattleProject()
    const catalog = JSON.parse(String(catalogMixed.files['assets/index.json'])) as {
      assets: Record<string, unknown>
    }
    catalog.assets['battle-sprite.generated.starter'] = battleSpriteRecord
    catalogMixed.files['assets/index.json'] = J(catalog)
    catalogMixed.files[battleSpriteRecord.path] = battleSpriteBytes
    const catalogWrites: string[] = []
    await expect(
      openLocalProject(mockDir('battle-mixed-catalog', catalogMixed.files, catalogWrites)),
    ).rejects.toThrow(/battle-sprite|legacy/i)
    expect(catalogWrites).toEqual([])

    const referenceMixed = legacyBattleProject()
    referenceMixed.files['content/items.json'] = J([
      {
        id: 'equip',
        name: 'Equip',
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: {
          slot: 'weapon',
          effects: [{ kind: 'battleSprite', sprite: 'player-summon-10' }],
        },
      },
    ])
    const referenceWrites: string[] = []
    await expect(
      openLocalProject(mockDir('battle-mixed-reference', referenceMixed.files, referenceWrites)),
    ).rejects.toThrow('同时含旧数字/path 与 BattleSpriteDef.id')
    expect(referenceWrites).toEqual([])

    const sameNode = legacyBattleProject()
    sameNode.files['content/skills.json'] = J({
      skills: [
        {
          id: 'mixed-summon',
          name: 'Mixed',
          cost: { mp: 0 },
          target: 'self',
          effects: [{ kind: 'summon', godId: 0, battleSprite: 'player-summon-10' }],
          animation: {},
        },
      ],
      levelUp: {},
    })
    const sameNodeWrites: string[] = []
    await expect(
      openLocalProject(mockDir('battle-mixed-node', sameNode.files, sameNodeWrites)),
    ).rejects.toThrow('同时含 godId 与 canonical battleSprite')
    expect(sameNodeWrites).toEqual([])
  })

  test('same-node mixed 按字段存在性 fail-loud，不会用 legacy 值覆盖坏 canonical 值', async () => {
    const cases: Array<{
      label: string
      mutate: (files: Record<string, string | ArrayBuffer>) => void
      message: RegExp
    }> = [
      {
        label: 'summon',
        mutate: (files) => {
          files['content/skills.json'] = J({
            skills: [
              {
                id: 'mixed-summon',
                name: 'Mixed',
                cost: { mp: 0 },
                target: 'self',
                effects: [{ kind: 'summon', godId: 0, battleSprite: 123 }],
                animation: {},
              },
            ],
            levelUp: {},
          })
        },
        message: /summon 同时含 godId 与 canonical battleSprite/,
      },
      {
        label: 'trance',
        mutate: (files) => {
          files['content/skills.json'] = J({
            skills: [
              {
                id: 'mixed-trance',
                name: 'Mixed',
                cost: { mp: 0 },
                target: 'self',
                effects: [{ kind: 'trance', sprite: 0, battleSprite: 123 }],
                animation: {},
              },
            ],
            levelUp: {},
          })
        },
        message: /trance 同时含旧 sprite 与 canonical battleSprite/,
      },
      {
        label: 'actor',
        mutate: (files) => {
          const actors = JSON.parse(String(files['content/actors.json'])) as Array<
            Record<string, unknown>
          >
          actors[0]!.battler = { battleSpriteNum: 10, battleSprite: 123 }
          files['content/actors.json'] = J(actors)
        },
        message: /同时含旧 battleSpriteNum\/path 与 canonical battleSprite/,
      },
      {
        label: 'enemy',
        mutate: (files) => {
          const manifest = JSON.parse(String(files['manifest.json'])) as {
            content: Record<string, string>
          }
          manifest.content.enemies = 'content/enemies.json'
          files['manifest.json'] = J(manifest)
          files['content/enemies.json'] = J([
            {
              id: 'mixed-enemy',
              name: 'Mixed',
              hp: 1,
              exp: 0,
              cash: 0,
              spriteNum: 1,
              battleSprite: 123,
              anim: { idleFrames: 1, idleSpeed: 1, magicFrames: 0, attackFrames: 0, yPosOffset: 0 },
            },
          ])
        },
        message: /同时含旧 spriteNum\/path\/anim 与 canonical battleSprite/,
      },
    ]

    for (const entry of cases) {
      const fixture = legacyBattleProject()
      entry.mutate(fixture.files)
      const writes: string[] = []
      await expect(
        openLocalProject(mockDir(`battle-mixed-presence-${entry.label}`, fixture.files, writes)),
      ).rejects.toThrow(entry.message)
      expect(writes, entry.label).toEqual([])
    }
  })

  test('battle 升级不被稍后可补的 openingMenuMusic 缺口阻断', async () => {
    const fixture = legacyBattleProject()
    const audio = v3MusicProject(['music.pal.004'])
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      assets: { roles: Record<string, string> }
    }
    const audioManifest = JSON.parse(String(audio['manifest.json'])) as {
      assets: { roles: Record<string, string> }
    }
    manifest.assets.roles = { ...audioManifest.assets.roles }
    delete manifest.assets.roles['audio.openingMenuMusic']
    fixture.files['manifest.json'] = J(manifest)
    fixture.files['assets/index.json'] = audio['assets/index.json']!

    const opened = await openLocalProject(
      mockDir('battle-before-audio-role-completion', fixture.files),
    )
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe('music.pal.004')
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('battle-sprite')
  })

  test.each([
    { label: 'unknown command', body: [{ kind: 'definitelyUnknownCommand' }] },
    {
      label: 'orphan ScriptRef',
      body: [
        { kind: 'setEntityAuto', entity: 'e1', script: { chunk: 'missing', id: 'missing/id' } },
      ],
    },
  ])('battle-sprite 升级在 script library 完整校验发现 $label 时零写', async ({ label, body }) => {
    const fixture = legacyBattleProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      content: Record<string, string>
    }
    manifest.content.scripts = 'content/scripts/'
    fixture.files['manifest.json'] = J(manifest)
    const chunk = { version: 1 as const, id: 'scene/s1', scripts: { 'scene/s1/test': body } }
    const normalized = normalizeScriptLibrary(
      {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: { 'scene/s1': { path: 'chunks/scene/s1.json', bytes: 0 } },
      },
      { 'scene/s1': chunk as unknown as ScriptChunkV1 },
    )
    fixture.files['content/scripts/index.json'] = J(normalized.index)
    fixture.files['content/scripts/chunks/scene/s1.json'] = J(chunk)
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir(`battle-script-${label}`, fixture.files, writes)),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  test('battle-sprite 恢复会拒绝被改写或后来新建的旧元数据', async () => {
    for (const mode of ['descriptor', 'created-effect'] as const) {
      const { files } = legacyBattleProject()
      const dir = mockDir(`battle-cleanup-${mode}`, files, [], {
        failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
      })
      await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure')
      if (mode === 'descriptor')
        files['assets/extracted/data/battle-sprites.json'] = J({ sprites: [] })
      else files['assets/extracted/data/battle-effect-index.json'] = J([0, 0])
      await expect(openLocalProject(dir)).rejects.toThrow('旧清理源被修改或后来新建')
      expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeDefined()
    }

    const existingEffect = legacyActorPathOnlyBattleProject()
    const existingEffectDir = mockDir('battle-cleanup-existing-effect', existingEffect, [], {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(existingEffectDir)).rejects.toThrow('Injected close failure')
    existingEffect['assets/extracted/data/battle-effect-index.json'] = J([9, 9])
    await expect(openLocalProject(existingEffectDir)).rejects.toThrow('旧清理源被修改')

    const deletedBeforePublish = legacyBattleProject()
    const deletedDir = mockDir(
      'battle-cleanup-deleted-before-publish',
      deletedBeforePublish.files,
      [],
      {
        failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
      },
    )
    await expect(openLocalProject(deletedDir)).rejects.toThrow('Injected close failure')
    delete deletedBeforePublish.files['assets/extracted/data/battle-sprites.json']
    await expect(openLocalProject(deletedDir)).rejects.toThrow('manifest 发布前丢失')
  })

  test('custom 同字节多源合并为单资产，别名被篡改时恢复 fail-loud', async () => {
    const successful = legacyActorPathOnlyBattleProject()
    const actors = JSON.parse(String(successful['content/actors.json'])) as Array<
      Record<string, unknown>
    >
    actors.push({
      ...structuredClone(actors[0]!),
      id: 'clone',
      name: 'name.clone',
      battler: {
        ...(structuredClone(actors[0]!.battler) as Record<string, unknown>),
        battleSpritePath: 'custom/clone.rle',
      },
    })
    successful['content/actors.json'] = J(actors)
    successful['assets/extracted/data/custom/clone.rle'] = battleSpriteBytes
    const opened = await openLocalProject(mockDir('battle-custom-alias', successful))
    const customAssets = Object.entries(opened.project.assetCatalog.assets).filter(([id]) =>
      id.startsWith('battle-sprite.legacy.'),
    )
    expect(customAssets).toHaveLength(1)
    expect(successful['assets/extracted/data/custom/hero.rle']).toBeUndefined()
    expect(successful['assets/extracted/data/custom/clone.rle']).toBeUndefined()

    const interrupted = legacyActorPathOnlyBattleProject()
    const interruptedActors = JSON.parse(String(interrupted['content/actors.json'])) as Array<
      Record<string, unknown>
    >
    interruptedActors.push({
      ...structuredClone(interruptedActors[0]!),
      id: 'clone',
      name: 'name.clone',
      battler: {
        ...(structuredClone(interruptedActors[0]!.battler) as Record<string, unknown>),
        battleSpritePath: 'custom/clone.rle',
      },
    })
    interrupted['content/actors.json'] = J(interruptedActors)
    interrupted['assets/extracted/data/custom/clone.rle'] = battleSpriteBytes
    const dir = mockDir('battle-custom-alias-tamper', interrupted, [], {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure')
    interrupted['assets/extracted/data/custom/clone.rle'] = new Uint8Array([1, 2, 3]).buffer
    await expect(openLocalProject(dir)).rejects.toThrow('旧清理源被修改')
  })

  test('严格旧空白工程可补齐 starter battle 资源，空 journal 也能从未动旧态重建', async () => {
    for (const emptyJournal of [false, true]) {
      const files = await exactOldBlankBattleProject({ emptyJournal })
      const opened = await openLocalProject(mockDir(`old-blank-${emptyJournal}`, files))
      expect(opened.project.manifest.content.battleSprites).toBe('content/battle-sprites.json')
      expect(opened.project.battleSpritesById['starter-fighter']?.profile.kind).toBe(
        'player-fighter',
      )
      expect(files['.type-pal/upgrade-local-v3-battle-sprites.json']).toBeUndefined()
    }
  })

  test('缺 battleSprites 但已改动的旧空白工程 fail-loud，不借用 player 0', async () => {
    const files = await exactOldBlankBattleProject({ corruptActor: true })
    const writes: string[] = []
    await expect(openLocalProject(mockDir('edited-old-blank', files, writes))).rejects.toThrow(
      '不是未修改的旧空白工程',
    )
    expect(writes).toEqual([])
  })

  test('旧 Actor 仅有 path 时只在升级边界采用 player 0，bare path 按 legacy.root 解析', async () => {
    const files = legacyActorPathOnlyBattleProject()
    const opened = await openLocalProject(mockDir('legacy-actor-path', files))
    const actor = opened.project.actorsById.hero!
    const definition = opened.project.battleSpritesById[actor.battler!.battleSprite]!
    expect(definition.profile).toMatchObject({
      kind: 'player-fighter',
      castEffectBase: 15,
      attackEffectBase: 0,
    })
    expect(definition.asset).toMatch(/^battle-sprite\.legacy\.[0-9a-f]{64}$/)
    expect(files['assets/extracted/data/custom/hero.rle']).toBeUndefined()
  })
  test('有效工程夹 → 装配 project + 全量场景', async () => {
    const { project, scenes } = await openLocalProject(mockDir('my-proj', currentProjectFiles()))
    expect(project.manifest.id).toBe('proj')
    expect(project.entryScene.id).toBe('s1')
    expect(scenes.map((s) => s.id)).toEqual(['s1'])
    expect(project.source).toBeDefined()
  })

  test('v4 单页/单段工程经项目级 journal 原子升级到 v5，manifest-last 且重开零写', async () => {
    const files = currentProjectFiles()
    const scene = JSON.parse(String(files['content/scenes/s1.json'])) as {
      entities: unknown[]
    }
    scene.entities = [
      {
        id: 'guide',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'gs',
        facing: 'down',
        pages: [
          {
            trigger: {
              on: 'interact',
              stages: [
                {
                  body: [{ kind: 'setEntityState', entity: 'guide', state: 2 }],
                },
              ],
            },
          },
        ],
      },
    ]
    files['content/scenes/s1.json'] = J(scene)
    const writes: string[] = []
    const dir = mockDir('v4-script', files, writes)

    const opened = await openLocalProject(dir)
    expect(opened.kind).toBe('v5')
    expect(opened.project.manifest.contentVersion).toBe(5)
    expect(writes.at(-1)).toBe('manifest.json')
    expect(files['content/shared-scripts.json']).toBeDefined()
    expect(files['content/migrations/script-v4-v5-save.json']).toBeDefined()
    expect(files['.type-pal/journals/script-v4-v5.json']).toBeUndefined()
    const sceneBytes = files['content/scenes/s1.json']
    const canonicalScene = JSON.parse(
      typeof sceneBytes === 'string' ? sceneBytes : new TextDecoder().decode(sceneBytes),
    ) as {
      entities: Array<{ initialPage?: string }>
    }
    expect(canonicalScene.entities[0]?.initialPage).toBe('default')

    const writeCount = writes.length
    const reopened = await openLocalProject(dir)
    expect(reopened.kind).toBe('v5')
    expect(writes).toHaveLength(writeCount)
  })

  test('v4→v5 manifest 提交中断后先按 journal 前滚，再进入 v5 loader', async () => {
    const files = currentProjectFiles()
    const writes: string[] = []
    const dir = mockDir('v4-script-recover', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })

    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(files['.type-pal/journals/script-v4-v5.json']).toBeDefined()
    expect(
      (JSON.parse(String(files['manifest.json'])) as { contentVersion: number }).contentVersion,
    ).toBe(4)

    const reopened = await openLocalProject(dir)
    expect(reopened.kind).toBe('v5')
    expect(reopened.project.manifest.contentVersion).toBe(5)
    expect(files['.type-pal/journals/script-v4-v5.json']).toBeUndefined()
  })

  test('v4 多页工程停在带 input digest 的迁移报告，确认前零写', async () => {
    const files = currentProjectFiles()
    const scene = JSON.parse(String(files['content/scenes/s1.json'])) as {
      entities: unknown[]
    }
    scene.entities = [
      {
        id: 'guide',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'gs',
        facing: 'down',
        pages: [{}, {}],
      },
    ]
    files['content/scenes/s1.json'] = J(scene)
    const writes: string[] = []

    await expect(
      openLocalProject(mockDir('v4-script-report', files, writes)),
    ).rejects.toMatchObject({
      report: {
        inputDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        issues: [expect.objectContaining({ resolution: 'name-pages' })],
      },
    })
    expect(writes).toEqual([])
    expect(
      (JSON.parse(String(files['manifest.json'])) as { contentVersion: number }).contentVersion,
    ).toBe(4)
    expect(Object.keys(files).some((path) => path.startsWith('.type-pal/'))).toBe(false)
  })

  test('v4 多页工程经作者命名、只读预览与明确确认后才原子发布', async () => {
    const files = currentProjectFiles()
    const scene = JSON.parse(String(files['content/scenes/s1.json'])) as {
      entities: unknown[]
    }
    scene.entities = [
      {
        id: 'guide',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'gs',
        facing: 'down',
        pages: [{}, {}],
      },
    ]
    files['content/scenes/s1.json'] = J(scene)
    const writes: string[] = []
    const dir = mockDir('v4-script-resolved', files, writes)
    let inputDigest = ''
    try {
      await openLocalProject(dir)
    } catch (error) {
      if (!(error instanceof ProjectScriptV4V5UpgradeError)) throw error
      inputDigest = error.report.inputDigest ?? ''
    }
    expect(inputDigest).toMatch(/^[a-f0-9]{64}$/)
    const resolutionPlan = {
      inputDigest,
      resolutions: [
        {
          kind: 'name-pages' as const,
          path: 'content/scenes/s1.json#/entities/guide/pages',
          initialPageId: 'idle',
          pages: [
            { pageId: 'idle', label: '待机' },
            { pageId: 'active', label: '行动' },
          ],
        },
      ],
    }

    await expect(openLocalProject(dir, { resolutionPlan })).rejects.toBeInstanceOf(
      LocalProjectV4V5PreviewRequiredError,
    )
    expect(writes).toEqual([])

    const opened = await openLocalProject(dir, {
      resolutionPlan,
      confirmInputDigest: inputDigest,
    })
    expect(opened.kind).toBe('v5')
    if (opened.kind !== 'v5') throw new Error('resolved v4 project 未升级到 v5')
    expect(opened.canonicalV5.scenes[0]?.entities[0]).toMatchObject({
      initialPage: 'idle',
      pages: [
        { id: 'idle', label: '待机' },
        { id: 'active', label: '行动' },
      ],
    })
    const manifestBytes = files['manifest.json']
    const manifestText =
      typeof manifestBytes === 'string' ? manifestBytes : new TextDecoder().decode(manifestBytes)
    expect((JSON.parse(manifestText) as { contentVersion: number }).contentVersion).toBe(5)
  })

  test('旧 v3 sprite number/legacy-root/followers → catalog 单链，二次打开零写入', async () => {
    const unusedSource = 'assets/extracted/data/sprite/83.rle'
    const fixture = legacySpriteProject({
      followers: [82, 0],
      sources: { 'assets/extracted/data/sprite/82.rle': spriteBytes, [unusedSource]: spriteBytes },
    })
    const writes: string[] = []
    const dir = mockDir('legacy-sprite', fixture.files, writes)
    const opened = await openLocalProject(dir)
    const definition = opened.project.spritesById['legacy-follower']!
    const record = opened.project.assetCatalog.assets[definition.asset]!

    expect(definition).toEqual({
      id: 'legacy-follower',
      asset: 'sprite.pal.082',
      label: '旧跟随者',
      layout: { kind: 'directional', framesPerDir: 3 },
    })
    expect(record).toMatchObject({
      kind: 'sprite',
      path: 'assets/migrated/sprites/082.rle',
      mediaType: 'application/vnd.type-pal.rle',
      origin: { kind: 'legacy-migrated', ref: 'sprite/82.rle' },
    })
    expect(new Uint8Array(fixture.files[record.path] as ArrayBuffer)).toEqual(
      new Uint8Array(spriteBytes),
    )
    expect(canonicalHookBody(opened)).toEqual([
      { kind: 'setFollowers', sprites: ['legacy-follower'] },
    ])
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sprite')
    expect(opened.project.assetCatalog.assets['sprite.pal.083']).toMatchObject({
      kind: 'sprite',
      path: 'assets/migrated/sprites/083.rle',
      label: 'PAL 大世界精灵 083',
    })
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()
    expect(fixture.files[unusedSource]).toBeUndefined()
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 工程自有 sprite path → authored 内容哈希路径，严格接收 canonical 裸 RLE', async () => {
    const sourcePath = 'assets/legacy/custom-sprite.rle'
    const fixture = legacySpriteProject({
      definitions: [
        {
          id: 'custom',
          spriteNum: 900,
          path: sourcePath,
          label: '自有精灵',
          layout: { kind: 'static' },
        },
      ],
      sources: { [sourcePath]: bareSpriteBytes },
    })
    const opened = await openLocalProject(mockDir('authored-sprite', fixture.files))
    const definition = opened.project.spritesById.custom!
    const record = opened.project.assetCatalog.assets[definition.asset]!
    expect(definition.asset).toBe('sprite.authored.legacy-900.custom')
    expect(record.path).toMatch(/^assets\/authored\/sprites\/legacy-900-[a-f0-9]{64}\.rle$/)
    expect(record.origin).toEqual({ kind: 'authored', ref: sourcePath })
    expect([...new Uint8Array(fixture.files[record.path] as ArrayBuffer).slice(0, 2)]).toEqual([
      0x1f, 0x8b,
    ])
    expect(fixture.files[sourcePath]).toBeUndefined()
  })

  test('旧 v3 authored SpriteDef id 分配对中文、规范化和大小写碰撞均无损且确定', async () => {
    const definitions = [
      ['中文甲', 'a', spriteBytes],
      ['中文乙', 'b', alternateSpriteBytes],
      ['foo bar', 'c', spriteBytes],
      ['foo_bar', 'd', alternateSpriteBytes],
      ['Foo', 'e', spriteBytes],
      ['foo', 'f', alternateSpriteBytes],
      ['u-466f6f', 'g', spriteBytes],
    ] as const
    const fixture = legacySpriteProject({
      definitions: definitions.map(([id, stem], index) => ({
        id,
        spriteNum: 900 + index,
        path: `assets/legacy/${stem}.rle`,
        label: id,
        layout: { kind: 'static' },
      })),
      sources: Object.fromEntries(
        definitions.map(([, stem, bytes]) => [`assets/legacy/${stem}.rle`, bytes]),
      ),
    })
    const first = await openLocalProject(mockDir('authored-id-escaping', fixture.files))
    const ids = Object.values(first.project.spritesById).map((definition) => definition.asset)
    expect(new Set(ids).size).toBe(definitions.length)
    expect(ids).toEqual(expect.arrayContaining([expect.stringContaining('e4b8ade69687')]))
    expect(ids.find((asset) => asset.startsWith('sprite.authored.legacy-904.'))).not.toBe(
      ids.find((asset) => asset.startsWith('sprite.authored.legacy-905.')),
    )
    const snapshot = [...ids]
    const second = await openLocalProject(mockDir('authored-id-escaping-reopen', fixture.files))
    expect(Object.values(second.project.spritesById).map((definition) => definition.asset)).toEqual(
      snapshot,
    )
  })

  test('旧 v3 authored 转义域与原样域在同 spriteNum 下不碰撞', async () => {
    const fixture = legacySpriteProject({
      definitions: [
        {
          id: 'Foo',
          spriteNum: 900,
          path: 'assets/legacy/upper.rle',
          label: '转义域',
          layout: { kind: 'static' },
        },
        {
          id: 'u-466f6f',
          spriteNum: 900,
          path: 'assets/legacy/plain.rle',
          label: '原样域前缀反例',
          layout: { kind: 'static' },
        },
      ],
      sources: {
        'assets/legacy/upper.rle': spriteBytes,
        'assets/legacy/plain.rle': alternateSpriteBytes,
      },
    })

    const opened = await openLocalProject(mockDir('authored-id-domain-separation', fixture.files))
    const escaped = opened.project.spritesById.Foo!.asset
    const prefixLookalike = opened.project.spritesById['u-466f6f']!.asset

    expect(escaped).toBe('sprite.authored.legacy-900.u-466f6f')
    expect(prefixLookalike).toBe('sprite.authored.legacy-900.u-752d343636663666')
    expect(escaped).not.toBe(prefixLookalike)
    expect(opened.project.assetCatalog.assets[escaped]!.sha256).not.toBe(
      opened.project.assetCatalog.assets[prefixLookalike]!.sha256,
    )
  })

  test('旧 v3 authored 目标 AssetId 已存在但字节不同则写前 fail-loud', async () => {
    const sourcePath = 'assets/legacy/custom-sprite.rle'
    const fixture = legacySpriteProject({
      definitions: [
        {
          id: 'custom',
          spriteNum: 900,
          path: sourcePath,
          label: '自有精灵',
          layout: { kind: 'static' },
        },
      ],
      sources: { [sourcePath]: alternateSpriteBytes },
    })
    const keptPath = 'assets/authored/sprites/kept.rle'
    fixture.files[keptPath] = spriteBytes
    fixture.files['assets/index.json'] = J({
      version: 1,
      assets: {
        'tileset.generated.starter': tilesetRecord,
        'sprite.authored.legacy-900.custom': {
          ...spriteRecord,
          path: keptPath,
          origin: { kind: 'authored' },
        },
      },
    })
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir('authored-sprite-conflict', fixture.files, writes)),
    ).rejects.toThrow(/已有 authored 记录但字节不同/)
    expect(writes).toEqual([])
    expect(fixture.files[sourcePath]).toBeDefined()
  })

  test('legacy sprite AssetId 已由 authored 内容接管时保留接管内容，二次打开零写入', async () => {
    const fixture = legacySpriteProject({
      sources: { 'assets/extracted/data/sprite/82.rle': alternateSpriteBytes },
    })
    const authoredPath = 'assets/authored/sprites/taken.rle'
    fixture.files[authoredPath] = spriteBytes
    fixture.files['assets/index.json'] = J({
      version: 1,
      assets: {
        'tileset.generated.starter': tilesetRecord,
        'sprite.pal.082': {
          ...spriteRecord,
          path: authoredPath,
          origin: { kind: 'authored' },
        },
      },
    })
    const writes: string[] = []
    const dir = mockDir('taken-pal-sprite', fixture.files, writes)

    const opened = await openLocalProject(dir)

    expect(opened.project.spritesById['legacy-follower']?.asset).toBe('sprite.pal.082')
    expect(opened.project.assetCatalog.assets['sprite.pal.082']).toMatchObject({
      path: authoredPath,
      sha256: spriteHash,
      origin: { kind: 'authored' },
    })
    expect(fixture.files[authoredPath]).toBe(spriteBytes)
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧数字 follower 遇同 spriteNum 多定义时写前 fail-loud，不任取 primary', async () => {
    const fixture = legacySpriteProject({
      definitions: [
        { id: 'a', spriteNum: 82, label: 'A', layout: { kind: 'static' } },
        { id: 'b', spriteNum: 82, label: 'B', layout: { kind: 'static' } },
      ],
      followers: [82],
    })
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir('ambiguous-follower', fixture.files, writes)),
    ).rejects.toThrow(/对应多个 SpriteDef\.id/)
    expect(writes).toEqual([])
    expect(fixture.files['manifest.json']).toBe(fixture.manifestText)
    expect(fixture.files['content/sprites.json']).toBe(fixture.definitionsText)
    expect(fixture.files[fixture.sourcePath]).toBeDefined()
  })

  test('旧 v3 sprite manifest-last 中断保持旧源，重试单调前滚并清理', async () => {
    const fixture = legacySpriteProject({ followers: [82] })
    const writes: string[] = []
    const dir = mockDir('retry-sprite-upgrade', fixture.files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(fixture.files['manifest.json']).toBe(fixture.manifestText)
    expect(fixture.files[fixture.sourcePath]).toBeDefined()
    expect(JSON.parse(String(fixture.files['content/sprites.json']))[0]).toHaveProperty('asset')

    writes.length = 0
    const opened = await openLocalProject(dir)
    expect(opened.project.spritesById['legacy-follower']?.asset).toBe('sprite.pal.082')
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test.each([
    { label: 'legacy-root gzip', bytes: tilesetBytes, byteExact: true },
    { label: '历史 clone 裸 RLE', bytes: bareTilesetBytes, byteExact: false },
  ])('旧 v3 tileset $label → canonical catalog gzip，二次打开零写入', async (input) => {
    const { files, sourcePath } = legacyTilesetProject({ bytes: input.bytes })
    const writes: string[] = []
    const dir = mockDir(`tileset-${input.label}`, files, writes)
    const opened = await openLocalProject(dir)
    const definition = opened.project.tilesets[0]!
    const record = opened.project.assetCatalog.assets[definition.asset]!
    const stored = files[record.path] as ArrayBuffer

    expect(definition).toEqual({
      id: 'tileset-001',
      name: '旧瓦片集',
      category: 'builtin',
      asset: 'tileset.pal.001',
    })
    expect(record).toMatchObject({
      kind: 'tileset',
      path: 'assets/migrated/tilesets/001.rle',
      mediaType: 'application/vnd.type-pal.rle',
      origin: { kind: 'legacy-migrated', ref: 'tileset/1.rle' },
    })
    expect([...new Uint8Array(stored).slice(0, 2)]).toEqual([0x1f, 0x8b])
    expect(record.bytes).toBe(stored.byteLength)
    expect(record.sha256).toBe(await sha256Hex(stored))
    if (input.byteExact) expect(new Uint8Array(stored)).toEqual(new Uint8Array(input.bytes))
    expect(files[sourcePath]).toBeUndefined()
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('tileset')
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 工程自有 tileset path → authored 内容哈希路径', async () => {
    const { files, sourcePath } = legacyTilesetProject({
      id: 'custom-set',
      path: 'assets/legacy/custom.rle',
      bytes: bareTilesetBytes,
    })
    const opened = await openLocalProject(mockDir('custom-tileset', files))
    const definition = opened.project.tilesets[0]!
    const record = opened.project.assetCatalog.assets[definition.asset]!
    expect(definition.asset).toBe('tileset.authored.custom-set')
    expect(record.path).toMatch(/^assets\/authored\/tilesets\/[a-f0-9]{64}\.rle$/)
    expect(record.origin).toEqual({ kind: 'authored', ref: sourcePath })
    expect(files[sourcePath]).toBeUndefined()
  })

  test('旧 v3 tileset 已有 authored AssetId 时保留作者资产，只退役旧源', async () => {
    const fixture = legacyTilesetProject()
    const authoredPath = 'assets/authored/tilesets/kept.rle'
    const authoredRecord = {
      kind: 'tileset' as const,
      path: authoredPath,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: alternateTilesetBytes.byteLength,
      sha256: await sha256Hex(alternateTilesetBytes),
      origin: { kind: 'authored' as const },
    }
    fixture.files['assets/index.json'] = J({
      version: 1,
      assets: {
        'sprite.generated.gs': spriteRecord,
        'tileset.pal.001': authoredRecord,
      },
    })
    fixture.files[authoredPath] = alternateTilesetBytes

    const opened = await openLocalProject(mockDir('authored-tileset-takeover', fixture.files))
    expect(opened.project.tilesets[0]?.asset).toBe('tileset.pal.001')
    expect(opened.project.assetCatalog.assets['tileset.pal.001']).toEqual(authoredRecord)
    expect(fixture.files[authoredPath]).toBe(alternateTilesetBytes)
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()
  })

  test.each([
    {
      label: 'generated',
      path: 'assets/generated/tilesets/collision.rle',
      origin: { kind: 'generated' },
      bytes: tilesetBytes,
    },
    {
      label: 'licensed',
      path: 'assets/runtime/tilesets/collision.rle',
      origin: { kind: 'licensed' },
      bytes: tilesetBytes,
    },
    {
      label: '过期 legacy-migrated',
      path: 'assets/migrated/tilesets/001.rle',
      origin: { kind: 'legacy-migrated', ref: 'tileset/2.rle' },
      bytes: alternateTilesetBytes,
    },
  ])('旧 v3 tileset 遇 $label 同 AssetId 占用时写前拒绝', async (collision) => {
    const fixture = legacyTilesetProject()
    fixture.files['assets/index.json'] = J({
      version: 1,
      assets: {
        'sprite.generated.gs': spriteRecord,
        'tileset.pal.001': {
          kind: 'tileset',
          path: collision.path,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: collision.bytes.byteLength,
          sha256: await sha256Hex(collision.bytes),
          origin: collision.origin,
        },
      },
    })
    fixture.files[collision.path] = collision.bytes
    const writes: string[] = []

    await expect(
      openLocalProject(mockDir(`occupied-${collision.label}`, fixture.files, writes)),
    ).rejects.toThrow(/AssetId tileset\.pal\.001/)
    expect(writes).toEqual([])
    expect(fixture.files['manifest.json']).toBe(fixture.manifestText)
    expect(fixture.files['content/tilesets.json']).toBe(fixture.definitionsText)
    expect(fixture.files[fixture.sourcePath]).toBeDefined()
  })

  test('旧 v3 tileset 源路径被另一 AssetId 共享时不删除源文件', async () => {
    const sourcePath = 'assets/authored/tilesets/shared-source.rle'
    const fixture = legacyTilesetProject({ id: 'custom-set', path: sourcePath })
    fixture.files['assets/index.json'] = J({
      version: 1,
      assets: {
        'sprite.generated.gs': spriteRecord,
        'tileset.authored.existing': {
          kind: 'tileset',
          path: sourcePath,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: tilesetBytes.byteLength,
          sha256: await sha256Hex(tilesetBytes),
          origin: { kind: 'authored' },
        },
      },
    })

    const opened = await openLocalProject(mockDir('shared-tileset-source', fixture.files))
    expect(opened.project.tilesets[0]?.asset).toBe('tileset.authored.custom-set')
    expect(fixture.files[sourcePath]).toBe(tilesetBytes)
    expect(opened.project.assetCatalog.assets['tileset.authored.existing']?.path).toBe(sourcePath)
  })

  test('legacy.tilesets 孤儿字段也会触发一次升级并被清理', async () => {
    const fixture = legacyTilesetProject()
    const manifest = JSON.parse(String(fixture.files['manifest.json'])) as {
      assets: { legacy: { families: string[]; tilesets?: string } }
    }
    manifest.assets.legacy.families = manifest.assets.legacy.families.filter(
      (family) => family !== 'tileset',
    )
    fixture.files['manifest.json'] = J(manifest)

    const opened = await openLocalProject(mockDir('orphan-legacy-tilesets', fixture.files))
    expect(opened.project.tilesets[0]?.asset).toBe('tileset.pal.001')
    expect(opened.project.manifest.assets.legacy).not.toHaveProperty('tilesets')
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()
  })

  test.each([
    'missing',
    'bad-rle',
    'kind-collision',
    'path-collision',
  ] as const)('旧 v3 tileset %s 在写前失败，零写入', async (scenario) => {
    const fixture = legacyTilesetProject()
    if (scenario === 'missing') delete fixture.files[fixture.sourcePath]
    if (scenario === 'bad-rle') fixture.files[fixture.sourcePath] = new Uint8Array([1, 2]).buffer
    if (scenario === 'kind-collision')
      fixture.files['assets/index.json'] = J({
        version: 1,
        assets: {
          'sprite.generated.gs': spriteRecord,
          'tileset.pal.001': {
            kind: 'sound',
            path: 'assets/migrated/sounds/001.wav',
            mediaType: 'audio/wav',
            bytes: 0,
            sha256: '0'.repeat(64),
            origin: { kind: 'legacy-migrated' },
          },
        },
      })
    if (scenario === 'path-collision')
      fixture.files['assets/index.json'] = J({
        version: 1,
        assets: {
          'sprite.generated.gs': spriteRecord,
          'portrait.conflict': {
            kind: 'portrait',
            path: 'assets/migrated/tilesets/001.rle',
            mediaType: 'image/png',
            bytes: 0,
            sha256: '0'.repeat(64),
            origin: { kind: 'legacy-migrated' },
          },
        },
      })
    const writes: string[] = []
    await expect(
      openLocalProject(mockDir(`bad-tileset-${scenario}`, fixture.files, writes)),
    ).rejects.toThrow()
    expect(writes).toEqual([])
    expect(fixture.files['manifest.json']).toBe(fixture.manifestText)
    expect(fixture.files['content/tilesets.json']).toBe(fixture.definitionsText)
    if (scenario === 'missing') expect(fixture.files[fixture.sourcePath]).toBeUndefined()
    else expect(fixture.files[fixture.sourcePath]).toBeDefined()
  })

  test.each([
    'assets/index.json',
    'content/tilesets.json',
  ] as const)('旧 v3 tileset 在 %s close 中断后不发布坏引用，重试可完成', async (failedPath) => {
    const fixture = legacyTilesetProject()
    const writes: string[] = []
    const dir = mockDir(`retry-${failedPath}`, fixture.files, writes, {
      failClose: (path, attempt) => path === failedPath && attempt === 1,
    })

    await expect(openLocalProject(dir)).rejects.toThrow(`Injected close failure ${failedPath}`)
    expect(fixture.files[fixture.sourcePath]).toBeDefined()
    expect(fixture.files['manifest.json']).toBe(fixture.manifestText)
    expect(fixture.files['content/tilesets.json']).toBe(fixture.definitionsText)
    const interruptedCatalog = JSON.parse(String(fixture.files['assets/index.json'])) as {
      assets: Record<string, unknown>
    }
    if (failedPath === 'assets/index.json') {
      expect(interruptedCatalog.assets['tileset.pal.001']).toBeUndefined()
      expect(writes).not.toContain('assets/index.json')
    } else {
      expect(interruptedCatalog.assets['tileset.pal.001']).toBeDefined()
      expect(writes).toContain('assets/index.json')
    }
    expect(writes).not.toContain('manifest.json')

    writes.length = 0
    const opened = await openLocalProject(dir)
    expect(opened.project.tilesets[0]?.asset).toBe('tileset.pal.001')
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('tileset')
    expect(fixture.files[fixture.sourcePath]).toBeUndefined()
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 tileset manifest-last 中断可校验滚前并清理旧源', async () => {
    const { files, sourcePath } = legacyTilesetProject()
    const writes: string[] = []
    const dir = mockDir('retry-tileset-upgrade', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })
    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(files[sourcePath]).toBeDefined()
    expect(writes).not.toContain('manifest.json')
    expect(JSON.parse(String(files['content/tilesets.json']))[0]).toHaveProperty(
      'asset',
      'tileset.pal.001',
    )

    writes.length = 0
    const opened = await openLocalProject(dir)
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('tileset')
    expect(files[sourcePath]).toBeUndefined()
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 四类静态图像一次闭包：内容/脚本/catalog/bytes/manifest-last，重复打开零写入', async () => {
    const files: Record<string, string | ArrayBuffer> = { ...fullProject }
    const manifest = JSON.parse(String(files['manifest.json'])) as {
      content: Record<string, string>
      assets: { legacy: Record<string, unknown> }
    }
    manifest.content.battleFields = 'content/battle-fields.json'
    manifest.assets.legacy = {
      ...manifest.assets.legacy,
      families: ['color-table', 'portrait', 'face', 'item-icon', 'battle-background'],
      portraits: 'assets/legacy/portraits',
      faces: 'assets/legacy/faces',
      itemIcons: 'assets/legacy/items',
    }
    files['manifest.json'] = J(manifest)
    files['content/actors.json'] = J([
      { id: 'a', name: 'name.a', spriteId: 'gs', portraits: { default: 1 } },
    ])
    files['content/items.json'] = J([
      {
        id: 'with-icon',
        name: '有图',
        desc: [],
        icon: 7,
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
      {
        id: 'without-icon',
        name: '无图',
        desc: [],
        icon: 0,
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ])
    files['content/battle-fields.json'] = J([
      {
        id: 6,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    files['content/scenes/s1.json'] = J({
      id: 's1',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      onEnter: [
        {
          id: 'images',
          body: [
            {
              kind: 'dialog',
              cue: { rows: [{ text: 'hello' }], portrait: { icon: 1, side: 'right' } },
            },
            { kind: 'setActorAppearance', actor: 'a', portrait: 1 },
          ],
        },
      ],
    })
    files['assets/legacy/portraits/1.png'] = pngHeaderBytes(80, 100, 1)
    files['assets/legacy/portraits/2.png'] = pngHeaderBytes(80, 100, 2)
    files['assets/legacy/faces/a.png'] = pngHeaderBytes(48, 48, 3)
    files['assets/legacy/items/7.png'] = pngHeaderBytes(32, 32, 4)
    files['assets/extracted/images/battle/bg/006.png'] = pngHeaderBytes(320, 200, 5)
    const writes: string[] = []
    const dir = mockDir('static-v3', files, writes)
    const opened = await openLocalProject(dir, { validateStaticImage: async () => undefined })

    expect(opened.project.manifest.assets.legacy?.families).toEqual(['color-table'])
    expect(opened.project.actorsById.a?.portraits?.default).toBe('portrait.pal.001')
    expect(opened.project.actorsById.a?.face).toBe('face.pal.a')
    expect(opened.project.items['with-icon']?.icon).toBe('item-icon.pal.007')
    expect(opened.project.items['without-icon']?.icon).toBeUndefined()
    expect(opened.project.battleFields?.[0]?.background).toBe('battle-background.pal.006')
    expect(canonicalHookBody(opened)).toEqual([
      {
        kind: 'dialog',
        cue: {
          rows: [{ text: 'hello' }],
          portrait: { asset: 'portrait.pal.001', side: 'right' },
        },
      },
      { kind: 'setActorAppearance', actor: 'a', portrait: 'portrait.pal.001' },
    ])
    expect(Object.keys(opened.project.assetCatalog.assets).sort()).toEqual([
      'battle-background.pal.006',
      'face.pal.a',
      'item-icon.pal.007',
      'portrait.pal.001',
      'portrait.pal.002',
      'sprite.generated.gs',
      'tileset.generated.starter',
    ])
    expect(files['assets/migrated/portraits/001.png']).toEqual(
      files['assets/legacy/portraits/1.png'],
    )
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir, { validateStaticImage: async () => undefined })
    expect(writes).toEqual([])
  })

  test('旧 v3 静态图保留同 AssetId authored 整条记录与 bytes，不复制 legacy 源', async () => {
    const { files } = staticPortraitFamilyProject()
    const authoredPath = 'assets/authored/portraits/custom.png'
    const authoredBytes = pngHeaderBytes(80, 100, 9)
    const authoredRecord = {
      kind: 'portrait' as const,
      path: authoredPath,
      mediaType: 'image/png',
      bytes: authoredBytes.byteLength,
      sha256: await sha256Hex(authoredBytes),
      label: '作者立绘',
      origin: { kind: 'authored' as const },
    }
    files[authoredPath] = authoredBytes
    files['assets/index.json'] = J({
      version: 1,
      assets: {
        'tileset.generated.starter': tilesetRecord,
        'sprite.generated.gs': spriteRecord,
        'portrait.pal.001': authoredRecord,
      },
    })
    const writes: string[] = []
    const dir = mockDir('static-authored', files, writes)
    const opened = await openLocalProject(dir, {
      validateStaticImage: async () => undefined,
    })

    expect(opened.project.assetCatalog.assets['portrait.pal.001']).toEqual(authoredRecord)
    expect(opened.project.actorsById.a?.portraits?.default).toBe('portrait.pal.001')
    expect(files[authoredPath]).toBe(authoredBytes)
    expect(writes).not.toContain(authoredPath)
    expect(writes).not.toContain('assets/migrated/portraits/001.png')
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('portrait')

    writes.length = 0
    await openLocalProject(dir, { validateStaticImage: async () => undefined })
    expect(writes).toEqual([])
  })

  test.each([
    'missing',
    'bad-hash',
  ] as const)('旧 v3 authored 静态图 %s 时写前失败且零写入', async (scenario) => {
    const { files, manifestText, actorsText } = staticPortraitFamilyProject()
    const authoredPath = `assets/authored/portraits/${scenario}.png`
    const authoredBytes = pngHeaderBytes(80, 100, 9)
    const catalogText = J({
      version: 1,
      assets: {
        'tileset.generated.starter': tilesetRecord,
        'sprite.generated.gs': spriteRecord,
        'portrait.pal.001': {
          kind: 'portrait',
          path: authoredPath,
          mediaType: 'image/png',
          bytes: authoredBytes.byteLength,
          sha256: scenario === 'bad-hash' ? '0'.repeat(64) : await sha256Hex(authoredBytes),
          origin: { kind: 'authored' },
        },
      },
    })
    files['assets/index.json'] = catalogText
    if (scenario === 'bad-hash') files[authoredPath] = authoredBytes
    const writes: string[] = []

    await expect(
      openLocalProject(mockDir(`static-${scenario}`, files, writes), {
        validateStaticImage: async () => undefined,
      }),
    ).rejects.toThrow()

    expect(writes).toEqual([])
    expect(files['manifest.json']).toBe(manifestText)
    expect(files['assets/index.json']).toBe(catalogText)
    expect(files['content/actors.json']).toBe(actorsText)
    expect(files['assets/migrated/portraits/001.png']).toBeUndefined()
  })

  test('旧 UI 目录不会静默丢弃，给出可操作错误', async () => {
    const manifest = JSON.parse(String(fullProject['manifest.json'])) as {
      assets: { legacy: Record<string, unknown> }
    }
    manifest.assets.legacy.ui = 'assets/legacy/ui'
    await expect(
      openLocalProject(mockDir('legacy-ui', { ...fullProject, 'manifest.json': J(manifest) })),
    ).rejects.toThrow('manifest.assets.legacy.ui')
  })

  test('无 manifest.json → 友好报错(带夹名)', async () => {
    await expect(openLocalProject(mockDir('空夹', {}))).rejects.toThrow('空夹')
  })

  test.each([
    {
      name: '优先使用 PAL 004',
      ids: ['music.pal.004', 'music.pal.037'],
      expected: 'music.pal.004',
    },
    {
      name: '缺 004 时按 AssetId 确定性回退',
      ids: ['music.pal.009', 'music.pal.001'],
      expected: 'music.pal.001',
    },
  ])('旧 v3 音乐工程补齐标题菜单角色：$name', async ({ ids, expected }) => {
    const files = v3MusicProject(ids)
    const writes: string[] = []
    const dir = mockDir('old-v3', files, writes)
    const opened = await openLocalProject(dir)
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe(expected)
    expect(opened.project.manifest.contentVersion).toBe(5)
    expect(writes.at(-1)).toBe('manifest.json')

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('已有标题菜单角色不覆盖，无音乐工程不新增角色', async () => {
    const custom = v3MusicProject(['music.pal.004', 'music.pal.009'], 'music.pal.009')
    const customWrites: string[] = []
    const opened = await openLocalProject(mockDir('custom-v3', custom, customWrites))
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe('music.pal.009')
    expect(opened.project.manifest.contentVersion).toBe(5)
    expect(customWrites.at(-1)).toBe('manifest.json')

    const silentFiles = { ...fullProject }
    const silentWrites: string[] = []
    const silent = await openLocalProject(mockDir('silent-v3', silentFiles, silentWrites))
    expect(silent.project.manifest.assets.roles['audio.openingMenuMusic']).toBeUndefined()
    expect(silent.project.manifest.contentVersion).toBe(5)
    expect(silentWrites.at(-1)).toBe('manifest.json')
  })

  test('旧 v3 sound family 复制登记、改写引用并以 manifest 最后发布', async () => {
    const wave = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
      .buffer
    const manifest = JSON.parse(String(fullProject['manifest.json'])) as {
      content: Record<string, string>
      assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
    }
    manifest.assets.legacy = {
      ...manifest.assets.legacy,
      families: ['sound', 'color-table'],
      sounds: 'assets/extracted/sounds',
    }
    manifest.content.scripts = 'content/scripts/'
    const rawChunk = {
      version: 1 as const,
      id: 'shared/c07',
      scripts: {
        'shared/user/test': [{ kind: 'playSound', soundId: 45 }],
      },
    }
    const rawScripts = normalizeScriptLibrary(
      {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: { 'shared/c07': { path: 'chunks/shared/c07.json', bytes: 0 } },
        library: {
          'shared/user/test': { name: '测试音效脚本', self: 'none' },
        },
      },
      { 'shared/c07': rawChunk as unknown as ScriptChunkV1 },
    )
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'assets/index.json': J({
        version: 1,
        assets: {
          ...(
            JSON.parse(String(fullProject['assets/index.json'])) as {
              assets: Record<string, unknown>
            }
          ).assets,
          'battle-sprite.generated.starter': battleSpriteRecord,
        },
      }),
      'content/battle-sprites.json': J([
        {
          id: 'starter-summon',
          label: '测试召唤精灵',
          asset: 'battle-sprite.generated.starter',
          profile: { kind: 'summon' },
        },
      ]),
      [battleSpriteRecord.path]: battleSpriteBytes,
      'content/actors.json': J([{ id: 'a', name: 'name.a', spriteId: 'gs' }]),
      'content/skills.json': J({
        skills: [
          {
            id: 's',
            name: 'S',
            cost: { mp: 0 },
            target: 'self',
            effects: [{ kind: 'summon', battleSprite: 'starter-summon', sound: 5 }],
            animation: { sound: 4 },
          },
        ],
        levelUp: {},
      }),
      'content/items.json': J([
        {
          id: 'i',
          name: 'I',
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'self',
            consuming: false,
            effects: [{ kind: 'healHp', amount: 1 }],
            sound: 6,
          },
        },
      ]),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [
          {
            id: 'sounds',
            body: [
              { kind: 'playSound', soundId: 45 },
              { kind: 'playSound', soundId: 122 },
            ],
          },
        ],
      }),
      'content/scripts/index.json': J(rawScripts.index),
      'content/scripts/chunks/shared/c07.json': J(rawChunk),
      ...Object.fromEntries(
        [4, 5, 6, 28, 29, 45, 47].map((id) => [`assets/extracted/sounds/${id}.wav`, wave]),
      ),
    }
    const writes: string[] = []
    const progress: SoundUpgradeProgress[] = []
    const dir = mockDir('old-v3-sounds', files, writes)
    const opened = await openLocalProject(dir, {
      onSoundUpgradeProgress: (value) => progress.push(value),
    })
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(opened.project.manifest.assets.legacy?.sounds).toBeUndefined()
    expect(canonicalHookBody(opened)).toEqual([{ kind: 'playSound', asset: 'sound.pal.045' }])
    expect(opened.project.skills.s?.animation.sound).toBe('sound.pal.004')
    expect(opened.project.items.i?.use?.sound).toBe('sound.pal.006')
    if (opened.kind !== 'v5') throw new Error('未升级为 v5')
    expect(opened.canonicalV5.project.sharedScripts['shared/user/test']?.body).toEqual([
      { kind: 'playSound', asset: 'sound.pal.045' },
    ])
    expect(opened.project.manifest.assets.roles).toMatchObject({
      'audio.battleItemUseSound': 'sound.pal.028',
      'audio.battleCoopCastSound': 'sound.pal.029',
      'audio.battleEscapeSound': 'sound.pal.045',
      'audio.battleEnemyTransformSound': 'sound.pal.047',
    })
    expect(opened.project.assetCatalog.assets['sound.pal.122']).toBeUndefined()
    expect(files['assets/migrated/sounds/045.wav']).toEqual(wave)
    expect(writes.at(-1)).toBe('manifest.json')
    const readProgress = progress.filter((value) => value.phase === 'read')
    expect(readProgress[0]).toEqual({ phase: 'read', completed: 0, total: 7 * wave.byteLength })
    expect(readProgress.at(-1)).toEqual({
      phase: 'read',
      completed: 7 * wave.byteLength,
      total: 7 * wave.byteLength,
    })
    const writeProgress = progress.filter((value) => value.phase === 'write')
    const firstWrite = writeProgress[0]!
    const lastWrite = writeProgress.at(-1)!
    expect(firstWrite).toMatchObject({ phase: 'write', completed: 0 })
    expect(firstWrite.total).toBeGreaterThan(7 * wave.byteLength)
    expect(lastWrite).toEqual({
      phase: 'write',
      completed: lastWrite.total,
      total: lastWrite.total,
    })
    expect(files['content/scripts/index.json']).toBeUndefined()
    expect(files['content/scripts/chunks/shared/c07.json']).toBeUndefined()

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 sound family 保留同 AssetId 的 authored WAV，不用 legacy 字节覆盖', async () => {
    const legacyWave = waveBytes(1)
    const authoredWave = waveBytes(2)
    const { manifest } = soundFamilyManifest()
    const authoredPath = 'assets/authored/escape.wav'
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'assets/index.json': J({
        version: 1,
        assets: {
          'tileset.generated.starter': tilesetRecord,
          'sprite.generated.gs': spriteRecord,
          'sound.pal.045': {
            kind: 'sound',
            path: authoredPath,
            mediaType: 'audio/wav',
            bytes: authoredWave.byteLength,
            sha256: await sha256Hex(authoredWave),
            label: '作者替换的逃跑音效',
            origin: { kind: 'authored' },
          },
        },
      }),
      'assets/extracted/sounds/45.wav': legacyWave,
      [authoredPath]: authoredWave,
    }
    const writes: string[] = []
    const opened = await openLocalProject(mockDir('authored-sound', files, writes))
    expect(opened.project.assetCatalog.assets['sound.pal.045']).toMatchObject({
      path: authoredPath,
      origin: { kind: 'authored' },
    })
    expect(files[authoredPath]).toBe(authoredWave)
    expect(writes).not.toContain(authoredPath)
    expect(opened.project.manifest.assets.roles['audio.battleEscapeSound']).toBe('sound.pal.045')
  })

  test('旧 v3 sound family 在已有 catalog WAV 缺失或 hash 错误时写前失败', async () => {
    const legacyWave = waveBytes(1)
    const authoredWave = waveBytes(2)
    for (const scenario of ['missing', 'bad-hash'] as const) {
      const { manifest, text: originalManifest } = soundFamilyManifest()
      const authoredPath = `assets/authored/${scenario}.wav`
      const files: Record<string, string | ArrayBuffer> = {
        ...fullProject,
        'manifest.json': originalManifest,
        'assets/index.json': J({
          version: 1,
          assets: {
            'tileset.generated.starter': tilesetRecord,
            'sprite.generated.gs': spriteRecord,
            'sound.pal.045': {
              kind: 'sound',
              path: authoredPath,
              mediaType: 'audio/wav',
              bytes: authoredWave.byteLength,
              sha256: scenario === 'bad-hash' ? '0'.repeat(64) : await sha256Hex(authoredWave),
              origin: { kind: 'authored' },
            },
          },
        }),
        'assets/extracted/sounds/45.wav': legacyWave,
        ...(scenario === 'bad-hash' ? { [authoredPath]: authoredWave } : {}),
      }
      const writes: string[] = []
      await expect(
        openLocalProject(mockDir(`invalid-${scenario}`, files, writes)),
      ).rejects.toThrow()
      expect(writes).toEqual([])
      expect(files['manifest.json']).toBe(originalManifest)
      expect(manifest.assets.legacy.families).toContain('sound')
    }
  })

  test('旧 v3 sound family 在 manifest 发布失败后保留旧判据，并可重试滚前完成', async () => {
    const { manifest } = soundFamilyManifest()
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ id: 'sound', body: [{ kind: 'playSound', soundId: 45 }] }],
      }),
      'assets/extracted/sounds/45.wav': waveBytes(1),
    }
    const writes: string[] = []
    const dir = mockDir('retry-sound-upgrade', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })

    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(writes).not.toContain('manifest.json')
    expect(
      (JSON.parse(String(files['manifest.json'])) as { assets: { legacy: { families: string[] } } })
        .assets.legacy.families,
    ).toContain('sound')
    expect(
      (
        JSON.parse(String(files['content/scenes/s1.json'])) as {
          onEnter: Array<{ body: unknown[] }>
        }
      ).onEnter[0]?.body,
    ).toEqual([{ kind: 'playSound', asset: 'sound.pal.045' }])

    writes.length = 0
    const opened = await openLocalProject(dir)
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(writes.at(-1)).toBe('manifest.json')
    expect(opened.project.assetCatalog.assets['sound.pal.045']?.kind).toBe('sound')
    expect(canonicalHookBody(opened)).toEqual([{ kind: 'playSound', asset: 'sound.pal.045' }])

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('v2 音乐+sound-family 工程一次打开连续升级闭包，并保留别名、引用与字节', async () => {
    const midi = new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer
    const soundfont = new Uint8Array([1, 2, 3]).buffer
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J({
        id: 'old',
        name: '旧工程',
        contentVersion: 2,
        entryScene: 's1',
        content: {
          actors: 'content/actors.json',
          skills: 'content/skills.json',
          items: 'content/items.json',
          locale: 'content/locale.json',
          scenes: 'content/scenes/',
          maps: 'content/maps/index.json',
          tilesets: 'content/tilesets.json',
          sprites: 'content/sprites.json',
          music: 'content/music.json',
        },
        assets: {
          root: 'assets/extracted/data',
          tilesets: 'tileset',
          sprites: 'sprite',
          palettes: 'palette',
          music: 'assets/extracted/music',
          sounds: 'assets/extracted/sounds',
        },
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      }),
      'content/music.json': J([{ id: 1, name: '蝶恋' }]),
      'content/tilesets.json': J([
        { id: 'tileset-001', name: '瓦片集 1', category: 'builtin', path: 'tileset/1.rle' },
      ]),
      'content/sprites.json': J([
        {
          id: 'gs',
          spriteNum: 2,
          label: '旧精灵',
          layout: { kind: 'static' },
        },
      ]),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        musicId: 1,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ id: 'sound', body: [{ kind: 'playSound', soundId: 45 }] }],
      }),
      'assets/extracted/music/001.mid': midi,
      'assets/extracted/sounds/45.wav': waveBytes(1),
      'assets/extracted/data/tileset/1.rle': tilesetBytes,
      'assets/extracted/data/sprite/2.rle': spriteBytes,
      'assets/extracted/data/battle-sprites.json': J({
        sprites: [{ kind: 'player', id: 0 }],
      }),
      'assets/extracted/data/battle-sprite/player/0.rle': battleSpriteBytes,
    }
    const opened = await openLocalProject(mockDir('old', files), {
      readSoundfont: async () => soundfont,
    })

    expect(opened.project.manifest.contentVersion).toBe(5)
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(opened.scenes[0]?.music).toBe('music.pal.001')
    expect(canonicalHookBody(opened)).toEqual([{ kind: 'playSound', asset: 'sound.pal.045' }])
    expect(opened.project.assetCatalog.assets['music.pal.001']?.label).toBe('蝶恋')
    expect(opened.project.assetCatalog.assets['sound.pal.045']?.kind).toBe('sound')
    expect(opened.project.spritesById.gs?.asset).toBe('sprite.pal.002')
    expect(opened.project.assetCatalog.assets['sprite.pal.002']?.kind).toBe('sprite')
    expect(opened.project.assetCatalog.assets['music.pal.001']?.bytes).toBe(4)
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe('music.pal.001')
    expect(files['content/music.json']).toBeUndefined()
    expect(files['assets/migrated/music/001.mid']).toEqual(midi)
    expect(files['assets/migrated/sounds/045.wav']).toEqual(files['assets/extracted/sounds/45.wav'])
    expect(files['assets/migrated/sprites/002.rle']).toEqual(spriteBytes)
    expect(files['assets/extracted/data/sprite/2.rle']).toBeUndefined()
    expect(files['assets/runtime/soundfont.sf3']).toEqual(soundfont)
  })

  test.each([
    {
      label: 'tilesets 内容 close',
      failClose: (path: string, attempt: number) =>
        path === 'content/tilesets.json' && attempt === 1,
    },
    {
      label: '最终 catalog 收缩 close',
      failClose: (path: string, attempt: number) => path === 'assets/index.json' && attempt === 2,
    },
    {
      label: 'manifest close',
      failClose: (path: string, attempt: number) => path === 'manifest.json' && attempt === 2,
    },
  ])('删除最后一个 tileset 定义的 $label 中断态仍可重开与重试', async (failure) => {
    const removableId = 'unused-tileset'
    const removableAsset = 'tileset.authored.unused'
    const removablePath = 'assets/authored/tilesets/unused.rle'
    const removableRecord = {
      kind: 'tileset' as const,
      path: removablePath,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: tilesetBytes.byteLength,
      sha256: await sha256Hex(tilesetBytes),
      origin: { kind: 'authored' as const },
    }
    const files: Record<string, string | ArrayBuffer> = {
      ...currentProjectFiles(),
      'content/tilesets.json': J([
        {
          id: 'tileset-001',
          name: '瓦片集 1',
          category: 'builtin',
          asset: 'tileset.generated.starter',
        },
        {
          id: removableId,
          name: '待删瓦片集',
          category: 'authored',
          asset: removableAsset,
        },
      ]),
      'assets/index.json': J({
        version: 1,
        assets: {
          'tileset.generated.starter': tilesetRecord,
          'sprite.generated.gs': spriteRecord,
          [removableAsset]: removableRecord,
        },
      }),
      'content/maps/map-001.json': J({
        version: 2,
        width: 1,
        height: 1,
        tilesetId: 'tileset-001',
        layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles: [[0], [null]] }],
        collision: [[0], [0]],
      }),
      [removablePath]: tilesetBytes,
    }
    const writes: string[] = []
    const dir = mockDir(`remove-${failure.label}`, files, writes, {
      failClose: failure.failClose,
    })
    const opened = await openLocalProject(dir)
    const session = new EditSession(
      toEditorState(opened.project, opened.scenes, {}, opened.scriptChunks, opened.stamps),
      { loadMap: (mapId) => opened.project.source.readJson(`content/maps/${mapId}.json`) },
    )
    const scan = await scanTilesetReferences({
      tilesetId: removableId,
      mapIndex: session.getState().mapIndex,
      stamps: session.getState().stamps,
      loadMap: (mapId) => session.ensureMapLoaded(mapId),
    })
    session.dispatch(
      new RemoveTilesetCommand(
        removableId,
        TilesetRemovalProof.fromScan(scan, session.getState().mapIndex),
        tilesetBytes,
      ),
    )
    const nextFiles = serializeProject(session.getState())
    const removePaths = session.getDeletedAssetPaths()

    await expect(writeProject(dir, nextFiles, { removePaths })).rejects.toThrow(
      /Injected close failure/,
    )
    await expect(openLocalProject(dir)).resolves.toBeDefined()
    expect(files[removablePath]).toBeDefined()

    writes.length = 0
    await writeProject(dir, nextFiles, { removePaths })
    expect(files[removablePath]).toBeUndefined()
    const reopened = await openLocalProject(dir)
    expect(reopened.project.tilesets.some(({ id }) => id === removableId)).toBe(false)
    expect(reopened.project.assetCatalog.assets[removableAsset]).toBeUndefined()
    expect(writes.indexOf('manifest.json')).toBeLessThan(writes.lastIndexOf('assets/index.json'))
  })

  test('删除 manifest role 资产时 manifest close 中断保留旧 catalog/字节，重试后再清理', async () => {
    const assetId = 'sound.role-test'
    const path = 'assets/authored/sounds/role-test.wav'
    const bytes = waveBytes(19)
    const current = currentProjectFiles()
    const manifest = JSON.parse(String(current['manifest.json'])) as {
      assets: { roles: Record<string, string> }
    }
    manifest.assets.roles['audio.battleItemUseSound'] = assetId
    const files: Record<string, string | ArrayBuffer> = {
      ...current,
      'manifest.json': J(manifest),
      'assets/index.json': J({
        version: 1,
        assets: {
          'tileset.generated.starter': tilesetRecord,
          'sprite.generated.gs': spriteRecord,
          [assetId]: {
            kind: 'sound',
            path,
            mediaType: 'audio/wav',
            bytes: bytes.byteLength,
            sha256: await sha256Hex(bytes),
            origin: { kind: 'authored' },
          },
        },
      }),
      [path]: bytes,
    }
    const dir = mockDir('remove-role-manifest-failure', files, [], {
      failClose: (candidate, attempt) => candidate === 'manifest.json' && attempt === 2,
    })
    const opened = await openLocalProject(dir)
    const session = new EditSession(toEditorState(opened.project, opened.scenes))
    session.dispatch(new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': undefined }))
    session.dispatch(new DeleteAssetCommand(assetId, bytes))
    const nextFiles = serializeProject(session.getState())
    const removePaths = session.getDeletedAssetPaths()

    await expect(writeProject(dir, nextFiles, { removePaths })).rejects.toThrow(
      'Injected close failure manifest.json',
    )
    const interrupted = await openLocalProject(dir)
    expect(interrupted.project.manifest.assets.roles['audio.battleItemUseSound']).toBe(assetId)
    expect(interrupted.project.assetCatalog.assets[assetId]?.path).toBe(path)
    expect(files[path]).toBeDefined()

    await writeProject(dir, nextFiles, { removePaths })
    const reopened = await openLocalProject(dir)
    expect(reopened.project.manifest.assets.roles['audio.battleItemUseSound']).toBeUndefined()
    expect(reopened.project.assetCatalog.assets[assetId]).toBeUndefined()
    expect(files[path]).toBeUndefined()
  })

  test('多文件删除中断后撤销：同一快照按成功 IO 更新，再保存会恢复已删二进制', async () => {
    const entries = [
      { id: 'sound.undo-a', path: 'assets/authored/sounds/undo-a.wav', bytes: waveBytes(21) },
      { id: 'sound.undo-b', path: 'assets/authored/sounds/undo-b.wav', bytes: waveBytes(22) },
    ]
    const files: Record<string, string | ArrayBuffer> = currentProjectFiles()
    const dir = mockDir('remove-undo-snapshot', files, [], {
      failRemove: (path, attempt) => path === entries[1]!.path && attempt === 1,
    })
    const opened = await openLocalProject(dir)
    const session = new EditSession(toEditorState(opened.project, opened.scenes))
    for (const entry of entries) {
      session.dispatch(
        new UpsertAssetCommand(
          entry.id,
          {
            kind: 'sound',
            path: entry.path,
            mediaType: 'audio/wav',
            bytes: entry.bytes.byteLength,
            sha256: await sha256Hex(entry.bytes),
            origin: { kind: 'authored' },
          },
          entry.bytes,
        ),
      )
    }
    const snapshot = await writeProject(dir, serializeProject(session.getState()))
    session.markSaved()

    for (const entry of entries) session.dispatch(new DeleteAssetCommand(entry.id, entry.bytes))
    await expect(
      writeProject(dir, serializeProject(session.getState()), {
        prevSnapshot: snapshot,
        removePaths: session.getDeletedAssetPaths(),
      }),
    ).rejects.toThrow(`Injected remove failure ${entries[1]!.path}`)
    expect(snapshot.size).toBeGreaterThan(0)
    expect(snapshot.has(entries[0]!.path)).toBe(false)
    expect(snapshot.has(entries[1]!.path)).toBe(true)
    expect(files[entries[0]!.path]).toBeUndefined()
    expect(files[entries[1]!.path]).toBeDefined()
    await expect(openLocalProject(dir)).resolves.toBeDefined()

    expect(session.undo()).toBe(true)
    expect(session.undo()).toBe(true)
    await writeProject(dir, serializeProject(session.getState()), {
      // 故意传同一个 Map：失败路径已按每个成功 IO 将它更新为真实磁盘快照。
      prevSnapshot: snapshot,
      removePaths: session.getDeletedAssetPaths(),
    })
    const reopened = await openLocalProject(dir)
    for (const entry of entries) {
      expect(reopened.project.assetCatalog.assets[entry.id]?.path).toBe(entry.path)
      expect(new Uint8Array(files[entry.path] as ArrayBuffer)).toEqual(new Uint8Array(entry.bytes))
    }
  })

  test('新导入 blob 已 close、catalog close 失败后撤销：恢复快照会清理孤儿', async () => {
    const assetId = 'sound.interrupted-import'
    const path = 'assets/authored/sounds/interrupted-import.wav'
    const bytes = waveBytes(23)
    const files: Record<string, string | ArrayBuffer> = currentProjectFiles()
    const dir = mockDir('interrupted-import-undo', files, [], {
      failClose: (candidate, attempt) => candidate === 'assets/index.json' && attempt === 1,
    })
    const opened = await openLocalProject(dir)
    const session = new EditSession(toEditorState(opened.project, opened.scenes))
    session.dispatch(
      new UpsertAssetCommand(
        assetId,
        {
          kind: 'sound',
          path,
          mediaType: 'audio/wav',
          bytes: bytes.byteLength,
          sha256: await sha256Hex(bytes),
          origin: { kind: 'authored' },
        },
        bytes,
      ),
    )
    const recoverySnapshot = new Map<string, string>()
    await expect(
      writeProject(dir, serializeProject(session.getState()), {
        prevSnapshot: recoverySnapshot,
      }),
    ).rejects.toThrow('Injected close failure assets/index.json')
    expect(files[path]).toBeDefined()
    expect(recoverySnapshot.has(path)).toBe(true)

    expect(session.undo()).toBe(true)
    await writeProject(dir, serializeProject(session.getState()), {
      prevSnapshot: recoverySnapshot,
      removePaths: session.getDeletedAssetPaths(),
    })
    expect(files[path]).toBeUndefined()
    const reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toBeUndefined()
  })

  test('mock FSA：资源替换/删除在保存后撤销，再保存重开仍恢复 catalog 与原字节', async () => {
    const assetId = 'sound.demo'
    const oldPath = 'assets/authored/old.wav'
    const nextPath = 'assets/authored/next.wav'
    const oldBytes = waveBytes(7)
    const nextBytes = waveBytes(8)
    const oldRecord = {
      kind: 'sound' as const,
      path: oldPath,
      mediaType: 'audio/wav' as const,
      bytes: oldBytes.byteLength,
      sha256: await sha256Hex(oldBytes),
      label: '原音效',
      origin: { kind: 'authored' as const },
    }
    const nextRecord = {
      ...oldRecord,
      path: nextPath,
      bytes: nextBytes.byteLength,
      sha256: await sha256Hex(nextBytes),
      label: '替换音效',
    }
    const files: Record<string, string | ArrayBuffer> = {
      ...currentProjectFiles(),
      'assets/index.json': J({
        version: 1,
        assets: {
          'tileset.generated.starter': tilesetRecord,
          'sprite.generated.gs': spriteRecord,
          [assetId]: oldRecord,
        },
      }),
      [oldPath]: oldBytes,
    }
    const dir = mockDir('asset-save-undo', files)
    const openSession = async (): Promise<EditSession> => {
      const opened = await openLocalProject(dir)
      return new EditSession(toEditorState(opened.project, opened.scenes, {}, opened.scriptChunks))
    }
    const diskBytes = (path: string): Uint8Array => new Uint8Array(files[path] as ArrayBuffer)

    const replaceSession = await openSession()
    replaceSession.dispatch(new UpsertAssetCommand(assetId, nextRecord, nextBytes, oldBytes))
    let snapshot = await writeProject(dir, serializeProject(replaceSession.getState()), {
      removePaths: replaceSession.getDeletedAssetPaths(),
    })
    replaceSession.markSaved()
    expect(files[oldPath]).toBeUndefined()
    expect(diskBytes(nextPath)).toEqual(new Uint8Array(nextBytes))

    replaceSession.undo()
    snapshot = await writeProject(dir, serializeProject(replaceSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: replaceSession.getDeletedAssetPaths(),
    })
    replaceSession.markSaved()
    expect(files[nextPath]).toBeUndefined()
    expect(diskBytes(oldPath)).toEqual(new Uint8Array(oldBytes))
    let reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toEqual(oldRecord)

    const deleteSession = new EditSession(
      toEditorState(reopened.project, reopened.scenes, {}, reopened.scriptChunks),
    )
    deleteSession.dispatch(new DeleteAssetCommand(assetId, oldBytes))
    snapshot = await writeProject(dir, serializeProject(deleteSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: deleteSession.getDeletedAssetPaths(),
    })
    deleteSession.markSaved()
    expect(files[oldPath]).toBeUndefined()
    reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toBeUndefined()

    deleteSession.undo()
    await writeProject(dir, serializeProject(deleteSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: deleteSession.getDeletedAssetPaths(),
    })
    deleteSession.markSaved()
    reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toEqual(oldRecord)
    expect(diskBytes(oldPath)).toEqual(new Uint8Array(oldBytes))
  })
})
