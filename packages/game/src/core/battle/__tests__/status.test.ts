import { describe, expect, it } from 'vitest'
import type { BattleState } from '../battle-state.js'
import { canAct, canCastMagic, tickStatusEffects } from '../status.js'

function makePlayerStatus(s: Partial<BattleState['players'][number]['status']>): BattleState['players'][number]['status'] {
  return {
    sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false,
    ...s,
  }
}

function makeBattleState(opts: { sleep?: number; paralyzed?: number; enemyHealth?: number; enemySilence?: number }): BattleState {
  return {
    players: [
      // biome-ignore lint/suspicious/noExplicitAny: minimal fixture
      { roleId: 0, prevHp: 100, prevMp: 30, defending: false, status: makePlayerStatus({ sleep: opts.sleep ?? 0, paralyzed: opts.paralyzed ?? 0 }) } as any,
    ],
    enemies: [
      // biome-ignore lint/suspicious/noExplicitAny: minimal fixture
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
    // biome-ignore lint/suspicious/noExplicitAny: minimal owner shape
    expect(canAct(owner1 as any)).toBe(false)
    // biome-ignore lint/suspicious/noExplicitAny: minimal owner shape
    expect(canAct(owner2 as any)).toBe(false)
    // biome-ignore lint/suspicious/noExplicitAny: minimal owner shape
    expect(canAct(owner3 as any)).toBe(true)
  })

  it('canCastMagic:silence>0 → false', () => {
    const owner1 = { status: makePlayerStatus({ silence: 2 }) }
    const owner2 = { status: makePlayerStatus({}) }
    // biome-ignore lint/suspicious/noExplicitAny: minimal owner shape
    expect(canCastMagic(owner1 as any)).toBe(false)
    // biome-ignore lint/suspicious/noExplicitAny: minimal owner shape
    expect(canCastMagic(owner2 as any)).toBe(true)
  })
})
