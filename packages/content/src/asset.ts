import type { ActorDef } from './actor.js'
import type { BattleSpriteDef } from './battle-sprite.js'
import type { EntryPoint, WorldState } from './character.js'
import type { BattleFieldDef, EnemyDef } from './enemy.js'
import type { SceneDef } from './index.js'
import type { ItemData } from './item.js'
import type { ScriptChunkV1 } from './script-library.js'
import type { SkillData } from './skill.js'
import type { SpriteDef } from './sprite.js'
import type { TilesetDef } from './tileset.js'

export type AssetId = string

export const ASSET_KINDS = [
  'music',
  'sound',
  'soundfont',
  'tileset',
  'sprite',
  'battle-sprite',
  'effect-sprite',
  'portrait',
  'face',
  'item-icon',
  'battle-background',
  'video',
  'frame-animation',
  'color-table',
] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const ASSET_ROLES = [
  'audio.midiSoundfont',
  'audio.defaultBattleMusic',
  'audio.bossVictoryMusic',
  'audio.normalVictoryMusic',
  'audio.openingMenuMusic',
  'audio.battleItemUseSound',
  'audio.battleCoopCastSound',
  'audio.battleEscapeSound',
  'audio.battleEnemyTransformSound',
  'video.startupTrademark',
  'video.startupSplash',
  'visual.standardColorTable',
] as const
export type AssetRole = (typeof ASSET_ROLES)[number]

export const AUDIO_ASSET_ROLES = {
  'audio.midiSoundfont': 'soundfont',
  'audio.defaultBattleMusic': 'music',
  'audio.bossVictoryMusic': 'music',
  'audio.normalVictoryMusic': 'music',
  'audio.openingMenuMusic': 'music',
} as const satisfies Partial<Record<AssetRole, AssetKind>>
export type AudioAssetRole = keyof typeof AUDIO_ASSET_ROLES

/** 可选的全局战斗提示音；与必填的音乐切片角色分开校验。 */
export const SOUND_ASSET_ROLES = {
  'audio.battleItemUseSound': 'sound',
  'audio.battleCoopCastSound': 'sound',
  'audio.battleEscapeSound': 'sound',
  'audio.battleEnemyTransformSound': 'sound',
} as const satisfies Partial<Record<AssetRole, AssetKind>>
export type SoundAssetRole = keyof typeof SOUND_ASSET_ROLES

export const ASSET_ROLE_KINDS = {
  ...AUDIO_ASSET_ROLES,
  ...SOUND_ASSET_ROLES,
  'video.startupTrademark': 'video',
  'video.startupSplash': 'video',
  'visual.standardColorTable': 'color-table',
} as const satisfies Record<AssetRole, AssetKind>

export type AssetOriginKind = 'legacy-migrated' | 'authored' | 'generated' | 'licensed'

export interface AssetRecordV1 {
  kind: AssetKind
  /** 当前工程根下的规范相对路径；AssetId 不得用来推导此路径。 */
  path: string
  mediaType: string
  bytes: number
  sha256: string
  label?: string
  origin: { kind: AssetOriginKind; ref?: string }
}

export interface AssetCatalogV1 {
  version: 1
  assets: Record<AssetId, AssetRecordV1>
}

export const LEGACY_ASSET_FAMILIES = [
  'music',
  'soundfont',
  'sound',
  'tileset',
  'sprite',
  'battle-sprite',
  'effect-sprite',
  'portrait',
  'face',
  'item-icon',
  'battle-background',
  'rng',
  'video',
  'color-table',
  'image',
] as const
export type LegacyAssetFamily = (typeof LEGACY_ASSET_FAMILIES)[number]

/** contentVersion 3 的迁移债务区；只有 LegacyAssetAdapter 可以解释这些旧目录。 */
export interface LegacyAssetConfigV3 {
  families: LegacyAssetFamily[]
  root?: string
  tilesets?: string
  sprites?: string
  palettes?: string
  sounds?: string
  portraits?: string
  faces?: string
  itemIcons?: string
  images?: string
  rng?: string
  videos?: string
}

