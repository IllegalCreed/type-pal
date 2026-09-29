/**
 * TEST-GLM-NEW-H-1 专属 typed fixture harness(仅 H01–H06 测试共用)。
 * 一律走现行公开构造器(createInitialGameState / createBattleState),不用 any / 双强转。
 */
import type { BattleField, Enemy, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import {
  type BattleEnemy,
  type BattlePlayer,
  type BattleState,
  createBattleState,
} from '../../../core/battle/battle-state.js'
import { type BusEntry, type CommandBus, createCommandBus } from '../../../core/command-bus.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import type { SeedableRng } from '../../../core/rng.js'

export function makeHRole(id: number, overrides: Partial<PlayerRole> = {}): PlayerRole {
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

export function makeHEnemy(overrides: Partial<Enemy> = {}): Enemy {
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

export function makeHField(): BattleField {
  return {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
}

export interface MakeHBattleOpts {
  roles?: PlayerRole[]
  /** party roleIds(默认 [0])。 */
  party?: number[]
  /** 敌槽(已展开;null = DH1 零占位槽)。默认 [makeHEnemy()]。 */
  enemies?: Array<Enemy | null>
  isBoss?: boolean
  rng?: SeedableRng
}

export interface HBattle {
  gs: GameState
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
  drain: () => BusEntry[]
}

/** 用公开工厂 createInitialGameState + createBattleState 搭一场可结算/可派发的战斗。 */
export function makeHBattle(opts: MakeHBattleOpts = {}): HBattle {
  const roles = opts.roles ?? [makeHRole(0)]
  const party = opts.party ?? roles.map((r) => r.id)
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = party
  const playerRoles: PlayerRoles = { roles }
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: opts.enemies ?? [makeHEnemy()],
    field: makeHField(),
    isBoss: opts.isBoss ?? false,
    rng: opts.rng ?? seededRng(7),
  })
  gs.battleState = state // 生产不变量:开战后 state 挂 gs(battle-system.ts:322-323)
  const bus = createCommandBus()
  return { gs, state, playerRoles, bus, drain: () => bus.drain() }
}

/** 空闲敌槽视图(BattleEnemy 零脚本/零状态,health 可调)。 */
export function asHEnemy(slot: BattleEnemy): Enemy {
  return slot.e
}

export function hPlayers(state: BattleState): BattlePlayer[] {
  return state.players
}

export function hEnemies(state: BattleState): BattleEnemy[] {
  return state.enemies
}

/**
 * 脚本化 + 记录型 rng:rangeInclusive/rangeFloat/range 依次吃 ints/floats,并把每次调用
 * (含参数)记进 calls,用于断言「RNG 抽取顺序」(DM6 / DL6 等)。队列用尽回退 1 / 1 / lo。
 */
export function recordingRng(
  ints: number[] = [],
  floats: number[] = [],
): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let i = 0
  let f = 0
  return {
    calls,
    next: () => {
      calls.push('next')
      return 0
    },
    range: (lo: number, hi: number) => {
      calls.push(`range(${lo},${hi})`)
      const v = ints[i++] ?? lo
      return Math.min(hi - 1, Math.max(lo, v))
    },
    rangeInclusive: (lo: number, hi: number) => {
      calls.push(`rangeInclusive(${lo},${hi})`)
      const v = ints[i++] ?? 1
      return Math.min(hi, Math.max(lo, v))
    },
    rangeFloat: (lo: number, hi: number) => {
      calls.push(`rangeFloat(${lo},${hi})`)
      const v = floats[f++] ?? 1
      return Math.min(hi, Math.max(lo, v))
    },
    getState: () => 0,
  }
}

/** 固定 seq 的确定性 rng(不记录)。 */
export function seededRng(seed: number): SeedableRng {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo)),
    rangeInclusive: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    rangeFloat: (lo: number, hi: number) => lo + next() * (hi - lo),
    getState: () => state,
  }
}

export function emptyHSpell(id: number, name?: string): Spell {
  return {
    id,
    _name: name ?? `Spell${id}`,
    magicNumber: 0,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
  }
}
