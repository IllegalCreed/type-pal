/** Reuse of defeated enemy slots through the real 0x9E dispatcher.
 * Prepared dead-slot references expose cleanup, ordering and all-or-nothing capacity.
 * Script/poison numbers are metadata only; this suite does not execute them or animations.
 */
import type { Enemy, EnemyObject } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { makeEnemyRecord } from '../../__tests__/battle-records.js'
import { makeBattle } from '../../__tests__/coverage85-glm-game/harness.js'
import type { BattleCtx } from '../event-system.js'
import { createInitialGameState } from '../game-state.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'
import type { BattleEnemy, BattleState } from './battle-state.js'

function makeSummonEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return makeEnemyRecord({
    id: 22,
    _name: 'Summoned',
    health: 80,
    exp: 5,
    cash: 10,
    level: 1,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    physicalResistance: 0,
    ...overrides,
  })
}

/** 完整 typed BattleEnemy 槽；defeated=true 时表示战中被击败的空槽。 */
function makeEnemySlot(init: {
  id: number
  health: number
  maxHealth?: number
  objectId: number
  defeated?: boolean
  status?: Partial<BattleEnemy['status']>
}): BattleEnemy {
  return {
    e: makeSummonEnemy({ id: init.id, health: init.health }),
    status: {
      sleep: 0,
      paralyzed: 0,
      confused: 0,
      haste: 0,
      slow: 0,
      ...init.status,
    },
    prevHp: init.health,
    maxHealth: init.maxHealth ?? init.health,
    objectId: init.objectId,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    resistanceToSorcery: 0,
    poisons: [],
    defeated: init.defeated ?? false,
  }
}

function makeSummonContext(
  state: BattleState,
  casterIndex: number,
  enemies: Enemy[],
  enemyObjects: EnemyObject[],
): BattleCtx {
  return {
    state,
    caster: { type: 'enemy', idx: casterIndex },
    summonTables: { enemies, enemyObjects },
    gs: createInitialGameState({ x: 0, y: 0, facing: 'down' }),
  }
}

/** Constructor-owned party/RNG/queues; retain the explicitly prepared mutable enemy slot references. */
function makeBattleWithSlots(roster: BattleEnemy[]): BattleState {
  const { state } = makeBattle({ enemies: roster.map((enemy) => enemy.e) })
  state.enemies = roster
  state.phase = 'performAction'
  state.turn = 1
  return state
}

const makeSummonObject = (objectIndex: number, enemyId: number): EnemyObject => ({
  objectIndex,
  enemyId,
  resistanceToSorcery: 3,
  scriptOnTurnStart: 11,
  scriptOnBattleEnd: 0,
  scriptOnReady: 22,
})

describe('Enemy summon defeated-slot reuse', () => {
  test('复用槽非空毒和状态残留清零、对象身份替换', () => {
    // Nonzero poison and both harmful/beneficial status expose stale-slot leakage.
    const dead = makeEnemySlot({
      id: 40,
      health: 0,
      maxHealth: 100,
      objectId: 440,
      defeated: true,
      status: { sleep: 4, confused: 3, bravery: 6 },
    })
    dead.poisons = [{ poisonId: 7, scriptEntry: 2 }] // Synthetic residue, not an executed poison script.
    const caster = makeEnemySlot({ id: 76, health: 200, objectId: 473 })
    const state = makeBattleWithSlots([dead, caster])
    const context = makeSummonContext(
      state,
      1,
      [makeSummonEnemy({ id: 22, health: 80 })],
      [makeSummonObject(419, 22)],
    )
    const result = dispatchBattleOpcode(0x9e, [419, 1, 300], context)
    expect(result.consumed).toBe(true)
    expect(dead.poisons).toEqual([])
    expect(dead.objectId).toBe(419)
    expect(dead.status).toMatchObject({ sleep: 0, confused: 0 })
    expect(dead.status.bravery ?? 0).toBe(0)
  })

  test('同席两死亡槽只复用一间：另一间保持 defeated 与残留身份', () => {
    const deadA = makeEnemySlot({
      id: 40,
      health: 0,
      maxHealth: 100,
      objectId: 440,
      defeated: true,
    })
    const deadB = makeEnemySlot({
      id: 41,
      health: 0,
      maxHealth: 100,
      objectId: 441,
      defeated: true,
    })
    const caster = makeEnemySlot({ id: 76, health: 200, objectId: 473 })
    const state = makeBattleWithSlots([deadA, deadB, caster])
    const context = makeSummonContext(
      state,
      2,
      [makeSummonEnemy({ id: 22, health: 80 })],
      [makeSummonObject(419, 22)],
    )
    const result = dispatchBattleOpcode(0x9e, [419, 1, 0], context)
    expect(result.consumed).toBe(true)
    expect(deadA).toMatchObject({ defeated: false, objectId: 419, e: { id: 22, health: 80 } })
    expect(deadB).toMatchObject({ defeated: true, objectId: 441, e: { id: 41, health: 0 } })
  })

  test('一间空槽不足两只：失败不部分复用，活槽与空槽均不改写', () => {
    const dead = makeEnemySlot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    const caster = makeEnemySlot({ id: 76, health: 200, objectId: 473 })
    const state = makeBattleWithSlots([dead, caster])
    const context = makeSummonContext(
      state,
      1,
      [makeSummonEnemy({ id: 22, health: 80 })],
      [makeSummonObject(419, 22)],
    )
    const result = dispatchBattleOpcode(0x9e, [419, 2, 300], context)
    expect(result).toEqual({ consumed: true, newIp: 300 })
    expect(dead).toMatchObject({ defeated: true, objectId: 440, e: { id: 40, health: 0 } })
    expect(caster).toMatchObject({ defeated: false, objectId: 473, e: { id: 76, health: 200 } })
  })

  test('Missing position table: reused and existing slots receive TS fallback anchors', () => {
    const dead = makeEnemySlot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    const caster = makeEnemySlot({ id: 76, health: 200, objectId: 473 })
    const state = makeBattleWithSlots([dead, caster])
    const context = makeSummonContext(
      state,
      1,
      [makeSummonEnemy({ id: 22, health: 80 })],
      [makeSummonObject(419, 22)],
    )
    dispatchBattleOpcode(0x9e, [419, 1, 0], context)
    // The context omits enemyPos: these literals describe the TS fallback contract.
    // SDLPal PAL_LoadBattleSprites reads EnemyPos data and adds yPosOffset; it has no such fallback.
    // Both prepared enemies have yPosOffset=0. Do not derive expected values from the SUT.
    expect(dead.posOriginal).toEqual({ x: 160, y: 80 })
    expect(dead.pos).toEqual({ x: 160, y: 80 })
    expect(caster.posOriginal).toEqual({ x: 100, y: 60 })
    expect(caster.pos).toEqual({ x: 100, y: 60 })
  })
})