export interface ManifestAssetConfigV3 {
  catalog: string
  roles: Partial<Record<AssetRole, AssetId>>
  legacy?: LegacyAssetConfigV3
}

const kindSet = new Set<string>(ASSET_KINDS)
const roleSet = new Set<string>(ASSET_ROLES)
const legacyFamilySet = new Set<string>(LEGACY_ASSET_FAMILIES)
const originSet = new Set<string>(['legacy-migrated', 'authored', 'generated', 'licensed'])

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

/**
 * 返回原值或 fail-loud。注册表和 FileSource 共用这一条路径边界，禁止隐式规范化。
 */
export function validateProjectRelativePath(path: string, where = '资源路径'): string {
  if (typeof path !== 'string' || path.length === 0) throw new Error(`${where}: 路径不能为空`)
  if (path.includes('\0')) throw new Error(`${where}: 路径包含 NUL`)
  if (path.startsWith('/')) throw new Error(`${where}: 禁止绝对路径 "${path}"`)
  if (/^[A-Za-z]:/.test(path)) throw new Error(`${where}: 禁止盘符路径 "${path}"`)
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) throw new Error(`${where}: 禁止 URL scheme "${path}"`)
  if (path.includes('\\')) throw new Error(`${where}: 禁止反斜杠 "${path}"`)
  if (path.includes('?') || path.includes('#'))
    throw new Error(`${where}: 禁止 query/fragment "${path}"`)
  const segments = path.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
    throw new Error(`${where}: 禁止空段、. 或 .. "${path}"`)
  return path
}

export function validateAssetCatalog(value: unknown, where = 'assets/index.json'): AssetCatalogV1 {
  const root = objectAt(value, where)
  if (root.version !== 1) throw new Error(`${where}.version: 期望 1`)
  const assets = objectAt(root.assets, `${where}.assets`)
  for (const [id, raw] of Object.entries(assets)) {
    if (id.trim().length === 0) throw new Error(`${where}.assets: AssetId 不能为空`)
    const record = objectAt(raw, `${where}.assets[${JSON.stringify(id)}]`)
    if (typeof record.kind !== 'string' || !kindSet.has(record.kind))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].kind: 非法 AssetKind`)
    validateProjectRelativePath(
      record.path as string,
      `${where}.assets[${JSON.stringify(id)}].path`,
    )
    if (typeof record.mediaType !== 'string' || record.mediaType.trim().length === 0)
      throw new Error(`${where}.assets[${JSON.stringify(id)}].mediaType: 期望非空字符串`)
    if (!Number.isInteger(record.bytes) || (record.bytes as number) < 0)
      throw new Error(`${where}.assets[${JSON.stringify(id)}].bytes: 期望非负整数`)
    if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].sha256: 期望 64 位小写十六进制`)
    if (record.label !== undefined && typeof record.label !== 'string')
      throw new Error(`${where}.assets[${JSON.stringify(id)}].label: 期望字符串`)
    const origin = objectAt(record.origin, `${where}.assets[${JSON.stringify(id)}].origin`)
    if (typeof origin.kind !== 'string' || !originSet.has(origin.kind))
      throw new Error(`${where}.assets[${JSON.stringify(id)}].origin.kind: 非法来源`)
    if (origin.ref !== undefined && typeof origin.ref !== 'string')
      throw new Error(`${where}.assets[${JSON.stringify(id)}].origin.ref: 期望字符串`)
    const ownedPrefix: Partial<Record<AssetOriginKind, string>> = {
      'legacy-migrated': 'assets/migrated/',
      authored: 'assets/authored/',
      generated: 'assets/generated/',
      licensed: 'assets/runtime/',
    }
    const expectedPrefix = ownedPrefix[origin.kind as AssetOriginKind]
    if (expectedPrefix && !(record.path as string).startsWith(expectedPrefix))
      throw new Error(
        `${where}.assets[${JSON.stringify(id)}].path: ${String(origin.kind)} 资源必须位于 ${expectedPrefix}`,
      )
  }
  return value as AssetCatalogV1
}

