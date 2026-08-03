import {
  type AssetId,
  type BattleSpriteDef,
  type CharacterInstance,
  CONTENT_VERSION,
  checkStages,
  type Facing,
  type GridPos,
  isMapAssetId,
  legacyWorldSpriteNumberFromAsset,
  palBattleSpriteAssetId,
  palMusicAssetId,
  type SpriteDef,
  type WorldState,
} from '@type-pal/content'
import {
  SAVE_VERSION,
  type SaveMeta,
  type SavePayload,
  type SavePayloadV5,
  type SavePayloadV6,
  type SavePayloadV8,
  type SlotId,
  slotKind,
} from './types.js'

/** 队伍显示快照：名字(已解析,nameOf 注入)+ 等级。now 注入(Date.now())。 */
export function buildMeta(
  slotId: SlotId,
  world: WorldState,
  mapName: string,
  nameOf: (c: CharacterInstance) => string,
  now: number,
  savedTimes?: number, // 原版 wSavedTimes(调用方算 max(全部槽)+1 传入)
): SaveMeta {
  return {
    slotId,
    kind: slotKind(slotId),
    party: world.party.map((c) => ({ name: nameOf(c), level: c.level })),
    mapName,
    savedAt: now,
    ...(savedTimes !== undefined ? { savedTimes } : {}),
  }
}

export function buildPayload(
  world: WorldState,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
  contentVersion: number,
): SavePayload {
  return { version: LEGACY_SAVE_ENVELOPE_VERSION, projectId, contentVersion, world, position }
}

export function buildPayloadV5(
  world: import('@type-pal/content').WorldStateV5,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
): SavePayloadV5 {
  return { version: 5, projectId, contentVersion: 5, world, position }
}

export function buildPayloadV6(
  world: import('@type-pal/content').WorldStateV6,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
): SavePayloadV6 {
  return { version: 6, projectId, contentVersion: 6, world, position }
}

export function buildPayloadV8(
  world: import('@type-pal/content').WorldStateV11,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
): SavePayloadV8 {
  return { version: SAVE_VERSION, projectId, contentVersion: CONTENT_VERSION, world, position }
}

/**
 * 读档运行时归一化(GLM x-shell G10.1:曾直用 payload,引擎加字段后旧档缺字段运行时崩):
 * · version 闸:新于引擎 → 抛(宁拒不猜);旧于当前 → 逐版本升级并验证当前工程闭包。
 * · 结构补默认:引擎演进新增的**容器**字段旧档缺失 → 补空值(?? 语义,不动既有值)。
 *   只补结构不钳数值 —— 数值修复 = "旧档复原",按方针不做(新档干净即可)。
 * 在隔离副本上完成全部验证后才一次提交并返回原顶层对象；任何失败都不污染输入。
 */
export interface NormalizePayloadOptions {
  legacyMusicAsset?: (track: number) => AssetId
  legacyPortraitAsset?: (portrait: number) => AssetId | undefined
  /** 当前工程 catalog 的 portrait kind 闭包；已是 AssetId 的新档也必须验证。 */
  validatePortraitAsset?: (asset: AssetId) => void
  /** v1/v2 编外跟随者旧数字到当前工程唯一 SpriteDef.id 的显式映射。 */
  legacyFollowerSpriteId?: (spriteNum: number) => string | undefined
  /** 当前工程 SpriteDef.id 闭包；旧映射和新字符串都必须验证。 */
  validateFollowerSpriteId?: (spriteId: string) => void
  /** v1-v3 角色外观旧玩家战斗精灵号到当前工程唯一 BattleSpriteDef.id。 */
  legacyPlayerBattleSpriteId?: (spriteNum: number) => string | undefined
  /** 当前工程 player-fighter 定义闭包；旧映射和已有字符串都必须验证。 */
  validatePlayerBattleSpriteId?: (definitionId: string) => void
  /** 槽位、URL 或文件名；升级失败时必须能指向用户可处理的存档。 */
  where?: string
}

export const LEGACY_SAVE_ENVELOPE_VERSION = 4 as const

/**
 * N3-1 后仍需保留的 SAVE 1 -> ... -> 4 纯 envelope 链。
 * 它必须始终停在 v4，让 content v4 -> v5 transition 在最后一次写 5/5 前消费旧脚本字段。
 */
