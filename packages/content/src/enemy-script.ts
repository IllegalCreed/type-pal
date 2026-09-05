import {
  type AuthorCondition,
  type BaseAuthorCommand,
  type CommandValidationOptions,
  checkAuthorCondition,
  checkBaseAuthorCommands,
} from './author-script-core.js'
import type { AiAction, AiCond } from './enemy-ai.js'
import type { LevelGrowthDelta } from './rewards.js'
import { type Command, checkCommands } from './script.js'

export type EnemyHookStateId = string
export type EnemyHookCommandId = string
export type EnemyHookChannel = 'ready' | 'turnStart'

export interface EnemyFallback {
  action: Extract<AiAction, { kind: 'cast' | 'pass' }>
  chancePercent: number
}

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

export type EnemyHookCommand =
  | { kind: 'setFallback'; fallback?: EnemyFallback }
  | {
      kind: 'effect'
      id: EnemyHookCommandId
      effect: Extract<AiAction, { kind: 'summon' | 'transform' | 'divide' }>
    }
  | BattleChoreographyAction

export type EnemyHookTransition =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: EnemyHookStateId }
  | { kind: 'advance'; state: EnemyHookStateId }
  | {
      kind: 'branch'
      cond: AiCond
      then: EnemyHookTransition
      else: EnemyHookTransition
    }
  | {
      kind: 'random'
      choices: { weight: number; then: EnemyHookTransition }[]
    }
  | {
      kind: 'commandOutcome'
      commandId: EnemyHookCommandId
      outcome: 'succeeded' | 'failed'
      then: EnemyHookTransition
      else: EnemyHookTransition
    }

export interface EnemyHookFlow {
  initial: EnemyHookStateId
  states: Record<
    EnemyHookStateId,
    {
      body: EnemyHookCommand[]
      next: EnemyHookTransition
    }
  >
}

export type EnemyOnDefeatedLeaf = Extract<
  BaseAuthorCommand,
  {
    kind:
      | 'dialog'
      | 'clearDialog'
      | 'wait'
      | 'playSound'
      | 'playMusic'
      | 'stopMusic'
      | 'giveItem'
      | 'loseItem'
      | 'giveMoney'
      | 'setFlag'
      | 'setVar'
      | 'addVar'
      | 'stopScript'
  }
>

export type EnemyOnDefeatedCommand =
  | EnemyOnDefeatedLeaf
  | {
      kind: 'branch'
      cond: AuthorCondition
      then: EnemyOnDefeatedCommand[]
      else?: EnemyOnDefeatedCommand[]
    }

export const ENEMY_HOOK_MAX_SYNC_STEPS = 64 as const

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
    throw new Error(`${path}: 期望非空且无首尾空格的 string`)
  return value
}

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path}: 期望有限数`)
  return value
}

function percent(value: unknown, path: string): number {
  const result = finite(value, path)
  if (result < 0 || result > 100) throw new Error(`${path}: 期望 0..100 有限数`)
  return result
}

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正整数`)
  return Number(value)
}

export function checkEnemyAiCondition(value: unknown, path: string): asserts value is AiCond {
  const condition = record(value, path)
  const kind = nonEmptyString(condition.kind, `${path}.kind`) as AiCond['kind']
  switch (kind) {
    case 'hpBelow':
    case 'hpAbove':
    case 'anyPlayerHpBelow':
    case 'chance':
      exactKeys(condition, ['kind', 'percent'], path)
      percent(condition.percent, `${path}.percent`)
      return
    case 'turn':
      exactKeys(condition, ['kind', 'op', 'value'], path)
      if (condition.op !== '==' && condition.op !== '>=') throw new Error(`${path}.op: 期望 ==|>=`)
      if (!Number.isInteger(condition.value) || Number(condition.value) < 0)
        throw new Error(`${path}.value: 期望非负整数`)
      return
    case 'aloneAlive':
    case 'firstOfKind':
      exactKeys(condition, ['kind'], path)
      return
    case 'allyCount':
      exactKeys(condition, ['kind', 'op', 'value'], path)
      if (condition.op !== '<=' && condition.op !== '>=') throw new Error(`${path}.op: 期望 <=|>=`)
      if (!Number.isInteger(condition.value) || Number(condition.value) < 0)
        throw new Error(`${path}.value: 期望非负整数`)
      return
    case 'playerInParty':
      exactKeys(condition, ['kind', 'role'], path)
      nonEmptyString(condition.role, `${path}.role`)
      return
    case 'difficulty':
      exactKeys(condition, ['kind', 'in'], path)
      if (!Array.isArray(condition.in) || condition.in.length === 0)
        throw new Error(`${path}.in: 期望非空难度 id 数组`)
      condition.in.forEach((entry, index) => {
        nonEmptyString(entry, `${path}.in[${index}]`)
      })
      return
    case 'all':
    case 'any':
      exactKeys(condition, ['kind', 'of'], path)
      if (!Array.isArray(condition.of)) throw new Error(`${path}.of: 期望条件数组`)
      condition.of.forEach((entry, index) => {
        checkEnemyAiCondition(entry, `${path}.of[${index}]`)
      })
      return
    case 'not':
      exactKeys(condition, ['kind', 'cond'], path)
      checkEnemyAiCondition(condition.cond, `${path}.cond`)
      return
    default:
      throw new Error(`${path}.kind: 未知敌人 AI 条件 ${String(kind)}`)
  }
}

