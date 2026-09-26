/**
 * TEST-GLM-CONTENT-GUARDS-2 test-only fixture：三份叶测试共用的最小合法基线与断言助手。
 * 只放当前真实类型的数据/薄构造器（无强转、无生产算法副本）；非法输入由各测试
 * 对单字段做收窄突变或以 unknown 字面量构造，不经本文件。
 */

import { expect } from 'vitest'
import type { BattleChoreographyAction } from '../battle-choreography.js'
import type { DialogueCue } from '../index.js'
import type { LevelGrowthDelta } from '../rewards.js'
import { deepSnapshot } from './glm-content-contract-fixtures.js'

/**
 * R1 精确错误路径：捕获实际 Error 并对完整 message 做全等比较。
 * `toThrow(string)` 只是子串匹配，钉不住路径前缀；失败表现为 AssertionError。
 */
export function expectExactError(run: () => unknown, message: string): void {
  let caught: unknown
  try {
    run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).message).toBe(message)
}

/**
 * R1 输入保真：对象/数组实际输入先取独立快照，守卫执行后比较同一对象未被改写。
 * 原始值（number/string）不可变，由调用方直接做值断言，不做装样子的空快照。
 * 正控意外抛出走 not.toThrow 包装：失败呈 AssertionError（裸调用会把生产原始
 * Error 直接冒成测试失败，负控判据会把这类失败判为混错）。
 */
export function expectAcceptsUnchanged<T>(run: (input: T) => void, input: T): void {
  const before = deepSnapshot(input)
  expect(() => run(input)).not.toThrow()
  expect(input).toEqual(before)
}

export function waitAction(ms: number): BattleChoreographyAction {
  return { kind: 'wait', ms }
}

export function stopMusicAction(fadeMs?: number): BattleChoreographyAction {
  return fadeMs === undefined ? { kind: 'stopMusic' } : { kind: 'stopMusic', fadeMs }
}

export function revivePartyAllAction(tenths: number): BattleChoreographyAction {
  return { kind: 'revivePartyAll', tenths }
}

export function increaseHpMpAction(
  delta: number,
  pools?: 'hp' | 'mp' | 'both',
): BattleChoreographyAction {
  return pools === undefined
    ? { kind: 'increaseHpMp', delta }
    : { kind: 'increaseHpMp', delta, pools }
}

export function growthDelta(over: Partial<LevelGrowthDelta> = {}): LevelGrowthDelta {
  return {
    level: 1,
    maxHP: 10,
    maxMP: 10,
    attack: 2,
    magicAttack: 2,
    defense: 2,
    speed: 2,
    luck: 1,
    ...over,
  }
}

export function growthAction(
  actor = 'actor.li',
  delta: LevelGrowthDelta = growthDelta(),
): BattleChoreographyAction {
  return { kind: 'applyActorGrowth', actor, delta }
}

export function castEffectAction(actor = 'actor.li'): BattleChoreographyAction {
  return { kind: 'playActorCastEffect', actor, effect: 'pre-magic-white-flash' }
}

/** 返回具体 dialog 成员而非整个联合，测试才能读取 cue 字段做身份断言。 */
export function dialogAction(cue: DialogueCue = { rows: [{ text: 'text.line' }] }): {
  kind: 'dialog'
  cue: DialogueCue
} {
  return { kind: 'dialog', cue }
}