export function normalizePayloadV4Envelope(
  input: SavePayload,
  options: NormalizePayloadOptions = {},
): SavePayload {
  const p = structuredClone(input)
  if (p.version > LEGACY_SAVE_ENVELOPE_VERSION)
    throw new Error(
      `存档格式 v${p.version} 新于引擎旧 envelope 链支持的 v${LEGACY_SAVE_ENVELOPE_VERSION}`,
    )
  // v(n)→v(n+1) envelope 升级链挂点；content transition 不得写在这里。
  const w = p.world
  w.party ??= []
  w.money ??= 0
  w.learnedSkills ??= {}
  w.inventory ??= []
  normalizeAudioState(p, options)
  normalizeAppearancePortraits(p, options)
  normalizeAppearanceBattleSprites(p, options)
  for (const c of [...w.party, ...(w.reserve ?? [])]) {
    c.equipment ??= {}
    c.tags ??= []
    c.hiddenExp ??= {}
    c.luck ??= 0 // 后加字段(fleeRate 装备派生刀):旧档缺 → 0(装备加成仍活派生)
  }
  normalizeSceneScriptOverrides(w.script)
  validateMapOverride(w.script)
  normalizeFollowers(p, options)
  p.version = LEGACY_SAVE_ENVELOPE_VERSION
  input.version = p.version
  input.projectId = p.projectId
  input.contentVersion = p.contentVersion
  input.world = p.world
  input.position = p.position
  return input
}

/**
 * content v4 当前入口。P7 切换后，v5 读档入口改走 preflightSaveMigration +
 * normalizePayloadV5；此别名只保留给 v4 runtime 与旧 envelope 回归。
 */
export function normalizePayload(
  input: SavePayload,
  options: NormalizePayloadOptions = {},
): SavePayload {
  return normalizePayloadV4Envelope(input, options)
}

/** 旧数字只经升级边界持久映射反查定义；工程名、定义 id 与物理路径均不参与推导。 */
export function resolveLegacyFollowerSpriteId(
  spritesById: Readonly<Record<string, SpriteDef>>,
  spriteNum: number,
): string | undefined {
  if (!Number.isInteger(spriteNum) || spriteNum <= 0) return undefined
  const candidates = Object.values(spritesById).filter(
    (definition) => legacyWorldSpriteNumberFromAsset(definition.asset) === spriteNum,
  )
  if (candidates.length !== 1) return undefined
  const [candidate] = candidates
  if (!candidate) return undefined
  return candidate.layout.kind === 'directional' && candidate.layout.framesPerDir === 3
    ? candidate.id
    : undefined
}

/** 旧数字只按 player 物理通道 AssetId 反查；0 合法，共享多定义视为歧义。 */
export function resolveLegacyPlayerBattleSpriteId(
  definitionsById: Readonly<Record<string, BattleSpriteDef>>,
  spriteNum: number,
): string | undefined {
  if (!Number.isInteger(spriteNum) || spriteNum < 0) return undefined
  const asset = palBattleSpriteAssetId('player', spriteNum)
  const candidates = Object.values(definitionsById).filter(
    (definition) => definition.asset === asset,
  )
  return candidates.length === 1 ? candidates[0]?.id : undefined
}

export interface RestoredMusicDecision {
  currentMusic: AssetId | null | undefined
  action: 'play' | 'stop'
}

/** 读档不能继承读档前世界的曲目：存档值优先，其次目标场景；两者都缺省则明确停止。 */
export function resolveRestoredMusic(
  saved: AssetId | null | undefined,
  sceneDefault: AssetId | null | undefined,
): RestoredMusicDecision {
  const currentMusic = saved !== undefined ? saved : sceneDefault
  return currentMusic === undefined || currentMusic === null
    ? { currentMusic, action: 'stop' }
    : { currentMusic, action: 'play' }
}