function familyForKind(kind: AssetKind): LegacyAssetFamily {
  return kind === 'frame-animation' ? 'rng' : kind
}

export function validateManifestAssetConfigV3(
  value: unknown,
  catalog?: AssetCatalogV1,
  where = 'manifest.assets',
): ManifestAssetConfigV3 {
  const assets = objectAt(value, where)
  if ('ui' in assets)
    throw new Error(
      `${where}.ui: 旧工程 UI 主题没有可安全升级的 slot 契约；请备份并移除该自定义后重开`,
    )
  validateProjectRelativePath(assets.catalog as string, `${where}.catalog`)
  const roles = objectAt(assets.roles, `${where}.roles`)
  for (const [role, id] of Object.entries(roles)) {
    if (!roleSet.has(role)) throw new Error(`${where}.roles.${role}: 未知资源角色`)
    if (typeof id !== 'string' || id.length === 0)
      throw new Error(`${where}.roles.${role}: 期望非空 AssetId`)
  }

  let families: LegacyAssetFamily[] = []
  if (assets.legacy !== undefined) {
    const legacy = objectAt(assets.legacy, `${where}.legacy`)
    if ('ui' in legacy)
      throw new Error(
        `${where}.legacy.ui: 旧工程 UI 主题没有可安全升级的 slot 契约；请备份并移除该自定义后重开`,
      )
    if (!Array.isArray(legacy.families)) throw new Error(`${where}.legacy.families: 期望数组`)
    families = legacy.families.map((family, index) => {
      if (typeof family !== 'string' || !legacyFamilySet.has(family))
        throw new Error(`${where}.legacy.families[${index}]: 未知 legacy family`)
      return family as LegacyAssetFamily
    })
    if (new Set(families).size !== families.length)
      throw new Error(`${where}.legacy.families: 不允许重复 family`)
  }

  if (catalog) {
    const entries = Object.entries(catalog.assets)
    const catalogFamilies = new Set(entries.map(([, record]) => familyForKind(record.kind)))
    for (const family of families) {
      if (catalogFamilies.has(family))
        throw new Error(`${where}: 资源族 "${family}" 同时出现在 catalog 与 legacy`)
    }

    const hasAudio = entries.some(
      ([, record]) => record.kind === 'music' || record.kind === 'soundfont',
    )
    if (hasAudio) {
      for (const role of Object.keys(AUDIO_ASSET_ROLES) as AudioAssetRole[]) {
        if (!(role in roles)) throw new Error(`${where}.roles: 音乐切片缺角色 "${role}"`)
      }
    }
    for (const role of ASSET_ROLES) {
      const id = roles[role]
      if (id === undefined) continue
      const record = catalog.assets[id as string]
      if (!record) throw new Error(`${where}.roles.${role}: AssetId "${String(id)}" 不存在`)
      const expected = ASSET_ROLE_KINDS[role]
      if (record.kind !== expected)
        throw new Error(`${where}.roles.${role}: 期望 ${expected}，实际 ${record.kind}`)
    }
  }
  return value as ManifestAssetConfigV3
}

export function palMusicAssetId(track: number): AssetId {
  if (!Number.isInteger(track) || track <= 0)
    throw new Error(`PAL 音乐号必须是正整数，收到 ${String(track)}`)
  return `music.pal.${String(track).padStart(3, '0')}`
}

export function palSoundAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk <= 0)
    throw new Error(`PAL 音效号必须是正整数，收到 ${String(chunk)}`)
  return `sound.pal.${String(chunk).padStart(3, '0')}`
}

export function palVideoAssetId(video: number): AssetId {
  if (!Number.isInteger(video) || video <= 0)
    throw new Error(`PAL 视频号必须是正整数，收到 ${String(video)}`)
  return `video.pal.${String(video).padStart(3, '0')}`
}

