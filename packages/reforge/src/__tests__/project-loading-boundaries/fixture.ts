/**
 * TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 专属 fixture：隔离合成当前工程。
 *
 * 只放数据与薄构造器，不复制生产算法；全部工程数据合成，不读写真实 PAL/migrate。
 * 受测输入先过 loadCurrentProjectFrom/assembleCurrentProject 现行守卫再进入断言；
 * 坏值只坏目标轴（mapId 悬空、条件引用不闭合、装备战斗精灵悬空、入口 IO 抛错）。
 */
import type { FileSource } from '../../file-source.js'

/** 工程闭包内的固定内容路径（manifest.content 与文件表共用，避免字面量漂移）。 */
const P = {
  actors: 'content/actors.json',
  skills: 'content/skills.json',
  items: 'content/items.json',
  locale: 'content/locale.json',
  sprites: 'content/sprites.json',
  battleSprites: 'content/battle-sprites.json',
  tilesets: 'content/tilesets.json',
  maps: 'content/maps/index.json',
  sharedScripts: 'content/shared-scripts.json',
  worldVariables: 'content/world-variables.json',
  poisons: 'content/poisons.json',
  enemies: 'content/enemies.json',
  enemyTeams: 'content/enemy-teams.json',
  battleFields: 'content/battle-fields.json',
  shops: 'content/shops.json',
  ambiences: 'content/ambiences.json',
  migrationDiagnostics: 'content/migration-diagnostics.json',
} as const

export interface LbSceneOverride {
  /** 覆盖场景正文（默认为合法最小场景）。 */
  body?: Record<string, unknown>
}

export interface LbProjectOptions {
  /** 额外登记的惰性场景 id（默认只有入口场景 s001）。 */
  extraSceneIds?: string[]
  /** 逐场景正文覆盖；键为场景 id。 */
  scenes?: Record<string, LbSceneOverride | undefined>
  /** 入口场景在 scene index 中的登记路径（默认 content/scenes/s001.json）。 */
  entryScenePath?: string
  items?: unknown[]
  enemies?: unknown[]
  sharedScripts?: Record<string, unknown>
  battleSprites?: unknown[]
  /** 提供时同时登记 manifest.content.poisons 路径并写入文件表。 */
  poisons?: unknown[]
  /** 提供时同时登记 manifest.content 下列可选表路径并写入文件表。 */
  optionalTables?: {
    enemyTeams?: unknown[]
    battleFields?: unknown[]
    shops?: unknown[]
    ambiences?: unknown[]
    migrationDiagnostics?: unknown
  }
  /** 地图索引与地图文件；键为 mapId。 */
  maps?: Record<string, unknown>
  /** actors 表（默认 actor.li + actor.hero）。 */
  actors?: unknown[]
}

/** 合法 player-fighter 战斗精灵（asset 需在 catalog 登记 battle-sprite kind）。 */
export const lbBattleSprite = (id: string, asset: string): Record<string, unknown> => ({
  id,
  label: `精灵 ${id}`,
  asset,
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
    },
    castEffectBase: 0,
    attackEffectBase: 0,
  },
})

/** 合法毒定义（id 正安全整数、名称非空、curability 合法域）。 */
export const lbPoison = (id: number): Record<string, unknown> => ({
  id,
  name: `毒 ${id}`,
  curability: 'common',
  color: 1,
})

/** 合法 apply/clearActorCondition 命令（形状过 checkActorConditionCommandShape）。 */
export const lbApplyCondition = (actor: string, poisonId: number): Record<string, unknown> => ({
  kind: 'applyActorCondition',
  actor,
  condition: { kind: 'poison', poisonId },
})

export const lbClearCondition = (actor: string): Record<string, unknown> => ({
  kind: 'clearActorCondition',
  actor,
  condition: { kind: 'poisonResistance' },
})

/** 带 onEnter hooks 的合法场景正文；bodyCommands 进 stages[0].body。 */
export const lbSceneWithHookCommands = (
  id: string,
  mapId: string,
  bodyCommands: unknown[],
): Record<string, unknown> => ({
  id,
  mapId,
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
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
            stages: [{ id: 's0', body: bodyCommands }],
          },
        },
      },
    },
  },
})

/** 合法最小 ProjectMap v4（宽区分地图内容，用于稳定 id 归位判别；等距行数 = height×2）。 */
export const lbProjectMap = (width: number): Record<string, unknown> => ({
  version: 4,
  width,
  height: 1,
  tilesetRefs: ['tileset-001'],
  layers: [
    {
      id: 'floor',
      name: '地板',
      tiles: Array.from({ length: 2 }, () => Array.from({ length: width }, () => null)),
      sources: Array.from({ length: 2 }, () => Array.from({ length: width }, () => null)),
    },
  ],
  collision: Array.from({ length: 2 }, () => Array.from({ length: width }, () => 0)),
})