function checkAiAction(value: unknown, path: string): asserts value is AiAction {
  const action = record(value, path)
  const kind = nonEmptyString(action.kind, `${path}.kind`) as AiAction['kind']
  const checkTarget = (): void => {
    if (
      action.target !== undefined &&
      !['random', 'lowestHp', 'highestHp', 'lowestMp', 'strongest'].includes(String(action.target))
    )
      throw new Error(`${path}.target: 未知目标策略`)
  }
  switch (kind) {
    case 'attack':
      exactKeys(action, ['kind', 'target'], path)
      checkTarget()
      return
    case 'cast':
      exactKeys(action, ['kind', 'skillId', 'target'], path)
      nonEmptyString(action.skillId, `${path}.skillId`)
      checkTarget()
      return
    case 'summon':
      exactKeys(action, ['kind', 'enemyId', 'count'], path)
      if (action.enemyId !== undefined) nonEmptyString(action.enemyId, `${path}.enemyId`)
      positiveInteger(action.count, `${path}.count`)
      return
    case 'transform':
      exactKeys(action, ['kind', 'enemyId'], path)
      nonEmptyString(action.enemyId, `${path}.enemyId`)
      return
    case 'divide':
      exactKeys(action, ['kind', 'copies'], path)
      positiveInteger(action.copies, `${path}.copies`)
      return
    case 'flee':
    case 'pass':
      exactKeys(action, ['kind'], path)
      return
    default:
      throw new Error(`${path}.kind: 未知敌人 AI 动作 ${String(kind)}`)
  }
}

