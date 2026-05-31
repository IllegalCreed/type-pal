/**
 * actions.test.ts —— M3 T19。
 *
 * 测试 3 个 simple action perform(attack / defend / flee)。
 * BattleState 通过 makeState helper 最小构造,与 battle-state.test.ts 风格对齐。
 */

import type { BattleField, Command, Enemy, Item, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createInitialGameState, type GameState, type InventoryEntry } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { performAttack } from '../actions/attack.js'
import { performDefend } from '../actions/defend.js'
import { performFlee } from '../actions/flee.js'
import { performItem } from '../actions/item.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import { runScript, setObjectPoisons } from '../../event-system.js'
import type { BattleState, BattleStatus } from '../battle-state.js'
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
  /** mock rng:固定返回此值的 rangeInclusive(逃跑判定 / crit / jitter 测试用)。 */
  forceRoll?: number
  /** mock rng:固定返回此值的 rangeFloat(D3 伤害浮动 RandomFloat 精确断言用)。 */
  forceFloat?: number
  /** 覆盖玩家战斗状态(bravery/dualAttack 等,D3 crit / 双击测试用)。 */
  playerStatus?: Partial<BattleStatus>
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
  const rng = (opts.forceRoll !== undefined || opts.forceFloat !== undefined)
    ? {
        ...baseRng,
        ...(opts.forceRoll !== undefined ? { rangeInclusive: () => opts.forceRoll! } : {}),
        ...(opts.forceFloat !== undefined ? { rangeFloat: () => opts.forceFloat! } : {}),
      }
    : baseRng

  const state: BattleState = {
    players: [{
      roleId: 0,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: opts.defending ?? false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, ...opts.playerStatus },
    }],
    enemies: enemies.map(e => ({
      e: { ...e },
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
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
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
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

/**
 * 按序回放 rangeInclusive / rangeFloat 的脚本化 rng(D3 多次 RNG 调用精确控制用)。
 * ints 依次喂 rangeInclusive(jitter→crit roll→李逍遥 roll …),floats 依次喂 rangeFloat。
 * 用尽后 ints 回退 1 / floats 回退 1。
 */
function scriptedRng(ints: number[], floats: number[] = []) {
  const base = createSeedableRng(1)
  let i = 0
  let f = 0
  return {
    ...base,
    rangeInclusive: () => ints[i++] ?? 1,
    rangeFloat: () => floats[f++] ?? 1,
  }
}

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
    // D17b:敌人掉血 → blue(sdlpal fight.c:648-651,sDamage<0);target={kind:'enemy',idx:0}
    expect(cmds[1]!.cmd).toMatchObject({ op: 'showDamageNum', color: 'blue', target: { kind: 'enemy', idx: 0 } })
    expect((cmds[1]!.cmd as { value: number }).value).toBeGreaterThan(0)
  })

  it('群攻(target=-1,attackAll 武器):player 攻击全体活敌(命中序 + division 减半)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // str=296;每敌 def=54 → base 506
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
      forceRoll: 1, // crit roll=1(不暴击)
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // sdlpal fight.c:3684 命中序 {2,1,0,4,3};2 敌(slot 0/1)→ slot1 先打(division1,全额 506)
    //   → slot0 后打(division2,506/2=253)。trunc(600-x)。
    expect(state.enemies[1]!.e.health).toBe(94) // 600-506(满额,先打)
    expect(state.enemies[0]!.e.health).toBe(347) // 600-253(半额,后打)
    const ops = bus.drain().map(c => c.cmd.op)
    expect(ops.filter(o => o === 'showDamageNum')).toHaveLength(2) // 2 敌 2 个伤害数字
    expect(ops).toContain('playPlayerAttack')
  })

  it('群攻跳过已死敌人(死敌不计 division)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 0 }, // 已死(skip,不双 division)
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
      forceRoll: 1,
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 死敌不动
    // 仅 slot1 活 → division 全程 1 → 全额 506
    expect(state.enemies[1]!.e.health).toBe(94)
  })

  // ── D3-b 群攻 crit + division 逐敌减半(fight.c:3681-3748)────────────────────

  it('D3:群攻 division 逐敌减半(3 敌,命中序 {2,1,0})', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 506
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot0:division4 → 126.5
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot1:division2 → 253
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot2:division1 → 506
      ],
      forceRoll: 1, // 不暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[2]!.e.health).toBe(2000 - 506) // 先打,全额
    expect(state.enemies[1]!.e.health).toBe(2000 - 253) // 半额
    expect(state.enemies[0]!.e.health).toBe(1873) // 506/4=126.5 → trunc(2000-126.5)=1873
  })

  it('D3:群攻 bravery → 全敌暴击 ×3', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 506
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { bravery: 1 },
      forceRoll: 1, // crit roll≠0,但 bravery 强制暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(5000 - 506 * 3) // 单敌 division1,506*3=1518
  })

  // ── D3 DualAttack 双击武器(仙女剑/玄冥宝刀 等,fight.c:3628/3681 t-loop)──────

  it('D3:DualAttack 武器 → 单体攻击两次', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 506,+jitter1=507
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, // 不暴击;jitter=1
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 507 * 2) // 两次各 507 = 1014
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    expect(dmgNums).toHaveLength(2) // 两次攻击 → 两个伤害数字
  })

  it('D3:无 DualAttack → 单体只攻击一次(对照)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      forceRoll: 1,
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 507) // 一次 507
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    expect(dmgNums).toHaveLength(1)
  })

  it('D3:DualAttack + attackAll(玄冥宝刀)→ 全体攻击两次', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 506
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, // 不暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // 两 sweep,每 sweep division 重置 1 → 单敌各全额 506 → 共 1012
    expect(state.enemies[0]!.e.health).toBe(5000 - 506 * 2)
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    expect(dmgNums).toHaveLength(2)
  })

  it('player 低 attackStrength 攻击高 defense enemy:damage 取 1', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 1, attackStrength: 0 }, // str = 0 + 7*6 = 42
      enemies: [{ level: 50, defense: 10000, physicalResistance: 1, health: 100 }],
      // def 巨大 → calcBase = 0;+jitter(1) → 1;无 crit;×float(1) → 1;max(1)=1
      forceRoll: 1, // jitter=1 / crit roll=1(≠0 不暴击)
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(99) // 100 - 1
  })

  // ── D3-a 单体物理攻击公式真值(fight.c:3636-3663)──────────────────────────
  // damage = CalcPhysical(str,def,res) + RandomLong(1,2) → crit(×3) → 李逍遥(×2)
  //          → ×RandomFloat(1,1.125) → max(1)

  it('D3:单体伤害含 RandomLong(1,2) jitter(无暴击,base+1)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base = 506(296*2-54*1.6+0.5)
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      forceRoll: 1, // jitter=1;crit roll=1(不暴击)
      forceFloat: 1, // 浮动 ×1
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 507) // base506 + jitter1 = 507
  })

  it('D3:jitter 取 2 时 damage = base+2', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      forceRoll: 2, // jitter=2;crit roll=2(不暴击)
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 508) // base506 + jitter2 = 508
  })

  it('D3:bravery 状态 → 必暴击 ×3(fight.c:3640)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 506
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { bravery: 1 },
      forceRoll: 1, // jitter=1;crit roll 即使 1(≠0)也因 bravery 暴击
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 507 * 3) // (506+1)*3 = 1521
  })

  it('D3:RandomFloat(1,1.125) 末乘浮动(forceFloat=1.125)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 1000 }],
      forceRoll: 1, // jitter=1 / 不暴击
      forceFloat: 1.125,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    // trunc((506+1) * 1.125) = trunc(570.375) = 570
    expect(state.enemies[0]!.e.health).toBe(1000 - 570)
  })

  it('D3:李逍遥(role 0)额外暴击 ×2(fight.c:3649,RandomLong(0,11)==0)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { id: 0, level: 10, attackStrength: 200 }, // role 0 = 李逍遥;base 506
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
    })
    // 脚本化:jitter=1,crit roll=3(≠0 无普通暴击),李逍遥 roll=0(×2),float=1
    state.rng = scriptedRng([1, 3, 0], [1])
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 507 * 2) // (506+1)*2 = 1014
  })

  it('enemy 攻击 player:扣 role.hp + emit playEnemyAttack', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 5, defense: 10, hp: 200 },
      enemies: [{ level: 10, attackStrength: 200 }], // str = 200 + 16*6 = 296
      forceRoll: 0, // 关闭随机 fAutoDefend(0>=10 false)+ jitter=0
      // player def = 10(无 level 项,c2 修);calcBase=trunc(296*2-10*1.6+0.5)=576;/2=288 → 击杀
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(0) // 200 - 252 → max(0, -)
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 })
    // D17b:player 掉血 → blue,target={kind:'player',idx:0};value=钳后 delta=200(被打死)
    expect(cmds[1]!.cmd).toMatchObject({ op: 'showDamageNum', color: 'blue', target: { kind: 'player', idx: 0 } })
    expect((cmds[1]!.cmd as { value: number }).value).toBe(200)
  })

  // ── B2 c2:enemy→player 物理公式真值(fight.c:4917-4929 + 5056-5075)──────────
  // def = PlayerDefense(基础+装备防,**无 level 项**)×(defending?2:1);physRes 硬编码 2;
  // sDamage = CalcPhysical(str+RandomLong(0,2), def, 2) + RandomLong(0,1);Protect→/=2

  it('B2:enemy→player def 无 (level+6)*4 项(global.c:1821-1826 真值;修旧 bug)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, defense: 100, hp: 5000 }, // def 真值=100(旧 bug:+ (10+6)*4=164)
      enemies: [{ level: 5, attackStrength: 500 }], // str = 500 + (5+6)*6 = 566
      forceRoll: 0, // str jitter=0 / damage jitter=0
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // base = trunc(566*2 - 100*1.6 + 0.5)=972;/physRes2=486;+0
    expect(5000 - playerRoles.roles[0]!.hp).toBe(486) // 旧 bug 值会是 435(def 164)
  })

  it('B2:enemy→player str+RandomLong(0,2) jitter(forceRoll=2 → str+2 伤害更高)', () => {
    const base = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 0,
    })
    performAttack(base.state, enemyActor, 0, base.bus, base.playerRoles)
    const dmg0 = 5000 - base.playerRoles.roles[0]!.hp

    const hi = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 2, // str+2 + damage jitter+2
    })
    performAttack(hi.state, enemyActor, 0, hi.bus, hi.playerRoles)
    const dmg2 = 5000 - hi.playerRoles.roles[0]!.hp
    expect(dmg2).toBeGreaterThan(dmg0) // jitter 真加进伤害
  })

  it('B2:enemy→player Protect 状态 → 伤害 /=2(fight.c:5059-5062)', () => {
    const noProt = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 0,
    })
    performAttack(noProt.state, enemyActor, 0, noProt.bus, noProt.playerRoles)
    const dmgNo = 5000 - noProt.playerRoles.roles[0]!.hp // 486

    const prot = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 0,
      playerStatus: { protect: 1 },
    })
    performAttack(prot.state, enemyActor, 0, prot.bus, prot.playerRoles)
    const dmgProt = 5000 - prot.playerRoles.roles[0]!.hp
    expect(dmgProt).toBe(Math.trunc(dmgNo / 2)) // 486 → 243
  })

  // ── B2 c3a:fAutoDefend 自动防御全闪避(fight.c:4938 + 5052 !fAutoDefend gate)──────
  it('B2:fAutoDefend(RandomLong(0,16)>=10)命中 → 整次免伤(全闪避)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 10, // rangeInclusive(0,16)=10 → 10>=10 → fAutoDefend true → 闪避
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(5000) // 全闪避,血不掉
  })

  it('B2:fAutoDefend 未命中(forceRoll=0 → 0>=10 false)→ 正常结算', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 0, // 0>=10 false → 不闪避
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBeLessThan(5000) // 挨打
  })

  it('B2:混乱/睡眠/麻痹目标无替挡 → 强制挨打(fight.c:4975-4985,即便 fAutoDefend 命中)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 10, // fAutoDefend 本会命中
      playerStatus: { sleep: 1 }, // 但睡眠 + 无替挡 → 强制 fAutoDefend=FALSE
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBeLessThan(5000) // 睡眠中躲不掉
  })

  it('player defending → enemy 攻击 damage 显著减小(def *= 2)', () => {
    // 不 defend
    const a = makeState({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: false,
      forceRoll: 0, // 关闭随机闪避 + jitter,确定对拍
    })
    performAttack(a.state, enemyActor, 0, a.bus, a.playerRoles)
    const dmgNoDef = 1000 - a.playerRoles.roles[0]!.hp

    // defend
    const b = makeState({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: true,
      forceRoll: 0,
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
      forceRoll: 0, // 关闭随机闪避 + jitter
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // str=0, def=1000(无 level 项) → calcBase(0,1000)=0 → damage<=0→1
    expect(playerRoles.roles[0]!.hp).toBe(99)
  })

  // 敌人普攻 attackEquivItem 中毒(fight.c:5139-5146)—— 29 个敌人(蜜蜂/僵尸/蜘蛛…)普攻附带毒物品
  it('敌普攻 equivItem 中毒:rate+抗性过 → 跑毒物品 scriptOnUse(0x29)单体毒队员', () => {
    setObjectPoisons([{ id: 551, level: 0, color: 16, playerScript: 40862, enemyScript: 0 }])
    // forceRoll=1:rate(10)>=1 过 + poisonResistance(0)<1 过 → 施毒
    const { state, playerRoles, bus } = makeState({
      enemies: [{ attackEquivItem: 117, attackEquivItemRate: 10 }],
      forceRoll: 1,
    })
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, {
      gs,
      items: [{ id: 117, scriptOnUse: 1 } as Item], // 毒蛇卵 scriptOnUse @ip1(0=无脚本哨兵)
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x29, operands: [0, 551, 0] }, { op: 'end' }], // ip1:0x29 单体毒 551
      runScript,
    })
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 551, wPoisonScript: 40862 })
  })

  it('敌普攻 equivItem:rate roll 不过 → 不中毒', () => {
    setObjectPoisons([{ id: 551, level: 0, color: 16, playerScript: 40862, enemyScript: 0 }])
    // forceRoll=10:rate(2)>=10 假 → 不施毒
    const { state, playerRoles, bus } = makeState({
      enemies: [{ attackEquivItem: 117, attackEquivItemRate: 2 }],
      forceRoll: 10,
    })
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, {
      gs,
      items: [{ id: 117, scriptOnUse: 0 } as Item],
      commands: [{ op: 'raw', opcode: 0x29, operands: [0, 551, 0] }, { op: 'end' }],
      runScript,
    })
    expect(gs.rgPoisonStatus['0_0']).toBeUndefined()
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
  it('fleeRate 远大于 rng 上限(roll 必小)→ 触发逃跑动画(fleeAnim)', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 9999 },
      enemies: [{ level: 1, dexterity: 0 }],
      forceRoll: 0, // 必摇出 0
    })
    performFlee(state, 0, playerRoles)
    // 成功 → 设 fleeAnim(逃跑动画放完才 phase='fleed';不再直接 fleed)
    expect(state.fleeAnim).toBeDefined()
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
    expect(state.fleeAnim).toBeUndefined() // boss 不可逃 → 不触发逃跑动画
    expect(state.phase).not.toBe('fleed')
  })

  it('无 enemy 时 def=0 → roll∈[0,0]=0,fleeRate>=0 → 命中', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 0 },
      enemies: [], // def 累加为 0
      forceRoll: 0,
    })
    performFlee(state, 0, playerRoles)
    expect(state.fleeAnim).toBeDefined()
  })

  it('def 为 SHORT 负溢出 → clamp 0(sdlpal fight.c:4139)', () => {
    const { state, playerRoles } = makeState({
      role: { fleeRate: 0 },
      // SHORT(累加结果) < 0 → def=0;rng(0,0)=0;str=0 >= 0 → 命中
      enemies: [{ level: 1, dexterity: -32700 }],
      forceRoll: 0,
    })
    performFlee(state, 0, playerRoles)
    expect(state.fleeAnim).toBeDefined()
  })

  it('逃跑失败 → 起失败动画 battleAnim(sdlpal fight.c:4155-4168,3步右下挪+帧1)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { fleeRate: 0 },
      enemies: [{ level: 50, dexterity: 100 }],
      forceRoll: 1, // roll>0 击败 fleeRate=0 → 失败
    })
    state.players[0]!.posOriginal = { x: 100, y: 100 }
    performFlee(state, 0, playerRoles, bus)
    expect(state.fleeAnim).toBeUndefined() // 未成功(无逃离动画)
    expect(state.battleAnim).toBeDefined() // 起了失败动画时间线(per-player 3步+帧1)
  })
})