export function palFrameAnimationAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk < 0)
    throw new Error(`PAL 帧动画号必须是非负整数，收到 ${String(chunk)}`)
  return `frame-animation.pal.${String(chunk).padStart(3, '0')}`
}

export function palPortraitAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk <= 0)
    throw new Error(`PAL 立绘号必须是正整数，收到 ${String(chunk)}`)
  return `portrait.pal.${String(chunk).padStart(3, '0')}`
}

/** 旧 PAL 的 0 是“无立绘”，只允许在升级边界被消解。 */
export function legacyPalPortraitAssetId(chunk: number): AssetId | undefined {
  if (!Number.isInteger(chunk) || chunk < 0)
    throw new Error(`旧 PAL 立绘号必须是非负整数，收到 ${String(chunk)}`)
  return chunk === 0 ? undefined : palPortraitAssetId(chunk)
}

export function palFaceAssetId(actorId: string): AssetId {
  if (typeof actorId !== 'string' || actorId.length === 0 || actorId.trim() !== actorId)
    throw new Error(`PAL 角色 id 必须是无首尾空白的非空字符串，收到 ${JSON.stringify(actorId)}`)
  return `face.pal.${actorId}`
}

export function palItemIconAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk <= 0)
    throw new Error(`PAL 物品图标号必须是正整数，收到 ${String(chunk)}`)
  return `item-icon.pal.${String(chunk).padStart(3, '0')}`
}

export function palBattleBackgroundAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk < 0)
    throw new Error(`PAL 战场背景号必须是非负整数，收到 ${String(chunk)}`)
  return `battle-background.pal.${String(chunk).padStart(3, '0')}`
}

export function palTilesetAssetId(mapNum: number): AssetId {
  if (!Number.isInteger(mapNum) || mapNum <= 0)
    throw new Error(`PAL 瓦片集号必须是正整数，收到 ${String(mapNum)}`)
  return `tileset.pal.${String(mapNum).padStart(3, '0')}`
}

export function palSpriteAssetId(spriteNum: number): AssetId {
  if (!Number.isInteger(spriteNum) || spriteNum <= 0)
    throw new Error(`PAL 大世界精灵号必须是正整数，收到 ${String(spriteNum)}`)
  return `sprite.pal.${String(spriteNum).padStart(3, '0')}`
}

export type PalBattleSpriteChannel = 'player' | 'enemy'

/** PAL 战斗精灵的物理 AssetId；player 0 合法，channel 是身份的一部分。 */
export function palBattleSpriteAssetId(
  channel: PalBattleSpriteChannel,
  spriteNum: number,
): AssetId {
  const minimum = channel === 'player' ? 0 : 1
  if (!Number.isInteger(spriteNum) || spriteNum < minimum)
    throw new Error(
      `PAL ${channel} 战斗精灵号必须是 ${minimum === 0 ? '非负' : '正'}整数，收到 ${String(spriteNum)}`,
    )
  return `battle-sprite.pal.${channel}.${String(spriteNum).padStart(3, '0')}`
}

/**
 * 只供旧 content/save 升级边界恢复大世界精灵号。
 * canonical PAL 资源和本地 v3 工程自有资源都把旧号持久编码进 AssetId；运行时加载绝不调用它猜路径。
 */
