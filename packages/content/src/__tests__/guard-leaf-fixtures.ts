/**
 * TEST-GLM-CONTENT-GUARDS-2 test-only fixture：三份叶测试共用的最小合法基线。
 * 只放当前真实类型的数据/薄构造器（无强转、无生产算法副本）；非法输入由各测试
 * 对单字段做收窄突变或以 unknown 字面量构造，不经本文件。
 */
import type { BattleChoreographyAction } from '../battle-choreography.js'
import type { DialogueCue } from '../index.js'
import type { LevelGrowthDelta } from '../rewards.js'

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