// ============================================================================
// performMagic (M3 T20)
// ============================================================================

function makeSpell(opts: Partial<Spell> = {}): Spell {
  return {
    id: 1,
    _name: 'TestSpell',
    magicNumber: 1,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...opts,
  }
}

function makeMagic(opts: Partial<Magic> = {}): Magic {
  return {
    id: 1,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 5,
    baseDamage: 50,
    elemental: 0,
    sound: 0,
    ...opts,
  }
}

describe('performMagic', () => {
  it('队员 cast,MP 足够 → 扣 MP + emit playMagicAnim + runScript 被调', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 30, maxMP: 30 },
    })
    const spell = makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 42 })
    // baseDamage:0 —— 本测专注 MP/anim/runScript 派发,inline 伤害由 magic-inline-damage.test.ts 覆盖
    const magic = makeMagic({ id: 3, costMP: 8, baseDamage: 0 })
    const runScript: RunScriptFn = vi.fn()
    const commands: Command[] = [{ op: 'end' }]

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands,
      runScript,
    })

    // 扣 MP
    expect(playerRoles.roles[0]!.mp).toBe(22) // 30 - 8

    // emit playMagicAnim
    const cmds = bus.drain()
    expect(cmds).toHaveLength(1)
    expect(cmds[0]!.cmd).toEqual({
      op: 'playMagicAnim',
      magicId: 3,
      casterType: 'player',
      casterIdx: 0,
      targetType: 'enemy',
      targetIdx: 0,
    })

    // runScript 被调
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.ip).toBe(42)
    expect(opts.runtimeMode).toBe('battle')
    expect(opts.commands).toBe(commands)
    expect(opts.battleCtx).toMatchObject({
      state,
      caster: { type: 'player', idx: 0 },
      target: { type: 'enemy', idx: 0 },
    })
  })

  it('scriptOnUse 失败(fScriptSuccess=false)→ MP 仍扣但不 emit 动画 + 不跑 scriptOnSuccess(乾坤一掷没钱/酒神没酒)', () => {
    const { state, playerRoles, bus } = makeState({ role: { mp: 30, maxMP: 30 } })
    const spell = makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 42, scriptOnSuccess: 99 })
    const magic = makeMagic({ id: 3, costMP: 8, baseDamage: 0 })
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // scriptOnUse(ip42)模拟 0x41 mark-failed(没钱"钱不够"/没酒"酒不足"分支)→ fScriptSuccess=false
    const runScript: RunScriptFn = vi.fn((opts) => {
      if (opts.ip === 42) gs.fScriptSuccess = false
    })
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7, targetIsEnemy: true, targetIdx: 0,
      spells: [spell], magics: [magic], playerRoles, bus, commands: [{ op: 'end' }], runScript, gs,
    })
    expect(playerRoles.roles[0]!.mp).toBe(22) // MP 仍扣(sdlpal fight.c:4190 总扣)
    expect(bus.drain().filter((c) => c.cmd.op === 'playMagicAnim')).toHaveLength(0) // 失败 → 无效果动画
    const calls = (runScript as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c) => c[0]!.ip === 42)).toBe(true) // scriptOnUse 跑了
    expect(calls.every((c) => c[0]!.ip !== 99)).toBe(true) // scriptOnSuccess 未跑(早退)
  })

  it('队员 cast,MP 不足 → 不扣 + 不 emit + 不 runScript + console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState({
      role: { mp: 3 },
    })
    const spell = makeSpell({ id: 1, magicNumber: 1, scriptOnUse: 10 })
    const magic = makeMagic({ id: 1, costMP: 10 })
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(playerRoles.roles[0]!.mp).toBe(3) // 不扣
    expect(bus.drain()).toEqual([]) // 不 emit
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not enough MP'),
    )
    warnSpy.mockRestore()
  })

  it('敌人 cast → 不扣 MP(敌人不 track mp) + 仍 emit + 仍 runScript', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 30 },
    })
    const spell = makeSpell({ id: 5, magicNumber: 2, scriptOnUse: 88 })
    const magic = makeMagic({ id: 2, costMP: 999, baseDamage: 0 }) // costMP 巨大验证不扣;baseDamage=0 避开 E2 伤害(本例只测 MP/emit/runScript)
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    // 队员 mp 不动
    expect(playerRoles.roles[0]!.mp).toBe(30)
    // 仍 emit
    const cmds = bus.drain()
    expect(cmds).toHaveLength(1)
    expect(cmds[0]!.cmd).toMatchObject({
      op: 'playMagicAnim',
      casterType: 'enemy',
      targetType: 'player',
    })
    // 仍 runScript
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.battleCtx.caster).toEqual({ type: 'enemy', idx: 0 })
    expect(opts.battleCtx.target).toEqual({ type: 'player', idx: 0 })
  })

  it('敌人攻击魔法(baseDamage>0)→ 目标队员真掉血 + emit showDamageNum(E2 enemy→player 结算)', () => {
    // 之前敌方攻击魔法只播动画不结算伤害(纯演出)→ E2 补齐。
    const { state, playerRoles, bus } = makeState({
      role: { hp: 500, defense: 30, level: 5 },
      enemies: [makeEnemy({ magicStrength: 28, level: 0 })], // magStr = 28+(0+6)*6 = 64
    })
    const spell = makeSpell({ id: 5, magicNumber: 2 })
    const magic = makeMagic({ id: 2, type: 'normal', baseDamage: 45, elemental: 1, costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: () => {},
    })
    expect(playerRoles.roles[0]!.hp).toBeLessThan(500) // 敌方魔法真扣血(autoDefend rng 浮动,断言掉血即可)
    const dmgCmd = bus.drain().find(c => c.cmd.op === 'showDamageNum')
    expect(dmgCmd?.cmd).toMatchObject({ op: 'showDamageNum', target: { kind: 'player', idx: 0 }, color: 'blue' })
  })

  it('敌人非攻击 type(summon)但 baseDamage>0 → 仍结算伤害(E2 gate type-agnostic,sdlpal fight.c:4772)', () => {
    // sdlpal 敌方魔法只看 baseDamage>0,不限 magic.type(summon 等也打)。验证不被 OFF_MAGIC_TYPES 漏掉。
    const { state, playerRoles, bus } = makeState({
      role: { hp: 500, defense: 30, level: 5 },
      enemies: [makeEnemy({ magicStrength: 28, level: 0 })],
    })
    const spell = makeSpell({ id: 5, magicNumber: 2 })
    const magic = makeMagic({ id: 2, type: 'summon', baseDamage: 45, elemental: 1, costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: () => {},
    })
    expect(playerRoles.roles[0]!.hp).toBeLessThan(500) // summon 类也结算(type != normal → 全体,这里单队员)
  })

  it('spell id 不存在 → warn + 不 emit + 不 runScript', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 999, // 不存在
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 1 })],
      magics: [makeMagic()],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('spell id 999 not found'),
    )
    warnSpy.mockRestore()
  })

  it('magic id(spell.magicNumber)不在 magics 表 → warn + 不 emit + 不 runScript', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 1, magicNumber: 99 })], // 指向不存在的 magic
      magics: [makeMagic({ id: 1 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('magic 99'),
    )
    warnSpy.mockRestore()
  })

  it('target=\'all\' → battleCtx.target=undefined,仍 emit + 仍 runScript', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 30 },
      enemies: [{}, {}, {}],
    })
    const spell = makeSpell({ id: 1, magicNumber: 1, scriptOnUse: 50 })
    const magic = makeMagic({ id: 1, costMP: 5, type: 'attackAll' })
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    // emit 时 targetIdx='all'
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toMatchObject({ op: 'playMagicAnim', targetIdx: 'all' })

    // runScript 调用,battleCtx.target=undefined
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.battleCtx.target).toBeUndefined()
    expect(opts.battleCtx.caster).toEqual({ type: 'player', idx: 0 })
  })

  it('scriptOnUse=0 → 不 runScript,但仍扣 MP + emit 动画(纯动画法术)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 30 },
    })
    const spell = makeSpell({ id: 1, magicNumber: 1, scriptOnUse: 0 }) // 关键
    // baseDamage:0 → 真·纯动画法术(offensive baseDamage>0 会走 inline 伤害,另有专测)
    const magic = makeMagic({ id: 1, costMP: 7, baseDamage: 0 })
    const runScript: RunScriptFn = vi.fn()

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(playerRoles.roles[0]!.mp).toBe(23) // 仍扣 MP
    expect(bus.drain()).toHaveLength(1) // 仍 emit 动画
    expect(runScript).not.toHaveBeenCalled() // 但不 runScript
  })
})