export function legacyWorldSpriteNumberFromAsset(asset: AssetId): number | undefined {
  const pal = /^sprite\.pal\.(\d+)$/.exec(asset)
  const authored = /^sprite\.authored\.legacy-(\d+)(?:\.|$)/.exec(asset)
  const raw = pal?.[1] ?? authored?.[1]
  if (raw === undefined) return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

export interface AssetReference {
  asset: AssetId
  expectedKind: AssetKind
  where: string
  /** 用户可理解的作者位置；同一脚本里多条命令仍只算一个编辑位置。 */
  site: string
}

export interface AssetReferenceSite {
  asset: AssetId
  expectedKind: AssetKind
  where: string
  site: string
  occurrences: number
}

export interface AssetReferenceSource {
  assets?: ManifestAssetConfigV3
  entryPoints?: readonly EntryPoint[]
  scenes?: readonly SceneDef[]
  scriptChunks?: Readonly<Record<string, ScriptChunkV1>> | readonly ScriptChunkV1[]
  actors?: readonly ActorDef[]
  enemies?: readonly EnemyDef[]
  items?: readonly ItemData[]
  skills?: readonly SkillData[]
  battleFields?: readonly BattleFieldDef[]
  /** 瓦片集领域定义到二进制资产的唯一 typed 边。 */
  tilesets?: readonly TilesetDef[]
  /** 大世界精灵领域定义到二进制资产的唯一 typed 边。 */
  sprites?: readonly SpriteDef[]
  /** 战斗精灵领域定义到二进制资产的唯一 typed 边。 */
  battleSprites?: readonly BattleSpriteDef[]
  /** 存档/运行态删除保护可选输入；工程内容闭包本身不传此槽。 */
  worlds?: readonly WorldState[]
}

const BATTLER_SOUND_FIELDS = [
  'attack',
  'critical',
  'weapon',
  'magic',
  'cover',
  'dying',
  'death',
] as const
const ENEMY_SOUND_FIELDS = ['attack', 'action', 'magic', 'death', 'call'] as const

function pushAssetReference(
  out: AssetReference[],
  reference: Omit<AssetReference, 'site'>,
  site: string,
): void {
  out.push({ ...reference, site })
}

function collectCommandAssets(
  node: unknown,
  where: string,
  out: AssetReference[],
  site = where,
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      collectCommandAssets(value, `${where}[${index}]`, out, site)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.kind === 'playMusic' && typeof record.asset === 'string')
    pushAssetReference(
      out,
      { asset: record.asset, expectedKind: 'music', where: `${where}.asset` },
      site,
    )
  if (record.kind === 'playSound' && typeof record.asset === 'string')
    pushAssetReference(
      out,
      { asset: record.asset, expectedKind: 'sound', where: `${where}.asset` },
      site,
    )
  if (record.kind === 'startBattle' && typeof record.music === 'string')
    pushAssetReference(
      out,
      { asset: record.music, expectedKind: 'music', where: `${where}.music` },
      site,
    )
  if (record.kind === 'playVideo' && typeof record.asset === 'string')
    pushAssetReference(
      out,
      { asset: record.asset, expectedKind: 'video', where: `${where}.asset` },
      site,
    )
  if (record.kind === 'playFrameAnimation' && typeof record.asset === 'string')
    pushAssetReference(
      out,
      { asset: record.asset, expectedKind: 'frame-animation', where: `${where}.asset` },
      site,
    )
  if (record.kind === 'dialog') {
    const cue = record.cue
    if (cue && typeof cue === 'object' && !Array.isArray(cue)) {
      const portrait = (cue as Record<string, unknown>).portrait
      if (portrait && typeof portrait === 'object' && !Array.isArray(portrait)) {
        const asset = (portrait as Record<string, unknown>).asset
        if (typeof asset === 'string')
          pushAssetReference(
            out,
            { asset, expectedKind: 'portrait', where: `${where}.cue.portrait.asset` },
            site,
          )
      }
    }
  }
  if (record.kind === 'setActorAppearance' && typeof record.portrait === 'string')
    pushAssetReference(
      out,
      { asset: record.portrait, expectedKind: 'portrait', where: `${where}.portrait` },
      site,
    )
  if (record.kind === 'quitToTitle' && Array.isArray(record.videos)) {
    record.videos.forEach((asset, index) => {
      if (typeof asset === 'string')
        pushAssetReference(
          out,
          { asset, expectedKind: 'video', where: `${where}.videos[${index}]` },
          site,
        )
    })
  }
  for (const [key, value] of Object.entries(record))
    collectCommandAssets(value, `${where}.${key}`, out, site)
}

