/**
 * TEST-GLM-GAME-BATTLE-STATE-1 — battle 状态机残余合同(逐合同排重后 10 条)。
 *
 * 排重基线:battle-system.test.ts / battle-system.cov85 / battle-system.glm-next-wave /
 * battle-opcodes 三个文件 / actions.test.ts / throw-item / attack-mate /
 * enemy-ai.test.ts / turn-queue.test.ts / battle-state 两个文件 / battle-runtime-context.test.ts /
 * battle-finalization.test.ts / battle-settlement.glm-next-wave / battle-progression.glm-next-wave /
 * battle-levelup / battle-turn-boundaries.glm-turn(已归档 Game 卡)。
 * 只覆盖上述文件未证明的独立业务轴;同形臂见 docs/ops/evidence/TEST-GLM-GAME-BATTLE-STATE-1/dedup-ledger.md。
 *
 *  1. haste 状态进队列 wiring(公式单测已有,queue 构建接线未证;battle-system.ts:748-751)
 *  2. DH3 未学法术降级(rgwMagic 有数据但查无该 spell;silence/MP 臂已测,known 臂未证;:2634-2644)
 *  3. DL7 被沉默敌仍消费魔法掷骰(RNG 流对齐;enemy-ai.test.ts:122 只证 type;enemy-ai.ts:119-121)
 *  4. scriptOnReady 返回值回写 show-once(turnStart 侧已证,ready 侧 :2526 未证)
 *  5. E04 defend → rgDefenseExp +2(fight.c:4116;仅负向断言存在)
 *  6. E04 玩家施法 → rgMagicExp +=R(2,3) + rgMagicPowerExp +=1(fight.c:4328-4329;敌方 0 掷骰已证)
 *  7. expGained=0 → 无 exp-cash 屏;cash 仍无条件入账(battle.c:1025 门 + 1054)
 *  8. Phase E:defeated 槽照跑 scriptOnBattleEnd 且返回值不回写(battle.c:1334-1337)
 *  9. rgwMagic 32 槽全满 → 不再学新法术(global.c:2084 PAL_AddMagic 槽满 false)
 * 10. 升级快照有效值含装备加成(battle.c:1184-1212;旧快照测全无装备)
 */
import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { type CommandBus, createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { createSeedableRng, type SeedableRng } from '../rng.js'
import { battleWonLevelUp } from './battle-progression.js'
import { buildBattleWonSettlement, tickBattleSettlement } from './battle-settlement.js'
import { type BattleResources, startBattle, tickBattle } from './battle-system.js'
import { decideEnemyAction } from './enemy-ai.js'

// ── 夹具(模式取自 battle-system.test.ts bootstrap;只留本文件用到的形状) ──────

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
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
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
    exp: 50,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 10,
    magicStrength: 0,
    defense: 10,
    dexterity: 20,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

function mkSpell(id: number, flags: Partial<Spell['flags']> = {}): Spell {
  return {
    id,
    _name: `spell${id}`,
    magicNumber: id,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
      ...flags,
    },
  }
}

function mkMagic(id: number, opts: Partial<Magic> = {}): Magic {
  return {
    id,
    effect: 0,
    type: 'normal' as Magic['type'],
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
    baseDamage: 30,
    elemental: 0,
    sound: 0,
    ...opts,
  }
}

interface BootOpts {
  partyMembers?: number[]
  roles?: PlayerRole[]
  enemies?: Enemy[]
  spells?: Spell[]
  magics?: Magic[]
  items?: Item[]
  commands?: Command[]
  rngSeed?: number
}

function boot(opts: BootOpts = {}): {
  gs: GameState
  bus: CommandBus
  playerRoles: PlayerRoles
  resources: BattleResources
  emptyInput: InputSnapshot
} {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = opts.partyMembers ?? [0]
  const roles = opts.roles ?? gs.partyMembers.map((id) => makeRole({ id }))
  const playerRoles: PlayerRoles = { roles }
  const enemies = opts.enemies ?? [makeEnemy({ id: 100 })]
  const enemyTeams: EnemyTeam[] = [{ id: 0, enemies: [100, 0xffff, 0xffff, 0xffff, 0xffff] }]
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const spells = opts.spells ?? []
  const magics = opts.magics ?? []
  const items = opts.items ?? []
  const commands = opts.commands ?? [{ op: 'end' }]
  const bus = createCommandBus()
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies,
    enemyTeams,
    battleFields: [field],
    playerRoles,
    items,
    spells,
    magics,
    commands,
    rngSeed: opts.rngSeed ?? 42,
  })
  const resources: BattleResources = {
    items,
    spells,
    magics,
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    enemies,
    enemyObjects: [],
    playerRoles,
    commands,
  }
  return {
    gs,
    bus,
    playerRoles,
    resources,
    emptyInput: { held: new Set(), pressed: new Set(), frameNum: 0 },
  }
}