function normalizeFollowers(p: SavePayload, options: NormalizePayloadOptions): void {
  const script = p.world.script as (WorldState['script'] & { followers?: unknown }) | undefined
  const raw = script?.followers
  if (!script || raw === undefined) return
  const where = options.where ?? `工程 ${JSON.stringify(p.projectId)} 的存档`
  const basePath = `${where}: world.script.followers`
  if (!Array.isArray(raw)) throw new Error(`${basePath}: 必须是 SpriteDef.id 数组`)
  if (raw.length > 2) throw new Error(`${basePath}: 最多允许 2 个编外跟随者，收到 ${raw.length}`)
  const hasString = raw.some((value) => typeof value === 'string')
  const hasNumber = raw.some((value) => typeof value === 'number')
  if (hasString && hasNumber) throw new Error(`${basePath}: 不允许数字与 SpriteDef.id 混合`)
  if (raw.some((value) => typeof value !== 'string' && typeof value !== 'number'))
    throw new Error(`${basePath}: 只允许 SpriteDef.id${p.version < 3 ? ' 或旧数字' : ''}`)
  if (p.version >= 3 && hasNumber)
    throw new Error(`${basePath}: v${p.version} 只允许 SpriteDef.id，拒绝数字`)

  const planned: string[] = []
  raw.forEach((value, index) => {
    const path = `${basePath}[${index}]`
    let spriteId: string | undefined
    if (typeof value === 'string') {
      if (!value) throw new Error(`${path}: SpriteDef.id 不能为空`)
      spriteId = value
    } else {
      if (!Number.isInteger(value) || value < 0)
        throw new Error(`${path}: 旧精灵号必须是非负整数，收到 ${String(value)}`)
      if (value === 0) return
      if (!options.legacyFollowerSpriteId)
        throw new Error(`${path}: 数字精灵 ${value} 无 SpriteDef.id 转换规则，拒绝猜测`)
      spriteId = options.legacyFollowerSpriteId(value)
      if (!spriteId)
        throw new Error(`${path}: 数字精灵 ${value} 在当前工程中缺少唯一 SpriteDef.id 映射`)
    }
    try {
      options.validateFollowerSpriteId?.(spriteId)
    } catch (cause) {
      throw new Error(
        `${path}: SpriteDef.id "${spriteId}" 在当前工程中不可用；${cause instanceof Error ? cause.message : String(cause)}`,
      )
    }
    planned.push(spriteId)
  })

  if (planned.length) script.followers = planned
  else delete script.followers
}

function normalizeAppearancePortraits(p: SavePayload, options: NormalizePayloadOptions): void {
  const where = options.where ?? `工程 ${JSON.stringify(p.projectId)} 的存档`
  const resolve = options.legacyPortraitAsset
  for (const [collection, characters] of [
    ['party', p.world.party ?? []],
    ['reserve', p.world.reserve ?? []],
  ] as const) {
    characters.forEach((character, index) => {
      const appearance = character.appearance as
        | { spriteId?: string; portrait?: unknown; battleSprite?: unknown }
        | undefined
      const raw = appearance?.portrait
      if (!appearance || raw === undefined) return
      const path = `${where}: world.${collection}[${index}].appearance.portrait`
      if (typeof raw === 'string') {
        if (raw.length === 0) throw new Error(`${path}: AssetId 不能为空`)
        try {
          options.validatePortraitAsset?.(raw)
        } catch (cause) {
          throw new Error(
            `${path}: AssetId "${raw}" 在当前工程中不可用；${cause instanceof Error ? cause.message : String(cause)}`,
          )
        }
        return
      }
      if (!Number.isInteger(raw) || (raw as number) < 0)
        throw new Error(`${path}: 旧立绘号必须是非负整数，收到 ${String(raw)}`)
      if (raw === 0) delete appearance.portrait
      else {
        if (!resolve) throw new Error(`${path}: 数字立绘 ${raw} 无 AssetId 转换规则，拒绝猜测`)
        const asset = resolve(raw as number)
        if (!asset) throw new Error(`${path}: 数字立绘 ${raw} 在当前工程中缺少唯一 AssetId 映射`)
        try {
          options.validatePortraitAsset?.(asset)
        } catch (cause) {
          throw new Error(
            `${path}: 数字立绘 ${raw} 映射到 "${asset}"，但当前工程不可用；${cause instanceof Error ? cause.message : String(cause)}`,
          )
        }
        appearance.portrait = asset
      }
      if (appearance && Object.keys(appearance).length === 0) delete character.appearance
    })
  }
}