/** 单棵命令树的 typed 资源边；运行时 readiness 与全工程 walker 共用同一递归语义。 */
export function collectCommandAssetReferences(
  node: unknown,
  where = 'commands',
  site = where,
): AssetReference[] {
  const references: AssetReference[] = []
  collectCommandAssets(node, where, references, site)
  return references
}

function appendCommandAssetReferences(
  out: AssetReference[],
  node: unknown,
  where: string,
  site: string,
): void {
  out.push(...collectCommandAssetReferences(node, where, site))
}

/** 递归收集所有 typed AssetId 引用；删除保护、闭包检查和引用面板共用这一张边表。 */
export function collectAssetReferences(source: AssetReferenceSource): AssetReference[] {
  const references: AssetReference[] = []
  if (source.assets) {
    for (const role of ASSET_ROLES) {
      const asset = source.assets.roles[role]
      if (asset)
        references.push({
          asset,
          expectedKind: ASSET_ROLE_KINDS[role],
          where: `manifest.assets.roles.${role}`,
          site: `manifest.assets.roles.${role}`,
        })
    }
  }
  source.entryPoints?.forEach((entryPoint, index) => {
    if (typeof entryPoint.introVideo === 'string')
      references.push({
        asset: entryPoint.introVideo,
        expectedKind: 'video',
        where: `entryPoints[${index}].introVideo`,
        site: `entryPoint:${entryPoint.id}:introVideo`,
      })
  })
  source.scenes?.forEach((scene, index) => {
    if (typeof scene.music === 'string')
      references.push({
        asset: scene.music,
        expectedKind: 'music',
        where: `scenes[${index}].music`,
        site: `scenes[${index}].music`,
      })
    if (typeof scene.battleMusic === 'string')
      references.push({
        asset: scene.battleMusic,
        expectedKind: 'music',
        where: `scenes[${index}].battleMusic`,
        site: `scenes[${index}].battleMusic`,
      })
    appendCommandAssetReferences(
      references,
      scene.onEnter,
      `scenes[${index}].onEnter`,
      `scene:${scene.id}:onEnter`,
    )
    appendCommandAssetReferences(
      references,
      scene.onTeleport,
      `scenes[${index}].onTeleport`,
      `scene:${scene.id}:onTeleport`,
    )
    appendCommandAssetReferences(
      references,
      scene.entities,
      `scenes[${index}].entities`,
      `scene:${scene.id}:entities`,
    )
  })
  const chunks = Array.isArray(source.scriptChunks)
    ? source.scriptChunks.map((chunk, index) => [chunk.id || String(index), chunk] as const)
    : Object.entries(source.scriptChunks ?? {})
  chunks.forEach(([chunkId, chunk]) => {
    for (const [scriptId, body] of Object.entries(chunk.scripts)) {
      appendCommandAssetReferences(
        references,
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        `script:${chunkId}:${scriptId}`,
      )
    }
  })
  source.actors?.forEach((actor, index) => {
    if (actor.portraits) {
      references.push({
        asset: actor.portraits.default,
        expectedKind: 'portrait',
        where: `actors[${index}].portraits.default`,
        site: `actor:${actor.id}:portraits`,
      })
      for (const [expression, asset] of Object.entries(actor.portraits.expressions ?? {}))
        references.push({
          asset,
          expectedKind: 'portrait',
          where: `actors[${index}].portraits.expressions[${JSON.stringify(expression)}]`,
          site: `actor:${actor.id}:portraits`,
        })
    }
    if (actor.face)
      references.push({
        asset: actor.face,
        expectedKind: 'face',
        where: `actors[${index}].face`,
        site: `actor:${actor.id}:face`,
      })
    for (const field of BATTLER_SOUND_FIELDS) {
      const asset = actor.battler?.sounds?.[field]
      if (typeof asset === 'string')
        references.push({
          asset,
          expectedKind: 'sound',
          where: `actors[${index}].battler.sounds.${field}`,
          site: `actor:${actor.id}:sounds`,
        })
    }
  })
  source.enemies?.forEach((enemy, index) => {
    for (const field of ENEMY_SOUND_FIELDS) {
      const asset = enemy.sounds[field]
      if (typeof asset === 'string')
        references.push({
          asset,
          expectedKind: 'sound',
          where: `enemies[${index}].sounds.${field}`,
          site: `enemy:${enemy.id}:sounds`,
        })
    }
    appendCommandAssetReferences(
      references,
      enemy.choreography,
      `enemies[${index}].choreography`,
      `enemy:${enemy.id}:choreography`,
    )
    appendCommandAssetReferences(
      references,
      enemy.onDefeated,
      `enemies[${index}].onDefeated`,
      `enemy:${enemy.id}:onDefeated`,
    )
  })
  source.items?.forEach((item, index) => {
    if (item.icon)
      references.push({
        asset: item.icon,
        expectedKind: 'item-icon',
        where: `items[${index}].icon`,
        site: `item:${item.id}:icon`,
      })
    for (const field of ['use', 'throw'] as const) {
      const asset = item[field]?.sound
      if (typeof asset === 'string')
        references.push({
          asset,
          expectedKind: 'sound',
          where: `items[${index}].${field}.sound`,
          site: `item:${item.id}:${field}`,
        })
    }
    const throwAnimationSound = item.throw?.presentation?.animation.sound
    if (typeof throwAnimationSound === 'string')
      references.push({
        asset: throwAnimationSound,
        expectedKind: 'sound',
        where: `items[${index}].throw.presentation.animation.sound`,
        site: `item:${item.id}:throw`,
      })
  })
  source.skills?.forEach((skill, index) => {
    if (typeof skill.animation.sound === 'string')
      references.push({
        asset: skill.animation.sound,
        expectedKind: 'sound',
        where: `skills[${index}].animation.sound`,
        site: `skill:${skill.id}:animation`,
      })
    skill.effects.forEach((effect, effectIndex) => {
      if (effect.kind === 'summon' && typeof effect.sound === 'string')
        references.push({
          asset: effect.sound,
          expectedKind: 'sound',
          where: `skills[${index}].effects[${effectIndex}].sound`,
          site: `skill:${skill.id}:effects`,
        })
    })
  })
  source.battleFields?.forEach((field, index) => {
    if (field.background)
      references.push({
        asset: field.background,
        expectedKind: 'battle-background',
        where: `battleFields[${index}].background`,
        site: `battleField:${field.id}:background`,
      })
  })
  source.tilesets?.forEach((tileset, index) => {
    references.push({
      asset: tileset.asset,
      expectedKind: 'tileset',
      where: `tilesets[${index}].asset`,
      site: `tileset:${tileset.id}:asset`,
    })
  })
  source.sprites?.forEach((sprite, index) => {
    references.push({
      asset: sprite.asset,
      expectedKind: 'sprite',
      where: `sprites[${index}].asset`,
      site: `sprite:${sprite.id}:asset`,
    })
    for (const [actionId, action] of Object.entries(sprite.poses ?? {})) {
      action.steps.forEach((step, stepIndex) => {
        step.cues?.forEach((cue, cueIndex) => {
          references.push({
            asset: cue.asset,
            expectedKind: 'sound',
            where: `sprites[${index}].poses[${JSON.stringify(actionId)}].steps[${stepIndex}].cues[${cueIndex}].asset`,
            site: `sprite:${sprite.id}:action:${actionId}`,
          })
        })
      })
    }
  })
  source.battleSprites?.forEach((sprite, index) => {
    references.push({
      asset: sprite.asset,
      expectedKind: 'battle-sprite',
      where: `battleSprites[${index}].asset`,
      site: `battleSprite:${sprite.id}:asset`,
    })
  })
  source.worlds?.forEach((world, worldIndex) => {
    for (const [collection, characters] of [
      ['party', world.party],
      ['reserve', world.reserve ?? []],
    ] as const) {
      characters.forEach((character, characterIndex) => {
        const asset = character.appearance?.portrait
        if (asset)
          references.push({
            asset,
            expectedKind: 'portrait',
            where: `worlds[${worldIndex}].${collection}[${characterIndex}].appearance.portrait`,
            site: `world:${worldIndex}:character:${character.id}:appearance`,
          })
      })
    }
  })
  return references
}

