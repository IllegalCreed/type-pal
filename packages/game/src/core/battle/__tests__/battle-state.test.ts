import type { Enemy, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { type BattlePhase, createBattleState } from '../battle-state.js'

/**
 * BattleState 测试 —— M3 T16。
 *
 * 覆盖:工厂从 GameState + fixture 派生、players prevHp/prevMp 拷贝、enemies
 * health shallow copy、roleId 错配抛错、phase 枚举 7 种。
 */

function minimalRole(id: number): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

function minimalEnemy(id: number, health = 50): Enemy {
  return {
    id,
    _name: 'TestEnemy',
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
    health,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  }
}

describe('createBattleState', () => {
  it('从 GameState + fixture 派生', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [minimalEnemy(100)],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(42),
    })
    expect(state.phase).toBe('preBattle')
    expect(state.players).toHaveLength(1)
    expect(state.enemies).toHaveLength(1)
    expect(state.expGained).toBe(0)
    expect(state.turn).toBe(0)
    expect(state.uiState).toBe('hidden')
  })

  it('players prevHp/prevMp 拷贝战前值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const role = minimalRole(0)
    const state = createBattleState({
      gs,
      playerRoles: { roles: [role] },
      enemies: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players[0]?.prevHp).toBe(200)
    expect(state.players[0]?.prevMp).toBe(30)
  })

  it('enemies prevHp = e.health 拷贝', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createBattleState({
      gs,
      playerRoles: { roles: [] },
      enemies: [minimalEnemy(100, 75)],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.enemies[0]?.prevHp).toBe(75)
    expect(state.enemies[0]?.e.health).toBe(75)
  })

  it('未知 roleId 抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [99]
    expect(() => createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })).toThrow(/role id 99/)
  })

  it('phase 字段联合 7 种', () => {
    const phases: BattlePhase[] = ['preBattle', 'selectAction', 'performAction', 'postAction', 'won', 'lost', 'fleed']
    expect(phases).toHaveLength(7)
  })

  // ── M5.B-w0.2: PLAYER_POSITIONS 真值(sdlpal battle.c:27 g_rgPlayerPos[3][3][2])──
  it('B-w0.2:partyMembers > 3 抛错(sdlpal g_rgPlayerPos[3][3][2] 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2, 3]  // 4 个,超 3 上限
    expect(() => createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2, 3].map((i) => minimalRole(i)) },
      enemies: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })).toThrow(/最多 3 player|partyMembers.length=4 > 3/)
  })

  it('B-w0.3:status field 扩 9 种 — silence/puppet/bravery/protect/dualAttack(全 optional)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    // 新字段写入 + JSON round-trip 保留
    state.players[0]!.status.silence = 3
    state.players[0]!.status.puppet = 5
    state.players[0]!.status.bravery = true
    state.players[0]!.status.protect = true
    state.players[0]!.status.dualAttack = true
    const parsed = JSON.parse(JSON.stringify(state)) as typeof state
    expect(parsed.players[0]?.status.silence).toBe(3)
    expect(parsed.players[0]?.status.puppet).toBe(5)
    expect(parsed.players[0]?.status.bravery).toBe(true)
    expect(parsed.players[0]?.status.protect).toBe(true)
    expect(parsed.players[0]?.status.dualAttack).toBe(true)
  })

  it('B-w0.2:partyMembers <= 3 正常构造', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2]  // 3 个,边界 OK
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2].map((i) => minimalRole(i)) },
      enemies: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players).toHaveLength(3)
  })
})
