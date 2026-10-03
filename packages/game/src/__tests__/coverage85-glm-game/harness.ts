/**
 * TEST-COVERAGE85-GLM-GAME-1 专属 typed fixture harness。
 * 只走公开构造器/公开字段(createInitialGameState / createBattleState / setMenuCatalogs 等),
 * 不用 any / 双强转 / 业务核心 mock;各测试文件只 import 本文件,不互相依赖。
 */
import type { BattleField, Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { type BattleState, createBattleState } from '../../core/battle/battle-state.js'
import { type CommandBus, createCommandBus } from '../../core/command-bus.js'
import { createInitialGameState, type GameState } from '../../core/game-state.js'
import type { SeedableRng } from '../../core/rng.js'

export function freshGs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

/** 确定性 LCG rng(H 波同思路,本卡自持):seq 可预测,断言可用。 */
export function seqRng(seq: number[] = []): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let i = 0
  return {
    calls,
    next: () => 0,
    range: (lo: number, hi: number) => {
      calls.push(`range(${lo},${hi})`)
      const v = seq[i++] ?? lo
      return Math.min(hi - 1, Math.max(lo, v))
    },
    rangeInclusive: (lo: number, hi: number) => {
      calls.push(`rangeInclusive(${lo},${hi})`)
      const v = seq[i++] ?? lo
      return Math.min(hi, Math.max(lo, v))
    },
    rangeFloat: (lo: number, hi: number) => {
      calls.push(`rangeFloat(${lo},${hi})`)
      return lo
    },
    getState: () => 0,
  }
}

export function makeRole(id: number, overrides: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 500,
    maxMP: 40,
    hp: 500,
    mp: 40,
    attackStrength: 60,
    magicStrength: 40,
    defense: 30,
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
    ...overrides,
  }
}

export function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'Enemy100',
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
    health: 9000,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 20,
    magicStrength: 10,
    defense: 10,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...overrides,
  }
}

export function makeField(overrides: Partial<BattleField> = {}): BattleField {
  return {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    ...overrides,
  }
}

export interface BattleFixture {
  gs: GameState
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
}

/** 公开工厂 createBattleState + 生产不变量 gs.battleState 挂接。 */
export function makeBattle(
  opts: {
    roles?: PlayerRole[]
    party?: number[]
    enemies?: Array<Enemy | null>
    isBoss?: boolean
    rng?: SeedableRng
  } = {},
): BattleFixture {
  const roles = opts.roles ?? [makeRole(0)]
  const party = opts.party ?? roles.map((r) => r.id)
  const gs = freshGs()
  gs.partyMembers = party
  const playerRoles: PlayerRoles = { roles }
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: opts.enemies ?? [makeEnemy()],
    field: makeField(),
    isBoss: opts.isBoss ?? false,
    rng: opts.rng ?? seqRng(),
  })
  gs.battleState = state
  return { gs, state, playerRoles, bus: createCommandBus() }
}
