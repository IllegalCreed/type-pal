/**
 * actions.test.ts —— M3 T19。
 *
 * 测试 3 个 simple action perform(attack / defend / flee)。
 * BattleState 通过 makeState helper 最小构造,与 battle-state.test.ts 风格对齐。
 */

import type { BattleField, Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createSeedableRng } from '../../rng.js'
import { performAttack } from '../actions/attack.js'
import { performDefend } from '../actions/defend.js'
import { performFlee } from '../actions/flee.js'
import type { BattleState } from '../battle-state.js'
import type { ActionQueueItem } from '../turn-queue.js'

// ============================================================================
// Fixture helpers
// ============================================================================

function makeRole(opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id: 0,
    _name: 'TestRole',
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
    ...opts,
  }
}

function makeEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
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
    health: 100,
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
    ...opts,
  }
}

interface MakeStateOpts {
  role?: Partial<PlayerRole>
  enemies?: Partial<Enemy>[]
  defending?: boolean
  isBoss?: boolean
  rngSeed?: number
  /** mock rng:固定返回此值的 rangeInclusive(逃跑判定测试用)。 */
  forceRoll?: number
}

function makeState(opts: MakeStateOpts = {}): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
} {
  const role = makeRole(opts.role)
  const enemies = (opts.enemies ?? [makeEnemy()]).map(e => makeEnemy(e))
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const baseRng = createSeedableRng(opts.rngSeed ?? 42)
  const rng = opts.forceRoll !== undefined
    ? {
        ...baseRng,
        rangeInclusive: () => opts.forceRoll!,
      }
    : baseRng

  const state: BattleState = {
    players: [{
      roleId: 0,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: opts.defending ?? false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    }],
    enemies: enemies.map(e => ({
      e: { ...e },
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
      prevHp: e.health,
      scriptOnTurnStart: 0,
      scriptOnBattleEnd: 0,
      scriptOnReady: 0,
    })),
    field,
    isBoss: opts.isBoss ?? false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng,
    phaseStallTicks: 0,
  }

  const playerRoles: PlayerRoles = { roles: [role] }
  return { state, playerRoles, bus: createCommandBus() }
}

const playerActor: ActionQueueItem = { isEnemy: false, idx: 0, dex: 30, fIsSecond: false }
const enemyActor: ActionQueueItem = { isEnemy: true, idx: 0, dex: 20, fIsSecond: false }

// ============================================================================
// performAttack
// ============================================================================

describe('performAttack', () => {
  it('player 攻击 enemy:扣 enemy.health + emit playPlayerAttack / showDamageNum', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // str = 200 + 16*6 = 296
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
      // enemy def = 10 + 11*4 = 54
      // atk(296) > def(54) → calcBase = trunc(296*2 - 54*1.6 + 0.5) = trunc(505.9) = 505
      // physRes=1 → damage = 505
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 100 - 505 → max(0, -)
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playPlayerAttack', playerIdx: 0, targetEnemyIdx: 0 })
    expect(cmds[1]!.cmd).toMatchObject({ op: 'showDamageNum', color: 'yellow' })
    expect((cmds[1]!.cmd as { value: number }).value).toBeGreaterThan(0)
  })

  it('player 低 attackStrength 攻击高 defense enemy:damage 取 1', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 1, attackStrength: 0 }, // str = 0 + 7*6 = 42
      enemies: [{ level: 50, defense: 10000, physicalResistance: 1, health: 100 }],
      // def 巨大 → calcBase = 0 → damage<=0 → 取 1
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(99) // 100 - 1
  })

  it('enemy 攻击 player:扣 role.hp + emit playEnemyAttack', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 5, defense: 10, hp: 200 },
      enemies: [{ level: 10, attackStrength: 200 }], // str = 200 + 16*6 = 296
      // player def = 10 + 11*4 = 54
      // calcBase = trunc(296*2 - 54*1.6 + 0.5) = 505 ; res=2 → 252
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(0) // 200 - 252 → max(0, -)
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 })
  })

  it('player defending → enemy 攻击 damage 显著减小(def *= 2)', () => {
    // 不 defend
    const a = makeState({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: false,
    })
    performAttack(a.state, enemyActor, 0, a.bus, a.playerRoles)
    const dmgNoDef = 1000 - a.playerRoles.roles[0]!.hp

    // defend
    const b = makeState({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: true,
    })
    performAttack(b.state, enemyActor, 0, b.bus, b.playerRoles)
    const dmgDef = 1000 - b.playerRoles.roles[0]!.hp

    expect(dmgDef).toBeLessThan(dmgNoDef)
    expect(dmgDef).toBeGreaterThan(0)
  })

  it('enemy str < 0 → clamp 到 0(sdlpal fight.c:4920)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 1, defense: 1000, hp: 100 },
      // SHORT cast:-32700 仍为负;str = -32700 + (1+6)*6 = -32658 → clamp 0
      enemies: [{ level: 1, attackStrength: -32700 }],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // str=0, def=1000+7*4=1028 → atk<=def*0.6=616.8 实际 0 → calcBase=0 → damage=1
    expect(playerRoles.roles[0]!.hp).toBe(99)
  })
})

// ============================================================================
// performDefend
// ============================================================================

describe('performDefend', () => {
  it('设 players[idx].defending = true', () => {
    const { state } = makeState({ defending: false })
    expect(state.players[0]!.defending).toBe(false)
    performDefend(state, 0)
    expect(state.players[0]!.defending).toBe(true)
  })

  it('对越界 idx 安全(不抛错)', () => {
    const { state } = makeState()
    expect(() => performDefend(state, 99)).not.toThrow()
  })
})

// ============================================================================
// performFlee
// ============================================================================

describe('performFlee', () => {
  it('fleeRate 远大于 rng 上限(roll 必小)→ phase=fleed', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 9999 },
      enemies: [{ level: 1, dexterity: 0 }],
      forceRoll: 0, // 必摇出 0
    })
    performFlee(state, 0, playerRoles)
    expect(state.phase).toBe('fleed')
  })

  it('fleeRate=0 + 多个高 dex 敌人(roll 必大)→ phase 不变', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 0 },
      enemies: [
        { level: 50, dexterity: 100 },
        { level: 50, dexterity: 100 },
      ],
      forceRoll: 1, // 任何 >0 的 roll 都击败 str=0
    })
    const before = state.phase
    performFlee(state, 0, playerRoles)
    expect(state.phase).toBe(before) // 不变
  })

  it('isBoss=true → 无论 fleeRate 多高都不可逃', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 99999 },
      enemies: [{ level: 1, dexterity: 0 }],
      isBoss: true,
      forceRoll: 0,
    })
    performFlee(state, 0, playerRoles)
    expect(state.phase).not.toBe('fleed')
  })

  it('无 enemy 时 def=0 → roll∈[0,0]=0,fleeRate>=0 → 命中', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 0 },
      enemies: [], // def 累加为 0
      forceRoll: 0,
    })
    performFlee(state, 0, playerRoles)
    expect(state.phase).toBe('fleed')
  })

  it('def 为 SHORT 负溢出 → clamp 0(sdlpal fight.c:4139)', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 0 },
      // SHORT(累加结果) < 0 → def=0;rng(0,0)=0;str=0 >= 0 → 命中
      enemies: [{ level: 1, dexterity: -32700 }],
      forceRoll: 0,
    })
    performFlee(state, 0, playerRoles)
    expect(state.phase).toBe('fleed')
  })
})