function normalizeAppearanceBattleSprites(p: SavePayload, options: NormalizePayloadOptions): void {
  const where = options.where ?? `工程 ${JSON.stringify(p.projectId)} 的存档`
  const entries: Array<{
    appearance: { battleSprite?: unknown }
    raw: unknown
    path: string
  }> = []
  for (const [collection, characters] of [
    ['party', p.world.party ?? []],
    ['reserve', p.world.reserve ?? []],
  ] as const) {
    characters.forEach((character, index) => {
      const appearance = character.appearance as { battleSprite?: unknown } | undefined
      if (!appearance || appearance.battleSprite === undefined) return
      entries.push({
        appearance,
        raw: appearance.battleSprite,
        path: `${where}: world.${collection}[${index}].appearance.battleSprite`,
      })
    })
  }
  const hasString = entries.some(({ raw }) => typeof raw === 'string')
  const hasNumber = entries.some(({ raw }) => typeof raw === 'number')
  if (hasString && hasNumber)
    throw new Error(`${where}: world party/reserve 的 battleSprite 不允许数字与定义 id 混合`)
  const invalid = entries.find(({ raw }) => typeof raw !== 'string' && typeof raw !== 'number')
  if (invalid)
    throw new Error(`${invalid.path}: 只允许 BattleSpriteDef.id${p.version < 4 ? ' 或旧数字' : ''}`)
  if (p.version >= 4 && hasNumber) {
    const numeric = entries.find(({ raw }) => typeof raw === 'number')
    if (!numeric) throw new Error(`${where}: 数字 battleSprite 扫描状态不一致`)
    throw new Error(`${numeric.path}: v${p.version} 只允许 BattleSpriteDef.id，拒绝数字`)
  }

  const planned = entries.map(({ raw, path }) => {
    let definitionId: string | undefined
    if (typeof raw === 'string') {
      if (!raw) throw new Error(`${path}: BattleSpriteDef.id 不能为空`)
      definitionId = raw
    } else {
      if (!Number.isInteger(raw) || (raw as number) < 0)
        throw new Error(`${path}: 旧玩家战斗精灵号必须是非负整数，收到 ${String(raw)}`)
      if (!options.legacyPlayerBattleSpriteId)
        throw new Error(`${path}: 数字战斗精灵 ${String(raw)} 无定义 id 转换规则，拒绝猜测`)
      definitionId = options.legacyPlayerBattleSpriteId(raw as number)
      if (!definitionId)
        throw new Error(
          `${path}: 数字战斗精灵 ${String(raw)} 在当前工程中缺少唯一 BattleSpriteDef.id 映射`,
        )
    }
    if (!options.validatePlayerBattleSpriteId)
      throw new Error(`${path}: 缺少当前工程 player-fighter 定义闭包，拒绝未验证的 id`)
    try {
      options.validatePlayerBattleSpriteId(definitionId)
    } catch (cause) {
      throw new Error(
        `${path}: BattleSpriteDef.id "${definitionId}" 在当前工程中不可用；${cause instanceof Error ? cause.message : String(cause)}`,
      )
    }
    return definitionId
  })
  entries.forEach((entry, index) => {
    entry.appearance.battleSprite = planned[index]
  })
}

function normalizeAudioState(p: SavePayload, options: NormalizePayloadOptions): void {
  const world = p.world as WorldState & { audio?: { currentMusic?: AssetId | number | null } }
  const vars = world.script?.vars as Record<string, unknown> | undefined
  const legacy = vars?.['sys:music']
  const current = world.audio?.currentMusic
  const raw = current === undefined ? legacy : current
  if (raw !== undefined) {
    world.audio ??= {}
    if (raw === null || (typeof raw === 'number' && raw <= 0)) world.audio.currentMusic = null
    else if (typeof raw === 'string') world.audio.currentMusic = raw
    else if (typeof raw === 'number') {
      const convert =
        options.legacyMusicAsset ?? (p.projectId === 'pal' ? palMusicAssetId : undefined)
      if (!convert)
        throw new Error(
          `旧存档工程 "${p.projectId}" 的数字音乐 ${raw} 无 AssetId 转换规则，拒绝猜测`,
        )
      world.audio.currentMusic = convert(raw)
    } else throw new Error(`存档 world.audio.currentMusic 类型非法:${String(raw)}`)
  }
  if (vars) delete vars['sys:music']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateRuntimeScriptBinding(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    checkStages(value, path)
    return
  }
  if (
    !isRecord(value) ||
    typeof value.chunk !== 'string' ||
    value.chunk.length === 0 ||
    typeof value.id !== 'string' ||
    value.id.length === 0
  )
    throw new Error(`${path} 必须是 ScriptStage[]、{chunk,id} ScriptRef 或 null`)
}

