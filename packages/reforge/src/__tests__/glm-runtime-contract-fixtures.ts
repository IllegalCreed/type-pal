/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 test-only fixture：五组共用的小数据/deferred/保真快照/记录宿主。
 * 只放数据与薄构造器，不复制生产算法/遍历器；不被生产导入。
 * 受测值先过对应现行守卫（buildWorld/checkRuntimeCommands/loadCurrentProjectFrom 等）再进入断言。
 */
import type {
  ActorDef,
  ItemData,
  ItemDataMap,
  StartWorld,
  WorldItemUseOutcome,
  WorldState,
} from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import type { FileSource } from '../file-source.js'

/** 保真深拷贝（不经 JSON 往返；保留 undefined/typed array 语义）。 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  if (node instanceof Map) return new Map([...node].map(([k, v]) => [clone(k), clone(v)]))
  if (node instanceof Set) return new Set([...node].map(clone))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

/** 手工控制的异步完成信号（不用固定 sleep 驱动时序）。 */
export function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
  settled: () => boolean
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  let done = false
  const promise = new Promise<T>((res, rej) => {
    resolve = (value) => {
      done = true
      res(value)
    }
    reject = (error) => {
      done = true
      rej(error)
    }
  })
  return { promise, resolve, reject, settled: () => done }
}

// ── B 组：两角色多物品的合法世界 ───────────────────────────────────────

const actorA: ActorDef = {
  id: 'hero-a',
  name: 'name.hero-a',
  spriteId: 'sprite.hero-a',
  battler: {
    baseStats: {
      level: 1,
      hp: 100,
      maxHP: 100,
      mp: 50,
      maxMP: 50,
      attack: 10,
      defense: 10,
      magicAttack: 10,
      speed: 10,
      luck: 5,
    },
    initialEquipment: { weapon: 'w-old' },
    initialMagic: [],
    battleSprite: 'bs-a',
  },
}

