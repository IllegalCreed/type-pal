// Q08 续批1 · 0x9E 正向「战中被击败空槽复用」轴（typed driver，零强转）。
//
// 相邻合同（按具体输入/断言复用，不以文件名宣称无重叠）：
//   - battle-opcodes.test.ts「没有 wMaxEnemyIndex 内空槽 → 召唤失败,不会扩容新槽」（负向不扩容）
//   - 「赤鬼王[0,76,0]型开局:2 个 0 槽 = 2 个召唤房间」（初始 0 占位槽）
//   - 「w!=0 召唤指定敌人 + 满血 + 脚本/抗性」「count op1:召唤 2 只」「w=0 自身同种」等主臂
// 本文件的具体条件：战中由活敌被击败产生的 defeated 槽
//   被后续 0x9E 复用——含 满血重置/毒与状态清零/对象身份与脚本替换/部分复用保序/容量上限。

import type { Enemy, EnemyObject } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { makeBattle } from './__tests__/coverage85-glm-game/harness.js'
import { dispatchBattleOpcode } from './core/battle/battle-opcodes.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
import type { BattleCtx } from './core/event-system.js'
import { createInitialGameState } from './core/game-state.js'

function baseEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 22,
    _name: 'Summoned',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 80,
    exp: 5,
    cash: 10,
    level: 1,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 0,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

/** 完整 typed BattleEnemy 槽；defeated=true 时表示战中被击败的空槽。 */
function slot(init: {
  id: number
  health: number
  maxHealth?: number
  objectId: number
  defeated?: boolean
  poisons?: [{ poisonId: number; scriptEntry: number }]
  status?: Partial<BattleEnemy['status']>
}): BattleEnemy {
  return {
    e: baseEnemy({ id: init.id, health: init.health }),
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
    poisons: init.poisons ?? [],
    defeated: init.defeated ?? false,
  }
}

function summonCtx(
  state: BattleState,
  casterIdx: number,
  enemies: Enemy[],
  enemyObjects: EnemyObject[],
): BattleCtx {
  return {
    state,
    caster: { type: 'enemy', idx: casterIdx },
    summonTables: { enemies, enemyObjects },
    gs: createInitialGameState({ x: 0, y: 0, facing: 'down' }),
  }
}

/** Constructor-owned party/RNG/queues; retain the explicitly prepared mutable enemy slot references. */
function battleState(roster: BattleEnemy[]): BattleState {
  const { state } = makeBattle({ enemies: roster.map((enemy) => enemy.e) })
  state.enemies = roster
  state.phase = 'performAction'
  state.turn = 1
  return state
}

const ENEMY_OBJ = (objectIndex: number, enemyId: number): EnemyObject => ({
  objectIndex,
  enemyId,
  resistanceToSorcery: 3,
  scriptOnTurnStart: 11,
  scriptOnBattleEnd: 0,
  scriptOnReady: 22,
})

describe('Q08 0x9E 正向死亡空槽复用（战中击败槽，非初始 0 占位）', () => {
  test('复用槽非空毒残留被清零、对象身份替换', () => {
    // 主测0x9E指定召唤例已证满血/maxHealth/defeated=false/
    // 空毒 poisons=[]/scriptOnReady/抗性/全队位置——本例只断言两个旧证未覆盖的精确轴：
    // ①战中毒残留（非空 poisons）复用时清零；②objectId 由死亡时身份 440 替换为召唤对象 419。
    const dead = slot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    dead.poisons = [{ poisonId: 7, scriptEntry: 2 }] // 死前中毒残留（旧例 poisons 本来为空）
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([dead, caster])
    const ctx = summonCtx(state, 1, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 1, 300], ctx)
    expect(r.consumed).toBe(true)
    expect(dead.poisons).toEqual([]) // 非空毒残留 → 复用时清零（旧例未证：旧 poisons 本来为空）
    expect(dead.objectId).toBe(419) // 对象身份 440 → 419 替换（核死亡前旧身份替换）
  })

  test('同席两死亡槽只复用一间：另一间保持 defeated 与残留身份', () => {
    const deadA = slot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    const deadB = slot({ id: 41, health: 0, maxHealth: 100, objectId: 441, defeated: true })
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([deadA, deadB, caster])
    const ctx = summonCtx(state, 2, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 1, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(deadA).toMatchObject({ defeated: false, objectId: 419, e: { id: 22, health: 80 } })
    expect(deadB).toMatchObject({ defeated: true, objectId: 441, e: { id: 41, health: 0 } })
  })

  test('一间空槽不足两只：失败不部分复用，活槽与空槽均不改写', () => {
    const dead = slot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([dead, caster])
    const ctx = summonCtx(state, 1, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 2, 300], ctx)
    expect(r).toEqual({ consumed: true, newIp: 300 })
    expect(dead).toMatchObject({ defeated: true, objectId: 440, e: { id: 40, health: 0 } })
    expect(caster).toMatchObject({ defeated: false, objectId: 473, e: { id: 76, health: 200 } })
  })

  test('复用后全体敌人底锚按新阵容重算（PAL_BattleMakeScene 等价）', () => {
    const dead = slot({ id: 40, health: 0, maxHealth: 100, objectId: 440, defeated: true })
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([dead, caster])
    const ctx = summonCtx(state, 1, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    dispatchBattleOpcode(0x9e, [419, 1, 0], ctx)
    // 一手固定坐标 oracle（sdlpal g_rgEnemyPos fallback 布局前两位 + battle.c:939
    // yPosOffset 平移；不用产品 getEnemyBasePos 计算 expected，防断言自适应）。
    // 阵容 2 敌 → layout[0]={160,80}、layout[1]={100,60}；两敌 yPosOffset 均 0。
    expect(dead.posOriginal).toEqual({ x: 160, y: 80 })
    expect(dead.pos).toEqual({ x: 160, y: 80 })
    expect(caster.posOriginal).toEqual({ x: 100, y: 60 })
    expect(caster.pos).toEqual({ x: 100, y: 60 })
  })
})
