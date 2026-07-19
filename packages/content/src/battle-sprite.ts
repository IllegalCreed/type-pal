import type { AssetCatalogV1, AssetId } from './asset.js'

/** 玩家战斗精灵的命名动作帧。索引均为资源内的绝对帧号。 */
export interface PlayerFighterFrames {
  idle: number
  dying: number
  dead: number
  defend: number
  hurt: number
  preMagic: number
  magic: number
  attackWindup: number
  attackRush: number
  attackStrike: number
  steal?: number
}

/**
 * 可参战角色的动作 ABI。命中特效与施法前摇特效目前仍是 effect frame base；
 * A7-3E 会把二者升级为 effect clip 引用，A7-3B 不拥有 effect-sprite 二进制。
 */
export interface PlayerFighterBattleSpriteProfile {
  kind: 'player-fighter'
  frames: PlayerFighterFrames
  castEffectBase: number
  attackEffectBase: number
}

/** 资源内一段连续帧；count 可以为 0（PAL 敌人允许没有施法或攻击段）。 */
export interface BattleSpriteFrameSection {
  start: number
  count: number
}

/** 敌人动作 ABI；战场落点 yPosOffset 仍属于 EnemyDef。 */
export interface EnemyBattleSpriteProfile {
  kind: 'enemy'
  idle: BattleSpriteFrameSection
  magic: BattleSpriteFrameSection
  attack: BattleSpriteFrameSection
  /** 待机每帧 40ms tick 数，至少 1。 */
  idleTicksPerFrame: number
  /** 攻击/行动每帧 40ms tick 数；PAL 的 0 是合法零时长推进。 */
  actTicksPerFrame: number
}

/** 召唤精灵按资源顺序播放全部帧；速度、染色与声音属于技能调用。 */
export interface SummonBattleSpriteProfile {
  kind: 'summon'
}

export type BattleSpriteProfile =
  | PlayerFighterBattleSpriteProfile
  | EnemyBattleSpriteProfile
  | SummonBattleSpriteProfile

/** 战斗精灵语义定义。业务内容引用 id，物理路径只存在 asset catalog。 */
export interface BattleSpriteDef {
  id: string
  label: string
  asset: AssetId
  profile: BattleSpriteProfile
}

