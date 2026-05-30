/**
 * throw-item.test.ts —— E2:performThrowItem(战斗投掷物)。
 *
 * 对照 sdlpal `fight.c:4332-4376`(kBattleActionThrowItem):
 *   PAL_RunTriggerScript(item.wScriptOnThrow, (WORD)sTarget);  // eventObjectID = 目标敌人
 *   PAL_AddItemToInventory(wObject, -1);                       // 投掷物消耗 1
 *
 * 投掷物 scriptOnThrow 跑 0x42 SimulateMagic 结算伤害(43 个符/镖/卵/蛊)。
 * 本测用**真 runScript** 走全链:performThrowItem → runScript → 0x42 → applyMagicDamage。
 */

import type { Command, Enemy, Item, Magic, ObjectMagicView } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { runScript } from '../../event-system.js'
import { createInitialGameState, type GameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import type { BattleState } from '../battle-state.js'
import { performThrowItem } from '../actions/throw-item.js'

function makeEnemy(opts: Partial<Enemy>): Enemy {
  // biome-ignore lint/suspicious/noExplicitAny: 只填伤害公式相关字段
  return { id: 100, health: 200, defense: 30, level: 5, poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }, ...opts } as any as Enemy
}

function makeState(enemies: Partial<Enemy>[]): BattleState {
  return {
    players: [{ roleId: 0, prevHp: 100, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
    enemies: enemies.map((e) => {
      const en = makeEnemy(e)
      return { e: en, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false }, prevHp: en.health, scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 }
    }),
    field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: { ...createSeedableRng(1), next: () => 0 }, // rngFactor 固定 1.0
    phaseStallTicks: 0,
  }
}

function makeGameState(inventory: { itemId: number, count: number }[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  gs.mode = 'battle'
  return gs
}

function makeItem(opts: Partial<Item>): Item {
  return {
    id: 66, _name: '天师符', bitmap: 0, price: 0, scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0,
    flags: { usable: false, equipable: false, throwable: true, consuming: true, applyToAll: false, sellable: true, equipableBy: [false, false, false, false, false, false] },
    ...opts,
  }
}

function objMagic(id: number, magicNumber: number): ObjectMagicView {
  return { id, magicNumber, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } }
}
function magicStat(id: number, baseDamage: number, elemental: number): Magic {
  // biome-ignore lint/suspicious/noExplicitAny: 只填伤害字段
  return { id, baseDamage, elemental, type: 'normal' } as any as Magic
}

describe('performThrowItem (E2)', () => {
  it('投掷天师符 → scriptOnThrow 跑 0x42 → 目标敌人落血 140 + 扣 inventory', () => {
    const state = makeState([{ health: 200, defense: 30, level: 5 }])
    const gs = makeGameState([{ itemId: 66, count: 2 }])
    // ip1 = 0x42 [349,0,0],ip0/ip2 = end
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x42, operands: [349, 0, 0] }, { op: 'end' }]

    performThrowItem({
      state, gs, casterIsEnemy: false, casterIdx: 0,
      itemId: 66, targetIdx: 0,
      items: [makeItem({ id: 66, scriptOnThrow: 1 })],
      magics: [magicStat(54, 140, 0)],
      objectMagics: [objMagic(349, 54)],
      bus: createCommandBus(), commands, runScript,
    })

    expect(state.enemies[0]!.e.health).toBe(60) // 140 伤害
    expect(gs.inventory[0]!.count).toBe(1) // 消耗 1
  })

  it('scriptOnThrow=0(非投掷物)→ warn + 不跑 + 不扣', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const state = makeState([{ health: 200 }])
    const gs = makeGameState([{ itemId: 5, count: 2 }])
    performThrowItem({
      state, gs, casterIsEnemy: false, casterIdx: 0,
      itemId: 5, targetIdx: 0,
      items: [makeItem({ id: 5, scriptOnThrow: 0 })],
      magics: [], objectMagics: [],
      bus: createCommandBus(), commands: [{ op: 'end' }], runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(200)
    expect(gs.inventory[0]!.count).toBe(2)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('inventory 没有该投掷物 → warn + 不跑(防御)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const state = makeState([{ health: 200 }])
    const gs = makeGameState([{ itemId: 66, count: 0 }])
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x42, operands: [349, 0, 0] }, { op: 'end' }]
    performThrowItem({
      state, gs, casterIsEnemy: false, casterIdx: 0,
      itemId: 66, targetIdx: 0,
      items: [makeItem({ id: 66, scriptOnThrow: 1 })],
      magics: [magicStat(54, 140, 0)], objectMagics: [objMagic(349, 54)],
      bus: createCommandBus(), commands, runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(200) // 没扔成 → 无伤害
    warnSpy.mockRestore()
  })
})