export function groupAssetReferencesBySite(
  references: readonly AssetReference[],
): AssetReferenceSite[] {
  const grouped = new Map<string, AssetReferenceSite>()
  for (const reference of references) {
    const key = `${reference.asset}\0${reference.expectedKind}\0${reference.site}`
    const existing = grouped.get(key)
    if (existing) {
      existing.occurrences++
      continue
    }
    grouped.set(key, { ...reference, occurrences: 1 })
  }
  return [...grouped.values()]
}

export interface AssetClosureIssue {
  severity: 'error' | 'warn'
  code:
    | 'missing-asset'
    | 'kind-mismatch'
    | 'missing-file'
    | 'bytes-mismatch'
    | 'hash-mismatch'
    | 'unused-asset'
  where: string
  message: string
}

export function validateAssetReferenceClosure(
  catalog: AssetCatalogV1,
  references: readonly AssetReference[],
): AssetClosureIssue[] {
  const issues: AssetClosureIssue[] = []
  const used = new Set<AssetId>()
  for (const reference of references) {
    used.add(reference.asset)
    const record = catalog.assets[reference.asset]
    if (!record) {
      issues.push({
        severity: 'error',
        code: 'missing-asset',
        where: reference.where,
        message: `AssetId "${reference.asset}" 不在 catalog`,
      })
    } else if (record.kind !== reference.expectedKind) {
      issues.push({
        severity: 'error',
        code: 'kind-mismatch',
        where: reference.where,
        message: `AssetId "${reference.asset}" 期望 ${reference.expectedKind}，实际 ${record.kind}`,
      })
    }
  }
  for (const id of Object.keys(catalog.assets)) {
    if (!used.has(id))
      issues.push({
        severity: 'warn',
        code: 'unused-asset',
        where: `assets[${JSON.stringify(id)}]`,
        message: `AssetId "${id}" 当前未被引用`,
      })
  }
  return issues
}