const NO_KEY: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }

/** 直摆单项玩家/敌方行动队列(仿 battle-system.test.ts BUG-1 / #311 手法)。 */
function injectSingleItem(gs: GameState, item: { isEnemy: boolean; idx: number }): void {
  const st = gs.battleState!
  st.phase = 'performAction'
  st.actionQueue = [{ isEnemy: item.isEnemy, idx: item.idx, dex: 100, fIsSecond: false }]
  st.currentActionIndex = 0
}

describe('TEST-GLM-GAME-BATTLE-STATE-1 行动选择与队列 wiring(battle-system.ts)', () => {
  it('haste 状态队员行动 dex ×3 进队列:同 dex 队员被压到其后(formulas 单测已有,queue 构建接线未证;fight.c:336-389 × :1556)', () => {
    const { gs, bus, emptyInput } = boot({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, dexterity: 50 }), makeRole({ id: 1, dexterity: 50 })],
      enemies: [makeEnemy({ id: 100, level: 0, dexterity: 0 })], // 敌 dex=(0+6)*3=18
    })
    const st = gs.battleState!
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(turnStart 无脚本)
    st.players[0]!.status.haste = 3 // 仙风云体术式加成(PAL_CLASSIC ×3)
    st.pendingActions.set(0, { type: 'attack', target: 0, targetSide: 'enemy' })
    st.pendingActions.set(1, { type: 'attack', target: 0, targetSide: 'enemy' })
    tickBattle(gs, emptyInput, bus) // 全员已填 → buildActionQueue → performAction
    expect(st.phase).toBe('performAction')
    // p0: 50×3=150 jitter[135,165] > p1: 50 jitter[45,55] > 敌: 18 jitter[16,19](间隔充分,掷骰不换序)
    expect(st.actionQueue.map((q) => (q.isEnemy ? `e${q.idx}` : `p${q.idx}`))).toEqual([
      'p0',
      'p1',
      'e0',
    ])
  })

  it('DH3 未学法术(rgwMagic 有数据但查无该 spell)→ 攻击系降普攻 / 辅助系降防御(MP 都不扣;fight.c:3290-3301 known 臂,silence/MP 臂旧测已证)', () => {
    // 攻击系(usableToEnemy)→ 降普攻
    const atk = boot({
      roles: [makeRole({ id: 0, mp: 30 })],
      spells: [mkSpell(296), mkSpell(297)],
      magics: [mkMagic(296), mkMagic(297)],
    })
    atk.gs.PlayerRolesRuntime.rgwMagic[0]![0] = 297 // 有已学数据(hasAnyMagicData),但 296 未学
    injectSingleItem(atk.gs, { isEnemy: false, idx: 0 })
    atk.gs.battleState!.pendingActions.set(0, {
      type: 'magic',
      actionId: 296,
      target: 0,
      targetSide: 'enemy',
    })
    const hp0 = atk.gs.battleState!.enemies[0]!.e.health
    for (let i = 0; i < 200 && atk.gs.battleState!.currentActionIndex === 0; i++)
      tickBattle(atk.gs, atk.emptyInput, atk.bus)
    expect(atk.gs.battleState!.enemies[0]!.e.health).toBeLessThan(hp0) // 降普攻命中
    expect(atk.playerRoles.roles[0]!.mp).toBe(30) // MP 不扣(未走 performMagic)

    // 辅助系(usableToEnemy=false)→ 降防御
    const def = boot({
      roles: [makeRole({ id: 0, mp: 30 })],
      spells: [mkSpell(296, { usableToEnemy: false }), mkSpell(297)],
      magics: [mkMagic(296), mkMagic(297)],
    })
    def.gs.PlayerRolesRuntime.rgwMagic[0]![0] = 297
    injectSingleItem(def.gs, { isEnemy: false, idx: 0 })
    def.gs.battleState!.pendingActions.set(0, {
      type: 'magic',
      actionId: 296,
      target: 0,
      targetSide: 'player',
    })
    const defHp0 = def.gs.battleState!.enemies[0]!.e.health
    for (let i = 0; i < 200 && def.gs.battleState!.currentActionIndex === 0; i++)
      tickBattle(def.gs, def.emptyInput, def.bus)
    expect(def.gs.battleState!.players[0]!.defending).toBe(true) // 降防御
    expect(def.gs.battleState!.enemies[0]!.e.health).toBe(defHp0)
    expect(def.playerRoles.roles[0]!.mp).toBe(30)
  })
})

