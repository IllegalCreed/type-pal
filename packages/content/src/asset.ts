import type { ActorDef } from './actor.js'
import type { AuthorSceneDef } from './author-scene.js'
import type { BattleSpriteDef } from './battle-sprite.js'
import type { EntryPoint, WorldState } from './character.js'
import type { BattleFieldDef, EnemyDef } from './enemy.js'
import type { SceneDef } from './index.js'
import type { ItemData } from './item.js'
import type { ScriptChunkV1 } from './script-library.js'
import { authoredSkillExecutionLayers, type SkillData } from './skill.js'
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

export interface ManifestAssetConfig {
  catalog: string
  roles: Partial<Record<AssetRole, AssetId>>
}

const kindSet = new Set<string>(ASSET_KINDS)
const roleSet = new Set<string>(ASSET_ROLES)
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

export function validateManifestAssetConfig(
  value: unknown,
  catalog?: AssetCatalogV1,
  where = 'manifest.assets',
): ManifestAssetConfig {
  const assets = objectAt(value, where)
  for (const key of Object.keys(assets))
    if (key !== 'catalog' && key !== 'roles')
      throw new Error(`${where}.${key}: 当前工程资源配置只允许 catalog 与 roles`)
  validateProjectRelativePath(assets.catalog as string, `${where}.catalog`)
  const roles = objectAt(assets.roles, `${where}.roles`)
  for (const [role, id] of Object.entries(roles)) {
    if (!roleSet.has(role)) throw new Error(`${where}.roles.${role}: 未知资源角色`)
    if (typeof id !== 'string' || id.length === 0)
      throw new Error(`${where}.roles.${role}: 期望非空 AssetId`)
  }

  if (catalog) {
    const entries = Object.entries(catalog.assets)
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
  return value as ManifestAssetConfig
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

export const PAL_PHYSICAL_EFFECT_ASSET_ID: AssetId = 'effect-sprite.pal.physical-hit'

export function palMagicEffectSpriteAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk < 0)
    throw new Error(`PAL 法术特效号必须是非负整数，收到 ${String(chunk)}`)
  return `effect-sprite.pal.magic.${String(chunk).padStart(3, '0')}`
}

