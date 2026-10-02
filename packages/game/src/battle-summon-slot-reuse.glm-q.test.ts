// Q08 续批1 · 0x9E 正向「战中被击败空槽复用」轴（typed driver，零强转）。
//
// 排重 basis（旧锚已证，不重复）：
//   - battle-opcodes.test.ts「没有 wMaxEnemyIndex 内空槽 → 召唤失败,不会扩容新槽」（负向不扩容）
//   - 「赤鬼王[0,76,0]型开局:2 个 0 槽 = 2 个召唤房间」（初始 0 占位槽）
//   - 「w!=0 召唤指定敌人 + 满血 + 脚本/抗性」「count op1:召唤 2 只」「w=0 自身同种」等主臂
// 未覆盖条件（r6 复核指明的「正向死亡空槽复用」）：战中由活敌被击败产生的 defeated 槽
//   被后续 0x9E 复用——含 满血重置/毒与状态清零/对象身份与脚本替换/部分复用保序/容量上限。

import type { Enemy, EnemyObject } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
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
    maxHealth: init.health,
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

function battleState(roster: BattleEnemy[]): BattleState {
  return {
    players: [],
    enemies: roster,
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: {
      next: () => 0,
      range: () => 0,
      rangeInclusive: () => 0,
      rangeFloat: () => 0,
      getState: () => 0,
    },
    phaseStallTicks: 0,
  }
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
  test('复用槽非空毒残留被清零、对象身份替换（旧证之外的独立轴）', () => {
    // 排重：battle-opcodes.test.ts:1459-1479 已证 reset 满血/maxHealth/defeated=false/
    // 空毒 poisons=[]/scriptOnReady/抗性/全队位置——本例只断言两个旧证未覆盖的精确轴：
    // ①战中毒残留（非空 poisons）复用时清零；②objectId 由死亡时身份 440 替换为召唤对象 419。
    const dead = slot({ id: 40, health: 0, objectId: 440, defeated: true })
    dead.poisons = [{ poisonId: 7, scriptEntry: 2 }] // 死前中毒残留（旧例 poisons 本来为空）
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([dead, caster])
    const ctx = summonCtx(state, 1, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 1, 300], ctx)
    expect(r.consumed).toBe(true)
    expect(dead.poisons).toEqual([]) // 非空毒残留 → 复用时清零（旧例未证：旧 poisons 本来为空）
    expect(dead.objectId).toBe(419) // 对象身份 440 → 419 替换（旧例未断言 objectId）
  })

  test('同席两死亡槽只复用一间：另一间保持 defeated 与残留身份', () => {
    const deadA = slot({ id: 40, health: 0, objectId: 440, defeated: true })
    const deadB = slot({ id: 41, health: 0, objectId: 441, defeated: true })
    const caster = slot({ id: 76, health: 200, objectId: 473 })
    const state = battleState([deadA, deadB, caster])
    const ctx = summonCtx(state, 2, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 1, 0], ctx)
    expect(r.consumed).toBe(true)
    const revived = [deadA, deadB].filter((s) => !s.defeated)
    expect(revived).toHaveLength(1) // count=1 只复用一间
    expect(revived[0]!.e.id).toBe(22)
    const kept = [deadA, deadB].find((s) => s.defeated)
    expect(kept?.objectId).toBeGreaterThanOrEqual(440) // 未复用者原样
  })

  test('活敌槽绝不复用：满员 3 活 0 死 → room=0 走 fail 跳转', () => {
    const roster = [
      slot({ id: 10, health: 50, objectId: 1 }),
      slot({ id: 11, health: 50, objectId: 2 }),
      slot({ id: 12, health: 50, objectId: 3 }),
    ]
    const state = battleState(roster)
    const ctx = summonCtx(state, 0, [baseEnemy({ id: 22, health: 80 })], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9e, [419, 1, 300], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(300) // room(=0) < count(1) → fail jump
    expect(roster.every((s) => s.e.id !== 22)).toBe(true) // 无槽被改写
  })

  test('复用后全体敌人底锚按新阵容重算（PAL_BattleMakeScene 等价）', () => {
    const dead = slot({ id: 40, health: 0, objectId: 440, defeated: true })
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