// ============================================================================
// performItem (M3 T21)
// ============================================================================

function makeItem(opts: Partial<Item> = {}): Item {
  return {
    id: 1,
    _name: 'TestItem',
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
    ...opts,
  }
}

/** 最小 GameState fixture(performItem 只看 .inventory)。 */
function makeGameState(inventory: InventoryEntry[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  gs.mode = 'battle'
  return gs
}

describe('performItem', () => {
  it('队员 use,inventory>0 → count-- + runScript 被调', () => {
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 7, count: 3 }])
    const item = makeItem({ id: 7, scriptOnUse: 42 })
    const runScript: RunScriptFn = vi.fn()
    const commands: Command[] = [{ op: 'end' }]

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      items: [item],
      playerRoles,
      bus,
      commands,
      runScript,
    })

    // count--
    expect(gs.inventory[0]!.count).toBe(2)

    // runScript 被调
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.ip).toBe(42)
    expect(opts.runtimeMode).toBe('battle')
    expect(opts.commands).toBe(commands)
    expect(opts.battleCtx).toMatchObject({
      state,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
    })
  })

  it('队员 use,inventory count=0 → 不扣 + 不 runScript + console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 3, count: 0 }])
    const item = makeItem({ id: 3, scriptOnUse: 10 })
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 3,
      targetIsEnemy: false,
      targetIdx: 0,
      items: [item],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(0) // 不动
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no inventory for item 3'),
    )
    warnSpy.mockRestore()
  })

  it('队员 use,根本没该 item entry → warn + return', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 99, count: 5 }]) // 另一 item
    const item = makeItem({ id: 3, scriptOnUse: 10 })
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 3,
      targetIsEnemy: false,
      targetIdx: 0,
      items: [item],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(5) // 不动
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no inventory for item 3'),
    )
    warnSpy.mockRestore()
  })

  it('item.scriptOnUse=0 → warn + 不扣 + 不 runScript', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 1, count: 5 }])
    const item = makeItem({ id: 1, scriptOnUse: 0 }) // 关键
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 1,
      targetIsEnemy: false,
      targetIdx: 0,
      items: [item],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(5) // 不扣
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not usable'),
    )
    warnSpy.mockRestore()
  })

  it('item id 不在 items 表 → warn + return', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 1, count: 5 }])
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 999, // 不在
      targetIsEnemy: false,
      targetIdx: 0,
      items: [makeItem({ id: 1, scriptOnUse: 10 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(5)
    expect(runScript).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('item id 999 not found'),
    )
    warnSpy.mockRestore()
  })

  it('target=\'all\' → battleCtx.target=undefined,仍扣 inventory + 仍 runScript', () => {
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 5, count: 2 }])
    const item = makeItem({ id: 5, scriptOnUse: 50 })
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 5,
      targetIsEnemy: false,
      targetIdx: 'all',
      items: [item],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(1) // 扣
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.battleCtx.target).toBeUndefined()
    expect(opts.battleCtx.caster).toEqual({ type: 'player', idx: 0 })
  })

  it('敌人 cast → 不扣 inventory(敌人不 track) + 仍 runScript', () => {
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 5, count: 2 }])
    const item = makeItem({ id: 5, scriptOnUse: 88 })
    const runScript: RunScriptFn = vi.fn()

    performItem({
      state,
      gs,
      casterIsEnemy: true,
      casterIdx: 0,
      itemId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      items: [item],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })

    // inventory 不动(敌人不 track)
    expect(gs.inventory[0]!.count).toBe(2)
    // 仍 runScript
    expect(runScript).toHaveBeenCalledTimes(1)
    const opts = (runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(opts.battleCtx.caster).toEqual({ type: 'enemy', idx: 0 })
    expect(opts.battleCtx.target).toEqual({ type: 'player', idx: 0 })
  })
})