export function palPortraitAssetId(chunk: number): AssetId {
  if (!Number.isInteger(chunk) || chunk <= 0)
    throw new Error(`PAL 立绘号必须是正整数，收到 ${String(chunk)}`)
  return `portrait.pal.${String(chunk).padStart(3, '0')}`
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

export interface AssetReference {
  asset: AssetId
  expectedKind: AssetKind
  where: string
  /** 用户可理解的作者位置；同一脚本里多条命令仍只算一个编辑位置。 */
  site: string
}

export type AssetReferenceOrigin =
  | { kind: 'manifest-role'; role: AssetRole }
  | { kind: 'entry-point'; id: string }
  | {
      kind: 'scene'
      id: string
      section: 'music' | 'battleMusic' | 'onEnter' | 'onTeleport' | 'entities'
    }
  | { kind: 'scene-hook'; sceneId: string; slot: 'onEnter' | 'onTeleport'; hookId: string }
  | { kind: 'script-chunk'; chunkId: string; scriptId: string }
  | { kind: 'shared-script'; id: string }
  | { kind: 'actor'; id: string; section: 'portraits' | 'face' | 'sounds' }
  | {
      kind: 'enemy'
      id: string
      section: 'sounds' | 'choreography' | 'onDefeated' | 'hook-ready' | 'hook-turnStart'
    }
  | { kind: 'item'; id: string; section: 'commands' | 'icon' | 'use' | 'throw' }
  | {
      kind: 'skill'
      id: string
      side: 'base' | 'player' | 'enemy'
      section: 'animation' | 'effects'
    }
  | { kind: 'battle-field'; id: string }
  | { kind: 'tileset'; id: string }
  | { kind: 'world-sprite'; id: string }
  | { kind: 'world-sprite-action'; spriteId: string; actionId: string }
  | { kind: 'battle-sprite'; id: string }
  | { kind: 'runtime-world' }

/** 全工程 walker 的有来源边；where/site 只用于诊断与旧分组，禁止反解析导航。 */
export interface LocatedAssetReference extends AssetReference {
  origin: AssetReferenceOrigin
}

export interface AssetReferenceSite {
  asset: AssetId
  expectedKind: AssetKind
  where: string
  site: string
  occurrences: number
}

export interface AssetReferenceSource {
  assets?: ManifestAssetConfig
  entryPoints?: readonly EntryPoint[]
  scenes?: readonly SceneDef[]
  scriptChunks?: Readonly<Record<string, ScriptChunkV1>> | readonly ScriptChunkV1[]
  /** 当前作者共享脚本库；每个脚本保留独立作者位置。 */
  sharedScripts?: Readonly<Record<string, { body: unknown }>>
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
  /** Editor canonical visits already own these roots; false avoids a second recursive traversal. */
  includeCanonicalAuthorCommands?: boolean
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

export interface CommandAssetTaggedReference {
  asset: AssetId
  expectedKind: AssetKind
  where: string
}

/** Inspect one tagged command node only; canonical callers own nested command traversal. */
export function commandAssetTaggedReferencesAtNode(
  value: unknown,
  where: string,
): CommandAssetTaggedReference[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const record = value as Record<string, unknown>
  const references: CommandAssetTaggedReference[] = []
  const push = (asset: unknown, expectedKind: AssetKind, suffix: string): void => {
    if (typeof asset === 'string')
      references.push({ asset, expectedKind, where: `${where}${suffix}` })
  }
  if (record.kind === 'playMusic') push(record.asset, 'music', '.asset')
  if (record.kind === 'playSound') push(record.asset, 'sound', '.asset')
  if (record.kind === 'startBattle') push(record.music, 'music', '.music')
  if (record.kind === 'playVideo') push(record.asset, 'video', '.asset')
  if (record.kind === 'playFrameAnimation') push(record.asset, 'frame-animation', '.asset')
  if (record.kind === 'dialog') {
    const cue = record.cue
    if (cue && typeof cue === 'object' && !Array.isArray(cue)) {
      const cueRecord = cue as Record<string, unknown>
      const portrait = cueRecord.portrait
      if (portrait && typeof portrait === 'object' && !Array.isArray(portrait))
        push((portrait as Record<string, unknown>).asset, 'portrait', '.cue.portrait.asset')
      const identity = cueRecord.identity
      if (identity && typeof identity === 'object' && !Array.isArray(identity)) {
        const identityRecord = identity as Record<string, unknown>
        const directPortrait = identityRecord.portrait
        if (
          identityRecord.kind === 'unbound' &&
          directPortrait &&
          typeof directPortrait === 'object' &&
          !Array.isArray(directPortrait)
        )
          push(
            (directPortrait as Record<string, unknown>).asset,
            'portrait',
            '.cue.identity.portrait.asset',
          )
      }
    }
  }
  if (record.kind === 'setActorAppearance') push(record.portrait, 'portrait', '.portrait')
  if (record.kind === 'quitToTitle' && Array.isArray(record.videos))
    record.videos.forEach((asset, index) => {
      push(asset, 'video', `.videos[${index}]`)
    })
  return references
}

/** Legacy/enemy tree walker; canonical author scripts use one-node visits instead. */
export function collectCommandAssetTaggedReferences(
  node: unknown,
  where: string,
): CommandAssetTaggedReference[] {
  const references: CommandAssetTaggedReference[] = []
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!value || typeof value !== 'object') return
    references.push(...commandAssetTaggedReferencesAtNode(value, path))
    for (const [key, child] of Object.entries(value as Record<string, unknown>))
      visit(child, `${path}.${key}`)
  }
  visit(node, where)
  return references
}

/** One canonical command visit, including startBattle choreography but never normal nested arms. */
export function collectCanonicalCommandAssetTaggedReferences(
  command: unknown,
  where: string,
): CommandAssetTaggedReference[] {
  const references = commandAssetTaggedReferencesAtNode(command, where)
  if (!command || typeof command !== 'object' || Array.isArray(command)) return references
  const record = command as Record<string, unknown>
  if (record.kind === 'startBattle' && record.choreography !== undefined)
    references.push(
      ...collectCommandAssetTaggedReferences(record.choreography, `${where}.choreography`),
    )
  return references
}

/** 单棵命令树的 typed 资源边；运行时 readiness 与全工程 walker 共用同一递归语义。 */
export function collectCommandAssetReferences(
  node: unknown,
  where = 'commands',
  site = where,
): AssetReference[] {
  return collectCommandAssetTaggedReferences(node, where).map((reference) => ({
    ...reference,
    site,
  }))
}

function appendCommandAssetReferences(
  out: LocatedAssetReference[],
  node: unknown,
  where: string,
  site: string,
  origin: AssetReferenceOrigin,
): void {
  out.push(
    ...collectCommandAssetReferences(node, where, site).map((reference) => ({
      ...reference,
      origin,
    })),
  )
}

