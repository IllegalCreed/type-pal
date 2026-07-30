import {
  type BattleChoreographyAction,
  ENEMY_HOOK_MAX_SYNC_STEPS,
  type EnemyFallback,
  type EnemyHookChannel,
  type EnemyHookFlow,
  type EnemyHookTransition,
  evalAiCond,
} from '@type-pal/content'
import {
  applyEnemyEffect,
  type BattleState,
  buildAiView,
  type EnemyEffectResult,
} from './battle-core.js'

export interface EnemyHookActivation {
  enemyIdx: number
  channel: EnemyHookChannel
  flow: EnemyHookFlow
  stateId: string
  commandIndex: number
  outcomes: Map<string, 'succeeded' | 'failed'>
  synchronousSteps: number
}

export type EnemyHookRuntimeStep =
  | { kind: 'action'; action: BattleChoreographyAction }
  | {
      kind: 'effect'
      commandId: string
      result: EnemyEffectResult
    }
  | { kind: 'complete' }

function cloneFallback(fallback: EnemyFallback): EnemyFallback {
  return {
    chancePercent: fallback.chancePercent,
    action: { ...fallback.action },
  }
}

export function beginEnemyHookActivation(
  state: BattleState,
  enemyIdx: number,
  channel: EnemyHookChannel,
): EnemyHookActivation | null {
  const enemy = state.enemies[enemyIdx]
  if (!enemy || enemy.hp <= 0) return null
  const flow = enemy.scriptOwnerDef.ai.hooks?.[channel]
  if (!flow) return null
  const stateId = enemy.hookCursors[channel] ?? flow.initial
  if (!flow.states[stateId])
    throw new Error(
      `${enemy.scriptOwnerDef.id}.ai.hooks.${channel}: runtime cursor 指向未知 state ${stateId}`,
    )
  return {
    enemyIdx,
    channel,
    flow,
    stateId,
    commandIndex: 0,
    outcomes: new Map(),
    synchronousSteps: 1,
  }
}

type TransitionResolution =
  | { kind: 'complete'; commit?: string }
  | { kind: 'continue'; state: string }

function resolveTransition(
  state: BattleState,
  activation: EnemyHookActivation,
  transition: EnemyHookTransition,
  rng: () => number,
): TransitionResolution {
  switch (transition.kind) {
    case 'stay':
      return { kind: 'complete' }
    case 'restart':
      return { kind: 'complete', commit: activation.flow.initial }
    case 'advance':
      return { kind: 'complete', commit: transition.state }
    case 'continue':
      return { kind: 'continue', state: transition.state }
    case 'branch': {
      const enemy = state.enemies[activation.enemyIdx]
      if (!enemy) throw new Error('enemy hook branch: 敌实例已不存在')
      return resolveTransition(
        state,
        activation,
        evalAiCond(transition.cond, buildAiView(state, enemy), rng)
          ? transition.then
          : transition.else,
        rng,
      )
    }
    case 'random': {
      const total = transition.choices.reduce((sum, choice) => sum + choice.weight, 0)
      if (!Number.isSafeInteger(total) || total <= 0)
        throw new Error('enemy hook random: runtime 权重总和非法')
      let draw = Math.min(total - 1, Math.floor(rng() * total))
      for (const choice of transition.choices) {
        if (draw < choice.weight) return resolveTransition(state, activation, choice.then, rng)
        draw -= choice.weight
      }
      throw new Error('enemy hook random: 未命中任何分支')
    }
    case 'commandOutcome': {
      const actual = activation.outcomes.get(transition.commandId)
      if (!actual)
        throw new Error(
          `enemy hook commandOutcome: 当前 activation 缺 effect ${transition.commandId} 结果`,
        )
      return resolveTransition(
        state,
        activation,
        actual === transition.outcome ? transition.then : transition.else,
        rng,
      )
    }
  }
}

/**
 * 推进一个敌 hook activation，直到产出一个需表现层执行的 action/effect 或完成。
 * setFallback 与 transition 都是同步步骤；continue closure 有独立 runtime 上限。
 */
export function nextEnemyHookStep(
  state: BattleState,
  activation: EnemyHookActivation,
  rng: () => number,
): EnemyHookRuntimeStep {
  while (true) {
    const enemy = state.enemies[activation.enemyIdx]
    if (!enemy || enemy.hp <= 0) return { kind: 'complete' }
    const flowState = activation.flow.states[activation.stateId]
    if (!flowState)
      throw new Error(
        `${enemy.scriptOwnerDef.id}.ai.hooks.${activation.channel}: runtime state ${activation.stateId} 不存在`,
      )
    const command = flowState.body[activation.commandIndex]
    if (command) {
      activation.commandIndex += 1
      if (command.kind === 'setFallback') {
        enemy.fallback = command.fallback ? cloneFallback(command.fallback) : undefined
        continue
      }
      if (command.kind === 'effect') {
        const result = applyEnemyEffect(state, activation.enemyIdx, command.effect)
        activation.outcomes.set(command.id, result.outcome)
        return { kind: 'effect', commandId: command.id, result }
      }
      return { kind: 'action', action: command }
    }

    const resolution = resolveTransition(state, activation, flowState.next, rng)
    if (resolution.kind === 'complete') {
      if (resolution.commit !== undefined) enemy.hookCursors[activation.channel] = resolution.commit
      return { kind: 'complete' }
    }
    if (!activation.flow.states[resolution.state])
      throw new Error(
        `${enemy.scriptOwnerDef.id}.ai.hooks.${activation.channel}: continue 指向未知 state ${resolution.state}`,
      )
    activation.synchronousSteps += 1
    if (activation.synchronousSteps > ENEMY_HOOK_MAX_SYNC_STEPS)
      throw new Error(
        `${enemy.scriptOwnerDef.id}.ai.hooks.${activation.channel}: synchronous closure 超过 ${ENEMY_HOOK_MAX_SYNC_STEPS} 步`,
      )
    activation.stateId = resolution.state
    activation.commandIndex = 0
    activation.outcomes = new Map()
  }
}
