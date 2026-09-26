/**
 * TEST-GLM-CONTENT-GUARDS-3 G5：checkEnemyHookFlow / checkEnemyAi / checkEnemyOnDefeatedCommands 残差。
 * 去重：enemy-script.test.ts（具名 state/抗性/悬空 state/跨 state effect id/空 random/
 * 非正权重/SCC/过长 closure/多 terminal/onDefeated 宽泛命令）、enemy-script.wave2.test.ts
 * （11 行 cond 矩阵、do 正控、fallback、forbidden effect kind、onDefeated count/number）、
 * enemy-script.boundaries.test.ts（hook flow 基础边界/checkEnemyAi 结构门）、
 * validate-enemy-crosscalls G06、wave2 叶守卫 91 行——本文件只补冻结池内：
 * 未知 AI 动作、summon 无 enemyId 正控、setFallback 缺省正控、同 state effect id 重复、
 * branch 转移正控、commandOutcome outcome 叶、未知 transition、同路径双 terminal、
 * rules 数组门/once 叶、onDefeated 数组门/wait/setVar/addVar/setFlag 叶。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkEnemyAi, checkEnemyHookFlow, checkEnemyOnDefeatedCommands } from './enemy-script.js'

const hookFlow = () => ({
  initial: 'ready',
  states: { ready: { body: [], next: { kind: 'stay' } } },
})

describe('G5 enemy hook/AI/onDefeated 残差', () => {
  test('hookFlow 与最小 AI 正控通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), hookFlow())
    expectAcceptsUnchanged((value) => checkEnemyAi(value, 'ai'), { resistanceToSorcery: 0 })
  })

  test('未知 AI 动作与 summon 缺 enemyId 正控/负例', () => {
    const control = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'summon', count: 1 } }],
    }
    expectAcceptsUnchanged((value) => checkEnemyAi(value, 'ai'), control)
    const badKind = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'bogus' } }],
    }
    const before = deepSnapshot(badKind)
    expectExactError(
      () => checkEnemyAi(badKind, 'ai'),
      'ai.rules[0].do.kind: 未知敌人 AI 动作 bogus',
    )
    expect(badKind).toEqual(before)
    const badEnemyId = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'summon', enemyId: '', count: 1 } }],
    }
    expectExactError(
      () => checkEnemyAi(badEnemyId, 'ai'),
      'ai.rules[0].do.enemyId: 期望非空且无首尾空格的 string',
    )
  })

  test('setFallback 缺省正控与同 state effect id 重复拒绝', () => {
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), {
      initial: 'ready',
      states: { ready: { body: [{ kind: 'setFallback' }], next: { kind: 'stay' } } },
    })
    const bad = {
      initial: 'ready',
      states: {
        ready: {
          body: [
            { kind: 'effect', id: 'spawn', effect: { kind: 'divide', copies: 1 } },
            { kind: 'effect', id: 'spawn', effect: { kind: 'divide', copies: 1 } },
          ],
          next: { kind: 'stay' },
        },
      },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body[1].id: 同一 state 内 effect id 重复 spawn',
    )
    expect(bad).toEqual(before)
  })

  test('branch 转移正控、commandOutcome outcome 叶与未知 transition 拒绝', () => {
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), {
      initial: 'ready',
      states: {
        ready: {
          body: [],
          next: {
            kind: 'branch',
            cond: { kind: 'chance', percent: 50 },
            then: { kind: 'stay' },
            else: { kind: 'restart' },
          },
        },
      },
    })
    const badOutcome = {
      initial: 'ready',
      states: {
        ready: {
          body: [
            { kind: 'effect', id: 'spawn', effect: { kind: 'summon', enemyId: 'e', count: 1 } },
          ],
          next: {
            kind: 'commandOutcome',
            commandId: 'spawn',
            outcome: 'always',
            then: { kind: 'stay' },
            else: { kind: 'stay' },
          },
        },
      },
    }
    const outcomeBefore = deepSnapshot(badOutcome)
    expectExactError(
      () => checkEnemyHookFlow(badOutcome, 'hook'),
      'hook.states.ready.next.outcome: 期望 succeeded|failed',
    )
    expect(badOutcome).toEqual(outcomeBefore)
    const badTransition = {
      initial: 'ready',
      states: { ready: { body: [], next: { kind: 'teleport' } } },
    }
    expectExactError(
      () => checkEnemyHookFlow(badTransition, 'hook'),
      'hook.states.ready.next.kind: 未知敌人 hook transition teleport',
    )
  })

  test('同一同步路径双 terminal 拒绝（单 state 内）', () => {
    const bad = {
      initial: 'ready',
      states: {
        ready: {
          body: [{ kind: 'fleeBattle' }, { kind: 'endBattle', result: 'terminate' }],
          next: { kind: 'stay' },
        },
      },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body: 同一激活路径 terminal action 不得超过一个',
    )
    expect(bad).toEqual(before)
  })

  test('checkEnemyAi rules 数组门与 once 叶拒绝', () => {
    const control = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'pass' }, once: true }],
    }
    expectAcceptsUnchanged((value) => checkEnemyAi(value, 'ai'), control)
    const badRules = { resistanceToSorcery: 0, rules: 'x' }
    const rulesBefore = deepSnapshot(badRules)
    expectExactError(() => checkEnemyAi(badRules, 'ai'), 'ai.rules: 期望 AiRule[]')
    expect(badRules).toEqual(rulesBefore)
    const badOnce = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'pass' }, once: 'yes' }],
    }
    expectExactError(() => checkEnemyAi(badOnce, 'ai'), 'ai.rules[0].once: 期望 boolean')
  })

  test('onDefeated 数组门、wait 叶与 setVar/addVar/setFlag 正负控', () => {
    expectAcceptsUnchanged(
      (value) => checkEnemyOnDefeatedCommands(value, 'defeated'),
      [
        { kind: 'setVar', var: 'k', value: 1 },
        { kind: 'addVar', var: 'k', delta: 1 },
        { kind: 'setFlag', flag: 'f', value: true },
        { kind: 'wait', ms: 0 },
      ],
    )
    expectExactError(
      () => checkEnemyOnDefeatedCommands({}, 'defeated'),
      'defeated: 期望 EnemyOnDefeatedCommand[]',
    )
    const badWait = [{ kind: 'wait', ms: -1 }]
    const waitBefore = deepSnapshot(badWait)
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badWait, 'defeated'),
      'defeated[0].ms: 期望非负有限数',
    )
    expect(badWait).toEqual(waitBefore)
    const badValue = [{ kind: 'setVar', var: 'k', value: 'x' }]
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badValue, 'defeated'),
      'defeated[0]: 期望有限数',
    )
    const badFlag = [{ kind: 'setFlag', flag: 'f', value: 'yes' }]
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badFlag, 'defeated'),
      'defeated[0].value: 期望 boolean',
    )
  })
})