describe('TEST-GLM-GAME-BATTLE-STATE-1 敌方 AI(enemy-ai.ts)', () => {
  it('DL7:被沉默敌仍消费一次魔法掷骰再落物理(RNG 流与未沉默一致,不因 silence 少抽;fight.c:4656-4658)', () => {
    // enemy-ai.test.ts:122 只断言 silence → type attack;掷骰消耗次数(RNG 流对齐)未证。
    function countingRng(seed: number): { rng: SeedableRng; magicRolls: () => number } {
      const base = createSeedableRng(seed)
      let rolls = 0
      const rng: SeedableRng = {
        ...base,
        range: (lo: number, hi: number) => {
          if (lo === 0 && hi === 10) rolls++ // 魔法门掷骰 RandomLong(0,9) 的唯一签名
          return base.range(lo, hi)
        },
      }
      return { rng, magicRolls: () => rolls }
    }
    const enemy = makeEnemy({ magic: 296, magicRate: 10 }) // magicRate=10:掷骰必过魔法门

    const silenced = countingRng(42)
    const silencedAction = decideEnemyAction({
      enemy,
      alivePlayers: [{ idx: 0, hp: 50 }],
      rng: silenced.rng,
      status: { silence: 1 },
    })
    expect(silencedAction.type).toBe('attack') // 被沉默 → 物理
    expect(silenced.magicRolls()).toBe(1) // 但魔法门掷骰照常消费一次(DL7:短路序与 C 一致)

    const control = countingRng(42) // 同 seed 对照:未沉默走魔法分支
    const controlAction = decideEnemyAction({
      enemy,
      alivePlayers: [{ idx: 0, hp: 50 }],
      rng: control.rng,
    })
    expect(controlAction.type).toBe('magic')
    expect(control.magicRolls()).toBe(1) // 两个分支消耗同数掷骰 → silence 不偏移 RNG 流
  })
})

describe('TEST-GLM-GAME-BATTLE-STATE-1 scriptOnReady re-arm 回写(battle-system.ts:2526)', () => {
  it('0x01 advance end → scriptOnReady 回写 end 行+1(show-once;fight.c:1226-1227;turnStart 侧已证,ready 侧未证)', () => {
    const commands: Command[] = [
      { op: 'end' },
      { op: 'end', advance: true }, // ip=1 起:advance end → runScript 返回 2
    ]
    const { gs, bus, emptyInput } = boot({ commands })
    const st = gs.battleState!
    st.enemies[0]!.scriptOnReady = 1
    injectSingleItem(gs, { isEnemy: true, idx: 0 })
    for (let i = 0; i < 200 && st.enemies[0]!.scriptOnReady === 1; i++)
      tickBattle(gs, emptyInput, bus)
    expect(st.enemies[0]!.scriptOnReady).toBe(2) // 返回值回写 → 下次 ready 从 2 起(show-once)
  })
})

describe('TEST-GLM-GAME-BATTLE-STATE-1 E04 隐藏经验累积臂(battle-system.ts performBattleAction)', () => {
  it('defend action → rgDefenseExp.wCount += 2(fight.c:4116,无 RNG;旧测只有负向 0 断言)', () => {
    const { gs, bus, emptyInput } = boot()
    const st = gs.battleState!
    injectSingleItem(gs, { isEnemy: false, idx: 0 })
    st.pendingActions.set(0, { type: 'defend', target: -1 })
    expect(gs.Exp.rgDefenseExp[0]?.wCount ?? 0).toBe(0) // startBattle 已清池
    for (let i = 0; i < 50 && st.currentActionIndex === 0; i++) tickBattle(gs, emptyInput, bus)
    expect(gs.Exp.rgDefenseExp[0]!.wCount).toBe(2)
  })

  it('玩家施法 → rgMagicExp += R(2,3) 且 rgMagicPowerExp += 1(fight.c:4328-4329;敌方 0 掷骰 BUG-1 已证,玩家正向累积未证)', () => {
    const { gs, bus, playerRoles, emptyInput } = boot({
      roles: [makeRole({ id: 0, mp: 30 })],
      spells: [mkSpell(296)],
      magics: [mkMagic(296, { costMP: 5 })],
    })
    const st = gs.battleState!
    injectSingleItem(gs, { isEnemy: false, idx: 0 })
    st.pendingActions.set(0, { type: 'magic', actionId: 296, target: 0, targetSide: 'enemy' })
    for (let i = 0; i < 50 && st.currentActionIndex === 0; i++) tickBattle(gs, emptyInput, bus)
    expect(playerRoles.roles[0]!.mp).toBe(25) // 施法真执行(非降级)
    expect(gs.Exp.rgMagicExp[0]!.wCount).toBeGreaterThanOrEqual(2)
    expect(gs.Exp.rgMagicExp[0]!.wCount).toBeLessThanOrEqual(3) // 恰一次 R(2,3)
    expect(gs.Exp.rgMagicPowerExp[0]!.wCount).toBe(1)
  })
})