export interface AssetFileClosureOptions {
  readBytes(path: string): Promise<Uint8Array>
  sha256(bytes: Uint8Array): Promise<string> | string
}

export async function validateAssetFileClosure(
  catalog: AssetCatalogV1,
  references: readonly AssetReference[],
  options: AssetFileClosureOptions,
): Promise<AssetClosureIssue[]> {
  const issues = validateAssetReferenceClosure(catalog, references)
  // catalog 是工程会打包/保存的物理闭包；未引用记录虽会另报 warning，其 bytes/hash 也必须有效。
  // 否则“未使用”资源可在发布包中悄悄缺文件，等作者重新引用才延迟爆炸。
  for (const [id, record] of Object.entries(catalog.assets).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    let bytes: Uint8Array
    try {
      bytes = await options.readBytes(record.path)
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'missing-file',
        where: `assets[${JSON.stringify(id)}].path`,
        message: `无法读取 "${record.path}": ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }
    if (bytes.byteLength !== record.bytes)
      issues.push({
        severity: 'error',
        code: 'bytes-mismatch',
        where: `assets[${JSON.stringify(id)}].bytes`,
        message: `登记 ${record.bytes}，实际 ${bytes.byteLength}`,
      })
    const hash = await options.sha256(bytes)
    if (hash !== record.sha256)
      issues.push({
        severity: 'error',
        code: 'hash-mismatch',
        where: `assets[${JSON.stringify(id)}].sha256`,
        message: `登记 ${record.sha256}，实际 ${hash}`,
      })
  }
  return issues
}
