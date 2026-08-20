import type { EntityRef } from './index.js'
import type {
  BaseSceneEntity,
  BaseHostileBehavior,
  BaseSceneDef,
  HostilePlayerFleePolicy,
  HostileVictoryPolicy,
  PositiveSafeInt,
} from './scene-core.js'
import type { CommandValidationOptions } from './author-script-core.js'
import type {
  RuntimeCommand,
  RuntimeEntityBehaviors,
  RuntimeEntityPage,
  RuntimeSceneHooks,
} from './runtime-script.js'
import { checkRuntimeCommands } from './runtime-script.js'

export type { HostilePlayerFleePolicy, HostileVictoryPolicy, PositiveSafeInt } from './scene-core.js'

/** 运行态 hostile 使用显式胜利与逃跑策略。 */
export interface RuntimeHostileBehavior extends Omit<BaseHostileBehavior, 'onLose'> {
  onLose?: 'gameOver' | RuntimeCommand[]
  onVictory: HostileVictoryPolicy
  onPlayerFlee: HostilePlayerFleePolicy
}

export interface RuntimeSceneEntity
  extends Omit<BaseSceneEntity, 'hostile' | 'behaviors' | 'pages' | 'initialPage'> {
  behaviors?: RuntimeEntityBehaviors
  pages?: RuntimeEntityPage[]
  initialPage?: string
  hostile?: RuntimeHostileBehavior
}

export type RuntimeEntityDef = RuntimeSceneEntity & EntityRef

export interface RuntimeSceneDef extends Omit<BaseSceneDef, 'entities' | 'hooks'> {
  entities: RuntimeEntityDef[]
  hooks?: RuntimeSceneHooks
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

export function checkPositiveSafeInt(
  value: unknown,
  path: string,
): asserts value is PositiveSafeInt {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正安全整数`)
}

function checkVictoryPolicy(
  value: unknown,
  path: string,
): asserts value is HostileVictoryPolicy {
  const policy = record(value, path)
  if (policy.kind === 'hide') {
    exactKeys(policy, ['kind', 'ticks'], path)
    checkPositiveSafeInt(policy.ticks, `${path}.ticks`)
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
): asserts value is HostilePlayerFleePolicy {
  const policy = record(value, path)
  if (policy.kind === 'suspend') {
    exactKeys(policy, ['kind', 'ticks'], path)
    checkPositiveSafeInt(policy.ticks, `${path}.ticks`)
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

/** 当前运行态 hostile 的严格单表 guard；禁止 respawnSeconds/success 和隐式策略。 */
export function checkRuntimeHostileBehavior(
  value: unknown,
  path = 'hostile',
  options: CommandValidationOptions = {},
): asserts value is RuntimeHostileBehavior {
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
    checkRuntimeCommands(hostile.onLose, `${path}.onLose`, options)
  if (hostile.onVictory === undefined) throw new Error(`${path}: 缺键 "onVictory"`)
  if (hostile.onPlayerFlee === undefined) throw new Error(`${path}: 缺键 "onPlayerFlee"`)
  checkVictoryPolicy(hostile.onVictory, `${path}.onVictory`)
  checkPlayerFleePolicy(hostile.onPlayerFlee, `${path}.onPlayerFlee`)
}
