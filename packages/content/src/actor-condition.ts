import { type ActivePoison, applyPoisonSelf, type PoisonDef } from './poison.js'
import type { StatusId } from './skill.js'

export const CARRIED_STATUS_TURN_RANGE = { min: 1, max: 999 } as const

export const ACTOR_STATUS_DEFINITIONS = {
  confused: {
    label: '混乱',
    category: 'bad',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '无法正常控制，可能攻击队友。',
  },
  paralyzed: {
    label: '定身',
    category: 'bad',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '无法行动。',
  },
  sleep: {
    label: '睡眠',
    category: 'bad',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '无法行动。',
  },
  silence: {
    label: '沉默',
    category: 'bad',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '无法施放仙术。',
  },
  puppet: {
    label: '傀儡',
    category: 'dead-only',
    carryable: false,
    turnRange: null,
    description: '只能施加给已倒下的队员，不能作为大世界携带状态。',
  },
  bravery: {
    label: '神勇',
    category: 'good',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '提高攻击表现。',
  },
  protect: {
    label: '护体',
    category: 'good',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '受到的物理与法术伤害减半。',
  },
  haste: {
    label: '加速',
    category: 'good',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '提高行动速度。',
  },
  dualAttack: {
    label: '连击',
    category: 'good',
    carryable: true,
    turnRange: CARRIED_STATUS_TURN_RANGE,
    description: '普通攻击可连续出手。',
  },
} as const satisfies Record<
  StatusId,
  {
    label: string
    category: 'bad' | 'good' | 'dead-only'
    carryable: boolean
    turnRange: { min: number; max: number } | null
    description: string
  }
>

export type CarryableStatusId = {
  [K in StatusId]: (typeof ACTOR_STATUS_DEFINITIONS)[K]['carryable'] extends true ? K : never
}[StatusId]

export const CARRYABLE_STATUS_IDS = Object.entries(ACTOR_STATUS_DEFINITIONS)
  .filter(([, definition]) => definition.carryable)
  .map(([status]) => status) as CarryableStatusId[]

const CARRYABLE_STATUS_ID_SET = new Set<string>(CARRYABLE_STATUS_IDS)

export function isCarryableStatusId(value: unknown): value is CarryableStatusId {
  return typeof value === 'string' && CARRYABLE_STATUS_ID_SET.has(value)
}

export interface CarriedStatus {
  status: CarryableStatusId
  turns: number
}

/** 入口新建世界时一次性消费的角色当前状态快照。 */
export interface ActorConditionSeed {
  poisonIds?: number[]
  statuses?: CarriedStatus[]
  poisonResistance?: number
}

export type ApplyActorCondition =
  | { kind: 'poison'; poisonId: number }
  | { kind: 'status'; status: CarryableStatusId; turns: number }
  | { kind: 'poisonResistance'; amount: number }

export type ClearActorCondition =
  | { kind: 'poison'; poisonId: number }
  | { kind: 'status'; status: CarryableStatusId }
  | { kind: 'poisonResistance' }

export type ActorConditionCommand =
  | { kind: 'applyActorCondition'; actor: string; condition: ApplyActorCondition }
  | { kind: 'clearActorCondition'; actor: string; condition: ClearActorCondition }

export interface ActorConditionCarrier {
  hp: number
  poisons?: ActivePoison[]
  extraStatuses?: CarriedStatus[]
  extraPoisonRes?: number
}