const actorB: ActorDef = {
  id: 'hero-b',
  name: 'name.hero-b',
  spriteId: 'sprite.hero-b',
  battler: {
    baseStats: {
      level: 1,
      hp: 80,
      maxHP: 80,
      mp: 40,
      maxMP: 40,
      attack: 8,
      defense: 8,
      magicAttack: 8,
      speed: 8,
      luck: 5,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'bs-b',
  },
}

const equippable = (
  id: string,
  slot: 'weapon' | 'accessory',
  equipableBy: string[],
): ItemData => ({
  id,
  name: `item.${id}`,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: true,
  equip: { slot, equipableBy, effects: [] },
})

const usable = (id: string, consuming = true): ItemData => ({
  id,
  name: `item.${id}`,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: true,
  use: { target: 'oneAlly', consuming, effects: [{ kind: 'healHp', amount: 10 }] },
})

/** 背包：5 件可装备（hero-a 4 + hero-b 1）+ 5 件可用 + 1 件不可用。 */
export const multiItems = (): ItemDataMap => ({
  'w-1': equippable('w-1', 'weapon', ['hero-a']),
  'w-2': equippable('w-2', 'weapon', ['hero-a']),
  'w-3': equippable('w-3', 'weapon', ['hero-a']),
  'a-1': equippable('a-1', 'accessory', ['hero-a']),
  'b-1': equippable('b-1', 'weapon', ['hero-b']),
  'u-1': usable('u-1'),
  'u-2': usable('u-2'),
  'u-3': usable('u-3'),
  'u-4': usable('u-4'),
  'u-5': usable('u-5'),
  'plain-1': {
    id: 'plain-1',
    name: 'item.plain-1',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
  },
})

export const multiWorld = (): WorldState => {
  const start: StartWorld = {
    party: ['hero-a', 'hero-b'],
    money: 0,
    inventory: [
      { itemId: 'w-1', count: 1 },
      { itemId: 'w-2', count: 1 },
      { itemId: 'w-3', count: 1 },
      { itemId: 'a-1', count: 1 },
      { itemId: 'b-1', count: 1 },
      { itemId: 'u-1', count: 3 },
      { itemId: 'u-2', count: 1 },
      { itemId: 'u-3', count: 1 },
      { itemId: 'u-4', count: 1 },
      { itemId: 'u-5', count: 1 },
      { itemId: 'plain-1', count: 1 },
    ],
    seedStats: { 'hero-a': { hp: 50, mp: 20 }, 'hero-b': { hp: 40, mp: 10 } },
  }
  return buildWorld(start, { 'hero-a': actorA, 'hero-b': actorB })
}

/** 构造合法 use 结果（成功 keep/close 或失败）。 */
export const useOutcome = (
  world: WorldState,
  over: Partial<WorldItemUseOutcome> = {},
): WorldItemUseOutcome => ({
  status: 'success',
  world,
  consumed: false,
  changed: false,
  effectResults: [],
  presentations: [],
  menu: 'keep',
  ...over,
})

// ── D 组：合法当前工程文件表（经 loadCurrentProjectFrom 守卫） ──────────

const dScene = (id: string) => ({
  id,
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
})

const dActors = [
  {
    id: 'actor.li',
    name: 'name.li',
    spriteId: 'sprite.li',
    portraits: {
      default: 'portrait.li.default',
      expressions: { angry: 'portrait.li.angry' },
    },
  },
]

const dDialogSceneBody = {
  id: 's-dlg',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
  hooks: {
    onEnter: {
      variants: {
        main: {
          label: '进场',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 's0',
            stages: [
              {
                id: 's0',
                body: [
                  {
                    kind: 'dialog',
                    cue: {
                      identity: {
                        kind: 'actor',
                        actor: 'actor.li',
                        portrait: { kind: 'expression', expression: 'angry', side: 'left' },
                      },
                      rows: [{ text: 'line.hello' }],
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
}

export interface DProjectOptions {
  sceneIds?: string[]
  withStamps?: boolean
  dialogScene?: boolean
}

/** 多场景合法当前工程文件表（sceneIds 控制索引/文件集）。 */
export function dProjectFiles(options: DProjectOptions = {}): Record<string, unknown> {
  const sceneIds = options.sceneIds ?? ['s001', 's002', 's003']
  const dialogScene = options.dialogScene ?? false
  const files: Record<string, unknown> = {
    'manifest.json': {
      id: 'demo-d',
      name: 'Demo D',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'new-game',
      entryPoints: [
        {
          id: 'new-game',
          label: '开始游戏',
          scene: sceneIds[0],
          startWorld: { party: [], money: 0, inventory: [] },
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
        ...(options.withStamps ? { stamps: 'content/stamps.json' } : {}),
      },
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    'content/actors.json': dActors,
    'content/scenes/index.json': {
      version: 1,
      scenes: sceneIds.map((id) => ({
        id,
        name: `场景 ${id}`,
        path: `content/scenes/${id}.json`,
      })),
    },
    'content/skills.json': { skills: [], levelUp: {} },
    'content/items.json': [],
    'content/locale.json': { 'name.li': '李逍遥', 'line.hello': '你好' },
    'content/sprites.json': [],
    'content/battle-sprites.json': [],
    'content/tilesets.json': [],
    'content/maps/index.json': {
      version: 1,
      maps: [{ id: 'map-001', name: '地图', path: 'content/maps/map-001.json' }],
    },
    'content/shared-scripts.json': {},
    'content/world-variables.json': {},
    'assets/index.json': {
      version: 1,
      assets: {
        'portrait.li.default': {
          kind: 'portrait',
          path: 'assets/authored/portrait-default.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
        'portrait.li.angry': {
          kind: 'portrait',
          path: 'assets/authored/portrait-angry.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'b'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
  }
  for (const id of sceneIds) {
    files[`content/scenes/${id}.json`] =
      dialogScene && id === 's001' ? deepSnapshot(dDialogSceneBody) : dScene(id)
  }
  return files
}

/** 合法极小 stamp 模板文件（数组形态；过 content validateStampTemplates）。 */
export const dStampFile = (): unknown => [
  {
    id: 'sign-1',
    name: '木牌',
    category: 'prop',
    origin: 'authored',
    anchor: { row: 0, col: 0 },
    width: 1,
    height: 1,
    tilesetRefs: ['tiles-main'],
    layers: [{ id: 'base', name: '底', tiles: [[1]], sources: [[0]] }],
    collision: [[null]],
  },
]

/** 只读内存 FileSource（拒绝未预期写路径；可注入每路径失败）。 */
export function memoryFileSource(
  files: Record<string, unknown>,
  failPath?: string,
): FileSource & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    async readText(path) {
      reads.push(`text:${path}`)
      if (path === failPath) throw new Error(`boom-text:${path}`)
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return `${JSON.stringify(value)}\n`
    },
    async readJson<T>(path: string) {
      reads.push(`json:${path}`)
      if (path === failPath) throw new Error(`boom-json:${path}`)
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return structuredClone(value) as T
    },
    async readBytes(path) {
      reads.push(`bytes:${path}`)
      if (path === failPath) throw new Error(`boom-bytes:${path}`)
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return value as ArrayBuffer
    },
    async urlFor(path) {
      reads.push(`url:${path}`)
      if (path === failPath) throw new Error(`boom-url:${path}`)
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return `blob:${path}`
    },
  }
}

/** AssetResolver 用最小 catalog（sprite + music + video 各一）。 */
export const dAssetCatalog = (): {
  version: 1
  assets: Record<string, object>
} => ({
  version: 1,
  assets: {
    'sprite.x': {
      kind: 'sprite',
      path: 'assets/generated/sprite-x.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: 'a'.repeat(64),
      origin: { kind: 'generated' },
      label: 'sprite x',
    },
    'music.m1': {
      kind: 'music',
      path: 'assets/generated/music-m1.mid',
      mediaType: 'audio/midi',
      bytes: 8,
      sha256: 'b'.repeat(64),
      origin: { kind: 'generated' },
      label: 'music m1',
    },
    'video.v1': {
      kind: 'video',
      path: 'assets/generated/video-v1.mp4',
      mediaType: 'video/mp4',
      bytes: 16,
      sha256: 'c'.repeat(64),
      origin: { kind: 'generated' },
      label: 'video v1',
    },
  },
})