/** 递归收集所有 typed AssetId 引用；删除保护、闭包检查和引用面板共用这一张边表。 */
export function collectAssetReferences(source: AssetReferenceSource): LocatedAssetReference[] {
  const references: LocatedAssetReference[] = []
  const includeCanonicalAuthorCommands = source.includeCanonicalAuthorCommands !== false
  if (source.assets) {
    for (const role of ASSET_ROLES) {
      const asset = source.assets.roles[role]
      if (asset)
        references.push({
          asset,
          expectedKind: ASSET_ROLE_KINDS[role],
          where: `manifest.assets.roles.${role}`,
          site: `manifest.assets.roles.${role}`,
          origin: { kind: 'manifest-role', role },
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
        origin: { kind: 'entry-point', id: entryPoint.id },
      })
  })
  source.scenes?.forEach((scene, index) => {
    if (typeof scene.music === 'string')
      references.push({
        asset: scene.music,
        expectedKind: 'music',
        where: `scenes[${index}].music`,
        site: `scenes[${index}].music`,
        origin: { kind: 'scene', id: scene.id, section: 'music' },
      })
    if (typeof scene.battleMusic === 'string')
      references.push({
        asset: scene.battleMusic,
        expectedKind: 'music',
        where: `scenes[${index}].battleMusic`,
        site: `scenes[${index}].battleMusic`,
        origin: { kind: 'scene', id: scene.id, section: 'battleMusic' },
      })
    appendCommandAssetReferences(
      references,
      scene.onEnter,
      `scenes[${index}].onEnter`,
      `scene:${scene.id}:onEnter`,
      { kind: 'scene', id: scene.id, section: 'onEnter' },
    )
    appendCommandAssetReferences(
      references,
      scene.onTeleport,
      `scenes[${index}].onTeleport`,
      `scene:${scene.id}:onTeleport`,
      { kind: 'scene', id: scene.id, section: 'onTeleport' },
    )
    if (includeCanonicalAuthorCommands) {
      appendCommandAssetReferences(
        references,
        scene.entities,
        `scenes[${index}].entities`,
        `scene:${scene.id}:entities`,
        { kind: 'scene', id: scene.id, section: 'entities' },
      )
      const hooks = (scene as unknown as { hooks?: AuthorSceneDef['hooks'] }).hooks
      for (const slot of ['onEnter', 'onTeleport'] as const) {
        const variants = hooks?.[slot]?.variants
        if (!variants) continue
        for (const [hookId, hook] of Object.entries(variants))
          appendCommandAssetReferences(
            references,
            hook.flow,
            `scenes[${index}].hooks.${slot}.variants[${JSON.stringify(hookId)}].flow`,
            `scene:${scene.id}:hook:${slot}:${hookId}`,
            { kind: 'scene-hook', sceneId: scene.id, slot, hookId },
          )
      }
    }
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
        { kind: 'script-chunk', chunkId, scriptId },
      )
    }
  })
  if (includeCanonicalAuthorCommands)
    for (const [scriptId, script] of Object.entries(source.sharedScripts ?? {}))
      appendCommandAssetReferences(
        references,
        script.body,
        `sharedScripts[${JSON.stringify(scriptId)}].body`,
        `sharedScript:${scriptId}`,
        { kind: 'shared-script', id: scriptId },
      )
  source.actors?.forEach((actor, index) => {
    if (actor.portraits) {
      references.push({
        asset: actor.portraits.default,
        expectedKind: 'portrait',
        where: `actors[${index}].portraits.default`,
        site: `actor:${actor.id}:portraits`,
        origin: { kind: 'actor', id: actor.id, section: 'portraits' },
      })
      for (const [expression, asset] of Object.entries(actor.portraits.expressions ?? {}))
        references.push({
          asset,
          expectedKind: 'portrait',
          where: `actors[${index}].portraits.expressions[${JSON.stringify(expression)}]`,
          site: `actor:${actor.id}:portraits`,
          origin: { kind: 'actor', id: actor.id, section: 'portraits' },
        })
    }
    if (actor.face)
      references.push({
        asset: actor.face,
        expectedKind: 'face',
        where: `actors[${index}].face`,
        site: `actor:${actor.id}:face`,
        origin: { kind: 'actor', id: actor.id, section: 'face' },
      })
    for (const field of BATTLER_SOUND_FIELDS) {
      const asset = actor.battler?.sounds?.[field]
      if (typeof asset === 'string')
        references.push({
          asset,
          expectedKind: 'sound',
          where: `actors[${index}].battler.sounds.${field}`,
          site: `actor:${actor.id}:sounds`,
          origin: { kind: 'actor', id: actor.id, section: 'sounds' },
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
          origin: { kind: 'enemy', id: enemy.id, section: 'sounds' },
        })
    }
    appendCommandAssetReferences(
      references,
      enemy.choreography,
      `enemies[${index}].choreography`,
      `enemy:${enemy.id}:choreography`,
      { kind: 'enemy', id: enemy.id, section: 'choreography' },
    )
    appendCommandAssetReferences(
      references,
      enemy.onDefeated,
      `enemies[${index}].onDefeated`,
      `enemy:${enemy.id}:onDefeated`,
      { kind: 'enemy', id: enemy.id, section: 'onDefeated' },
    )
    for (const channel of ['ready', 'turnStart'] as const) {
      const hook = enemy.ai.hooks?.[channel]
      if (!hook) continue
      appendCommandAssetReferences(
        references,
        hook,
        `enemies[${index}].ai.hooks.${channel}`,
        `enemy:${enemy.id}:hook:${channel}`,
        {
          kind: 'enemy',
          id: enemy.id,
          section: channel === 'ready' ? 'hook-ready' : 'hook-turnStart',
        },
      )
    }
  })
  source.items?.forEach((item, index) => {
    if (includeCanonicalAuthorCommands)
      appendCommandAssetReferences(references, item, `items[${index}]`, `item:${item.id}`, {
        kind: 'item',
        id: item.id,
        section: 'commands',
      })
    if (item.icon)
      references.push({
        asset: item.icon,
        expectedKind: 'item-icon',
        where: `items[${index}].icon`,
        site: `item:${item.id}:icon`,
        origin: { kind: 'item', id: item.id, section: 'icon' },
      })
    for (const field of ['use', 'throw'] as const) {
      const asset = item[field]?.sound
      if (typeof asset === 'string')
        references.push({
          asset,
          expectedKind: 'sound',
          where: `items[${index}].${field}.sound`,
          site: `item:${item.id}:${field}`,
          origin: { kind: 'item', id: item.id, section: field },
        })
    }
    const throwAnimationSound = item.throw?.presentation?.animation.sound
    if (typeof throwAnimationSound === 'string')
      references.push({
        asset: throwAnimationSound,
        expectedKind: 'sound',
        where: `items[${index}].throw.presentation.animation.sound`,
        site: `item:${item.id}:throw`,
        origin: { kind: 'item', id: item.id, section: 'throw' },
      })
  })
  source.skills?.forEach((skill, index) => {
    for (const layer of authoredSkillExecutionLayers(skill)) {
      const layerPath = layer.side === 'base' ? '' : `execution.${layer.side}.`
      if (typeof layer.animation?.sound === 'string')
        references.push({
          asset: layer.animation.sound,
          expectedKind: 'sound',
          where: `skills[${index}].${layerPath}animation.sound`,
          site:
            layer.side === 'base'
              ? `skill:${skill.id}:animation`
              : `skill:${skill.id}:execution:${layer.side}:animation`,
          origin: {
            kind: 'skill',
            id: skill.id,
            side: layer.side,
            section: 'animation',
          },
        })
      ;(layer.effects ?? []).forEach((effect, effectIndex) => {
        if (effect.kind === 'summon' && typeof effect.sound === 'string')
          references.push({
            asset: effect.sound,
            expectedKind: 'sound',
            where: `skills[${index}].${layerPath}effects[${effectIndex}].sound`,
            site:
              layer.side === 'base'
                ? `skill:${skill.id}:effects`
                : `skill:${skill.id}:execution:${layer.side}:effects`,
            origin: {
              kind: 'skill',
              id: skill.id,
              side: layer.side,
              section: 'effects',
            },
          })
      })
    }
  })
  source.battleFields?.forEach((field, index) => {
    if (field.background)
      references.push({
        asset: field.background,
        expectedKind: 'battle-background',
        where: `battleFields[${index}].background`,
        site: `battleField:${field.id}:background`,
        origin: { kind: 'battle-field', id: String(field.id) },
      })
  })
  source.tilesets?.forEach((tileset, index) => {
    references.push({
      asset: tileset.asset,
      expectedKind: 'tileset',
      where: `tilesets[${index}].asset`,
      site: `tileset:${tileset.id}:asset`,
      origin: { kind: 'tileset', id: tileset.id },
    })
  })
  source.sprites?.forEach((sprite, index) => {
    references.push({
      asset: sprite.asset,
      expectedKind: 'sprite',
      where: `sprites[${index}].asset`,
      site: `sprite:${sprite.id}:asset`,
      origin: { kind: 'world-sprite', id: sprite.id },
    })
    for (const [actionId, action] of Object.entries(sprite.poses ?? {})) {
      action.steps.forEach((step, stepIndex) => {
        step.cues?.forEach((cue, cueIndex) => {
          references.push({
            asset: cue.asset,
            expectedKind: 'sound',
            where: `sprites[${index}].poses[${JSON.stringify(actionId)}].steps[${stepIndex}].cues[${cueIndex}].asset`,
            site: `sprite:${sprite.id}:action:${actionId}`,
            origin: { kind: 'world-sprite-action', spriteId: sprite.id, actionId },
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
      origin: { kind: 'battle-sprite', id: sprite.id },
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
            origin: { kind: 'runtime-world' },
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