export function checkEnemyFallback(value: unknown, path: string): asserts value is EnemyFallback {
  const fallback = record(value, path)
  exactKeys(fallback, ['action', 'chancePercent'], path)
  checkAiAction(fallback.action, `${path}.action`)
  const actionKind = (fallback.action as AiAction).kind
  if (actionKind !== 'cast' && actionKind !== 'pass')
    throw new Error(`${path}.action.kind: fallback 只允许 cast|pass`)
  percent(fallback.chancePercent, `${path}.chancePercent`)
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

function checkHookCommand(
  value: unknown,
  path: string,
  effectIds: Set<string>,
  options: CommandValidationOptions,
): asserts value is EnemyHookCommand {
  const command = record(value, path)
  if (command.kind === 'setFallback') {
    exactKeys(command, ['kind', 'fallback'], path)
    if (command.fallback !== undefined) checkEnemyFallback(command.fallback, `${path}.fallback`)
    return
  }
  if (command.kind === 'effect') {
    exactKeys(command, ['kind', 'id', 'effect'], path)
    const id = nonEmptyString(command.id, `${path}.id`)
    if (effectIds.has(id)) throw new Error(`${path}.id: 同一 state 内 effect id 重复 ${id}`)
    effectIds.add(id)
    checkAiAction(command.effect, `${path}.effect`)
    const effectKind = (command.effect as AiAction).kind
    if (effectKind !== 'summon' && effectKind !== 'transform' && effectKind !== 'divide')
      throw new Error(`${path}.effect.kind: effect 只允许 summon|transform|divide`)
    return
  }
  checkBattleChoreographyAction(command, path, options)
}

function checkTransition(
  value: unknown,
  path: string,
  stateIds: ReadonlySet<string>,
  effectIds: ReadonlySet<string>,
  continueTargets: Set<string>,
): asserts value is EnemyHookTransition {
  const transition = record(value, path)
  const kind = nonEmptyString(transition.kind, `${path}.kind`) as EnemyHookTransition['kind']
  switch (kind) {
    case 'stay':
    case 'restart':
      exactKeys(transition, ['kind'], path)
      return
    case 'continue':
    case 'advance': {
      exactKeys(transition, ['kind', 'state'], path)
      const state = nonEmptyString(transition.state, `${path}.state`)
      if (!stateIds.has(state)) throw new Error(`${path}.state: 未知 state ${state}`)
      if (kind === 'continue') continueTargets.add(state)
      return
    }
    case 'branch':
      exactKeys(transition, ['kind', 'cond', 'then', 'else'], path)
      checkEnemyAiCondition(transition.cond, `${path}.cond`)
      checkTransition(transition.then, `${path}.then`, stateIds, effectIds, continueTargets)
      checkTransition(transition.else, `${path}.else`, stateIds, effectIds, continueTargets)
      return
    case 'random':
      exactKeys(transition, ['kind', 'choices'], path)
      if (!Array.isArray(transition.choices) || transition.choices.length === 0)
        throw new Error(`${path}.choices: 期望非空 random 分支`)
      transition.choices.forEach((rawChoice, index) => {
        const choicePath = `${path}.choices[${index}]`
        const choice = record(rawChoice, choicePath)
        exactKeys(choice, ['weight', 'then'], choicePath)
        positiveInteger(choice.weight, `${choicePath}.weight`)
        checkTransition(choice.then, `${choicePath}.then`, stateIds, effectIds, continueTargets)
      })
      return
    case 'commandOutcome':
      exactKeys(transition, ['kind', 'commandId', 'outcome', 'then', 'else'], path)
      if (!effectIds.has(nonEmptyString(transition.commandId, `${path}.commandId`)))
        throw new Error(`${path}.commandId: 只能引用同 state 顶层 effect id`)
      if (transition.outcome !== 'succeeded' && transition.outcome !== 'failed')
        throw new Error(`${path}.outcome: 期望 succeeded|failed`)
      checkTransition(transition.then, `${path}.then`, stateIds, effectIds, continueTargets)
      checkTransition(transition.else, `${path}.else`, stateIds, effectIds, continueTargets)
      return
    default:
      throw new Error(`${path}.kind: 未知敌人 hook transition ${String(kind)}`)
  }
}

export function checkEnemyHookFlow(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is EnemyHookFlow {
  const flow = record(value, path)
  exactKeys(flow, ['initial', 'states'], path)
  const states = record(flow.states, `${path}.states`)
  const stateIds = new Set(Object.keys(states))
  if (stateIds.size === 0) throw new Error(`${path}.states: 期望至少一个 state`)
  for (const stateId of stateIds) nonEmptyString(stateId, `${path}.states 的 state id`)
  const initial = nonEmptyString(flow.initial, `${path}.initial`)
  if (!stateIds.has(initial)) throw new Error(`${path}.initial: 未知 state ${initial}`)

  const continueGraph = new Map<string, Set<string>>()
  const terminalCounts = new Map<string, number>()
  for (const [stateId, rawState] of Object.entries(states)) {
    const statePath = `${path}.states.${stateId}`
    const state = record(rawState, statePath)
    exactKeys(state, ['body', 'next'], statePath)
    if (!Array.isArray(state.body)) throw new Error(`${statePath}.body: 期望 EnemyHookCommand[]`)
    const effectIds = new Set<string>()
    let terminals = 0
    state.body.forEach((command, index) => {
      checkHookCommand(command, `${statePath}.body[${index}]`, effectIds, options)
      const kind = (command as { kind?: unknown }).kind
      if (kind === 'fleeBattle' || kind === 'endBattle') terminals += 1
    })
    if (terminals > 1)
      throw new Error(`${statePath}.body: 同一激活路径 terminal action 不得超过一个`)
    terminalCounts.set(stateId, terminals)
    const continueTargets = new Set<string>()
    checkTransition(state.next, `${statePath}.next`, stateIds, effectIds, continueTargets)
    continueGraph.set(stateId, continueTargets)
  }

  const visiting = new Set<string>()
  const memo = new Map<string, { steps: number; terminals: number }>()
  const inspectClosure = (stateId: string): { steps: number; terminals: number } => {
    const cached = memo.get(stateId)
    if (cached) return cached
    if (visiting.has(stateId))
      throw new Error(`${path}.states.${stateId}: continue 图存在无调度边界循环`)
    visiting.add(stateId)
    let steps = 1
    let terminals = terminalCounts.get(stateId) ?? 0
    for (const target of continueGraph.get(stateId) ?? []) {
      const child = inspectClosure(target)
      steps = Math.max(steps, 1 + child.steps)
      terminals = Math.max(terminals, (terminalCounts.get(stateId) ?? 0) + child.terminals)
    }
    visiting.delete(stateId)
    if (steps > ENEMY_HOOK_MAX_SYNC_STEPS)
      throw new Error(
        `${path}.states.${stateId}: synchronous continue closure 超过 ${ENEMY_HOOK_MAX_SYNC_STEPS} 步`,
      )
    if (terminals > 1)
      throw new Error(`${path}.states.${stateId}: 同一激活可达路径 terminal action 超过一个`)
    const result = { steps, terminals }
    memo.set(stateId, result)
    return result
  }
  for (const stateId of stateIds) inspectClosure(stateId)
}

export function checkEnemyAi(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): void {
  const ai = record(value, path)
  exactKeys(ai, ['resistanceToSorcery', 'rules', 'fallback', 'hooks'], path)
  if (
    !Number.isInteger(ai.resistanceToSorcery) ||
    Number(ai.resistanceToSorcery) < 0 ||
    Number(ai.resistanceToSorcery) > 10
  )
    throw new Error(`${path}.resistanceToSorcery: 期望 0..10 整数`)
  if (ai.rules !== undefined) {
    if (!Array.isArray(ai.rules)) throw new Error(`${path}.rules: 期望 AiRule[]`)
    ai.rules.forEach((rawRule, index) => {
      const rulePath = `${path}.rules[${index}]`
      const rule = record(rawRule, rulePath)
      exactKeys(rule, ['at', 'when', 'do', 'once'], rulePath)
      if (rule.at !== 'turnStart' && rule.at !== 'act')
        throw new Error(`${rulePath}.at: 期望 turnStart|act`)
      if (rule.when !== undefined) checkEnemyAiCondition(rule.when, `${rulePath}.when`)
      checkAiAction(rule.do, `${rulePath}.do`)
      if (rule.once !== undefined && typeof rule.once !== 'boolean')
        throw new Error(`${rulePath}.once: 期望 boolean`)
    })
  }
  if (ai.fallback !== undefined) checkEnemyFallback(ai.fallback, `${path}.fallback`)
  if (ai.hooks !== undefined) {
    const hooks = record(ai.hooks, `${path}.hooks`)
    exactKeys(hooks, ['ready', 'turnStart'], `${path}.hooks`)
    for (const channel of ['ready', 'turnStart'] as const)
      if (hooks[channel] !== undefined)
        checkEnemyHookFlow(hooks[channel], `${path}.hooks.${channel}`, options)
  }
}

const ON_DEFEATED_LEAF_KEYS = {
  dialog: ['kind', 'cue'],
  clearDialog: ['kind'],
  wait: ['kind', 'ms'],
  playSound: ['kind', 'asset'],
  playMusic: ['kind', 'asset'],
  stopMusic: ['kind'],
  giveItem: ['kind', 'itemId', 'count'],
  loseItem: ['kind', 'itemId', 'count'],
  giveMoney: ['kind', 'delta'],
  setFlag: ['kind', 'flag', 'value'],
  setVar: ['kind', 'var', 'value'],
  addVar: ['kind', 'var', 'delta'],
  stopScript: ['kind'],
} as const satisfies Record<EnemyOnDefeatedLeaf['kind'], readonly string[]>

export function checkEnemyOnDefeatedCommands(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is EnemyOnDefeatedCommand[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 EnemyOnDefeatedCommand[]`)
  value.forEach((rawCommand, index) => {
    const commandPath = `${path}[${index}]`
    const command = record(rawCommand, commandPath)
    const kind = nonEmptyString(command.kind, `${commandPath}.kind`)
    if (kind === 'branch') {
      exactKeys(command, ['kind', 'cond', 'then', 'else'], commandPath)
      checkAuthorCondition(command.cond, `${commandPath}.cond`)
      checkEnemyOnDefeatedCommands(command.then, `${commandPath}.then`, options)
      if (command.else !== undefined)
        checkEnemyOnDefeatedCommands(command.else, `${commandPath}.else`, options)
      return
    }
    const allowed = ON_DEFEATED_LEAF_KEYS[kind as EnemyOnDefeatedLeaf['kind']]
    if (!allowed)
      throw new Error(`${commandPath}.kind: onDefeated context 不支持命令 ${JSON.stringify(kind)}`)
    exactKeys(command, allowed, commandPath)
    checkBaseAuthorCommands([command], commandPath, options)
    if (kind === 'dialog' && !options.checkDialogueCue) checkCommands([command], commandPath)
    if (kind === 'wait' && finite(command.ms, `${commandPath}.ms`) < 0)
      throw new Error(`${commandPath}.ms: 期望非负有限数`)
    if ((kind === 'playSound' || kind === 'playMusic') && command.asset !== undefined)
      nonEmptyString(command.asset, `${commandPath}.asset`)
    if (kind === 'giveItem' || kind === 'loseItem') {
      nonEmptyString(command.itemId, `${commandPath}.itemId`)
      if (command.count !== undefined) positiveInteger(command.count, `${commandPath}.count`)
    }
    if (kind === 'giveMoney' || kind === 'setVar' || kind === 'addVar')
      finite(kind === 'giveMoney' ? command.delta : (command.value ?? command.delta), commandPath)
    if (kind === 'setFlag') {
      nonEmptyString(command.flag, `${commandPath}.flag`)
      if (typeof command.value !== 'boolean') throw new Error(`${commandPath}.value: 期望 boolean`)
    }
    if (kind === 'setVar') nonEmptyString(command.var, `${commandPath}.var`)
    if (kind === 'addVar') nonEmptyString(command.var, `${commandPath}.var`)
  })
}
