import {
  type ActorDef,
  type AssetCatalogV1,
  type BattleFieldDef,
  buildWorld,
  type EnemyDef,
  type EnemyTeamDef,
  EQUIP_SLOT_IDS,
  type ItemData,
  type ItemDataMap,
  type SkillData,
  type WorldState,
} from '@type-pal/content'
import { createBattlePlayers } from './battle/battle-player-input.js'
import {
  type BattleTrialConfig,
  parseBattleTrialConfig,
  parseTrialParty,
  type TrialParty,
  type TrialPool,
} from './battle-trial-config.js'
import { expectDefined } from './defined.js'
import { sha256Bytes } from './hash.js'
import type { LoadedCurrentProjectCore } from './project-loader.js'
import { projectItemsView } from './runtime-project-view.js'

export interface TrialCatalog {
  actorsById: Record<string, ActorDef>
  skills: Record<string, SkillData>
  items: Record<string, Pick<ItemData, 'equip'>>
  enemiesById: Record<string, EnemyDef>
  enemyTeamsById: Record<string, EnemyTeamDef>
  battleFields: readonly BattleFieldDef[]
  assetCatalog: AssetCatalogV1
}
export interface BattleTrialIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}
const own = <T>(table: Record<string, T>, id: string): T | undefined =>
  Object.hasOwn(table, id) ? table[id] : undefined

/** Battle inputs, not scene caches/functions; shared by the sender and receiving preparation. */
export function battleTrialRevision(project: LoadedCurrentProjectCore): Promise<string> {
  const fields = [
    'manifest',
    'assetCatalog',
    'actorsById',
    'skills',
    'items',
    'enemiesById',
    'enemyTeamsById',
    'battleFields',
    'battleSpritesById',
    'poisons',
    'levelUp',
    'sharedScripts',
    'worldVariables',
    'locale',
  ] as const
  return sha256Bytes(
    new TextEncoder().encode(
      JSON.stringify(Object.fromEntries(fields.map((key) => [key, project[key]]))),
    ),
  )
}