const lbDefaultActors = (): unknown[] => [
  {
    id: 'actor.li',
    name: 'name.li',
    spriteId: 'sprite.li',
    portraits: {
      default: 'portrait.li.default',
      expressions: { angry: 'portrait.li.angry' },
    },
  },
  {
    id: 'actor.hero',
    name: 'name.hero',
    spriteId: 'sprite.li',
    battler: {
      baseStats: {
        level: 1,
        hp: 20,
        maxHP: 20,
        mp: 5,
        maxMP: 5,
        attack: 2,
        defense: 2,
        magicAttack: 2,
        speed: 2,
        luck: 2,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: 'bs.hero',
    },
  },
]

/** 合法 item-private 使用脚本物品（use.effects 唯一 itemPrivateScript，target scene）。 */
export const lbPrivateScriptItem = (
  id: string,
  bodyCommands: unknown[],
): Record<string, unknown> => ({
  id,
  name: `item.${id}`,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: true,
  use: {
    target: 'scene',
    consuming: false,
    effects: [
      { kind: 'itemPrivateScript', script: { id: 'use', label: '使用', body: bodyCommands } },
    ],
  },
})

/** 隔离合成当前工程文件表；所有路径均在工程闭包内、全部数据合成。 */
export function lbProjectFiles(options: LbProjectOptions = {}): Record<string, unknown> {
  const entryScenePath = options.entryScenePath ?? 'content/scenes/s001.json'
  const maps = options.maps ?? { 'map-001': lbProjectMap(1) }
  const optional = options.optionalTables ?? {}
  const files: Record<string, unknown> = {
    'manifest.json': {
      id: 'demo-lb',
      name: 'Demo Loading Boundaries',
      contentVersion: 22,
      minimumSaveVersion: 11,
      defaultEntryId: 'new-game',
      entryPoints: [
        {
          id: 'new-game',
          label: '开始游戏',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      content: {
        actors: P.actors,
        scenes: 'content/scenes/',
        skills: P.skills,
        items: P.items,
        locale: P.locale,
        sprites: P.sprites,
        battleSprites: P.battleSprites,
        tilesets: P.tilesets,
        maps: P.maps,
        sharedScripts: P.sharedScripts,
        worldVariables: P.worldVariables,
        ...(options.poisons ? { poisons: P.poisons } : {}),
        ...(options.enemies ? { enemies: P.enemies } : {}),
        ...(optional.enemyTeams ? { enemyTeams: P.enemyTeams } : {}),
        ...(optional.battleFields ? { battleFields: P.battleFields } : {}),
        ...(optional.shops ? { shops: P.shops } : {}),
        ...(optional.ambiences ? { ambiences: P.ambiences } : {}),
        ...(optional.migrationDiagnostics !== undefined
          ? { migrationDiagnostics: P.migrationDiagnostics }
          : {}),
      },
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    [P.actors]: options.actors ?? lbDefaultActors(),
    'content/scenes/index.json': {
      version: 1,
      scenes: [
        { id: 's001', name: '入口场景', path: entryScenePath },
        ...(options.extraSceneIds ?? []).map((id) => ({
          id,
          name: `场景 ${id}`,
          path: `content/scenes/${id}.json`,
        })),
      ],
    },
    [P.skills]: { skills: [], levelUp: {} },
    [P.items]: options.items ?? [],
    [P.locale]: { 'name.li': '李逍遥', 'line.hello': '你好' },
    [P.sprites]: [],
    [P.battleSprites]: options.battleSprites ?? [],
    [P.tilesets]: [],
    [P.maps]: {
      version: 1,
      maps: Object.keys(maps).map((id) => ({
        id,
        name: `地图 ${id}`,
        path: `content/maps/${id}.json`,
      })),
    },
    [P.sharedScripts]: options.sharedScripts ?? {},
    [P.worldVariables]: {},
    ...(options.poisons ? { [P.poisons]: options.poisons } : {}),
    ...(options.enemies ? { [P.enemies]: options.enemies } : {}),
    ...(optional.enemyTeams ? { [P.enemyTeams]: optional.enemyTeams } : {}),
    ...(optional.battleFields ? { [P.battleFields]: optional.battleFields } : {}),
    ...(optional.shops ? { [P.shops]: optional.shops } : {}),
    ...(optional.ambiences ? { [P.ambiences]: optional.ambiences } : {}),
    ...(optional.migrationDiagnostics !== undefined
      ? { [P.migrationDiagnostics]: optional.migrationDiagnostics }
      : {}),
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
        'battle.hero': {
          kind: 'battle-sprite',
          path: 'assets/generated/battle-hero.png',
          mediaType: 'image/png',
          bytes: 4,
          sha256: 'c'.repeat(64),
          origin: { kind: 'generated' },
        },
      },
    },
  }
  files[entryScenePath] = options.scenes?.s001?.body ?? {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
  for (const id of options.extraSceneIds ?? []) {
    files[`content/scenes/${id}.json`] = options.scenes?.[id]?.body ?? {
      id,
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    }
  }
  for (const [id, body] of Object.entries(maps)) files[`content/maps/${id}.json`] = body
  return files
}

export interface LbSourceOptions {
  /** 每路径读取前等待的闸门（外部 IO 完成时序控制，不是业务 mock）。 */
  gates?: Record<string, Promise<void>>
  /** 指定路径 readJson 抛出的原始值（含非 Error 值，进入 FileSource 公开 IO 域）。 */
  throws?: Record<string, unknown>
}

/** 只读内存 FileSource：reads 记录 IO 轨迹；缺文件按生产约定抛 NotFoundError。 */
export function lbMemorySource(
  files: Record<string, unknown>,
  options: LbSourceOptions = {},
): FileSource & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    async readText(path) {
      reads.push(`text:${path}`)
      const value = files[path]
      if (value === undefined) throw new DOMException(`missing ${path}`, 'NotFoundError')
      return `${JSON.stringify(value)}\n`
    },
    async readJson<T>(path: string) {
      reads.push(`json:${path}`)
      if (options.throws?.[path] !== undefined) throw options.throws[path]
      await options.gates?.[path]
      const value = files[path]
      if (value === undefined) throw new DOMException(`missing ${path}`, 'NotFoundError')
      return structuredClone(value) as T
    },
    async readBytes(path) {
      reads.push(`bytes:${path}`)
      if (options.throws?.[path] !== undefined) throw options.throws[path]
      const value = files[path]
      if (value === undefined) throw new DOMException(`missing ${path}`, 'NotFoundError')
      return value as ArrayBuffer
    },
    async urlFor(path) {
      reads.push(`url:${path}`)
      return `blob:${path}`
    },
  }
}
