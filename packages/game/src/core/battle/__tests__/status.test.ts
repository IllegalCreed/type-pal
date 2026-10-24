import { describe, expect, it } from 'vitest'
import { makeHBattle, makeHEnemy, makeHRole } from '../../../__tests__/glm-next-wave/H/harness.js'
import type { BattleState } from '../battle-state.js'
import { canAct, canCastMagic, tickStatusEffects } from '../status.js'

function makePlayerStatus(
  s: Partial<BattleState['players'][number]['status']>,
): BattleState['players'][number]['status'] {
  return {
    sleep: 0,
    paralyzed: 0,
    confused: 0,
    haste: 0,
    slow: 0,
    ...s,
  }
}

function makeBattleState(opts: {
  sleep?: number
  paralyzed?: number
  enemyHealth?: number
  enemySilence?: number
}): BattleState {
  const { state } = makeHBattle({
    roles: [makeHRole(0)],
    enemies: [makeHEnemy({ health: opts.enemyHealth ?? 50 })],
  })
  state.players[0]!.status = makePlayerStatus({
    sleep: opts.sleep ?? 0,
    paralyzed: opts.paralyzed ?? 0,
  })
  state.enemies[0]!.status = makePlayerStatus({ silence: opts.enemySilence ?? 0 })
  return state
}

describe('B-w1.a status tick', () => {
  it('每回合 -1:sleep=3 → 2 → 1 → 0(到 0 不再衰减)', () => {
    const state = makeBattleState({ sleep: 3 })
    tickStatusEffects(state)
    expect(state.players[0]?.status.sleep).toBe(2)
    tickStatusEffects(state)
    expect(state.players[0]?.status.sleep).toBe(1)
    tickStatusEffects(state)
    expect(state.players[0]?.status.sleep).toBe(0)
    tickStatusEffects(state)
    expect(state.players[0]?.status.sleep).toBe(0) // 不变负
  })

  it('全部 9 种 status 逐回合 -1(含 boolean 类 haste/protect/bravery/dualAttack,对齐 fight.c:1632-1638)', () => {
    const state = makeBattleState({})
    state.players[0]!.status = makePlayerStatus({
      confused: 2,
      paralyzed: 1,
      sleep: 3,
      silence: 1,
      puppet: 1,
      bravery: 5,
      protect: 5,
      haste: 5,
      slow: 4,
      dualAttack: 1000,
    })
    tickStatusEffects(state)
    const s = state.players[0]!.status
    expect(s.confused).toBe(1)
    expect(s.paralyzed).toBe(0)
    expect(s.sleep).toBe(2)
    expect(s.silence).toBe(0)
    expect(s.puppet).toBe(0)
    // boolean 类(sdlpal 全是 WORD 计数器,统一递减)
    expect(s.bravery).toBe(4)
    expect(s.protect).toBe(4)
    expect(s.haste).toBe(4)
    expect(s.slow).toBe(3)
    expect(s.dualAttack).toBe(999) // 装备状态也参与回合递减;战后清理另按 >999 判断
  })

  it('enemy silence 衰减(B-w0.3 扩字段)', () => {
    const state = makeBattleState({ enemyHealth: 50, enemySilence: 2 })
    tickStatusEffects(state)
    expect(state.enemies[0]?.status.silence).toBe(1)
  })

  it('dead enemy 仍按回合末递减 status（对齐 fight.c:1655-1661 的全槽遍历）', () => {
    const state = makeBattleState({ enemyHealth: 0, enemySilence: 3 })
    tickStatusEffects(state)
    expect(state.enemies[0]?.status.silence).toBe(2)
  })

  it('canAct:sleep>0 或 paralyzed>0 → false', () => {
    const owner = makeBattleState({ sleep: 2 }).players[0]!
    expect(canAct(owner)).toBe(false)
    owner.status = makePlayerStatus({ paralyzed: 1 })
    expect(canAct(owner)).toBe(false)
    owner.status = makePlayerStatus({ confused: 1 })
    expect(canAct(owner)).toBe(true) // 混乱由上层改派攻击,不属跳过行动
  })

  it('canCastMagic:silence>0 → false', () => {
    const owner = makeBattleState({}).players[0]!
    owner.status.silence = 2
    expect(canCastMagic(owner)).toBe(false)
    owner.status.silence = 0
    expect(canCastMagic(owner)).toBe(true)
  })
})