function normalizeSceneScriptOverrides(script: WorldState['script']): void {
  if (!script) return
  const raw = script as unknown as Record<string, unknown>
  const legacy = raw.onTeleport
  const rawOverrides = raw.sceneScriptOverrides
  if (rawOverrides !== undefined && !isRecord(rawOverrides))
    throw new Error('存档 world.script.sceneScriptOverrides 必须是“场景 ID → 脚本覆写”对象')
  let overrides: Record<string, unknown> | undefined = rawOverrides

  if (legacy !== undefined) {
    if (!isRecord(legacy))
      throw new Error('旧存档 world.script.onTeleport 必须是“场景 ID → 脚本绑定”对象')
    if (overrides === undefined) {
      overrides = {}
      raw.sceneScriptOverrides = overrides
    }
    for (const [sceneId, binding] of Object.entries(legacy)) {
      validateRuntimeScriptBinding(binding, `旧存档 world.script.onTeleport[${sceneId}]`)
      const existing = overrides[sceneId]
      if (existing !== undefined && !isRecord(existing))
        throw new Error(`存档 world.script.sceneScriptOverrides[${sceneId}] 必须是对象`)
      if (isRecord(existing) && Object.hasOwn(existing, 'onTeleport'))
        throw new Error(`旧存档 ${sceneId} 同时存在 onTeleport 旧字段与新覆写,拒绝猜测合并`)
      const target: Record<string, unknown> = existing ?? {}
      target.onTeleport = binding
      overrides[sceneId] = target
    }
    delete raw.onTeleport
  }

  if (overrides === undefined) return
  for (const [sceneId, override] of Object.entries(overrides)) {
    if (!isRecord(override))
      throw new Error(`存档 world.script.sceneScriptOverrides[${sceneId}] 必须是对象`)
    for (const key of Object.keys(override))
      if (key !== 'onEnter' && key !== 'onTeleport')
        throw new Error(
          `存档 world.script.sceneScriptOverrides[${sceneId}] 含未知槽 ${key};只允许 onEnter/onTeleport`,
        )
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      if (!Object.hasOwn(override, slot) || override[slot] === null) continue
      validateRuntimeScriptBinding(
        override[slot],
        `存档 world.script.sceneScriptOverrides[${sceneId}].${slot}`,
      )
    }
  }
}

function validateMapOverride(script: WorldState['script']): void {
  const mapOverride = (script as { mapOverride?: unknown } | undefined)?.mapOverride
  if (mapOverride === undefined) return
  if (typeof mapOverride !== 'object' || mapOverride === null || Array.isArray(mapOverride))
    throw new Error('存档 world.script.mapOverride 必须是“场景 ID → 稳定地图 ID”对象')
  for (const [sceneId, mapId] of Object.entries(mapOverride)) {
    if (typeof mapId === 'number')
      throw new Error(
        `旧存档 world.script.mapOverride[${sceneId}] 使用数字地图编号 ${mapId}，无法安全转换为新版稳定地图 ID`,
      )
    if (!isMapAssetId(mapId))
      throw new Error(
        `存档 world.script.mapOverride[${sceneId}] 不是合法稳定地图 ID：${String(mapId)}`,
      )
  }
}

/** 截当前画面 → 缩到 w×h → PNG Blob(浏览器;离屏 canvas)。source 应为干净游戏帧(无 UI 层)。 */
export function captureThumbnail(source: HTMLCanvasElement, w = 64, h = 40): Promise<Blob> {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const c = off.getContext('2d')
  if (!c) return Promise.reject(new Error('thumbnail: no 2d context'))
  c.imageSmoothingEnabled = true
  c.drawImage(source, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error('thumbnail: toBlob null'))), 'image/png')
  })
}
