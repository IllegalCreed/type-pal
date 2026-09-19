/** Simulator launch data only. No project definitions, runtime state, or save storage. */
import {
  type BattleFieldDef,
  type BattlerSpec,
  type EnemyTeamDef,
  EQUIP_SLOT_IDS,
  type EquipSlot,
} from '@type-pal/content'

export type TrialPool = { kind: 'full' } | { kind: 'value' | 'percent'; value: number }
export type TrialMusic = { kind: 'default' | 'silent' } | { kind: 'asset'; assetId: string }
export type TrialStats = Partial<Omit<BattlerSpec['baseStats'], 'hp' | 'mp'>>
export interface TrialMember {
  actorId: string
  stats: TrialStats
  /** Missing slot inherits; null explicitly unequips. */
  equipment: Partial<Record<EquipSlot, string | null>>
  skills: { kind: 'inherit' } | { kind: 'replace'; ids: string[] }
  hp: TrialPool
  mp: TrialPool
}
export interface TrialParty {
  members: TrialMember[]
}
export type TrialEnemies =
  | { kind: 'team'; teamId: EnemyTeamDef['id'] }
  | { kind: 'slots'; slots: Array<string | null> }
export interface TrialBag {
  items: Array<{ itemId: string; quantity: number }>
}
export interface BattleTrialConfig {
  party: TrialParty
  enemies: TrialEnemies
  bag: TrialBag
  fieldId: BattleFieldDef['id']
  music: TrialMusic
  money: number
  auto: boolean
  boss: boolean
}