export type BattleSpriteProfileKind = BattleSpriteProfile['kind']

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`)
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '期望对象')
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(path, '期望非空字符串')
  return value
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) fail(path, '期望非负整数')
  return value as number
}

function positiveInteger(value: unknown, path: string): number {
  const result = nonNegativeInteger(value, path)
  if (result === 0) fail(path, '期望正整数')
  return result
}

function sectionAt(value: unknown, path: string): BattleSpriteFrameSection {
  const section = recordAt(value, path)
  return {
    start: nonNegativeInteger(section.start, `${path}.start`),
    count: nonNegativeInteger(section.count, `${path}.count`),
  }
}

const PLAYER_FRAME_KEYS = [
  'idle',
  'dying',
  'dead',
  'defend',
  'hurt',
  'preMagic',
  'magic',
  'attackWindup',
  'attackRush',
  'attackStrike',
] as const satisfies readonly (keyof PlayerFighterFrames)[]

function profileAt(value: unknown, path: string): BattleSpriteProfile {
  const profile = recordAt(value, path)
  if (profile.kind === 'player-fighter') {
    const frames = recordAt(profile.frames, `${path}.frames`)
    const parsed = {} as PlayerFighterFrames
    for (const key of PLAYER_FRAME_KEYS)
      parsed[key] = nonNegativeInteger(frames[key], `${path}.frames.${key}`)
    if (frames.steal !== undefined)
      parsed.steal = nonNegativeInteger(frames.steal, `${path}.frames.steal`)
    return {
      kind: 'player-fighter',
      frames: parsed,
      castEffectBase: nonNegativeInteger(profile.castEffectBase, `${path}.castEffectBase`),
      attackEffectBase: nonNegativeInteger(profile.attackEffectBase, `${path}.attackEffectBase`),
    }
  }
  if (profile.kind === 'enemy') {
    const idle = sectionAt(profile.idle, `${path}.idle`)
    const magic = sectionAt(profile.magic, `${path}.magic`)
    const attack = sectionAt(profile.attack, `${path}.attack`)
    if (idle.count === 0) fail(`${path}.idle.count`, '敌人至少需要 1 个待机帧')
    if (idle.start !== 0) fail(`${path}.idle.start`, '敌人待机段必须从 0 开始')
    if (magic.start !== idle.start + idle.count)
      fail(`${path}.magic.start`, '敌人施法段必须紧接待机段')
    if (attack.start !== magic.start + magic.count)
      fail(`${path}.attack.start`, '敌人攻击段必须紧接施法段')
    return {
      kind: 'enemy',
      idle,
      magic,
      attack,
      idleTicksPerFrame: positiveInteger(profile.idleTicksPerFrame, `${path}.idleTicksPerFrame`),
      actTicksPerFrame: nonNegativeInteger(profile.actTicksPerFrame, `${path}.actTicksPerFrame`),
    }
  }
  if (profile.kind === 'summon')
    return {
      kind: 'summon',
    }
  fail(`${path}.kind`, '期望 player-fighter、enemy 或 summon')
}

/** 加载边界 guard，并可与 catalog 的 battle-sprite kind 交叉校验。 */
export function validateBattleSprites(value: unknown, catalog?: AssetCatalogV1): BattleSpriteDef[] {
  if (!Array.isArray(value)) fail('battleSprites', '期望数组')
  const ids = new Set<string>()
  return value.map((raw, index) => {
    const path = `battleSprites[${index}]`
    const record = recordAt(raw, path)
    if ('path' in record || 'spriteNum' in record || 'spritePath' in record)
      fail(path, '旧 number/path 字段已退役；只允许 id → asset')
    const id = nonEmptyString(record.id, `${path}.id`)
    if (id.includes('/')) fail(`${path}.id`, "id 不得含 '/'")
    if (ids.has(id)) fail(`${path}.id`, `重复 id "${id}"`)
    ids.add(id)
    const label = nonEmptyString(record.label, `${path}.label`)
    const asset = nonEmptyString(record.asset, `${path}.asset`)
    if (catalog) {
      const assetRecord = catalog.assets[asset]
      if (!assetRecord) fail(`${path}.asset`, `AssetId "${asset}" 不在 catalog`)
      if (assetRecord.kind !== 'battle-sprite')
        fail(`${path}.asset`, `AssetId "${asset}" 期望 battle-sprite，实际 ${assetRecord.kind}`)
    }
    return { id, label, asset, profile: profileAt(record.profile, `${path}.profile`) }
  })
}

/** 定义会访问到的绝对帧集合；替换/no-shrink 与运行时 readiness 共用。 */
export function battleSpriteDefinitionFrameIndices(
  definition: Pick<BattleSpriteDef, 'profile'>,
  actualFrameCount?: number,
): Set<number> {
  const profile = definition.profile
  const result = new Set<number>()
  if (profile.kind === 'player-fighter') {
    for (const key of PLAYER_FRAME_KEYS) result.add(profile.frames[key])
    if (profile.frames.steal !== undefined) result.add(profile.frames.steal)
  } else if (profile.kind === 'summon') {
    if (actualFrameCount === undefined)
      throw new Error('summon profile 的帧集合必须由已解码资源提供 actualFrameCount')
    if (!Number.isInteger(actualFrameCount) || actualFrameCount <= 0)
      throw new Error('summon battle sprite 至少需要 1 个实际帧')
    for (let frame = 0; frame < actualFrameCount; frame++) result.add(frame)
  } else {
    for (const section of [profile.idle, profile.magic, profile.attack])
      for (let frame = section.start; frame < section.start + section.count; frame++)
        result.add(frame)
  }
  return result
}

/** 定义所需最小帧数；空集合不会出现，因为每类 profile 都至少声明一个帧。 */
export function battleSpriteDefinitionFrameDemand(
  definition: Pick<BattleSpriteDef, 'profile'>,
  actualFrameCount?: number,
): number {
  return Math.max(...battleSpriteDefinitionFrameIndices(definition, actualFrameCount)) + 1
}

export function resolveBattleSpriteDefinition(
  id: string,
  definitions: readonly BattleSpriteDef[],
  expected?: BattleSpriteProfileKind | readonly BattleSpriteProfileKind[],
): BattleSpriteDef {
  const definition = definitions.find((entry) => entry.id === id)
  if (!definition) throw new Error(`战斗精灵定义 "${id}" 不存在`)
  const accepted =
    expected === undefined ? undefined : Array.isArray(expected) ? expected : [expected]
  if (accepted && !accepted.includes(definition.profile.kind))
    throw new Error(
      `战斗精灵定义 "${id}" profile 期望 ${accepted.join('/')}，实际 ${definition.profile.kind}`,
    )
  return definition
}