/** Pure and shared by the editor and runtime. A valid stored draft need not be runnable. */
export function collectBattleTrialIssues(
  input: unknown,
  project: TrialCatalog,
): BattleTrialIssue[] {
  let config: BattleTrialConfig
  try {
    config = parseBattleTrialConfig(input)
  } catch (error) {
    return [
      {
        path: 'config',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
      },
    ]
  }
  const issues: BattleTrialIssue[] = []
  const error = (path: string, message: string) => issues.push({ path, message, severity: 'error' })
  if (!config.party.members.length) error('party', '请至少选择一名可参战角色')
  if (!project.battleFields.some((field) => field.id === config.fieldId))
    error('fieldId', `战场 ${config.fieldId} 不存在，请在战场目录配置`)
  if (
    config.music.kind === 'asset' &&
    project.assetCatalog.assets[config.music.assetId]?.kind !== 'music'
  )
    error('music', `音乐 ${config.music.assetId} 不存在或资源类型不符`)
  let living = 0
  config.party.members.forEach((member, index) => {
    const path = `party.members[${index}]`,
      actor = own(project.actorsById, member.actorId)
    if (!actor?.battler) {
      error(`${path}.actorId`, `角色 ${member.actorId} 不存在或不可参战`)
      return
    }
    const stats = { ...actor.battler.baseStats, ...member.stats }
    for (const [key, pool, max] of [
      ['hp', member.hp, stats.maxHP],
      ['mp', member.mp, stats.maxMP],
    ] as const) {
      if (!Number.isSafeInteger(max) || max < (key === 'hp' ? 1 : 0))
        error(`${path}.stats`, `${member.actorId} 的最大${key === 'hp' ? '体力' : '真气'}无效`)
      else {
        if (pool.kind === 'value' && pool.value > max)
          error(`${path}.${key}`, `当前值 ${pool.value} 超过最大值 ${max}`)
        if (key === 'hp' && poolValue(pool, max) > 0) living++
      }
    }
    const equipment = { ...actor.battler.initialEquipment, ...member.equipment }
    for (const [slot, id] of Object.entries(equipment)) {
      if (id === null) continue
      const item = own(project.items, id)
      if (
        !EQUIP_SLOT_IDS.some((s) => s === slot) ||
        !item?.equip ||
        item.equip.slot !== slot ||
        !item.equip.equipableBy.includes(member.actorId)
      )
        error(`${path}.equipment.${slot}`, `角色 ${member.actorId} 不能在 ${slot} 穿戴 ${id}`)
      if (item?.equip?.effects.some((effect) => effect.kind === 'maxPool'))
        issues.push({
          path: `${path}.equipment.${slot}`,
          severity: 'warning',
          message: `${id} 的体力/真气上限效果当前引擎尚未执行；试打不单独修改正式规则`,
        })
      for (const effect of item?.equip?.effects ?? [])
        if (effect.kind === 'grantSkill' && !own(project.skills, effect.skillId))
          error(`${path}.equipment.${slot}`, `装备授予的技能 ${effect.skillId} 不存在`)
    }
    const ids = member.skills.kind === 'inherit' ? actor.battler.initialMagic : member.skills.ids
    for (const id of ids) if (!own(project.skills, id)) error(`${path}.skills`, `技能 ${id} 不存在`)
  })
  if (config.party.members.length && living === 0)
    error('party', '我方必须至少有一名体力大于0的队员')
  const enemySlots =
    config.enemies.kind === 'team'
      ? own(project.enemyTeamsById, config.enemies.teamId)?.slots
      : config.enemies.slots
  if (!enemySlots)
    error('enemies', `敌队 ${config.enemies.kind === 'team' ? config.enemies.teamId : ''} 不存在`)
  else {
    if (enemySlots.length > 5) error('enemies', '敌方不能超过5个槽位')
    if (!enemySlots.some(Boolean)) error('enemies', '请至少选择一个敌人，空敌队不能试打')
    enemySlots.forEach((id, index) => {
      if (id !== null && !own(project.enemiesById, id))
        error(`enemies.slots[${index}]`, `敌人 ${id} 不存在`)
    })
  }
  config.bag.items.forEach((item, index) => {
    if (!own(project.items, item.itemId))
      error(`bag.items[${index}]`, `背包物品 ${item.itemId} 不存在`)
  })
  return issues
}
function poolValue(pool: TrialPool, max: number): number {
  return pool.kind === 'full'
    ? max
    : pool.kind === 'value'
      ? pool.value
      : Number((BigInt(max) * BigInt(pool.value)) / 100n)
}
function applyTrialParty(world: WorldState, party: TrialParty): void {
  world.party.forEach((member, i) => {
    const setup = expectDefined(party.members[i])
    Object.assign(member, setup.stats)
    for (const [slot, id] of Object.entries(setup.equipment)) {
      if (id === null) delete member.equipment[slot]
      else member.equipment[slot] = id
    }
    if (setup.skills.kind === 'replace') world.learnedSkills[member.id] = [...setup.skills.ids]
    member.hp = poolValue(setup.hp, member.maxHP)
    member.mp = poolValue(setup.mp, member.maxMP)
  })
}

/** Editor preview uses the same fresh instances, overrides and formal equipment derivation as launch.
 * This does not authorize starting a battle: collectBattleTrialIssues still validates the full plan.
 */
export function previewBattleTrialParty(
  input: TrialParty,
  project: { actorsById: Record<string, ActorDef>; items: ItemDataMap },
) {
  const party = parseTrialParty(input)
  const world = buildWorld(
    { party: party.members.map((member) => member.actorId), money: 0, inventory: [] },
    project.actorsById,
  )
  applyTrialParty(world, party)
  return createBattlePlayers(world, project)
}
export function prepareBattleTrial(input: unknown, project: LoadedCurrentProjectCore) {
  const config = parseBattleTrialConfig(input)
  const issues = collectBattleTrialIssues(config, project)
  const errors = issues.filter((issue) => issue.severity === 'error')
  if (errors.length)
    throw new Error(errors.map((issue) => `${issue.path}：${issue.message}`).join('\n'))
  const world: WorldState = buildWorld(
    {
      party: config.party.members.map((member) => member.actorId),
      money: config.money,
      inventory: config.bag.items.map((item) => ({ itemId: item.itemId, count: item.quantity })),
    },
    project.actorsById,
    project.worldVariables,
    project.poisonsById,
  )
  applyTrialParty(world, config.party)
  const items = projectItemsView(project.items)
  const slots =
    config.enemies.kind === 'team'
      ? expectDefined(project.enemyTeamsById[config.enemies.teamId]).slots
      : config.enemies.slots
  const enemySlots = slots.map((id) =>
    id === null ? null : structuredClone(expectDefined(project.enemiesById[id])),
  )
  return {
    config,
    world,
    items,
    players: createBattlePlayers(world, { actorsById: project.actorsById, items }),
    enemySlots,
    field: expectDefined(project.battleFields.find((field) => field.id === config.fieldId)),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  }
}
