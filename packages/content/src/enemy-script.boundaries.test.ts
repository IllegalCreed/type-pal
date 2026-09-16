/**
 * TEST-FOUNDATION-COVERAGE-1 B6：敌方脚本边界（enemy-script.ts:458-558）。
 * 既有 enemy-script.test.ts/enemy-ai.test.ts 已覆盖具名 state/effect outcome/抗性边界/
 * 悬空 state/未知字段/空 random/非正权重/SCC/过长 closure/多 terminal/choreography/
 * onDefeated 宽泛命令；本文件补 checkEnemyAi 的 rules.at/hooks 结构门与
 * checkEnemyHookFlow 的 states 空/initial 未命中/body 非数组基础边界。
 */
import { describe, expect, test } from 'vitest'
import { checkEnemyAi, checkEnemyHookFlow } from './enemy-script.js'

const hookFlow = () => ({
  initial: 'ready',
  states: {
    ready: { body: [], next: { kind: 'stay' } },
  },
})

describe('checkEnemyHookFlow · 基础边界', () => {
  test('最小 stay 流通过', () => {
    expect(() => checkEnemyHookFlow(hookFlow(), 'hook')).not.toThrow()
  })
  test('states 空对象拒绝', () => {
    expect(() => checkEnemyHookFlow({ initial: 'x', states: {} }, 'hook')).toThrow(
      /hook\.states: 期望至少一个 state/,
    )
  })
  test('initial 未命中拒绝（未知 state）', () => {
    expect(() =>
      checkEnemyHookFlow({ ...hookFlow(), initial: 'gone' }, 'hook'),
    ).toThrow(/hook\.initial: 未知 state gone/)
  })
  test('state body 非数组拒绝且 where 精确', () => {
    const flow = {
      initial: 'ready',
      states: { ready: { body: {}, next: { kind: 'stay' } } },
    }
    expect(() => checkEnemyHookFlow(flow, 'hook')).toThrow(
      /hook\.states\.ready\.body: 期望 EnemyHookCommand\[\]/,
    )
  })
})

describe('checkEnemyAi · 结构门', () => {
  const ai = (over: Record<string, unknown> = {}) => ({
    resistanceToSorcery: 0,
    ...over,
  })
  test('最小 ai（仅抗性）通过', () => {
    expect(() => checkEnemyAi(ai(), 'ai')).not.toThrow()
  })
  test('抗性 0 与 10 边界合法（既有测试已含，此处作为结构正控）', () => {
    expect(() => checkEnemyAi(ai({ resistanceToSorcery: 10 }), 'ai')).not.toThrow()
  })
  test('rules.at 非法值拒绝且 where 精确', () => {
    expect(() =>
      checkEnemyAi(ai({ rules: [{ at: 'midturn', do: { kind: 'attack' }, once: false }] }), 'ai'),
    ).toThrow(/ai\.rules\[0\]\.at: 期望 turnStart\|act/)
  })
  test('hooks 未知频道键拒绝（只允许 ready/turnStart）', () => {
    expect(() =>
      checkEnemyAi(ai({ hooks: { idle: hookFlow() } }), 'ai'),
    ).toThrow(/ai\.hooks/)
  })
  test('hooks 内嵌非法 hook flow 逐层透传拒绝', () => {
    expect(() =>
      checkEnemyAi(ai({ hooks: { ready: { initial: 'gone', states: {} } } }), 'ai'),
    ).toThrow(/ai\.hooks\.ready\.states: 期望至少一个 state/)
  })
})
