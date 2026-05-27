import { describe, expect, it } from 'vitest'
import type { BattleCtx } from '../../event-system.js'
import type { BattleEnemy, BattleState } from '../battle-state.js'
import { dispatchBattleOpcode } from '../battle-opcodes.js'

function makeEnemy(health: number, magic = 0, magicRate = 0): BattleEnemy {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: minimal Enemy shape
    e: { id: 1, health, magic, magicRate } as any,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: 100,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function makeCtx(enemy: BattleEnemy): BattleCtx {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: minimal BattleState
    state: { enemies: [enemy], players: [] } as any as BattleState,
    caster: { type: 'enemy', idx: 0 },
  }
}

describe('B-w2.a battle-opcodes dispatch', () => {
  it('0x0064 jump if enemy hp > N%:hp 满 100/100 + operand[0]=50 → jump operand[1]', () => {
    const enemy = makeEnemy(100)  // prevHp 100, cur 100 → 100% > 50%
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0064, [50, 200, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(200)
  })

  it('0x0064 jump if hp > N%:hp 残 30 + operand[0]=50 → 不 jump(返回 ip 不变)', () => {
    const enemy = makeEnemy(30)  // 30/100 = 30% < 50%
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0064, [50, 200, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBeUndefined()
  })

  it('0x0067 enemy use magic:operand[0]=12, operand[1]=20 → enemy.e.magic=12, magicRate=20', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0067, [12, 20, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.magic).toBe(12)
    expect(enemy.e.magicRate).toBe(20)
  })

  it('0x0067:operand[1]=0 → magicRate 默认 10(sdlpal `script.c:2022` 真值)', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    dispatchBattleOpcode(0x0067, [5, 0, 0], ctx)
    expect(enemy.e.magicRate).toBe(10)
  })

  it('0x0061 jump if player not poisoned:简版无 poison apply → 总是 jump', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0061, [0, 300, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(300)
  })

  it('0x0069 enemy escape:enemy.e.health 设 0', () => {
    const enemy = makeEnemy(50)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0069, [0, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.health).toBe(0)
  })

  it('0x0060 immediate KO:operand[0]=0xFFFF(self)→ caster enemy health=0', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0060, [0xFFFF, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.health).toBe(0)
  })

  it('未具名 opcode 返回 consumed=false(走 raw skip)', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0xC0, [0, 0, 0], ctx)
    expect(r.consumed).toBe(false)
  })
})
