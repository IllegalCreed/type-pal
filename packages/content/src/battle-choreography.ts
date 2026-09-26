import type { CommandValidationOptions } from './command-validation-options.js'
import { checkEnemyAiCondition } from './enemy-ai-condition-guard.js'
import { exactKeys, finite, nonEmptyString, record } from './enemy-validation-shapes.js'
import type { LevelGrowthDelta } from './rewards.js'
import { type Command, checkCommands } from './script.js'

export type BattleChoreographyAction =
  | Extract<
      Command,
      {
        kind:
          | 'dialog'
          | 'wait'
          | 'playSound'
          | 'playMusic'
          | 'fleeBattle'
          | 'endBattle'
          | 'revivePartyAll'
          | 'increaseHpMp'
      }
    >
  | { kind: 'stopMusic'; fadeMs?: number }
  | { kind: 'applyActorGrowth'; actor: string; delta: LevelGrowthDelta }
  | {
      kind: 'playActorCastEffect'
      actor: string
      effect: 'pre-magic-white-flash'
    }

function checkGrowthDelta(value: unknown, path: string): void {
  const delta = record(value, path)
  const fields = [
    'level',
    'maxHP',
    'maxMP',
    'attack',
    'magicAttack',
    'defense',
    'speed',
    'luck',
  ] as const satisfies readonly (keyof LevelGrowthDelta)[]
  exactKeys(delta, fields, path)
  for (const field of fields)
    if (!Number.isInteger(delta[field])) throw new Error(`${path}.${field}: 期望整数固定成长量`)
}

export function checkBattleChoreographyAction(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is BattleChoreographyAction {
  const action = record(value, path)
  const kind = nonEmptyString(action.kind, `${path}.kind`) as BattleChoreographyAction['kind']
  switch (kind) {
    case 'dialog':
      exactKeys(action, ['kind', 'cue'], path)
      if (options.checkDialogueCue) options.checkDialogueCue(action.cue, `${path}.cue`)
      else checkCommands([action], path)
      return
    case 'wait':
      exactKeys(action, ['kind', 'ms'], path)
      if (finite(action.ms, `${path}.ms`) < 0) throw new Error(`${path}.ms: 期望非负有限数`)
      return
    case 'playSound':
    case 'playMusic':
      exactKeys(action, ['kind', 'asset'], path)
      nonEmptyString(action.asset, `${path}.asset`)
      return
    case 'stopMusic':
      exactKeys(action, ['kind', 'fadeMs'], path)
      if (action.fadeMs !== undefined && finite(action.fadeMs, `${path}.fadeMs`) < 0)
        throw new Error(`${path}.fadeMs: 期望非负有限数`)
      return
    case 'fleeBattle':
      exactKeys(action, ['kind'], path)
      return
    case 'endBattle':
      exactKeys(action, ['kind', 'result'], path)
      if (!['terminate', 'won', 'lost'].includes(String(action.result)))
        throw new Error(`${path}.result: 期望 terminate|won|lost`)
      return
    case 'revivePartyAll':
      exactKeys(action, ['kind', 'tenths'], path)
      if (
        !Number.isInteger(action.tenths) ||
        Number(action.tenths) < 0 ||
        Number(action.tenths) > 10
      )
        throw new Error(`${path}.tenths: 期望 0..10 整数`)
      return
    case 'increaseHpMp':
      exactKeys(action, ['kind', 'delta', 'pools'], path)
      finite(action.delta, `${path}.delta`)
      if (
        action.pools !== undefined &&
        action.pools !== 'hp' &&
        action.pools !== 'mp' &&
        action.pools !== 'both'
      )
        throw new Error(`${path}.pools: 期望 hp|mp|both`)
      return
    case 'applyActorGrowth':
      exactKeys(action, ['kind', 'actor', 'delta'], path)
      nonEmptyString(action.actor, `${path}.actor`)
      checkGrowthDelta(action.delta, `${path}.delta`)
      return
    case 'playActorCastEffect':
      exactKeys(action, ['kind', 'actor', 'effect'], path)
      nonEmptyString(action.actor, `${path}.actor`)
      if (action.effect !== 'pre-magic-white-flash')
        throw new Error(`${path}.effect: 期望 pre-magic-white-flash`)
      return
    default:
      throw new Error(`${path}.kind: battle context 不支持动作 ${String(kind)}`)
  }
}

export function checkBattleChoreographyBody(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is BattleChoreographyAction[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 BattleChoreographyAction[]`)
  value.forEach((action, index) => {
    checkBattleChoreographyAction(action, `${path}[${index}]`, options)
  })
}

export function checkBattleChoreography(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): void {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 BattleChoreography[]`)
  value.forEach((rawHook, index) => {
    const hookPath = `${path}[${index}]`
    const hook = record(rawHook, hookPath)
    exactKeys(hook, ['at', 'once', 'when', 'body'], hookPath)
    if (hook.at !== 'battleStart' && hook.at !== 'turnStart')
      throw new Error(`${hookPath}.at: 期望 battleStart|turnStart`)
    if (hook.once !== undefined && typeof hook.once !== 'boolean')
      throw new Error(`${hookPath}.once: 期望 boolean`)
    if (hook.when !== undefined) checkEnemyAiCondition(hook.when, `${hookPath}.when`)
    checkBattleChoreographyBody(hook.body, `${hookPath}.body`, options)
  })
}
