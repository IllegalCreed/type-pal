import type {
  AssetCatalogV1,
  AssetId,
  AssetRole,
  LegacyAssetConfigV3,
  LegacyAssetFamily,
} from './asset.js'
import { palMusicAssetId, validateAssetCatalog, validateManifestAssetConfigV3 } from './asset.js'
import type { LoadedManifest } from './character.js'

interface ManifestV2 {
  id: string
  name: string
  contentVersion: 2
  entryScene: string
  entryPoints?: LoadedManifest['entryPoints']
  content: Record<string, string>
  assets?: Record<string, unknown>
  startWorld: LoadedManifest['startWorld']
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function legacyFamilies(assets: Record<string, unknown>): LegacyAssetFamily[] {
  const families = new Set<LegacyAssetFamily>()
  if (assets.root !== undefined)
    for (const family of [
      'battle-sprite',
      'effect-sprite',
      'battle-background',
      'rng',
      'video',
      'glyph-table',
      'ui-image',
      'image',
    ] as const)
      families.add(family)
  if (assets.tilesets !== undefined) families.add('tileset')
  if (assets.sprites !== undefined) families.add('sprite')
  if (assets.palettes !== undefined) families.add('color-table')
  if (assets.sounds !== undefined) families.add('sound')
  if (assets.portraits !== undefined) families.add('portrait')
  if (assets.faces !== undefined) families.add('face')
  if (assets.itemIcons !== undefined) families.add('item-icon')
  return [...families]
}

/**
 * v2 清单 -> v3 清单纯变换。调用方先用注入 reader/hash 建好 catalog；本函数不读文件。
 * 音乐族不会进入 legacy，旧 music 目录只允许在升级边界被消费一次。
 */
export function upgradeManifestV2ToV3(args: {
  manifest: unknown
  catalog: AssetCatalogV1
  roles?: Partial<Record<AssetRole, AssetId>>
  catalogPath?: string
}): LoadedManifest {
  const raw = object(args.manifest, 'manifest') as unknown as ManifestV2
  if (raw.contentVersion !== 2) throw new Error(`manifest: 期望 contentVersion 2`)
  const oldAssets = object(raw.assets ?? {}, 'manifest.assets')
  const content = { ...raw.content }
  delete content.music
  const legacy: LegacyAssetConfigV3 = {
    families: legacyFamilies(oldAssets),
    ...Object.fromEntries(
      [
        'root',
        'tilesets',
        'sprites',
        'palettes',
        'sounds',
        'portraits',
        'faces',
        'itemIcons',
        'ui',
        'images',
        'rng',
        'videos',
      ].flatMap((key) => (typeof oldAssets[key] === 'string' ? [[key, oldAssets[key]]] : [])),
    ),
  }
  const catalog = validateAssetCatalog(args.catalog)
  const assets = {
    catalog: args.catalogPath ?? 'assets/index.json',
    roles: { ...args.roles },
    ...(legacy.families.length ? { legacy } : {}),
  }
  validateManifestAssetConfigV3(assets, catalog)
  return {
    id: raw.id,
    name: raw.name,
    contentVersion: 3,
    entryScene: raw.entryScene,
    ...(raw.entryPoints ? { entryPoints: cloneJson(raw.entryPoints) } : {}),
    content,
    assets,
    startWorld: cloneJson(raw.startWorld),
  }
}

function numericTrack(value: unknown): number | undefined {
  const track = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(track) ? track : undefined
}

/** 递归升级场景、脚本 chunk、敌人编舞中的旧音乐字段；输入不原地修改。 */
export function upgradeV2MusicReferences<T>(input: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'playMusic' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`playMusic.musicId: 期望整数`)
      const rest = Object.fromEntries(
        Object.entries(source).filter(([key]) => key !== 'musicId' && key !== 'kind'),
      )
      return track <= 0
        ? {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'stopMusic',
          }
        : {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'playMusic',
            asset: palMusicAssetId(track),
          }
    }
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      if (key === 'musicId' || key === 'battleMusicId') continue
      output[key] = walk(child)
    }
    if (source.kind === 'startBattle' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`startBattle.musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    } else if ('musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    }
    if ('battleMusicId' in source) {
      const track = numericTrack(source.battleMusicId)
      if (track === undefined) throw new Error(`battleMusicId: 期望整数`)
      output.battleMusic = track <= 0 ? null : palMusicAssetId(track)
    }
    return output
  }
  return walk(input) as T
}

/** 旧 music.json 的作者别名合并进 catalog label；无别名条目不制造第二份数据。 */
export function applyV2MusicLabels(catalog: AssetCatalogV1, legacyMusic: unknown): AssetCatalogV1 {
  const next = cloneJson(validateAssetCatalog(catalog))
  if (!Array.isArray(legacyMusic)) throw new Error('content/music.json: 期望数组')
  for (const [index, raw] of legacyMusic.entries()) {
    const entry = object(raw, `content/music.json[${index}]`)
    const track = numericTrack(entry.id)
    if (track === undefined || track <= 0)
      throw new Error(`content/music.json[${index}].id: 期望正整数`)
    const record = next.assets[palMusicAssetId(track)]
    if (!record) throw new Error(`旧音乐 ${track} 在 catalog 中无对应 AssetId`)
    if (entry.name !== undefined) {
      if (typeof entry.name !== 'string')
        throw new Error(`content/music.json[${index}].name: 期望字符串`)
      record.label = entry.name
    }
  }
  return next
}

export type LegacySoundAssetResolver = (legacyId: number) => AssetId | undefined

function legacySoundAsset(
  value: unknown,
  resolveSound: LegacySoundAssetResolver,
  where: string,
): AssetId | undefined {
  if (typeof value === 'string') return value
  if (!Number.isInteger(value)) throw new Error(`${where}: 期望整数或 AssetId`)
  const legacy = value as number
  if (legacy === 0) return undefined
  const id = Math.abs(legacy)
  const asset = resolveSound(id)
  if (!asset && id !== 122) throw new Error(`${where}: 旧音效 ${id} 没有可迁移 WAV`)
  return asset
}

const DROP_COMMAND = Symbol('drop-command')

/** 递归升级场景、chunk 与敌人编舞中的 playSound；已知空槽 122 还原为无命令。 */
export function upgradeLegacySoundCommands<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const walk = (value: unknown, where: string): unknown | typeof DROP_COMMAND => {
    if (Array.isArray(value))
      return value.flatMap((child, index) => {
        const next = walk(child, `${where}[${index}]`)
        return next === DROP_COMMAND ? [] : [next]
      })
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'playSound' && 'soundId' in source) {
      const asset = legacySoundAsset(source.soundId, resolveSound, `${where}.soundId`)
      if (!asset) return DROP_COMMAND
      const output: Record<string, unknown> = { kind: 'playSound', asset }
      for (const [key, child] of Object.entries(source)) {
        if (key === 'kind' || key === 'soundId') continue
        const next = walk(child, `${where}.${key}`)
        if (next !== DROP_COMMAND) output[key] = next
      }
      return output
    }
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      const next = walk(child, `${where}.${key}`)
      if (next !== DROP_COMMAND) output[key] = next
    }
    return output
  }
  const upgraded = walk(input, 'commands')
  if (upgraded === DROP_COMMAND) throw new Error('命令根不能是空音效命令')
  return upgraded as T
}

const ACTOR_SOUND_FIELDS = [
  'attack',
  'critical',
  'weapon',
  'magic',
  'cover',
  'dying',
  'death',
] as const
const ENEMY_SOUND_FIELDS = ['attack', 'action', 'magic', 'death', 'call'] as const

function upgradeSoundObject(
  sounds: Record<string, unknown>,
  fields: readonly string[],
  resolveSound: LegacySoundAssetResolver,
  where: string,
): void {
  for (const field of fields) {
    if (!(field in sounds)) continue
    const asset = legacySoundAsset(sounds[field], resolveSound, `${where}.${field}`)
    if (asset) sounds[field] = asset
    else delete sounds[field]
  }
}

export function upgradeLegacyActorSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const actors = cloneJson(input) as unknown
  if (!Array.isArray(actors)) throw new Error('actors: 期望数组')
  actors.forEach((raw, index) => {
    const actor = object(raw, `actors[${index}]`)
    if (actor.battler === undefined) return
    const battler = object(actor.battler, `actors[${index}].battler`)
    if (battler.sounds === undefined) return
    upgradeSoundObject(
      object(battler.sounds, `actors[${index}].battler.sounds`),
      ACTOR_SOUND_FIELDS,
      resolveSound,
      `actors[${index}].battler.sounds`,
    )
  })
  return actors as T
}

export function upgradeLegacyEnemySounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const enemies = cloneJson(input) as unknown
  if (!Array.isArray(enemies)) throw new Error('enemies: 期望数组')
  enemies.forEach((raw, index) => {
    const enemy = object(raw, `enemies[${index}]`)
    const sounds = object(enemy.sounds, `enemies[${index}].sounds`)
    const legacyMagic = sounds.magic
    upgradeSoundObject(sounds, ENEMY_SOUND_FIELDS, resolveSound, `enemies[${index}].sounds`)
    if (typeof legacyMagic === 'number' && legacyMagic < 0) sounds.suppressMagicEffectSound = true
  })
  return enemies as T
}

export function upgradeLegacySkillSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const root = cloneJson(input) as unknown
  const skills = object(root, 'skills')
  if (!Array.isArray(skills.skills)) throw new Error('skills.skills: 期望数组')
  skills.skills.forEach((raw, index) => {
    const skill = object(raw, `skills.skills[${index}]`)
    const animation = object(skill.animation, `skills.skills[${index}].animation`)
    if ('sound' in animation) {
      const asset = legacySoundAsset(
        animation.sound,
        resolveSound,
        `skills.skills[${index}].animation.sound`,
      )
      if (asset) animation.sound = asset
      else delete animation.sound
    }
    if (!Array.isArray(skill.effects)) throw new Error(`skills.skills[${index}].effects: 期望数组`)
    skill.effects.forEach((rawEffect, effectIndex) => {
      const effect = object(rawEffect, `skills.skills[${index}].effects[${effectIndex}]`)
      if (effect.kind !== 'summon' || !('sound' in effect)) return
      const asset = legacySoundAsset(
        effect.sound,
        resolveSound,
        `skills.skills[${index}].effects[${effectIndex}].sound`,
      )
      if (asset) effect.sound = asset
      else delete effect.sound
    })
  })
  return root as T
}

export function upgradeLegacyItemSounds<T>(input: T, resolveSound: LegacySoundAssetResolver): T {
  const items = cloneJson(input) as unknown
  if (!Array.isArray(items)) throw new Error('items: 期望数组')
  items.forEach((raw, index) => {
    const item = object(raw, `items[${index}]`)
    for (const field of ['use', 'throw'] as const) {
      if (item[field] === undefined) continue
      const spec = object(item[field], `items[${index}].${field}`)
      if (!('sound' in spec)) continue
      const asset = legacySoundAsset(spec.sound, resolveSound, `items[${index}].${field}.sound`)
      if (asset) spec.sound = asset
      else delete spec.sound
    }
  })
  return items as T
}

/** 只退出 sound family；调用方负责先建好 catalog 和二进制，再把此 manifest 最后落盘。 */
export function exitLegacySoundFamily(args: {
  manifest: LoadedManifest
  roles?: Partial<Record<AssetRole, AssetId>>
  catalog?: AssetCatalogV1
}): LoadedManifest {
  const next = cloneJson(args.manifest)
  next.assets.roles = { ...args.roles, ...args.manifest.assets.roles }
  if (args.manifest.assets.legacy) {
    const { sounds: _retiredSounds, ...legacy } = args.manifest.assets.legacy
    next.assets.legacy = {
      ...legacy,
      families: args.manifest.assets.legacy.families.filter((family) => family !== 'sound'),
    }
  }
  validateManifestAssetConfigV3(next.assets, args.catalog, '升级后 manifest.assets')
  return next
}
