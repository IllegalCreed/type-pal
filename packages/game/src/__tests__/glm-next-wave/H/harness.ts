/**
 * 第一阶段战斗测试共用typed fixture factories(始于TEST-GLM-NEW-H-1,亦供SDL对齐回归使用)。
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
import { createSeedableRng, type SeedableRng } from '../../../core/rng.js'

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
  /** party roleIds；默认按roles顺序取id，未传roles时为[0]。 */
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

/**
 * 公开工厂构造BattleState及直接角色输入；不hydrate运行态，也不安装完整startBattle资源。
 * 需要这些前提的结算/宿主测试须走真实初始化，不能把本helper当完整开战。
 */
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
    rng: opts.rng ?? createSeedableRng(7),
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
 * 脚本化RNG：整数方法共用ints游标，浮点方法使用floats；拒绝域外值，不静默钳制坏fixture。
 * 队列用尽取合法默认值：exclusive整数取lo，inclusive整数/浮点优先1，否则取lo。
 * 空区间返回lo且不吃队列。记录的是方法调用，不是PRNG内部抽样；next固定0、getState固定0，
 * 因此本stub不提供seed重放语义。trace在调用当时同步追加，供与脚本事件交错的顺序断言。
 */
export function recordingRng(
  ints: number[] = [],
  floats: number[] = [],
  trace?: string[],
): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let i = 0
  let f = 0
  const emit = (event: string): void => {
    calls.push(event)
    trace?.push(`rng:${event}`)
  }
  const finiteBounds = (lo: number, hi: number): void => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      throw new RangeError(`recordingRng: non-finite bounds ${lo},${hi}`)
    }
  }
  return {
    calls,
    next: () => {
      emit('next')
      return 0
    },
    range: (lo: number, hi: number) => {
      emit(`range(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = ints[i++] ?? lo
      if (!Number.isInteger(v) || v < lo || v >= hi) {
        throw new RangeError(`recordingRng.range: ${v} outside [${lo},${hi})`)
      }
      return v
    },
    rangeInclusive: (lo: number, hi: number) => {
      emit(`rangeInclusive(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = ints[i++] ?? (lo <= 1 && 1 <= hi ? 1 : lo)
      if (!Number.isInteger(v) || v < lo || v > hi) {
        throw new RangeError(`recordingRng.rangeInclusive: ${v} outside [${lo},${hi}]`)
      }
      return v
    },
    rangeFloat: (lo: number, hi: number) => {
      emit(`rangeFloat(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = floats[f++] ?? (lo <= 1 && 1 < hi ? 1 : lo)
      if (!Number.isFinite(v) || v < lo || v >= hi) {
        throw new RangeError(`recordingRng.rangeFloat: ${v} outside [${lo},${hi})`)
      }
      return v
    },
    getState: () => 0,
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
