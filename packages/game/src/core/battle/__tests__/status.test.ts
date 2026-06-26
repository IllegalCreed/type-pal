import { describe, expect, it } from 'vitest'
import type { BattleState } from '../battle-state.js'
import { canAct, canCastMagic, tickStatusEffects } from '../status.js'

function makePlayerStatus(s: Partial<BattleState['players'][number]['status']>): BattleState['players'][number]['status'] {
  return {
    sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0,
    ...s,
  }
}

function makeBattleState(opts: { sleep?: number; paralyzed?: number; enemyHealth?: number; enemySilence?: number }): BattleState {
  return {
    players: [
      { roleId: 0, prevHp: 100, prevMp: 30, defending: false, status: makePlayerStatus({ sleep: opts.sleep ?? 0, paralyzed: opts.paralyzed ?? 0 }) } as any,
    ],
    enemies: [
      { e: { health: opts.enemyHealth ?? 50 } as any, status: makePlayerStatus({ silence: opts.enemySilence ?? 0 }), prevHp: 50, scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 } as any,
    ],
  } as unknown as BattleState
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
    expect(state.players[0]?.status.sleep).toBe(0)  // 不变负
  })

  it('全部 9 种 status 逐回合 -1(含 boolean 类 haste/protect/bravery/dualAttack,对齐 fight.c:1632-1638)', () => {
    const state = makeBattleState({})
    state.players[0]!.status = makePlayerStatus({
      confused: 2, paralyzed: 1, sleep: 3, silence: 1, puppet: 1,
      bravery: 5, protect: 5, haste: 5, slow: 0, dualAttack: 5,
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
    expect(s.slow).toBe(0) // 0 不变负
    expect(s.dualAttack).toBe(4)
  })

  it('paralyzed 同 sleep 同样衰减', () => {
    const state = makeBattleState({ paralyzed: 2 })
    tickStatusEffects(state)
    expect(state.players[0]?.status.paralyzed).toBe(1)
    tickStatusEffects(state)
    expect(state.players[0]?.status.paralyzed).toBe(0)
  })

  it('enemy silence 衰减(B-w0.3 扩字段)', () => {
    const state = makeBattleState({ enemyHealth: 50, enemySilence: 2 })
    tickStatusEffects(state)
    expect(state.enemies[0]?.status.silence).toBe(1)
  })

  it('dead enemy(health<=0)不 tick(避免无意义衰减)', () => {
    const state = makeBattleState({ enemyHealth: 0, enemySilence: 3 })
    tickStatusEffects(state)
    expect(state.enemies[0]?.status.silence).toBe(3)
  })

  it('canAct:sleep>0 或 paralyzed>0 → false', () => {
    const owner1 = { status: makePlayerStatus({ sleep: 2 }) }
    const owner2 = { status: makePlayerStatus({ paralyzed: 1 }) }
    const owner3 = { status: makePlayerStatus({}) }
    expect(canAct(owner1 as any)).toBe(false)
    expect(canAct(owner2 as any)).toBe(false)
    expect(canAct(owner3 as any)).toBe(true)
  })

  it('canCastMagic:silence>0 → false', () => {
    const owner1 = { status: makePlayerStatus({ silence: 2 }) }
    const owner2 = { status: makePlayerStatus({}) }
    expect(canCastMagic(owner1 as any)).toBe(false)
    expect(canCastMagic(owner2 as any)).toBe(true)
  })
})