function assertPositiveSafeInteger(value: number, where: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${where}: 必须是正安全整数`)
}

function record(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  where: string,
): void {
  const allowedSet = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedSet.has(key)) throw new Error(`${where}.${key}: 未知字段`)
}

function nonEmptyStableId(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value)
    throw new Error(`${where}: 期望非空且无首尾空格的稳定 id`)
  return value
}

function assertCarriedStatusTurns(value: number, where: string): void {
  assertPositiveSafeInteger(value, where)
  if (value > CARRIED_STATUS_TURN_RANGE.max)
    throw new Error(`${where}: 不得大于 ${CARRIED_STATUS_TURN_RANGE.max}`)
}

/** StartWorld 与编辑器共用的快照形状守卫；跨表引用另由 validate-refs 核对。 */
export function checkActorConditionSeedShape(value: unknown, where: string): ActorConditionSeed {
  const seed = record(value, where)
  exactKeys(seed, ['poisonIds', 'statuses', 'poisonResistance'], where)
  if (seed.poisonIds !== undefined) {
    if (!Array.isArray(seed.poisonIds)) throw new Error(`${where}.poisonIds: 期望毒 id 数组`)
    const seen = new Set<number>()
    seed.poisonIds.forEach((poisonId, index) => {
      if (typeof poisonId !== 'number' || !Number.isSafeInteger(poisonId) || poisonId <= 0)
        throw new Error(`${where}.poisonIds[${index}]: 期望正安全整数 PoisonDef.id`)
      if (seen.has(poisonId))
        throw new Error(`${where}.poisonIds[${index}]: 毒 ${String(poisonId)} 重复`)
      seen.add(poisonId)
    })
  }
  if (seed.statuses !== undefined) {
    if (!Array.isArray(seed.statuses)) throw new Error(`${where}.statuses: 期望定时状态数组`)
    const seen = new Set<string>()
    seed.statuses.forEach((rawStatus, index) => {
      const statusPath = `${where}.statuses[${index}]`
      const status = record(rawStatus, statusPath)
      exactKeys(status, ['status', 'turns'], statusPath)
      if (!isCarryableStatusId(status.status))
        throw new Error(`${statusPath}.status: 状态 ${String(status.status)} 不可携带`)
      assertCarriedStatusTurns(status.turns as number, `${statusPath}.turns`)
      if (seen.has(status.status))
        throw new Error(`${statusPath}.status: 状态 ${status.status} 重复`)
      seen.add(status.status)
    })
  }
  if (seed.poisonResistance !== undefined)
    assertPositiveSafeInteger(seed.poisonResistance as number, `${where}.poisonResistance`)
  return seed as unknown as ActorConditionSeed
}

/** runtime/author 两层脚本入口共用的 exact-shape 守卫。 */
export function checkActorConditionCommandShape(value: unknown, where: string): void {
  const command = record(value, where)
  if (command.kind !== 'applyActorCondition' && command.kind !== 'clearActorCondition')
    throw new Error(`${where}.kind: 期望 applyActorCondition|clearActorCondition`)
  exactKeys(command, ['kind', 'actor', 'condition'], where)
  nonEmptyStableId(command.actor, `${where}.actor`)
  const condition = record(command.condition, `${where}.condition`)
  const conditionPath = `${where}.condition`
  if (condition.kind === 'poison') {
    exactKeys(condition, ['kind', 'poisonId'], conditionPath)
    if (
      typeof condition.poisonId !== 'number' ||
      !Number.isSafeInteger(condition.poisonId) ||
      condition.poisonId <= 0
    )
      throw new Error(`${conditionPath}.poisonId: 期望正安全整数 PoisonDef.id`)
    return
  }
  if (condition.kind === 'status') {
    exactKeys(
      condition,
      command.kind === 'applyActorCondition' ? ['kind', 'status', 'turns'] : ['kind', 'status'],
      conditionPath,
    )
    if (!isCarryableStatusId(condition.status))
      throw new Error(`${conditionPath}.status: 状态 ${String(condition.status)} 不可携带`)
    if (command.kind === 'applyActorCondition')
      assertCarriedStatusTurns(condition.turns as number, `${conditionPath}.turns`)
    return
  }
  if (condition.kind === 'poisonResistance') {
    exactKeys(
      condition,
      command.kind === 'applyActorCondition' ? ['kind', 'amount'] : ['kind'],
      conditionPath,
    )
    if (command.kind === 'applyActorCondition')
      assertPositiveSafeInteger(condition.amount as number, `${conditionPath}.amount`)
    return
  }
  throw new Error(`${conditionPath}.kind: 未知角色状态 ${String(condition.kind)}`)
}

function assertKnownPoison(
  poisonId: number,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
  where: string,
): void {
  if (!Number.isSafeInteger(poisonId) || poisonId <= 0)
    throw new Error(`${where}: 毒 id 必须是正安全整数`)
  if (!poisonDefs[poisonId]) throw new Error(`${where}: 未知毒 ${poisonId}`)
}

/**
 * 大世界携带状态的唯一叠加规则：坏状态已有则不刷新，好状态取更长回合；
 * 傀儡不在 CarryableStatusId 中，运行时非法输入也会 fail-loud。
 */
export function applyCarriedStatus(
  carrier: ActorConditionCarrier,
  status: CarryableStatusId,
  turns: number,
): boolean {
  if (!isCarryableStatusId(status))
    throw new Error(`applyCarriedStatus: 状态 ${String(status)} 不可携带`)
  assertCarriedStatusTurns(turns, 'applyCarriedStatus.turns')
  const definition = ACTOR_STATUS_DEFINITIONS[status]
  const previous = carrier.extraStatuses ?? []
  const current = previous.find((entry) => entry.status === status)
  if (definition.category === 'bad' && current && current.turns > 0) return false
  if (definition.category === 'good' && carrier.hp <= 0) return false
  const nextTurns = current ? Math.max(current.turns, turns) : turns
  if (current?.turns === nextTurns) return false
  carrier.extraStatuses = current
    ? previous.map((entry) => (entry.status === status ? { status, turns: nextTurns } : entry))
    : [...previous, { status, turns: nextTurns }]
  return true
}

export function applyTemporaryPoisonResistance(
  carrier: ActorConditionCarrier,
  amount: number,
): boolean {
  assertPositiveSafeInteger(amount, 'applyTemporaryPoisonResistance.amount')
  const previous = carrier.extraPoisonRes ?? 0
  carrier.extraPoisonRes = Math.max(previous, amount)
  return carrier.extraPoisonRes !== previous
}

/** 新建世界时直接物化确定性快照；毒不执行相克/致死链，全部从 tickIndex=0 开始。 */
export function applyActorConditionSeed(
  carrier: ActorConditionCarrier,
  seed: ActorConditionSeed,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
): void {
  const poisonIds = seed.poisonIds ?? []
  const statuses = seed.statuses ?? []
  const seenPoisons = new Set<number>()
  for (const poisonId of poisonIds) {
    assertKnownPoison(poisonId, poisonDefs, 'applyActorConditionSeed.poisonIds')
    if (seenPoisons.has(poisonId))
      throw new Error(`applyActorConditionSeed.poisonIds: 毒 ${poisonId} 重复`)
    seenPoisons.add(poisonId)
  }
  const seenStatuses = new Set<string>()
  for (const status of statuses) {
    if (!isCarryableStatusId(status.status))
      throw new Error(`applyActorConditionSeed.statuses: 状态 ${String(status.status)} 不可携带`)
    assertCarriedStatusTurns(status.turns, 'applyActorConditionSeed.statuses.turns')
    if (seenStatuses.has(status.status))
      throw new Error(`applyActorConditionSeed.statuses: 状态 ${status.status} 重复`)
    if (ACTOR_STATUS_DEFINITIONS[status.status].category === 'good' && carrier.hp <= 0)
      throw new Error(`applyActorConditionSeed.statuses: 死亡角色不能播种好状态 ${status.status}`)
    seenStatuses.add(status.status)
  }
  if (seed.poisonResistance !== undefined)
    assertPositiveSafeInteger(seed.poisonResistance, 'applyActorConditionSeed.poisonResistance')

  if (poisonIds.length > 0)
    carrier.poisons = poisonIds.map((poisonId) => ({ poisonId, tickIndex: 0 }))
  for (const status of statuses) applyCarriedStatus(carrier, status.status, status.turns)
  if (seed.poisonResistance !== undefined) carrier.extraPoisonRes = seed.poisonResistance
}

/** 剧情显式施加意图；毒必中且复用已有自毒相克/致死语义，不投抗性骰。 */
export function applyActorCondition(
  carrier: ActorConditionCarrier,
  condition: ApplyActorCondition,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
): boolean {
  switch (condition.kind) {
    case 'poison': {
      assertKnownPoison(condition.poisonId, poisonDefs, 'applyActorCondition.poisonId')
      const before = JSON.stringify({ hp: carrier.hp, poisons: carrier.poisons ?? [] })
      applyPoisonSelf(carrier, condition.poisonId, poisonDefs as Record<number, PoisonDef>)
      return before !== JSON.stringify({ hp: carrier.hp, poisons: carrier.poisons ?? [] })
    }
    case 'status':
      return applyCarriedStatus(carrier, condition.status, condition.turns)
    case 'poisonResistance': {
      return applyTemporaryPoisonResistance(carrier, condition.amount)
    }
  }
}

export function clearActorCondition(
  carrier: ActorConditionCarrier,
  condition: ClearActorCondition,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
): boolean {
  switch (condition.kind) {
    case 'poison': {
      assertKnownPoison(condition.poisonId, poisonDefs, 'clearActorCondition.poisonId')
      const previous = carrier.poisons ?? []
      const next = previous.filter((entry) => entry.poisonId !== condition.poisonId)
      if (next.length === previous.length) return false
      carrier.poisons = next
      return true
    }
    case 'status': {
      if (!isCarryableStatusId(condition.status))
        throw new Error(`clearActorCondition: 状态 ${String(condition.status)} 不可携带`)
      const previous = carrier.extraStatuses ?? []
      const next = previous.filter((entry) => entry.status !== condition.status)
      if (next.length === previous.length) return false
      carrier.extraStatuses = next
      return true
    }
    case 'poisonResistance':
      if (carrier.extraPoisonRes === undefined) return false
      delete carrier.extraPoisonRes
      return true
  }
}