/** Strict JSON data helpers shared with the editor's private preset document. */
export function trialObject(value: unknown, keys: readonly string[], where: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error(`${where}: 期望普通JSON对象`)
  const result = value as Record<string, unknown>
  for (const key of Object.keys(result))
    if (!keys.includes(key)) throw new Error(`${where}.${key}: 未知字段`)
  return result
}
export function trialArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${where}: 期望数组`)
  for (let i = 0; i < value.length; i++)
    if (!Object.hasOwn(value, i)) throw new Error(`${where}[${i}]: 不允许稀疏空洞`)
  return value
}
export function trialId(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value)
    throw new Error(`${where}: 期望非空、无首尾空白的稳定ID`)
  return value
}
export function trialInteger(value: unknown, min: number, max: number, where: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${where}: 期望${min}～${max}的整数`)
  return value
}
export function trialBoolean(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${where}: 期望布尔值`)
  return value
}
const STAT_KEYS = [
  'level',
  'maxHP',
  'maxMP',
  'attack',
  'defense',
  'magicAttack',
  'speed',
  'luck',
] as const

function parsePool(value: unknown, where: string): TrialPool {
  const v = trialObject(value, ['kind', 'value'], where)
  if (v.kind === 'full') {
    trialObject(v, ['kind'], where)
    return { kind: 'full' }
  }
  if (v.kind !== 'value' && v.kind !== 'percent') throw new Error(`${where}.kind: 无效资源模式`)
  return {
    kind: v.kind,
    value: trialInteger(
      v.value,
      0,
      v.kind === 'percent' ? 100 : Number.MAX_SAFE_INTEGER,
      `${where}.value`,
    ),
  }
}
export function parseTrialMusic(value: unknown, where = 'trial.music'): TrialMusic {
  const v = trialObject(value, ['kind', 'assetId'], where)
  if (v.kind === 'default' || v.kind === 'silent') {
    trialObject(v, ['kind'], where)
    return { kind: v.kind }
  }
  if (v.kind !== 'asset') throw new Error(`${where}.kind: 无效音乐模式`)
  return { kind: 'asset', assetId: trialId(v.assetId, `${where}.assetId`) }
}
export function parseTrialParty(value: unknown, where = 'trial.party'): TrialParty {
  const v = trialObject(value, ['members'], where)
  const members = trialArray(v.members, `${where}.members`)
  // Empty is an editable draft, never a runnable battle. Readiness validates nonempty below the UI.
  if (members.length > 5) throw new Error(`${where}.members: 最多5名队员`)
  const seen = new Set<string>()
  return {
    members: members.map((entry, i): TrialMember => {
      const at = `${where}.members[${i}]`
      const member = trialObject(entry, ['actorId', 'stats', 'equipment', 'skills', 'hp', 'mp'], at)
      const actorId = trialId(member.actorId, `${at}.actorId`)
      if (seen.has(actorId)) throw new Error(`${at}.actorId: 重复队员${actorId}`)
      seen.add(actorId)
      const rawStats = trialObject(member.stats, STAT_KEYS, `${at}.stats`)
      const stats: TrialStats = {}
      for (const key of STAT_KEYS)
        if (Object.hasOwn(rawStats, key))
          stats[key] = trialInteger(
            rawStats[key],
            key === 'level' || key === 'maxHP' ? 1 : 0,
            Number.MAX_SAFE_INTEGER,
            `${at}.stats.${key}`,
          )
      const rawEquipment = trialObject(member.equipment, EQUIP_SLOT_IDS, `${at}.equipment`)
      const equipment: TrialMember['equipment'] = {}
      for (const slot of EQUIP_SLOT_IDS)
        if (Object.hasOwn(rawEquipment, slot))
          equipment[slot] =
            rawEquipment[slot] === null
              ? null
              : trialId(rawEquipment[slot], `${at}.equipment.${slot}`)
      const rawSkills = trialObject(member.skills, ['kind', 'ids'], `${at}.skills`)
      let skills: TrialMember['skills']
      if (rawSkills.kind === 'inherit') {
        trialObject(rawSkills, ['kind'], `${at}.skills`)
        skills = { kind: 'inherit' }
      } else if (rawSkills.kind === 'replace') {
        const ids = trialArray(rawSkills.ids, `${at}.skills.ids`).map((id, j) =>
          trialId(id, `${at}.skills.ids[${j}]`),
        )
        if (new Set(ids).size !== ids.length) throw new Error(`${at}.skills.ids: 重复技能`)
        skills = { kind: 'replace', ids }
      } else throw new Error(`${at}.skills.kind: 无效技能模式`)
      return {
        actorId,
        stats,
        equipment,
        skills,
        hp: parsePool(member.hp, `${at}.hp`),
        mp: parsePool(member.mp, `${at}.mp`),
      }
    }),
  }
}
export function parseTrialEnemies(value: unknown, where = 'trial.enemies'): TrialEnemies {
  const v = trialObject(value, ['kind', 'teamId', 'slots'], where)
  if (v.kind === 'team') {
    trialObject(v, ['kind', 'teamId'], where)
    return { kind: 'team', teamId: trialId(v.teamId, `${where}.teamId`) }
  }
  if (v.kind !== 'slots') throw new Error(`${where}.kind: 无效敌队模式`)
  trialObject(v, ['kind', 'slots'], where)
  const slots = trialArray(v.slots, `${where}.slots`)
  if (slots.length !== 5) throw new Error(`${where}.slots: 必须明确提供5个槽位，空槽使用null`)
  return {
    kind: 'slots',
    slots: slots.map((id, i) => (id === null ? null : trialId(id, `${where}.slots[${i}]`))),
  }
}
export function parseTrialBag(value: unknown, where = 'trial.bag'): TrialBag {
  const v = trialObject(value, ['items'], where)
  const seen = new Set<string>()
  return {
    items: trialArray(v.items, `${where}.items`)
      .map((entry, i) => {
        const at = `${where}.items[${i}]`
        const item = trialObject(entry, ['itemId', 'quantity'], at)
        const itemId = trialId(item.itemId, `${at}.itemId`)
        if (seen.has(itemId)) throw new Error(`${at}.itemId: 重复物品，请修改已有行数量`)
        seen.add(itemId)
        return {
          itemId,
          quantity: trialInteger(item.quantity, 0, Number.MAX_SAFE_INTEGER, `${at}.quantity`),
        }
      })
      .filter((item) => item.quantity > 0),
  }
}
export function parseBattleTrialConfig(value: unknown, where = 'trial'): BattleTrialConfig {
  const v = trialObject(
    value,
    ['party', 'enemies', 'bag', 'fieldId', 'music', 'money', 'auto', 'boss'],
    where,
  )
  return {
    party: parseTrialParty(v.party, `${where}.party`),
    enemies: parseTrialEnemies(v.enemies, `${where}.enemies`),
    bag: parseTrialBag(v.bag, `${where}.bag`),
    fieldId: trialInteger(v.fieldId, 0, Number.MAX_SAFE_INTEGER, `${where}.fieldId`),
    music: parseTrialMusic(v.music, `${where}.music`),
    money: trialInteger(v.money, 0, Number.MAX_SAFE_INTEGER, `${where}.money`),
    auto: trialBoolean(v.auto, `${where}.auto`),
    boss: trialBoolean(v.boss, `${where}.boss`),
  }
}
