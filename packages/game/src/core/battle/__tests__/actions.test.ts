/**
 * actions.test.ts —— M3 T19。
 *
 * 测试 3 个 simple action perform(attack / defend / flee)。
 * BattleState 通过 makeState helper 最小构造,与 battle-state.test.ts 风格对齐。
 */

import type { BattleField, Command, Enemy, Item, Magic, ObjectMagicView, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createInitialGameState, type GameState, type InventoryEntry } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { SUMMON_FADE_STEPS } from '../anim-timeline.js'
import { performAttack, performEnemyConfusedAttack } from '../actions/attack.js'
import { performDefend } from '../actions/defend.js'
import { performFlee } from '../actions/flee.js'
import { performItem } from '../actions/item.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import { type BattleCtx, runScript, setObjectPoisons } from '../../event-system.js'
import { dispatchBattleOpcode } from '../battle-opcodes.js'
import { getPlayerActualDexterity } from '../formulas.js'
import { tickStatusEffects } from '../status.js'
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
  /** D12:role 0 装备授予的逃跑率加成(写 gs.rgEquipmentEffect[0].rgwFleeRate[0])。 */
  equipFleeRate?: number
}

function makeState(opts: MakeStateOpts = {}): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
  gs: GameState
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
  // D12:performFlee 用 getPlayerFleeRate(gs,role) = runtime base + 装备加成。
  //   seed runtime base = role.fleeRate(等价旧 raw 行为),equipFleeRate 写装备槽 0。
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.PlayerRolesRuntime.rgwFleeRate[0] = role.fleeRate
  if (opts.equipFleeRate !== undefined)
    gs.rgEquipmentEffect[0]!.rgwFleeRate[0] = opts.equipFleeRate
  return { state, playerRoles, bus: createCommandBus(), gs }
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
  // P0#1(2026-06-02 审计核源):玩家物攻 str = PAL_GetPlayerAttackStrength(global.c:1757-1764)
  //   = rgwAttackStrength + Σ装备,**无 level 项**。此前 ts 误加 (level+6)*6(M3 把敌方公式套玩家,fight.c:4917)。
  //   role.attackStrength 已 projected(base+装备)→ 直接用,改后玩家伤害不随 level 虚高。敌方分支(:131)不动。
  it('P0#1:玩家攻击 str 不含 level 项(同 attackStrength 不同 level → 同伤害)', () => {
    const dmg = (lvl: number): number => {
      const { state, playerRoles, bus } = makeState({
        role: { level: lvl, attackStrength: 200 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 99999 }],
        forceRoll: 1, forceFloat: 1, // 固定 +1 / 不暴击 / jitter=1,隔离 str 变量
      })
      const before = state.enemies[0]!.e.health
      performAttack(state, playerActor, 0, bus, playerRoles)
      return before - state.enemies[0]!.e.health
    }
    expect(dmg(1)).toBe(dmg(99)) // str=role.attackStrength(200),与 level 无关(旧 bug:242 vs 830)
  })

  it('player 攻击 enemy:扣 enemy.health + emit playPlayerAttack / showDamageNum', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // str = 200(P0#1:无 level 项)
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
      // enemy def = 10 + (5+6)*4 = 54(敌方 def 含 level,正确)
      // atk(200) > def(54) → calcBase = trunc(200*2 - 54*1.6 + 0.5) = trunc(314.1) = 314
      // physRes=1 → damage = 314(>100 → 击杀)
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 100 - 505 → max(0, -)
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playPlayerAttack', playerIdx: 0, targetEnemyIdx: 0 })
    // D17b:敌人掉血 → blue(sdlpal fight.c:648-651,sDamage<0);target={kind:'enemy',idx:0}
    expect(cmds[1]!.cmd).toMatchObject({ op: 'showDamageNum', color: 'blue', target: { kind: 'enemy', idx: 0 } })
    expect((cmds[1]!.cmd as { value: number }).value).toBeGreaterThan(0)
  })

  // sdlpal 玩家打敌人 wHealth 是 WORD,`wHealth -= sDamage`(fight.c:3665)超杀**下溢不钳**,
  //   PAL_BattleDisplayStatChange 用 (SHORT)(wHealth-wPrevHP)(fight.c:638)→ 显示**完整算出伤害**,
  //   非剩余血。(敌打玩家才 `if (hp<sDamage) sDamage=hp` 钳剩余血,fight.c:5064 —— 故意不对称。)
  it('超杀:玩家打敌人显示完整伤害而非剩余血(fight.c:638/3665)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
      forceRoll: 1, forceFloat: 1, // base+1 / 不暴击 / 不李逍遥 / jitter×1 → 完整伤害 = 314+1 = 315
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 315 > 100 → 击杀
    const cmds = bus.drain()
    const dmg = cmds.find(c => (c.cmd as { op: string }).op === 'showDamageNum')!.cmd as { value: number }
    expect(dmg.value).toBe(315) // 完整伤害 315,非剩余血 100
  })

  // 群攻同理:sdlpal `wHealth -= sDamage`(fight.c:3726)WORD 下溢,显示完整累加伤害。
  it('超杀:群攻击杀敌显示完整伤害而非剩余血(fight.c:3726)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 50 }], // 单敌 division 1
      forceRoll: 1, // 不暴击;群攻无 jitter
    })
    performAttack(state, playerActor, -1, bus, playerRoles) // targetIdx<0 = attackAll 群攻
    expect(state.enemies[0]!.e.health).toBe(0) // 314 > 50 → 击杀
    const cmds = bus.drain()
    const dmg = cmds.find(c => (c.cmd as { op: string }).op === 'showDamageNum')!.cmd as { value: number }
    expect(dmg.value).toBe(314) // 完整伤害 314(群攻无 +1/jitter),非剩余血 50
  })

  // M6 出招声:sdlpal PAL_BattleShowPlayerAttackAnim 起手(fight.c:2058-2071)HP>0 时
  //   !crit→AUDIO_PlaySound(attackSound),crit→criticalSound;在 dual-attack t-loop 内每击一次(fight.c:3673)。
  //   ts 经 bus {op:'playSound'} → bootstrap audio.playSound。命中"武器声"weaponSound 仍由 playPlayerAttack 接。
  it('M6 出招声:玩家物攻起手 emit playSound(非暴击=attackSound,暴击=criticalSound)', () => {
    const drainSounds = (bus: CommandBus): number[] =>
      bus.drain().filter(c => c.cmd.op === 'playSound').map(c => (c.cmd as { soundId: number }).soundId)
    // 非暴击(forceRoll=1 → crit roll≠0)→ attackSound(37)
    {
      const { state, playerRoles, bus } = makeState({
        role: { level: 10, attackStrength: 200, attackSound: 37, criticalSound: 5 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
        forceRoll: 1, forceFloat: 1,
      })
      performAttack(state, playerActor, 0, bus, playerRoles)
      expect(drainSounds(bus)).toEqual([37])
    }
    // 暴击(forceRoll=0 → crit roll===0)→ criticalSound(5)
    {
      const { state, playerRoles, bus } = makeState({
        role: { level: 10, attackStrength: 200, attackSound: 37, criticalSound: 5 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
        forceRoll: 0, forceFloat: 1,
      })
      performAttack(state, playerActor, 0, bus, playerRoles)
      expect(drainSounds(bus)).toEqual([5])
    }
  })

  it('群攻(target=-1,attackAll 武器):player 攻击全体活敌(命中序 + division 减半)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // str=200(P0#1 修:无 level 项);每敌 def=54 → base 314
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
      forceRoll: 1, // crit roll=1(不暴击)
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // sdlpal fight.c:3684 命中序 {2,1,0,4,3};2 敌(slot 0/1)→ slot1 先打(division1,全额 314)
    //   → slot0 后打(division2,314/2=157)。trunc(600-x)。
    expect(state.enemies[1]!.e.health).toBe(286) // 600-314(满额,先打)
    expect(state.enemies[0]!.e.health).toBe(443) // 600-157(半额,后打)
    const ops = bus.drain().map(c => c.cmd.op)
    expect(ops.filter(o => o === 'showDamageNum')).toHaveLength(2) // 2 敌 2 个伤害数字
    expect(ops).toContain('playPlayerAttack')
  })

  it('群攻跳过已 defeated 敌人(wObjectID==0,不计 division)', () => {
    // L21:C 群攻续跳判 wObjectID==0(defeated/清槽),非 health<=0(fight.c:3698)。已死敌 = defeated。
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 }, // 已 defeated(清槽)→ skip,不计 division
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
      forceRoll: 1,
    })
    state.enemies[0]!.defeated = true // wObjectID==0:死亡结算后清槽
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600) // defeated 敌不挨打、不动
    // 仅 slot1 活 → division 全程 1 → 全额 314
    expect(state.enemies[1]!.e.health).toBe(286)
  })

  it('L21:health=0 但未 defeated 的敌(sweep 间窗口)仍挨打 + 让 division 翻倍(fight.c:3698/3728)', () => {
    // C 续跳只判 wObjectID==0,不判 health;首 sweep 打死但本 action 内尚未清槽(checkEnemyDeaths 后跑)的敌
    //   仍参与 division 翻倍(后续活敌伤害减半);C 还对其 wHealth 再扣一次(WORD 下溢,显示完整伤害)。
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 }, // slot0:HIT_ORDER {2,1,0} 后打
        { level: 5, defense: 10, physicalResistance: 1, health: 0 },   // slot1:health=0 但未 defeated(sweep 间打死),先打
      ],
      forceRoll: 1, // 不暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // slot1(health0 非 defeated)先打 → division*=2;slot0 后打 division2 → 314/2=157
    expect(state.enemies[1]!.e.health).toBe(0)         // 钳 0(C 是 WORD 下溢,不可观测;damage 不依赖 health)
    expect(state.enemies[0]!.e.health).toBe(600 - 157) // slot0 半额;改前跳 slot1 → slot0 全额=286
  })

  // ── 敌→我 被动格挡(fAutoDefend,fight.c:4938/5023-5085)──────────────────────
  // BUG(2026-06-04 user 报"高级草妖普攻只出声、无动作、无受击、无掉血"):被动格挡触发时,此前 attack.ts
  //   只 emit playEnemyAttack(经 audio 播敌攻击音)+ return,未建动画 → 有声无动画。修后建格挡动画时间线。
  it('敌→我 被动格挡(forceRoll=10 强制 fAutoDefend)→ 建格挡动画时间线 + 不掉血', () => {
    const { state, playerRoles, bus } = makeState({
      role: { hp: 500, maxHP: 500, defense: 10 },
      enemies: [{ level: 5, attackStrength: 100, defense: 10, physicalResistance: 1, health: 100, attackSound: 39 }],
      forceRoll: 10, // rangeInclusive 恒 10 → fAutoDefend = (10>=10) = true
    })
    // buildEnemyPhysicalTimeline 需 posOriginal(否则退化无时间线)
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const hpBefore = playerRoles.roles[0]!.hp

    performAttack(state, enemyActor, 0, bus, playerRoles)

    // 格挡:建了动画时间线(非只出声 + 空白)
    expect(state.battleAnim).toBeDefined()
    // 格挡:不结算伤害(fight.c:5052 !fAutoDefend gate)
    expect(playerRoles.roles[0]!.hp).toBe(hpBefore)
    // 时间线含玩家格挡姿 frame 3,且全程无 damageNum(无受击数字)
    const frames = state.battleAnim!.frames
    expect(frames.some((f) => f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 3))).toBe(true)
    expect(frames.every((f) => f.damageNum === undefined)).toBe(true)
  })

  // ── D3-b 群攻 crit + division 逐敌减半(fight.c:3681-3748)────────────────────

  it('D3:群攻 division 逐敌减半(3 敌,命中序 {2,1,0})', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot0:division4 → 78.5
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot1:division2 → 157
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot2:division1 → 314
      ],
      forceRoll: 1, // 不暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[2]!.e.health).toBe(2000 - 314) // 先打,全额
    expect(state.enemies[1]!.e.health).toBe(2000 - 157) // 半额
    expect(state.enemies[0]!.e.health).toBe(1921) // 314/4=78.5 → trunc(2000-78.5)=1921
  })

  it('D3:群攻 bravery → 全敌暴击 ×3', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { bravery: 1 },
      forceRoll: 1, // crit roll≠0,但 bravery 强制暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(5000 - 314 * 3) // 单敌 division1,314*3=942
  })

  // ── D3 DualAttack 双击武器(仙女剑/玄冥宝刀 等,fight.c:3628/3681 t-loop)──────

  it('D3:DualAttack 武器 → 单体攻击两次', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 314,+jitter1=315
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, // 不暴击;jitter=1
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 2) // 两次各 315 = 630
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    expect(dmgNums).toHaveLength(2) // 两次攻击 → 两个伤害数字
  })

  // 单体双击出招音只响一次(user 2026-06-05 报):此前 attack.ts loop 内两次 voice + playPlayerAttack 都在
  //   performAttack 同 tick 同步 bus.emit → bootstrap 同帧 drain 同 id 重叠成一次。修:出招声/武器声改挂
  //   时间线 frame.sound(driver 逐 tick 经 bus emit)→ 两段挥砍声音随帧错开各响。sdlpal:每次
  //   ShowPlayerAttackAnim 起手播 attackSound(fight.c:2061-2071)+ currentFrame=9 后播 weaponSound(fight.c:2124)。
  it('单体双击:出招声/武器声挂时间线各帧(逐 tick 播),不再同 tick 同步 emit 重叠(fight.c:2061/2124)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200, attackSound: 37, weaponSound: 88 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, forceFloat: 1, // 不暴击 → 出招声=attackSound(37)
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, 0, bus, playerRoles)
    const frames = state.battleAnim!.frames
    // 两段挥砍各 frame0 挂出招声(37)→ 共 2;各 currentFrame=9 特效 i==0 帧挂武器声(88)→ 共 2
    expect(frames.filter(f => f.sound === 37)).toHaveLength(2)
    expect(frames.filter(f => f.sound === 88)).toHaveLength(2)
    // 武器声不再走 playPlayerAttack 同步命令(已改帧同步,避免双击同 tick 重叠)
    expect(bus.drain().filter(c => c.cmd.op === 'playPlayerAttack')).toHaveLength(0)
  })

  it('D3:无 DualAttack → 单体只攻击一次(对照)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      forceRoll: 1,
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315) // 一次 315
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    expect(dmgNums).toHaveLength(1)
  })

  it('D3:DualAttack + attackAll(玄冥宝刀)→ 全体攻击两次', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, // 不暴击
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // 两 sweep,每 sweep division 重置 1 → 单敌各全额 314 → 共 628
    expect(state.enemies[0]!.e.health).toBe(5000 - 314 * 2)
    const dmgNums = bus.drain().filter(c => c.cmd.op === 'showDamageNum')
    // sdlpal 每 sweep 各调一次 ShowPlayerAttackAnim → 各 sweep i==0 弹自己的数字(PAL_BattleBackupStat 每 swing
    //   后重置 wPrevHP,fight.c:2210/588)→ **两个数字各 314**,非一个总和 628(旧测试"一个总 delta"假设不忠实)。
    expect(dmgNums).toHaveLength(2)
    expect((dmgNums[0]!.cmd as { value: number }).value).toBe(314)
    expect((dmgNums[1]!.cmd as { value: number }).value).toBe(314)
  })

  // 群攻双击(醉仙望月步授 dualAttack,fight.c:3681 t<(dualAttack?2:1)):sdlpal 每 sweep 各调一次
  //   PAL_BattleShowPlayerAttackAnim(fight.c:3745,在 t-loop 内)→ **两次完整挥砍**,各 sweep i==0 弹自己的
  //   伤害数字(BackupStat 每 swing 后重置 prevHP,fight.c:2210/588)+ 起手出招声 + 命中武器声各播一次。
  //   user 2026-06-05 报"群攻没触发两次 / 出招音效没播两遍"。此前 ts 群攻整段只建一次挥砍 + 武器声一遍。
  //   2026-06-05 进一步:出招/武器声改挂时间线 frame.sound(逐 tick 播,避免同 tick 同步 emit 重叠),不再 playPlayerAttack。
  it('群攻双击:两次完整挥砍段 + 各 sweep i==0 弹自己数字 + 出招/武器声各挂两帧(fight.c:3681/3745/2061/2124)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200, attackSound: 37, weaponSound: 88 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { dualAttack: 1 },
      forceRoll: 1, // 不暴击
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    // 两次完整挥砍 → 两个带 damageNums 的命中 i==0 帧,各该 sweep 的 314
    const numFrames = state.battleAnim!.frames.filter((f) => (f.damageNums?.length ?? 0) > 0)
    expect(numFrames, '两个 sweep 各一个 i==0 数字帧').toHaveLength(2)
    expect(numFrames[0]!.damageNums![0]!.value).toBe(314)
    expect(numFrames[1]!.damageNums![0]!.value).toBe(314)
    // 两个完整挥砍段 → 两个命中特效 i==0 帧(currentFrame=9 起手)
    const swingStarts = state.battleAnim!.frames.filter(
      (f) => f.overlay?.kind === 'effect' && f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 9),
    )
    expect(swingStarts, '两次挥砍各一个起手帧').toHaveLength(2)
    // 出招声(37)挂各 sweep frame0、武器声(88)挂各 sweep currentFrame=9 帧 → 时间线各两帧(逐 tick 播,不重叠)
    const frames = state.battleAnim!.frames
    expect(frames.filter(f => f.sound === 37)).toHaveLength(2)
    expect(frames.filter(f => f.sound === 88)).toHaveLength(2)
    // 武器声不再走 playPlayerAttack 同步命令
    expect(bus.drain().filter(c => c.cmd.op === 'playPlayerAttack')).toHaveLength(0)
  })

  // M6/D17a 群攻挥砍动画(林月如等 attackAll 鞭武器):此前群攻**完全无动画**(只即时弹数字),
  //   user 2026-06-03 报"林月如没攻击动画"。修:有 posOriginal → buildPlayerAttackTimeline 挥向中心
  //   (150,100,sdlpal sTarget==-1)。
  // BUG(2026-06-04 user 报"群攻掉血数字出现偏晚"):sdlpal PAL_BattleDisplayStatChange 在
  //   PAL_BattleShowPlayerAttackAnim 挥砍特效**首帧 i==0**(fight.c:2209)就遍历全敌弹数字,**不是**
  //   挥砍播完后。此前 ts 用 pendingDamageNums 时间线后弹(注释误引 fight.c:3748,该处实为 PAL_BattleDelay)
  //   → 数字偏晚。修:群攻伤害数字挂挥砍 i==0 帧(= 首个 effect overlay 帧,与单体同帧),不走 pendingDamageNums。
  it('群攻掉血数字在挥砍 i==0 帧弹(fight.c:2209 DisplayStatChange),非时间线后', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      forceRoll: 1,
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.battleAnim, '群攻应建挥砍动画时间线(此前无)').toBeDefined()
    expect(state.battleAnim!.frames.length).toBeGreaterThan(0)
    // i==0 帧 = 首个命中特效 overlay 帧(currentFrame=9 起);DisplayStatChange 在此帧弹全敌数字。
    const swingFrame = state.battleAnim!.frames.find((f) => f.overlay?.kind === 'effect')
    expect(swingFrame, '应有挥砍命中特效帧').toBeDefined()
    expect(swingFrame!.damageNums, '群攻数字挂挥砍 i==0 帧').toHaveLength(1)
    expect(swingFrame!.damageNums![0]!.value).toBe(314)
    expect(swingFrame!.damageNums![0]!.target).toEqual({ kind: 'enemy', idx: 0 })
    expect(swingFrame!.damageNums![0]!.color).toBe('blue')
    // 不再用 pendingDamageNums 时间线后弹(那是法术 PostMagic 的机制,fight.c:3186)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    // frame[0](rush 起手)不即时 emit 数字
    expect(bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toHaveLength(0)
  })

  // sdlpal PAL_BattleDisplayStatChange 遍历**所有**敌人弹各自数字(fight.c:626-659),群攻命中多敌 →
  //   挥砍 i==0 帧同时弹多个数字(每个掉血敌一个),非逐帧/时间线后弹。
  it('群攻多敌:挥砍 i==0 帧同时弹每个掉血敌的数字(fight.c:626-659)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
      forceRoll: 1,
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    state.enemies[1]!.posOriginal = { x: 200, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    const swingFrame = state.battleAnim!.frames.find((f) => f.overlay?.kind === 'effect')
    expect(swingFrame!.damageNums, '2 敌各一个数字,同挥砍 i==0 帧').toHaveLength(2)
    // 命中序 {2,1,0,4,3}:slot1 先打(division1 全额 314)/ slot0 后打(division2 半额 157)
    const byIdx = new Map(swingFrame!.damageNums!.map((d) => [d.target.idx, d.value]))
    expect(byIdx.get(1)).toBe(314)
    expect(byIdx.get(0)).toBe(157)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
  })

  it('player 低 attackStrength 攻击高 defense enemy:damage 取 1', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 1, attackStrength: 0 }, // str = 0(无 level 项);def 巨大 → calcBase=0
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
      role: { level: 10, attackStrength: 200 }, // base = 314(200*2-54*1.6+0.5)
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      forceRoll: 1, // jitter=1;crit roll=1(不暴击)
      forceFloat: 1, // 浮动 ×1
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 315) // base314 + jitter1 = 315
  })

  it('D3:jitter 取 2 时 damage = base+2', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      forceRoll: 2, // jitter=2;crit roll=2(不暴击)
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 316) // base314 + jitter2 = 316
  })

  it('D3:bravery 状态 → 必暴击 ×3(fight.c:3640)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { bravery: 1 },
      forceRoll: 1, // jitter=1;crit roll 即使 1(≠0)也因 bravery 暴击
      forceFloat: 1,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 3) // (314+1)*3 = 945
  })

  it('D3:RandomFloat(1,1.125) 末乘浮动(forceFloat=1.125)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 1000 }],
      forceRoll: 1, // jitter=1 / 不暴击
      forceFloat: 1.125,
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    // trunc((314+1) * 1.125) = trunc(354.375) = 354
    expect(state.enemies[0]!.e.health).toBe(1000 - 354)
  })

  it('D3:李逍遥(role 0)额外暴击 ×2(fight.c:3649,RandomLong(0,11)==0)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { id: 0, level: 10, attackStrength: 200 }, // role 0 = 李逍遥;base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
    })
    // 脚本化:jitter=1,crit roll=3(≠0 无普通暴击),李逍遥 roll=0(×2),float=1
    state.rng = scriptedRng([1, 3, 0], [1])
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 2) // (314+1)*2 = 630
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

  // ── B2 c3b:守护替挡 cover(rgwCoveredBy,fight.c:4943-4985)──────────────────────
  // 坏状态(混乱/睡眠/麻痹)目标 + fAutoDefend 命中 → 查 coveredBy 找健康替挡者 → 仍闪避(全免伤);
  // 无替挡 / 替挡者也坏状态 → 强制挨打。

  /** 给 state 加第二名队员(守护者)+ playerRoles。 */
  function addCoverer(
    state: BattleState,
    playerRoles: PlayerRoles,
    covererRole: Partial<PlayerRole>,
    covererStatus: Partial<BattleStatus> = {},
  ): void {
    const role = makeRole({ id: 1, hp: 5000, maxHP: 5000, ...covererRole })
    playerRoles.roles[1] = role
    state.players[1] = {
      roleId: 1,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, ...covererStatus },
    }
  }

  it('B2 c3b:混乱目标 + 健康守护者(coveredBy)→ 替挡闪避(免伤)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 10, // fAutoDefend 命中
      playerStatus: { confused: 1 }, // 目标坏状态
    })
    playerRoles.roles[0]!.coveredBy = 1 // 被 role 1 守护
    addCoverer(state, playerRoles, { hp: 5000 }) // role 1 健康
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(5000) // 守护者替挡 → 闪避免伤
  })

  it('B2 c3b:混乱目标 + 守护者也坏状态 → 无效替挡 → 强制挨打', () => {
    const { state, playerRoles, bus } = makeState({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 10,
      playerStatus: { confused: 1 },
    })
    playerRoles.roles[0]!.coveredBy = 1
    addCoverer(state, playerRoles, { hp: 5000 }, { sleep: 1 }) // 守护者睡眠 → 挡不了
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBeLessThan(5000) // 无有效替挡 → 挨打
  })

  it('B2 c3b:混乱目标 + coveredBy 指向不在队的角色 → 无替挡 → 挨打', () => {
    const { state, playerRoles, bus } = makeState({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      forceRoll: 10,
      playerStatus: { confused: 1 },
    })
    playerRoles.roles[0]!.coveredBy = 3 // role 3 不在队
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBeLessThan(5000)
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

  // L22:C 条件链 `iCoverIndex==-1 && !fAutoDefend && rate>=RandomLong(1,10) && PoisonRes<RandomLong(1,100)`
  //   (fight.c:5139)左到右短路 → 非格挡非自卫命中**恒**求值 `rate>=RandomLong(1,10)`,与 equivItem 是否为 0
  //   无关(只第二个 RandomLong(1,100) 受 rate 短路)。旧 TS 加 `equivId!==0 &&` 前置,对普通敌(equivItem=0,
  //   占多数)跳过这次抽取 → 比 C 少消费一次,后续 TS 自身确定性回放数值整体前移。修:删该前置短路。
  it('L22:敌普攻 equivItem==0 命中也消费一次 RandomLong(1,10)(fight.c:5139 短路纪律)', () => {
    let equivRolls = 0 // 统计 (1,10) 抽取(敌→我路径里仅 equiv rate roll 用此参数)
    const { state, playerRoles, bus, gs } = makeState({
      enemies: [{ attackEquivItem: 0, attackEquivItemRate: 0 }], // 普通敌:无毒物品
    })
    const base = createSeedableRng(1)
    state.rng = {
      ...base,
      rangeInclusive: (lo: number, hi: number) => {
        if (lo === 0 && hi === 16) return 0 // fAutoDefend = 0>=10 = false → 命中(非自卫,进 equiv block)
        if (lo === 1 && hi === 10) { equivRolls++; return 5 }
        return base.rangeInclusive(lo, hi)
      },
    }
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, {
      gs,
      items: [], // equivItem=0 找不到物品 → scriptOnUse=0 → 不中毒(等价 C 跑 rgObject[0] 空脚本)
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(equivRolls).toBe(1) // 普通敌命中也消费一次,与 C 短路顺序一致
    expect(gs.rgPoisonStatus['0_0']).toBeUndefined() // 但 equivItem=0 不产生实际中毒
  })
})

// ============================================================================
// performDefend
// ============================================================================

describe('performEnemyConfusedAttack(B2 c1b,fight.c:4596-4654)', () => {
  it('混乱敌打友敌:CalcBaseDamage(str,def)*2/physRes', () => {
    const { state, bus } = makeState({
      enemies: [
        { level: 5, attackStrength: 500 }, // 攻击者 idx0:str=500+(5+6)*6=566
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 }, // 目标 idx1:def=10+(5+6)*4=54
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    // calcBase(566,54)=trunc(566*2-54*1.6+0.5)=trunc(1046.1)=1046;*2=2092;/physRes2=1046
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046)
  })

  it('混乱敌打友敌:伤害<=0 钳 1', () => {
    const { state, bus } = makeState({
      enemies: [
        { level: 1, attackStrength: 0 }, // str=0+7*6=42
        { level: 50, defense: 10000, physicalResistance: 1, health: 500 }, // def 巨大 → base 0
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.enemies[1]!.e.health).toBe(499) // base 0 → *2=0 → <=0 → 1
  })

  it('M8:有 posOriginal → 建混乱攻击动画(滑步+火花+抖动)启动 battleAnim,伤害仍结算', () => {
    const { state, bus } = makeState({
      enemies: [
        { level: 5, attackStrength: 500 },
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 },
      ],
    })
    state.enemies[0]!.posOriginal = { x: 100, y: 80 }
    state.enemies[1]!.posOriginal = { x: 200, y: 100 }
    state.enemies[1]!.spriteFrameHeight = 30
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.battleAnim).toBeDefined() // 动画链启动(替代旧的即时数字,fight.c:4596-4654)
    expect(state.battleAnim!.frames[3]!.overlay).toMatchObject({ x: 193, y: 100 })
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046) // 伤害结算不变
  })

  it('M8:缺 posOriginal(旧 fixture)→ fallback 不建动画', () => {
    const { state, bus } = makeState({
      enemies: [
        { level: 5, attackStrength: 500 },
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 },
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.battleAnim).toBeUndefined() // 无 render-state → 退化即时(向后兼容)
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046)
  })
})

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
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 9999 },
      enemies: [{ level: 1, dexterity: 0 }],
      forceRoll: 0, // 必摇出 0
    })
    performFlee(state, gs, 0, playerRoles)
    // 成功 → 设 fleeAnim(逃跑动画放完才 phase='fleed';不再直接 fleed)
    expect(state.fleeAnim).toBeDefined()
  })

  it('fleeRate=0 + 多个高 dex 敌人(roll 必大)→ phase 不变', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 0 },
      enemies: [
        { level: 50, dexterity: 100 },
        { level: 50, dexterity: 100 },
      ],
      forceRoll: 1, // 任何 >0 的 roll 都击败 str=0
    })
    const before = state.phase
    performFlee(state, gs, 0, playerRoles)
    expect(state.phase).toBe(before) // 不变
  })

  it('isBoss=true → 无论 fleeRate 多高都不可逃', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 99999 },
      enemies: [{ level: 1, dexterity: 0 }],
      isBoss: true,
      forceRoll: 0,
    })
    performFlee(state, gs, 0, playerRoles)
    expect(state.fleeAnim).toBeUndefined() // boss 不可逃 → 不触发逃跑动画
    expect(state.phase).not.toBe('fleed')
  })

  it('无 enemy 时 def=0 → roll∈[0,0]=0,fleeRate>=0 → 命中', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 0 },
      enemies: [], // def 累加为 0
      forceRoll: 0,
    })
    performFlee(state, gs, 0, playerRoles)
    expect(state.fleeAnim).toBeDefined()
  })

  it('def 为 SHORT 负溢出 → clamp 0(sdlpal fight.c:4139)', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 0 },
      // SHORT(累加结果) < 0 → def=0;rng(0,0)=0;str=0 >= 0 → 命中
      enemies: [{ level: 1, dexterity: -32700 }],
      forceRoll: 0,
    })
    performFlee(state, gs, 0, playerRoles)
    expect(state.fleeAnim).toBeDefined()
  })

  it('逃跑失败 → 起失败动画 battleAnim(sdlpal fight.c:4155-4168,3步右下挪+帧1)', () => {
    const { state, playerRoles, bus, gs } = makeState({
      role: { fleeRate: 0 },
      enemies: [{ level: 50, dexterity: 100 }],
      forceRoll: 1, // roll>0 击败 fleeRate=0 → 失败
    })
    state.players[0]!.posOriginal = { x: 100, y: 100 }
    performFlee(state, gs, 0, playerRoles, bus)
    expect(state.fleeAnim).toBeUndefined() // 未成功(无逃离动画)
    expect(state.battleAnim).toBeDefined() // 起了失败动画时间线(per-player 3步+帧1)
    expect(bus.drain().filter(c => c.cmd.op === 'showBattleMessage')).toHaveLength(0) // 文字不早于失败动作
    expect(state.battleAnim?.frames.at(-1)?.battleMessage).toEqual({ text: '逃跑失败', durationMs: 320 })
  })

  // ── D12(2026-06-01 W1):装备逃跑率加成生效(sdlpal global.c:1868-1897 PAL_GetPlayerFleeRate)──
  it('装备授逃跑率 → base+装备 决定成功(base 0 单凭装备 50 即可逃)', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 0 }, // runtime base = 0
      equipFleeRate: 50, // 装备槽 0 授 +50
      enemies: [{ level: 1, dexterity: 0 }], // def = 0 + (1+6)*4 = 28
      forceRoll: 28, // roll=28;base-only str=0 < 28 失败,equip-aware str=50 >= 28 成功
    })
    performFlee(state, gs, 0, playerRoles)
    // 装备感知:str = getPlayerFleeRate = 0+50 = 50 >= 28 → 成功(若仍用 raw base 0 则失败,fleeAnim undefined)
    expect(state.fleeAnim).toBeDefined()
  })

  // ── DM4:def 累加跳过 defeated 空槽(fight.c:4129 `if (wObjectID == 0) continue`)──
  it('DM4:defeated 敌(死敌清槽/0 占位)不计入 def,roll 上限只含活敌', () => {
    const { state, playerRoles, gs } = makeState({
      role: { fleeRate: 28 },
      enemies: [
        { level: 1, dexterity: 0 }, // 活敌:def = 0 + (1+6)*4 = 28
        { level: 50, dexterity: 100 }, // 标 defeated:C 不计(原 bug:仍累加 → 成功率偏低)
      ],
    })
    state.enemies[1]!.defeated = true
    let capturedHi = -1
    ;(state.rng as { rangeInclusive: (lo: number, hi: number) => number }).rangeInclusive = (_lo, hi) => {
      capturedHi = hi
      return 0
    }
    performFlee(state, gs, 0, playerRoles)
    expect(capturedHi).toBe(28) // 仅活敌 28;若含死敌应为 28+100+(50+6)*4=352
    expect(state.fleeAnim).toBeDefined() // str 28 >= roll 0
  })

  // ── DM5:boss 战逃跑恒消费 RNG 并走失败演出(fight.c:4143 掷骰为 && 左操作数;4155-4170 失败分支)──
  it('DM5:isBoss 仍消费一次掷骰,走失败动画 + FleeExp.wCount+=2', () => {
    const { state, playerRoles, bus, gs } = makeState({
      role: { fleeRate: 9999 }, // str 必胜 roll,但 isBoss → 必失败
      enemies: [{ level: 1, dexterity: 0 }],
      isBoss: true,
    })
    state.players[0]!.posOriginal = { x: 100, y: 100 }
    let rolls = 0
    ;(state.rng as { rangeInclusive: (lo: number, hi: number) => number }).rangeInclusive = () => {
      rolls++
      return 0
    }
    const before = gs.Exp.rgFleeExp[0]?.wCount ?? 0
    performFlee(state, gs, 0, playerRoles, bus)
    expect(rolls).toBe(1) // RandomLong(0,def) 恒消费(原 bug:顶部提前 return 不掷)
    expect(state.fleeAnim).toBeUndefined() // 不成功
    expect(state.battleAnim).toBeDefined() // 失败演出(3 步右下挪 + 帧1)
    expect(gs.Exp.rgFleeExp[0]?.wCount ?? 0).toBe(before + 2)
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

function makeObjectMagic(opts: Partial<ObjectMagicView> = {}): ObjectMagicView {
  return {
    id: 295,
    magicNumber: 47,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: true,
    },
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

  // M6 法术起手音 —— sdlpal PAL_BattleShowPlayerPreMagicAnim CLASSIC 分支(fight.c:2377,!fIsWIN95)播
  //   AUDIO_PlaySound(rgwMagicSound[role]) = **每角色自己的施法音**(非固定;李逍遥9/赵灵儿10/林月如11)。
  //   2026-06-03 user 实听 9/10/11 纠正:此前误用固定 28(实为物品演出音 PAL_BattleShowPlayerUseItemAnim)。
  it('M6 法术音:队员施法 push 本角色 magicSound + 效果音;敌方施法播 enemy.magicSound', () => {
    // 队员施法 → [role.magicSound(9), 55(magic.sound 效果)]
    {
      const { state, playerRoles, bus, gs } = makeState({ role: { mp: 30, maxMP: 30, magicSound: 9 } })
      performMagic({
        state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
        targetIsEnemy: true, targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [makeMagic({ id: 3, costMP: 8, baseDamage: 0, sound: 55 })],
        playerRoles, bus, commands: [{ op: 'end' }], runScript: vi.fn(), gs,
      })
      expect(gs.pendingSounds).toEqual([9, 55])
    }
    // 敌方施法 → 播敌人自身 cast 音 enemy.magicSound(62,sdlpal fight.c:4695)+ 效果音(走 enemy 分支,非 role)
    {
      const { state, playerRoles, bus, gs } = makeState({
        role: { mp: 30, maxMP: 30 },
        enemies: [{ magicSound: 62 }],
      })
      performMagic({
        state, casterIsEnemy: true, casterIdx: 0, spellId: 7,
        targetIsEnemy: false, targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [makeMagic({ id: 3, costMP: 8, baseDamage: 0, sound: 55 })],
        playerRoles, bus, commands: [{ op: 'end' }], runScript: vi.fn(), gs,
      })
      expect(gs.pendingSounds ?? []).toEqual([62, 55]) // 敌 cast 音 62 + 效果音 55
    }
  })

  // 顺序修:user 先后报"灵葫咒掉血在动画前"和"武神数字等整段动画结束才出"。
  //   SDLPal 是 OffMagic/Summon 主特效结束后 DisplayStatChange,随后 PostMagic 受击动画。
  it('scriptOnSuccess 秒杀(0x60)数字挂 PostMagic 第一帧,不等整条时间线结束(灵葫咒类,真 runScript)', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 30, maxMP: 30 },
      enemies: [{ level: 5, health: 100 }],
    })
    // 时间线前置:caster + target 有 posOriginal + magicSpriteFrameCounts 有 effect → 建 OffMagic 链
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    // scriptOnSuccess @ip1 = 0x60 秒杀目标敌(ctx.target);baseDamage SHORT -999 哨兵 → 无 inline 伤害,只 KO 数字
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x60, operands: [0xFFFF, 0, 0] }, { op: 'end' }]
    const spell = makeSpell({ id: 9, magicNumber: 5, scriptOnUse: 0, scriptOnSuccess: 1 })
    const magic = makeMagic({ id: 5, effect: 7, type: 'normal', baseDamage: 64537 })
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 9, targetIsEnemy: true, targetIdx: 0,
      spells: [spell], magics: [magic], playerRoles, bus, commands, runScript,
      magicSpriteFrameCounts: new Map([[7, 4]]), // effect 7 有 4 帧 → 建 OffMagic 时间线
    })
    expect(state.enemies[0]!.e.health).toBe(0) // 秒杀生效(逻辑同步)
    // 关键:秒杀数字不即时 emit,而挂到 PostMagic 第一帧(敌人开始受击时),不再等整条时间线播完。
    expect(bus.drain().filter(c => c.cmd.op === 'showDamageNum')).toHaveLength(0)
    expect(state.battleAnim?.pendingDamageNums ?? []).toHaveLength(0)
    const frames = state.battleAnim?.frames ?? []
    const numIdx = frames.findIndex(f => (f.damageNums?.length ?? 0) > 0)
    const firstPostIdx = frames.findIndex(f => f.fighters?.some(d => d.side === 'enemy' && d.idx === 0))
    expect(numIdx).toBe(firstPostIdx)
    expect(frames[numIdx]!.damageNums).toEqual([{ target: { kind: 'enemy', idx: 0 }, value: 100, color: 'blue' }])
  })

  it('武神/召唤法术:伤害数字在召唤神淡出前的 PostMagic 第一帧显示', () => {
    const { state, playerRoles, bus } = makeState({
      role: { mp: 120, maxMP: 120, magicStrength: 80 },
      enemies: [{ health: 9000, defense: 20, level: 5 }],
      forceFloat: 1,
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }

    const wuShen = makeMagic({
      id: 19,
      type: 'summon',
      special: 0,
      effect: 52,
      xOffset: -8,
      yOffset: 22,
      speed: 0,
      effectTimes: 0xfffe,
      baseDamage: 250,
      sound: 303,
    })
    const wuShenSecondary = makeMagic({
      id: 52,
      effect: 13,
      type: 'attackAll',
      speed: 0,
      fireDelay: 0,
      effectTimes: 1,
      baseDamage: 0,
    })

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 351,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [makeSpell({ id: 351, magicNumber: 19, flags: {
        usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: true,
      } })],
      magics: [wuShen, wuShenSecondary],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
      magicSpriteFrameCounts: new Map([[13, 8]]),
      summonSpriteFrameCounts: new Map([[10, 4]]),
    })

    expect(bus.drain().filter(c => c.cmd.op === 'showDamageNum')).toHaveLength(0)
    expect(state.battleAnim?.pendingDamageNums ?? []).toHaveLength(0)
    const frames = state.battleAnim?.frames ?? []
    const numIdx = frames.findIndex(f => (f.damageNums?.length ?? 0) > 0)
    const firstFadeOutIdx = frames.findIndex(f => f.summon?.fadeDir === 'out')
    expect(numIdx).toBeGreaterThan(0)
    expect(firstFadeOutIdx).toBeGreaterThan(numIdx)
    expect(frames[numIdx]!.summon?.spriteKey).toBe('player-10')
    expect(frames[numIdx]!.fighters?.some(d => d.side === 'enemy' && d.idx === 0)).toBe(true)
    expect(frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: expect.any(Number), color: 'blue' },
    ])
  })

  it('金蝉脱壳 scriptOnUse(0x3A)→ 触发 PlayerEscape 动画,不直接结束战斗', () => {
    const { state, playerRoles, bus, gs } = makeState({ role: { mp: 99, maxMP: 99 } })
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x3A, operands: [43072, 0, 0] },
      { op: 'end' },
    ]
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 392,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [makeSpell({
        id: 392,
        magicNumber: 99,
        scriptOnUse: 1,
        flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: false, applyToAll: true },
      })],
      magics: [makeMagic({ id: 99, costMP: 33, baseDamage: 0, effect: 0xffff, sound: 0 })],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
    })

    expect(playerRoles.roles[0]!.mp).toBe(66)
    expect(state.fleeAnim).toEqual({ step: 0 })
    expect(state.phase).toBe('performAction')
    expect(gs.pendingSounds).toEqual([45])
  })

  it('夺魂失败 → battle narration 显示原文「失败　没有效果」', () => {
    const { state, playerRoles, bus, gs } = makeState({ role: { mp: 99, maxMP: 99 } })
    state.enemies[0]!.resistanceToSorcery = 10 // 0x2E RandomLong(0,9) 永远不大于 10 → 失败跳转
    state.rng.rangeInclusive = () => 0
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x2E, operands: [0, 0, 3] },
      { op: 'end' },
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', messageIndex: 13364, text: '失败　没有效果' },
      { op: 'end' },
    ]
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 304,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 304, magicNumber: 67, scriptOnSuccess: 1 })],
      magics: [makeMagic({ id: 67, costMP: 83, baseDamage: 64537, effect: 39, sound: 170 })],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
    })

    expect(state.battleDialogQueue?.[0]).toMatchObject({ text: '失败　没有效果', style: 'narration' })
    expect(bus.drain().some(c => c.cmd.op === 'showBattleMessage')).toBe(false)
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

  it('梦蛇295:spells 缺项时从 object-magics 解析并在 Trance 闪色末帧切换 sprite', () => {
    const { state, playerRoles, bus, gs } = makeState({
      role: { mp: 120, maxMP: 120, spriteNumInBattle: 1, magicSound: 9 },
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.spriteNumOverride = 1
    const runScript: RunScriptFn = vi.fn((opts) => {
      if (opts.ip === 10)
        state.players[0]!.spriteNumOverride = 295
    })

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 295,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [],
      objectMagics: [makeObjectMagic({ id: 295, magicNumber: 47, scriptOnSuccess: 10 })],
      magics: [makeMagic({ id: 47, type: 'trance', costMP: 99, baseDamage: 0, sound: 335 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
      gs,
    })

    expect(playerRoles.roles[0]!.mp).toBe(21)
    expect(runScript).toHaveBeenCalledTimes(1)
    expect((runScript as ReturnType<typeof vi.fn>).mock.calls[0]![0].ip).toBe(10)
    expect(state.players[0]!.spriteNumOverride).toBe(1) // 闪色阶段仍用旧 sprite
    expect(state.battleAnim?.frames.length).toBeGreaterThan(7)
    expect(state.battleAnim?.frames.some(f => f.sound === 9)).toBe(true)
    expect(gs.pendingSounds ?? []).not.toContain(335) // trance:原版 DefMagicAnim effect=0xFFFF 早退,magic.sound 335 不播(fight.c:2480-2484/2501)
    // L19:闪色 6 帧(旧精灵 iColorShift 渐变)后,**不再硬切**,而是接 72 步 dither crossfade
    //   (fight.c:4234-4240 VIDEO_BackupScreen→LoadBattleSprites→iColorShift=0→MakeScene→FadeScene)。
    const fr = state.battleAnim!.frames
    const flashStart = fr.length - SUMMON_FADE_STEPS - 6
    expect(fr.slice(flashStart, flashStart + 6).map(f => f.fighters?.[0]?.iColorShift)).toEqual([0, 2, 4, 6, 8, 10])
    // fade 段:72 帧,每帧已切到新精灵 295 + iColorShift=0,复用 summon crossfade 引擎(fadeDir='out' 不画神/不隐队员)。
    const fadeFrames = fr.slice(-SUMMON_FADE_STEPS)
    expect(fadeFrames.length).toBe(SUMMON_FADE_STEPS)
    expect(fadeFrames.every(f =>
      f.summon?.fadeDir === 'out'
      && f.fighters?.[0]?.iColorShift === 0
      && f.fighters?.[0]?.spriteNumOverride === 295,
    )).toBe(true)
    expect(fadeFrames[0]!.summon?.fadeStep).toBe(0)
    expect(fadeFrames.at(-1)!.summon?.fadeStep).toBe(SUMMON_FADE_STEPS - 1)
    expect(state.battleAnim?.hasSummonFade).toBe(true) // present 据此在非 fade 帧(闪色)快照 from
    expect(state.battleAnim?.frames.at(-1)?.fighters?.[0]).toMatchObject({
      side: 'player',
      idx: 0,
      iColorShift: 0,
      spriteNumOverride: 295,
    })
    expect(bus.drain().map(c => c.cmd).filter(c => c.op === 'playMagicAnim')).toEqual([{
      op: 'playMagicAnim',
      magicId: 47,
      casterType: 'player',
      casterIdx: 0,
      targetType: 'player',
      targetIdx: 'all',
    }])
  })

  it('斩龙诀式 scriptOnUse 0x35:振屏挂到 OffMagic 起始,不提前写全局 gs.shakeTime', () => {
    const { state, playerRoles, bus, gs } = makeState({
      role: { mp: 120, maxMP: 120, spriteNumInBattle: 1, magicStrength: 100 },
      enemies: [{ health: 500 }],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const runScript = vi.fn((opts) => {
      opts.battleCtx!.pendingScreenShake!.time = 14
      opts.battleCtx!.pendingScreenShake!.level = 4
    }) as RunScriptFn

    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 342,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [makeSpell({ id: 342, magicNumber: 16, scriptOnUse: 43111, flags: {
        usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: true,
      } })],
      magics: [makeMagic({
        id: 16, effect: 11, type: 'attackWhole', xOffset: 0, yOffset: 44,
        speed: 0, fireDelay: 0, effectTimes: 0, shake: 0, baseDamage: 280,
      })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
      gs,
      magicSpriteFrameCounts: new Map([[11, 6]]),
    })

    expect(gs.shakeTime).toBe(0)
    const frames = state.battleAnim?.frames ?? []
    const firstMagicIdx = frames.findIndex(f => f.overlays?.some(o => o.kind === 'magic' && o.spriteChunk === 11))
    expect(firstMagicIdx).toBeGreaterThan(0)
    expect(frames.slice(0, firstMagicIdx).some(f => f.shake)).toBe(false)
    expect(frames[firstMagicIdx]?.shake).toEqual({ time: 14, level: 4 })
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
  it('队员 use,inventory>0 → 脚本后按 consuming 扣库存 + runScript 被调', () => {
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 7, count: 3 }])
    const item = makeItem({ id: 7, scriptOnUse: 42 })
    const runScript: RunScriptFn = vi.fn(() => {
      expect(gs.inventory[0]!.count).toBe(3) // sdlpal fight.c:4392-4399:先跑脚本,后扣 consuming
    })
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

  it('队员 use,非 consuming 物品 → 跑脚本但不扣库存', () => {
    const { state, playerRoles, bus } = makeState()
    const gs = makeGameState([{ itemId: 7, count: 3 }])
    const item = makeItem({ id: 7, scriptOnUse: 42, flags: { ...makeItem().flags, consuming: false } })
    const runScript: RunScriptFn = vi.fn()

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
      commands: [{ op: 'end' }],
      runScript,
    })

    expect(gs.inventory[0]!.count).toBe(3)
    expect(runScript).toHaveBeenCalledTimes(1)
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

  it('item.scriptOnUse=0 → PAL_RunTriggerScript no-op,仍按 consuming 扣库存', () => {
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

    expect(gs.inventory[0]!.count).toBe(4) // sdlpal fight.c:4392-4400:script 0 no-op 后仍扣 consuming
    expect(runScript).not.toHaveBeenCalled()
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

  it('target=\'all\' → battleCtx.target=undefined,仍按 consuming 扣 inventory + 仍 runScript', () => {
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

// ============================================================================
// buff 端到端验证(0x2D opcode 施 buff → status 置位 → 战斗效果生效)
//   user 2026-06-05 求证"天罡战气/金刚咒/仙风云体术 感觉没效果"。① 状态递减时机已核(tickStatusEffects 在
//   回合末 action 之后,fight.c:1632-1638,非使用前清零)。② 各单元已分散测(bravery actions:579 / protect
//   物理 actions:677 + 法术 magic-damage:306 / haste formulas:241 / 0x2D opcode battle-opcodes:543 / 递减
//   status:38);此处补**整链**证据:真 0x2D opcode 施 buff(非直接写 status)→ status 置位 → 真战斗消费点
//   (performAttack / getPlayerActualDexterity)→ 效果生效,与无 buff 对照。
// ============================================================================
describe('buff 端到端(0x2D 施 buff → status → 战斗效果;user 2026-06-05 求证)', () => {
  const buffCtx = (s: { state: BattleState; playerRoles: PlayerRoles; gs: GameState }): BattleCtx =>
    ({ state: s.state, target: { type: 'player', idx: 0 }, playerRoles: s.playerRoles, gs: s.gs } as BattleCtx)

  it('天罡战气 → 0x2D[5,3] 置 bravery=3 → 单体物攻必暴击 ×3(对照无 buff;fight.c:3640)', () => {
    const mk = () => makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 99999 }],
      forceRoll: 1, forceFloat: 1, // crit roll≠0(无 buff 不暴击);jitter=1
    })
    // 对照:无 buff
    const a = mk()
    performAttack(a.state, playerActor, 0, a.bus, a.playerRoles)
    const dmgNoBuff = 99999 - a.state.enemies[0]!.e.health
    // 真 0x2D opcode 施 buff
    const b = mk()
    const r = dispatchBattleOpcode(0x2D, [5, 3, 0], buffCtx(b))
    expect(r.consumed).toBe(true)
    expect(b.state.players[0]!.status.bravery).toBe(3) // status 置位
    performAttack(b.state, playerActor, 0, b.bus, b.playerRoles)
    const dmgBuff = 99999 - b.state.enemies[0]!.e.health
    expect(dmgBuff).toBe(dmgNoBuff * 3) // 暴击 ×3 生效
  })

  it('金刚咒 → 0x2D[6,3] 置 protect=3 → 敌物攻伤害减半(attack.ts:335;fight.c:5059)', () => {
    const mk = () => makeState({
      role: { hp: 500, maxHP: 500, defense: 10 },
      enemies: [{ level: 5, attackStrength: 100, defense: 10, physicalResistance: 1, health: 100 }],
      forceRoll: 1, // 固定 rng:str+1 / +1;fAutoDefend=(1>=10)=false
    })
    const a = mk()
    performAttack(a.state, enemyActor, 0, a.bus, a.playerRoles)
    const dmgNoBuff = 500 - a.playerRoles.roles[0]!.hp
    const b = mk()
    dispatchBattleOpcode(0x2D, [6, 3, 0], buffCtx(b))
    expect(b.state.players[0]!.status.protect).toBe(3)
    performAttack(b.state, enemyActor, 0, b.bus, b.playerRoles)
    const dmgBuff = 500 - b.playerRoles.roles[0]!.hp
    expect(dmgNoBuff).toBeGreaterThan(2) // 健全性:基准伤害够大,÷2 有意义
    expect(dmgBuff).toBe(Math.trunc(dmgNoBuff / 2)) // protect 减半(trunc)
    // 注:protect 对**法术**伤害同样 ÷2(magic-damage.ts:221)已由 magic-damage.test.ts:306 覆盖。
  })

  it('仙风云体术 → 0x2D[7,3] 置 haste=3 → 行动 dexterity ×3(battle-system.ts:620→formulas.ts:209)', () => {
    const b = makeState({ role: { dexterity: 30 } })
    dispatchBattleOpcode(0x2D, [7, 3, 0], buffCtx(b))
    expect(b.state.players[0]!.status.haste).toBe(3)
    // 真 turn-order 消费点读 status.haste>0 → getPlayerActualDexterity ×3(battle-system.ts:620-624)
    const hasted = b.state.players[0]!.status.haste > 0
    expect(getPlayerActualDexterity(30, { haste: hasted, slow: false })).toBe(90)
  })

  it('buff 递减时机:本回合行动消费 buff **后**才回合末 -1(不使用前清零;fight.c:1632)', () => {
    const b = makeState({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 99999 }],
      forceRoll: 1, forceFloat: 1,
    })
    dispatchBattleOpcode(0x2D, [5, 3, 0], buffCtx(b))
    expect(b.state.players[0]!.status.bravery).toBe(3)
    // 本回合物攻仍吃 bravery(行动不动 status)→ 证明未在使用前清零
    performAttack(b.state, playerActor, 0, b.bus, b.playerRoles)
    expect(b.state.players[0]!.status.bravery).toBe(3)
    // 回合末递减 -1(tickStatusEffects,fight.c:1632-1638);仍 >0 → 下回合继续生效(持久)
    tickStatusEffects(b.state)
    expect(b.state.players[0]!.status.bravery).toBe(2)
  })
})
