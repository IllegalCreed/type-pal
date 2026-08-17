import type { EntityRef } from './index.js'
import type { EntityBaseV5, HostileBehaviorV5, SceneDefV5 } from './scene-v5.js'
import type {
  AuthorCommandV13,
  EntityBehaviorsV13,
  EntityPageV13,
  SceneHooksV13,
} from './script-v13.js'
import { checkAuthorCommandsV13 } from './script-v13.js'

/** JSON 仍以 number 表示；所有入口必须用 checkPositiveSafeIntV13 先验证。 */
export type PositiveSafeInt = number

export type HostileVictoryPolicyV13 =
  | { kind: 'hide'; ticks: PositiveSafeInt }
  | { kind: 'remove' }
  | { kind: 'remain' }

export type HostilePlayerFleePolicyV13 =
  | { kind: 'suspend'; ticks: PositiveSafeInt }
  | { kind: 'remain' }

/** v12 hostile 的旧 respawnSeconds 已在此边界被确定性替换。 */
export interface HostileBehaviorV13 extends Omit<HostileBehaviorV5, 'respawnSeconds' | 'onLose'> {
  onLose?: 'gameOver' | AuthorCommandV13[]
  onVictory: HostileVictoryPolicyV13
  onPlayerFlee: HostilePlayerFleePolicyV13
}

export interface EntityBaseV13
  extends Omit<EntityBaseV5, 'hostile' | 'behaviors' | 'pages' | 'initialPage'> {
  behaviors?: EntityBehaviorsV13
  pages?: EntityPageV13[]
  initialPage?: string
  hostile?: HostileBehaviorV13
}

export type EntityDefV13 = EntityBaseV13 & EntityRef

export interface SceneDefV13 extends Omit<SceneDefV5, 'entities' | 'hooks'> {
  entities: EntityDefV13[]
  hooks?: SceneHooksV13
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

export function checkPositiveSafeIntV13(
  value: unknown,
  path: string,
): asserts value is PositiveSafeInt {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正安全整数`)
}

function checkVictoryPolicy(
  value: unknown,
  path: string,
): asserts value is HostileVictoryPolicyV13 {
  const policy = record(value, path)
  if (policy.kind === 'hide') {
    exactKeys(policy, ['kind', 'ticks'], path)
    checkPositiveSafeIntV13(policy.ticks, `${path}.ticks`)
    return
  }
  if (policy.kind === 'remove' || policy.kind === 'remain') {
    exactKeys(policy, ['kind'], path)
    return
  }
  throw new Error(`${path}.kind: 期望 hide|remove|remain`)
}

function checkPlayerFleePolicy(
  value: unknown,
  path: string,
): asserts value is HostilePlayerFleePolicyV13 {
  const policy = record(value, path)
  if (policy.kind === 'suspend') {
    exactKeys(policy, ['kind', 'ticks'], path)
    checkPositiveSafeIntV13(policy.ticks, `${path}.ticks`)
    return
  }
  if (policy.kind === 'remain') {
    exactKeys(policy, ['kind'], path)
    return
  }
  throw new Error(`${path}.kind: 期望 suspend|remain`)
}

function checkChase(value: unknown, path: string): void {
  const chase = record(value, path)
  exactKeys(chase, ['range', 'speed', 'floating'], path)
  if (!Number.isFinite(chase.range) || Number(chase.range) < 0)
    throw new Error(`${path}.range: 期望非负有限数`)
  if (!Number.isFinite(chase.speed) || Number(chase.speed) <= 0)
    throw new Error(`${path}.speed: 期望正有限数`)
  if (chase.floating !== undefined && typeof chase.floating !== 'boolean')
    throw new Error(`${path}.floating: 期望 boolean`)
}

/** v13 hostile 的严格单表 guard；禁止旧 respawnSeconds/success 和隐式策略。 */
export function checkHostileBehaviorV13(
  value: unknown,
  path = 'hostile',
): asserts value is HostileBehaviorV13 {
  const hostile = record(value, path)
  exactKeys(
    hostile,
    ['enemyTeamId', 'battleFieldId', 'chase', 'onLose', 'onVictory', 'onPlayerFlee'],
    path,
  )
  if (typeof hostile.enemyTeamId !== 'string' || hostile.enemyTeamId.length === 0)
    throw new Error(`${path}.enemyTeamId: 期望非空字符串`)
  if (
    hostile.battleFieldId !== undefined &&
    (!Number.isSafeInteger(hostile.battleFieldId) || Number(hostile.battleFieldId) < 0)
  )
    throw new Error(`${path}.battleFieldId: 期望非负安全整数`)
  if (hostile.chase !== undefined) checkChase(hostile.chase, `${path}.chase`)
  if (hostile.onLose !== undefined && hostile.onLose !== 'gameOver')
    checkAuthorCommandsV13(hostile.onLose, `${path}.onLose`)
  if (hostile.onVictory === undefined) throw new Error(`${path}: 缺键 "onVictory"`)
  if (hostile.onPlayerFlee === undefined) throw new Error(`${path}: 缺键 "onPlayerFlee"`)
  checkVictoryPolicy(hostile.onVictory, `${path}.onVictory`)
  checkPlayerFleePolicy(hostile.onPlayerFlee, `${path}.onPlayerFlee`)
}
