/** TEST-GLM-WAVE-O-1 O08/O09：敌脚本 guard 与世界变量初始化残余合同。
 *  旧证：enemy-script.boundaries / world-variable.boundaries 覆盖主干；本卡按 gap-map
 *  直击未覆盖臂：checkEnemyFallback chance 域、checkEnemyHookFlow 状态结构、
 *  initialWorldVariablesV1 fresh-record 语义与 sys: 命名空间保留轴。
 */
import { describe, expect, test } from 'vitest'
import { checkEnemyAi, checkEnemyFallback, checkEnemyHookFlow } from './enemy-script.js'
import {
  initialWorldVariablesV1,
  validateWorldVariableRegistryV1,
  type WorldVariableRegistryV1,
} from './world-variable.js'

describe('O08 checkEnemyFallback：兜底行动域', () => {
  const fallback = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    action: { kind: 'cast', skillId: '1' },
    chancePercent: 25,
    ...over,
  })

  test('合法 cast/pass 通过；chancePercent 越界拒绝', () => {
    expect(() => checkEnemyFallback(fallback(), 'p')).not.toThrow()
    expect(() =>
      checkEnemyFallback(fallback({ action: { kind: 'pass' }, chancePercent: 0 }), 'p'),
    ).not.toThrow()
    expect(() => checkEnemyFallback(fallback({ chancePercent: -1 }), 'p')).toThrow(/chancePercent/)
    expect(() => checkEnemyFallback(fallback({ chancePercent: 101 }), 'p')).toThrow(/chancePercent/)
  })

  test('action 非法 kind（attack 不属 fallback 域）拒绝', () => {
    expect(() => checkEnemyFallback(fallback({ action: { kind: 'attack' } }), 'p')).toThrow(
      /action/,
    )
  })
})

describe('O08 checkEnemyHookFlow：游标程序状态结构', () => {
  const flow = (states: Record<string, unknown>): Record<string, unknown> => ({
    initial: 'ready',
    states,
  })
  const state = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    body: [],
    next: { kind: 'stay' },
    ...over,
  })

  test('合法状态机通过；initial 未命中状态拒绝', () => {
    expect(() => checkEnemyHookFlow(flow({ ready: state() }), 'p')).not.toThrow()
    expect(() => checkEnemyHookFlow(flow({ ghost: state() }), 'p')).toThrow(/initial/)
  })

  test('空 states / 状态缺 body 拒绝', () => {
    expect(() => checkEnemyHookFlow(flow({}), 'p')).toThrow()
    expect(() => checkEnemyHookFlow(flow({ ready: { next: { kind: 'stay' } } }), 'p')).toThrow()
  })

  test('transition 分支递归（branch 深层 transition 校验）', () => {
    expect(() =>
      checkEnemyHookFlow(
        flow({
          ready: state({
            next: {
              kind: 'branch',
              cond: { kind: 'playerInParty', role: 'hero' },
              then: { kind: 'stay' },
              else: { kind: 'restart' },
            },
          }),
        }),
        'p',
      ),
    ).not.toThrow()
  })
})

describe('O08 checkEnemyAi：顶层聚合', () => {
  const ai = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    resistanceToSorcery: 5,
    rules: [],
    ...over,
  })

  test('resistanceToSorcery 越界（>10）拒绝；合法通过', () => {
    expect(() => checkEnemyAi(ai(), 'p')).not.toThrow()
    expect(() => checkEnemyAi(ai({ resistanceToSorcery: 11 }), 'p')).toThrow(/resistanceToSorcery/)
  })

  test('rules 元素 at 域拒绝（合法 turnStart/act）', () => {
    expect(() =>
      checkEnemyAi(ai({ rules: [{ at: 'turnStart', do: { kind: 'attack' } }] }), 'p'),
    ).not.toThrow()
    expect(() => checkEnemyAi(ai({ rules: [{ at: 'wat', do: { kind: 'attack' } }] }), 'p')).toThrow(
      /at/,
    )
  })
})

describe('O09 initialWorldVariablesV1：fresh-record 初始化', () => {
  const registry: WorldVariableRegistryV1 = {
    bossDefeated: { kind: 'flag', name: '首领已败', description: '', initial: false },
    affection: { kind: 'number', name: '好感', description: '', initial: 3 },
  }

  test('flag/number 分桶到 flags/vars 且值来自 initial', () => {
    const initial = initialWorldVariablesV1(registry)
    expect(initial).toEqual({ flags: { bossDefeated: false }, vars: { affection: 3 } })
  })

  test('空 registry → 双空桶；输入 registry 不被引用泄漏（fresh records）', () => {
    const initial = initialWorldVariablesV1({})
    expect(initial).toEqual({ flags: {}, vars: {} })
    const mutated = initialWorldVariablesV1(registry)
    mutated.flags.bossDefeated = true
    expect(registry.bossDefeated?.initial).toBe(false)
    // 再取一次仍以 registry.initial 为真源。
    expect(initialWorldVariablesV1(registry).flags.bossDefeated).toBe(false)
  })

  test('sys: 命名空间保留给引擎（registry 校验拒绝）', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        'sys:battleField': { kind: 'flag', name: 'n', description: '', initial: true },
      }),
    ).toThrow('sys: 命名空间保留给引擎')
  })
})