describe('TEST-GLM-GAME-BATTLE-STATE-1 胜利结算(battle-settlement.ts)', () => {
  it('expGained=0 → 无 exp-cash 屏;cash 仍无条件入账(battle.c:1025 `if iExpGained>0` 门 + 1054 无条件;旧测均 exp≥1)', () => {
    const { gs, resources } = boot({ roles: [makeRole({ id: 0, hp: 300, maxHP: 500 })] })
    const st = gs.battleState!
    st.expGained = 0
    st.cashGained = 50
    const cashBefore = gs.dwCash
    buildBattleWonSettlement(gs, st, resources)
    expect(st.settlement?.screens).toEqual([]) // 0 经验 → 不出 exp 屏
    expect(gs.dwCash).toBe(cashBefore + 50) // cash 无条件入账
  })

  it('Phase E:defeated 槽照跑 scriptOnBattleEnd 且返回值不回写(battle.c:1334-1337 对 i=0..max 不按 health 过滤;与 turnStart/ready 回写语义相反)', () => {
    const commands: Command[] = [
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: '战后残响' },
      { op: 'end', advance: true }, // runScript 返回 3 —— 若回写则字段变 3
    ]
    const { gs, bus, resources } = boot({
      commands,
      roles: [makeRole({ id: 0, hp: 300, maxHP: 500 })],
    })
    const st = gs.battleState!
    st.enemies[0]!.defeated = true // 真实 won 状态:全敌已被 checkEnemyDeaths 清槽
    st.enemies[0]!.scriptOnBattleEnd = 1
    st.settlement = { screens: [], index: 0, shownMs: 0 }
    expect(tickBattleSettlement(st, gs, NO_KEY, resources, bus)).toBe(true)
    expect(st.battleDialogQueue?.length).toBe(1) // defeated 槽照跑(脚本执行,对话入队)
    expect(st.enemies[0]!.scriptOnBattleEnd).toBe(1) // 返回值 3 不回写(区别于 turnStart/ready)
  })
})

describe('TEST-GLM-GAME-BATTLE-STATE-1 升级学法术与快照(battle-progression.ts)', () => {
  function makeGs(): GameState {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const rt = gs.PlayerRolesRuntime
    rt.rgwLevel[0] = 1
    rt.rgwHP[0] = 50
    rt.rgwMaxHP[0] = 100
    rt.rgwMP[0] = 10
    rt.rgwMaxMP[0] = 30
    rt.rgwAttackStrength[0] = 20
    gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 1, wCount: 0 }
    gs.partyMembers = [0]
    return gs
  }
  const rng0 = (): SeedableRng => ({ ...createSeedableRng(1), rangeInclusive: () => 0 })

  it('rgwMagic 32 槽全满 → 不再学新法术(learnedMagics 空、槽位不变;global.c:2084 PAL_AddMagic 槽满 false 臂)', () => {
    const gs = makeGs()
    const rt = gs.PlayerRolesRuntime
    for (let slot = 0; slot < 32; slot++) rt.rgwMagic[slot]![0] = 300 + slot // 全槽已学
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100, // 1 → 2 级,entry level 1 ≤ 2 满足学习门
      levelUpExp: Object.assign([], { 1: 100 }) as number[],
      levelUpMagic: [[{ level: 1, magic: 354 }]],
      rng: rng0(),
    })
    expect(results[0]!.learnedMagics).toEqual([]) // 无空槽 → 不学
    expect(rt.rgwMagic.some((row) => row[0] === 354)).toBe(false) // 槽位不被覆盖
  })

  it('升级快照有效值含装备加成:attack.old/cur 都带装备项(battle.c:1184-1212 PAL_GetPlayerXxx;旧快照测全无装备)', () => {
    const gs = makeGs()
    const rt = gs.PlayerRolesRuntime
    gs.rgEquipmentEffect[0]!.rgwAttackStrength[0] = 7 // 装备加成(生产层由 scriptOnEquip 回填)
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: Object.assign([], { 1: 100 }) as number[],
      levelUpMagic: [],
      rng: rng0(),
    })
    const snapshot = results[0]!.snapshot!
    expect(snapshot.attack.old).toBe(27) // old base 20 + 装备 7(有效值口径,非裸 base)
    expect(snapshot.attack.cur).toBe(rt.rgwAttackStrength[0]! + 7) // cur 同带装备
  })
})
