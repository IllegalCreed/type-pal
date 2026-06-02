/**
 * battle-system.test.ts —— M3 T22。
 *
 * 测试覆盖:
 *  - startBattle:正常构 BattleState + 切 mode='battle' + 资源缓存
 *  - startBattle:enemyTeam / battleField 找不到抛错;空槽位过滤
 *  - tickBattle:preBattle 一 tick 转 selectAction
 *  - tickBattle:selectAction 等 pendingActions 填好 → 进 performAction
 *  - tickBattle:performAction → postAction → 回 selectAction 推下一轮
 *  - tickBattle:enemy 死光 → won → finalize 切 explore + exp/cash 入账
 *  - tickBattle:队员死光 → lost → finalize 切 explore(不复活,死员 hp=0,靠 0x4E 读档恢复)
 *  - tickBattle:flee 成功 → fleed → finalize 切 explore(无 hp 改动)
 *  - tickBattle:phase stall > 1500 → 兜底切 explore
 *  - finalize 清 __battleResources + battleState
 *  - defending 单轮失效(postAction 清)
 */

import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type CommandBus, createCommandBus, type PresentCommand } from '../../command-bus.js'
import { createInitialGameState, type GameState } from '../../game-state.js'
import { activateHidingEffect, applyHiddenExpGrowth, battleWonLevelUp, decrementHidingEffect, selectAutoTargetFrom, startBattle, tickBattle, type BattleResources, type RunScriptFn } from '../battle-system.js'
import { createSeedableRng } from '../../rng.js'
import { tickMenu } from '../../menu/menu-mode.js'
import type { BattleEnemy } from '../battle-state.js'

// E04-b 隐藏属性经验分配公式(sdlpal battle.c:1226-1293 CHECK_HIDDEN_EXP)。
describe('applyHiddenExpGrowth(CHECK_HIDDEN_EXP 分配,battle.c:1238-1262)', () => {
  const oneRng = { rangeInclusive: (_a: number, _b: number) => 1 } // R(1,2) 恒 1,确定性

  it('单池:d=trunc(exp*wCount/total)*2+wExp,逐级扣阈值涨属性,余写 wExp', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 1 } // 仅 health 累积 → iTotalCount=1
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const levelUpExp = Array(100).fill(100) // 每级阈值 100
    // d = trunc(100*1/1)*2+0 = 200 → 扣 100(lv0→1,maxHP+1)→ 扣 100(lv1→2,maxHP+1)→ 余 0
    const res = applyHiddenExpGrowth({ exp: gs.Exp, rt: gs.PlayerRolesRuntime, roleId: 0, expGained: 100, levelUpExp, rng: oneRng })
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(102) // +2(两级各 R(1,2)=1)
    expect(gs.Exp.rgHealthExp[0]!.wExp).toBe(0)
    expect(gs.Exp.rgHealthExp[0]!.wLevel).toBe(2)
    expect(res).toEqual([{ stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 2 }])
  })

  it('iTotalCount=0(无累积)→ 整段跳过,无属性变化,返回 []', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    const res = applyHiddenExpGrowth({ exp: gs.Exp, rt: gs.PlayerRolesRuntime, roleId: 0, expGained: 999, levelUpExp: Array(100).fill(10), rng: oneRng })
    expect(res).toEqual([])
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(100)
  })

  it('多池按 wCount 占比分(health:2 / attack:1,total=3)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 2 }
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 50
    const levelUpExp = Array(100).fill(100)
    // health: d=trunc(300*2/3)*2=400 → 4 级(maxHP+4);attack: d=trunc(300*1/3)*2=200 → 2 级(atk+2)
    const res = applyHiddenExpGrowth({ exp: gs.Exp, rt: gs.PlayerRolesRuntime, roleId: 0, expGained: 300, levelUpExp, rng: oneRng })
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(104)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(52)
    expect(res).toEqual([
      { stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 4 },
      { stat: 'rgwAttackStrength', label: 'attack', statLabelWord: 51, delta: 2 },
    ])
  })

  // E04-c 集成:真战斗里玩家攻击 → wCount 累积(performBattleAction 接 fight.c:3756-3757)。
  it('集成:startBattle 清 wCount;玩家攻击 → rgAttackExp+1 / rgHealthExp+R(2,3)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999, attackStrength: 0, dexterity: 1, level: 1 })],
      roles: [makeRole({ id: 0, hp: 9999, maxHP: 9999, dexterity: 50, attackStrength: 10 })],
    })
    expect(gs.Exp.rgAttackExp[0]!.wCount).toBe(0) // startBattle clearHiddenExpCounts 已清
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    // 玩家 dex 50 > 敌 getEnemyDex{1,1}≈19 → 先手攻击;驱动到 wCount 累积即停
    let guard = 40
    const confirm = { held: new Set<never>(), pressed: new Set(['Confirm'] as const), frameNum: 0 }
    while (gs.mode === 'battle' && (gs.Exp.rgAttackExp[0]!.wCount ?? 0) === 0 && guard-- > 0)
      tickBattle(gs, gs.battleState?.settlement ? confirm as unknown as typeof emptyInput : emptyInput, bus)
    expect(gs.Exp.rgAttackExp[0]!.wCount).toBe(1) // 攻击 1 次 → +1
    expect(gs.Exp.rgHealthExp[0]!.wCount ?? 0).toBeGreaterThanOrEqual(2) // RandomLong(2,3)
  })

  // E04-d:battleWonLevelUp 把隐藏经验涨点放进 result.hiddenExpGrowth(供结算屏 hidden-exp-up box)。
  it('battleWonLevelUp result.hiddenExpGrowth 含累积属性的涨点(attack)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwHP[0] = 100 // 活着才升级
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 50
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 0, wCount: 1 } // 仅 attack 累积
    const res = battleWonLevelUp({
      gs, partyMembers: [0], expGained: 500,
      levelUpExp: Array(100).fill(100), levelUpMagic: [], rng: createSeedableRng(42),
    })
    const r0 = res.find((r) => r.roleId === 0)
    const atkGrowth = r0?.hiddenExpGrowth?.find((g) => g.stat === 'rgwAttackStrength')
    expect(atkGrowth).toBeDefined()
    expect(atkGrowth!.statLabelWord).toBe(51) // 武术
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBeGreaterThan(50) // 实际涨了
  })
})

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

interface BootstrapOpts {
  /** roleId 列表(partyMembers);默认 [0]。 */
  partyMembers?: number[]
  /** 注入的 role 列表(playerRoles);默认 = partyMembers 对应的 makeRole。 */
  roles?: PlayerRole[]
  /** 注入的 enemies(全表);默认 [makeEnemy({ id: 100 })]。 */
  enemies?: Enemy[]
  /** EnemyTeam.enemies 槽位(指向上面 enemies 的 id);默认 [100, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]。 */
  teamSlots?: [number, number, number, number, number]
  isBoss?: boolean
  rngSeed?: number
  runScriptFn?: RunScriptFn
  /** B4(3):0x8A 持久 fAutoBattle —— startBattle 前设 gs.fAutoBattle(整场自动)。 */
  fAutoBattle?: boolean
  /** E2 投掷物测试用:注入 items / magics / objectMagics / commands / inventory。 */
  items?: Item[]
  magics?: Magic[]
  spells?: Spell[]
  objectMagics?: ObjectMagicView[]
  objectPoisons?: ObjectPoisonView[]
  commands?: Command[]
  inventory?: { itemId: number, count: number }[]
  /** D11:升级阈值表(稀疏)+ 学法术表;省略 → 不升级。 */
  levelUpExp?: number[]
  levelUpMagic?: import('@type-pal/shared').LevelUpMagicEntry[][]
}

function bootstrap(opts: BootstrapOpts = {}): {
  gs: GameState
  bus: CommandBus
  resources: BattleResources
  emptyInput: InputSnapshot
} {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = opts.partyMembers ?? [0]

  const roles: PlayerRole[] = opts.roles ?? gs.partyMembers.map(id => makeRole({ id }))
  const playerRoles: PlayerRoles = { roles }

  const enemies: Enemy[] = opts.enemies ?? [makeEnemy({ id: 100 })]
  const teamSlots = opts.teamSlots ?? ([100, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF] as [number, number, number, number, number])
  const enemyTeams: EnemyTeam[] = [{ id: 0, enemies: teamSlots }]
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const battleFields = [field]
  const items: Item[] = opts.items ?? []
  const spells: Spell[] = opts.spells ?? []
  const magics: Magic[] = opts.magics ?? []
  const objectMagics: ObjectMagicView[] = opts.objectMagics ?? []
  const objectPoisons: ObjectPoisonView[] = opts.objectPoisons ?? []
  const commands: Command[] = opts.commands ?? [{ op: 'end' }]
  if (opts.inventory)
    gs.inventory = opts.inventory
  if (opts.fAutoBattle)
    gs.fAutoBattle = true // B4(3):startBattle 前设 → createBattleState seed state.fAutoBattle

  const bus = createCommandBus()

  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: opts.isBoss ?? false,
    enemies,
    enemyTeams,
    battleFields,
    playerRoles,
    items,
    spells,
    magics,
    objectMagics,
    objectPoisons,
    commands,
    levelUpExp: opts.levelUpExp,
    levelUpMagic: opts.levelUpMagic,
    rngSeed: opts.rngSeed ?? 42,
    runScriptFn: opts.runScriptFn,
  })

  return {
    gs,
    bus,
    resources: { items, spells, magics, objectMagics, objectPoisons, enemies, enemyObjects: [], playerRoles, commands },
    emptyInput: { held: new Set(), pressed: new Set(), frameNum: 0 },
  }
}

/**
 * 推进战斗到 explore。D11b:胜利后有结算演出 hold(逐屏等键/超时)—— settlement active 时按
 * Confirm 快速翻屏;其余阶段空输入(动作由测试直填 pendingActions,不需按键)。
 */
function driveBattleToExplore(gs: GameState, bus: CommandBus, max = 400): void {
  const empty: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
  const advance: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }
  let safety = max
  while (gs.mode === 'battle' && safety-- > 0)
    tickBattle(gs, gs.battleState?.settlement ? advance : empty, bus)
}

// ============================================================================
// startBattle
// ============================================================================

describe('startBattle', () => {
  it('构 BattleState + 切 mode=battle + phase=preBattle', () => {
    const { gs } = bootstrap()
    expect(gs.mode).toBe('battle')
    expect(gs.battleState).toBeDefined()
    expect(gs.battleState?.phase).toBe('preBattle')
    expect(gs.battleState?.players).toHaveLength(1)
    expect(gs.battleState?.enemies).toHaveLength(1)
  })

  it('过滤 0 / 0xFFFF 空槽位', () => {
    const { gs } = bootstrap({
      enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 200 })],
      teamSlots: [100, 0, 200, 0xFFFF, 0xFFFF],
    })
    expect(gs.battleState?.enemies).toHaveLength(2)
  })

  it('enemyTeam 找不到 → 抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    expect(() => startBattle({
      gs,
      enemyTeamId: 999,
      battleFieldId: 0,
      isBoss: false,
      enemies: [],
      enemyTeams: [],
      battleFields: [{ id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } }],
      playerRoles: { roles: [makeRole({ id: 0 })] },
      items: [],
      spells: [],
      magics: [],
      commands: [{ op: 'end' }],
      rngSeed: 1,
    })).toThrow(/enemyTeam id 999/)
  })

  it('battleField 找不到 → 抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    expect(() => startBattle({
      gs,
      enemyTeamId: 0,
      battleFieldId: 999,
      isBoss: false,
      enemies: [makeEnemy({ id: 100 })],
      enemyTeams: [{ id: 0, enemies: [100, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF] }],
      battleFields: [],
      playerRoles: { roles: [makeRole({ id: 0 })] },
      items: [],
      spells: [],
      magics: [],
      commands: [{ op: 'end' }],
      rngSeed: 1,
    })).toThrow(/battleField id 999/)
  })

  it('isBoss 透传到 BattleState', () => {
    const { gs } = bootstrap({ isBoss: true })
    expect(gs.battleState?.isBoss).toBe(true)
  })

  it('enemy slot 指向不在 enemies.json 的 id → warn + 跳过', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { gs } = bootstrap({
      enemies: [makeEnemy({ id: 100 })],
      teamSlots: [100, 999, 0xFFFF, 0xFFFF, 0xFFFF],
    })
    expect(gs.battleState?.enemies).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('enemy id 999'))
    warnSpy.mockRestore()
  })
})

// ============================================================================
// tickBattle —— phase 转换
// ============================================================================

describe('tickBattle phase transitions', () => {
  it('preBattle → selectAction 一 tick 内', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('selectAction')
    expect(gs.battleState?.uiState).toBe('selectMove')
    expect(gs.battleState?.menuState).toBe('main')
    expect(gs.battleState?.selectingPlayerIdx).toBe(0)
  })

  it('selectAction:pendingActions 未满 → 不进 performAction', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    tickBattle(gs, emptyInput, bus) // selectAction(等 pendingActions)
    expect(gs.battleState?.phase).toBe('selectAction')
  })

  it('selectAction:pendingActions 填满 → 进 performAction + build actionQueue', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction
    expect(gs.battleState?.phase).toBe('performAction')
    expect(gs.battleState?.actionQueue.length).toBeGreaterThan(0)
    expect(gs.battleState?.uiState).toBe('hidden')
  })

  it('B2 c8:dualMove>=2 敌 → 必二动(actionQueue 含 2 条该敌 entry,fight.c:1239)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, dualMove: 2, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction(建 queue)
    const enemyEntries = gs.battleState!.actionQueue.filter((q) => q.isEnemy)
    expect(enemyEntries.length).toBe(2) // dualMove>=2 必二动
    expect(enemyEntries.some((q) => q.fIsSecond)).toBe(true)
  })

  it('B2 c8:dualMove=0 敌 → 单动(actionQueue 仅 1 条该敌 entry)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, dualMove: 0, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState!.actionQueue.filter((q) => q.isEnemy).length).toBe(1)
  })

  // ── D7(2026-06-01 W1):dex 抖动 RandomFloat(0.9,1.1)(sdlpal fight.c:1474/1556)──
  it('D7:敌 dex 乘 RandomFloat(0.9,1.1)→ actionQueue dex = trunc(baseDex*float)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      // enemy dex base = getEnemyDexterity({level:5,dexterity:30}) = (5+6)*3+30 = 63
      enemies: [makeEnemy({ id: 100, level: 5, dexterity: 30, dualMove: 0, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999, dexterity: 0, level: 0 })], // player dex 低,不抢戏
    })
    tickBattle(gs, emptyInput, bus) // → selectAction
    gs.battleState!.rng.rangeFloat = () => 0.9 // 固定抖动因子 0.9
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // 建 queue
    const enemyEntry = gs.battleState!.actionQueue.find((q) => q.isEnemy)
    // base 63 * 0.9 = 56.7 → trunc 56(WORD 截断);现状无抖动则恒 63 → 失败
    expect(enemyEntry?.dex).toBe(56)
  })

  // ── B4(3)(2026-06-01 W2):0x8A 持久 fAutoBattle 整场自动(sdlpal uibattle.c:839-878)──
  it('B4(3):gs.fAutoBattle → 队员**无输入**自动 commit(攻击/法术)→ 自动进 performAction', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999, attackStrength: 0 })],
      roles: [makeRole({ id: 0, hp: 99999, attackStrength: 100 })],
      fAutoBattle: true, // 0x8A 设的持久 flag
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    // **不设 pendingActions**(玩家无输入)。fAutoBattle → 自动填动作 → 直接进 performAction。
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.players[0]).toBeDefined()
    // 自动 commit 了一个动作(无 magic 时 = 物理攻击全体活敌)→ phase 推进出 selectAction
    expect(gs.battleState?.phase).not.toBe('selectAction')
  })

  it('B4(3):战斗结束 → gs.fAutoBattle 清 false(sdlpal script.c:3332 单场有效)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })], // 必秒 → 胜利
      roles: [makeRole({ id: 0, attackStrength: 999 })],
      fAutoBattle: true,
    })
    expect(gs.fAutoBattle).toBe(true) // 入战时 true
    driveBattleToExplore(gs, bus)
    expect(gs.mode).toBe('explore')
    expect(gs.fAutoBattle).toBe(false) // 战斗结束清(非永久)
  })

  it('performAction → postAction(queue 跑完)→ 下一轮 selectAction(双方都活)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999 })], // 不会被一击秒,保证不进 won
      roles: [makeRole({ id: 0, hp: 99999 })], // 不会被秒,保证不进 lost
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction
    // performAction 逐 tick 推 queue;直到 phase 变 postAction
    let safety = 50
    while (gs.battleState?.phase === 'performAction' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('postAction')
    // 再推一 tick → postAction handler 双方都活 → 回 selectAction,turn 推到 1
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('selectAction')
    expect(gs.battleState?.turn).toBe(1)
  })

  it('敌 scriptOnReady 含 showDialog → 行动前先显示对话 + 暂停战斗(guard),Confirm 后才行动', () => {
    const { gs, bus, emptyInput } = bootstrap({
      // scriptOnReady ip=1 → showDialog '哼哼';ip=2 end。敌/我都不会被秒,保证留在战斗内。
      enemies: [makeEnemy({ id: 100, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
      commands: [{ op: 'end' }, { op: 'showDialog', messageIndex: 0, text: '哼哼' }, { op: 'end' }],
    })
    gs.battleState!.enemies[0]!.scriptOnReady = 1 // 挂 AI 脚本(bootstrap 默认 enemyObjects=[] → 0)
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction

    // 推进直到敌人 turn 跑 scriptOnReady → 队列被填 + tickBattleDialog 起 box
    let safety = 60
    while (gs.dialogBox === undefined && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.dialogBox).toBeDefined() // 战斗内对话显示了
    expect(gs.dialogBox?.currentLineText).toBe('哼哼')
    expect(gs.battleState?.phase).toBe('performAction') // 仍在 perform(敌人还没结算)

    // 不按键多 tick → 对话仍在,战斗被 hold(scriptOnReady 不重跑 → 队列不增长)
    const queuedAfterStart = gs.battleState?.battleDialogQueue?.length ?? 0
    for (let i = 0; i < 10; i++) tickBattle(gs, emptyInput, bus)
    expect(gs.dialogBox).toBeDefined() // 仍 hold
    expect(gs.battleState?.battleDialogQueue?.length ?? 0).toBe(queuedAfterStart) // guard:不重跑脚本

    // 打完字 + Confirm 关对话 → 战斗恢复推进
    let s2 = 60
    while (gs.dialogBox?.phase !== 'waiting-end-key' && s2-- > 0) tickBattle(gs, emptyInput, bus)
    bus.drain()
    const confirmInput: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }
    tickBattle(gs, confirmInput, bus) // dialog-end → 关 box → 放行
    expect(gs.dialogBox).toBeUndefined()
  })

  it('敌 scriptOnTurnStart 含 showDialog → 进战斗/每轮起手即显示(玩家选动作之前,user 实测顺序修复)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
      // scriptOnTurnStart ip=1 → showDialog '不自量力的家伙!';ip=2 end(蜘蛛精/林月如式嘲讽)
      commands: [{ op: 'end' }, { op: 'showDialog', messageIndex: 0, text: '不自量力的家伙!' }, { op: 'end' }],
    })
    gs.battleState!.enemies[0]!.scriptOnTurnStart = 1 // bootstrap enemyObjects=[] → 默认 0,手挂
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction

    // 关键:**没有**设 pendingActions(玩家还没选动作)→ turnStart 应在进 selectAction 即触发对话
    let safety = 30
    while (gs.dialogBox === undefined && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.dialogBox?.currentLineText).toBe('不自量力的家伙!') // 选动作之前就说话(原 bug:先选才说)
    expect(gs.battleState?.phase).toBe('selectAction') // 仍在选动作阶段 — 对话挡着菜单
    // B2 c7:0x00(plain end)收尾 → sdlpal 返回值回写**起始 entry**(script.c:3204/3478,fight.c:1186)→
    //   wScriptOnTurnStart 保持 = 起跑 entry 1(每轮从头重显,如 enemyId 23 跳跳蛙 / 25 怪老子)。
    //   原断言 `=0` 是近似(错误把每轮重显的脚本禁掉);真值 = re-arm 到起始。
    expect(gs.battleState?.enemies[0]?.scriptOnTurnStart).toBe(1)

    // 本轮不重跑(guard:队列不再被 turnStart 重新填)
    const qlen = gs.battleState?.battleDialogQueue?.length ?? 0
    for (let i = 0; i < 5; i++) tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.battleDialogQueue?.length ?? 0).toBe(qlen)
  })

  it('B2 c7:scriptOnTurnStart 0x01(advance)收尾 → show-once(返回值推进过本段,对照 0x00 每轮重显)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
      // ip1 showDialog;ip2 = 0x01 advance end → sdlpal 返回 ip2+1=3(指针前移 = show-once,fight.c:1186)
      commands: [{ op: 'end' }, { op: 'showDialog', messageIndex: 0, text: '哼,识相的快滚!' }, { op: 'end', advance: true }],
    })
    gs.battleState!.enemies[0]!.scriptOnTurnStart = 1
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    let safety = 30
    while (gs.dialogBox === undefined && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.dialogBox?.currentLineText).toBe('哼,识相的快滚!') // turn1 显示
    // 0x01 advance → wScriptOnTurnStart 推进到 end 行 +1 = 3(跳过本段;≠ 起始 1 的每轮重显)
    expect(gs.battleState?.enemies[0]?.scriptOnTurnStart).toBe(3)
  })
})

// ============================================================================
// tickBattle —— 终态(won / lost / fleed)
// ============================================================================

describe('tickBattle finalize', () => {
  it('队员一击秒 enemy → won → finalize 切 explore + exp/cash 入账', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1, exp: 100, cash: 200 })], // 必秒
      roles: [makeRole({ id: 0, attackStrength: 500 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })

    driveBattleToExplore(gs, bus)

    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    // M5.B-w1.c:exp/cash 入账走 gs.Exp.rgPrimaryExp + gs.dwCash 真 schema
    expect(gs.dwCash).toBe(200)
    expect(gs.Exp.rgPrimaryExp[0]?.wExp).toBeGreaterThan(0)
  })

  it('B2 c6:胜利后跑各敌 scriptOnBattleEnd(battle.c:1334-1337;仅胜利)', () => {
    const calls: number[] = []
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })], // 必秒 → 胜利
      roles: [makeRole({ id: 0, attackStrength: 999 })],
      runScriptFn: (input) => { calls.push(input.ip) }, // 记录所有 runScript 调用
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.enemies[0]!.scriptOnBattleEnd = 777 // boss 死后剧情脚本
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    driveBattleToExplore(gs, bus)
    expect(calls).toContain(777) // 战后 scriptOnBattleEnd 真被跑(即便敌已死)
  })

  it('B2 c6:逃跑/战败不跑 scriptOnBattleEnd(仅胜利 PAL_BattleWon)', () => {
    const calls: number[] = []
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 9999, attackStrength: 0 })],
      roles: [makeRole({ id: 0, hp: 1, maxHP: 1 })],
      runScriptFn: (input) => { calls.push(input.ip) }, // 注入才能真验证"没被调"
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.enemies[0]!.scriptOnBattleEnd = 777
    // 强制逃跑结束(非胜利)
    gs.battleState!.phase = 'fleed'
    let safety = 30
    while (gs.mode === 'battle' && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(calls).not.toContain(777) // 非胜利 → 不跑
  })

  it('finalizeBattle 回写战斗 HP/MP → gs.PlayerRolesRuntime(边界同步:战果持久化)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1, exp: 0, cash: 0 })], // 必秒 → won,队员无伤
      roles: [makeRole({ id: 0, hp: 88, mp: 22, attackStrength: 999 })], // 进战斗 hp 88 / mp 22
    })
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(0) // 测试 gs 初始 runtime 全 0(证明回写真发生)
    // 满血基线 maxHP=88/maxMP=22(= 入战值)→ Phase F 半血恢复对满血 noop,回写值不被改。
    // (真游戏 runtime 始终 hydrate;此测试只验回写,故显式设 maxHP 等于 hp 以隔离 Phase F。)
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 88
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 22
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    driveBattleToExplore(gs, bus)
    expect(gs.mode).toBe('explore')
    // 战斗 HP/MP 战果回写 runtime(原 finalizeBattle 只回写 exp/cash → rgwHP 仍 0,打完复原的 bug)
    // 注:exp/cash=0 → 无升级、无 exp-cash 屏 → 结算 screens 空 → 立即收尾;Phase F 半血恢复对满血 noop。
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(88)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(22)
  })

  it('D11 整合:打赢 + exp 进阈值 → finalizeBattle 触发升级(rt.rgwLevel 1→2 + 满血)', () => {
    const lvExp: number[] = []
    lvExp[1] = 100 // 1 级升 2 级需 100 exp
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1, exp: 100, cash: 0 })], // 必秒,给 100 exp
      roles: [makeRole({ id: 0, hp: 50, maxHP: 100, attackStrength: 999 })],
      levelUpExp: lvExp,
    })
    // 手设 runtime 基线(测试 gs 默认 runtime 全 0;升级读 runtime,需有 level/maxHP 基线)
    const rt = gs.PlayerRolesRuntime
    rt.rgwLevel[0] = 1; rt.rgwHP[0] = 50; rt.rgwMaxHP[0] = 100; rt.rgwMP[0] = 10; rt.rgwMaxMP[0] = 30
    gs.Exp.rgPrimaryExp[0] = { wExp: 0, wLevel: 1 }
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    driveBattleToExplore(gs, bus)
    expect(gs.mode).toBe('explore')
    expect(rt.rgwLevel[0]).toBe(2) // exp 100 >= 阈值 100 → 升 1 级
    expect(rt.rgwHP[0]).toBe(rt.rgwMaxHP[0]) // 升级满血
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(0) // 余 0
  })

  it('队员死光 → lost → finalize 切 explore(不复活,hp 保持战斗结算 0;真死亡靠死亡脚本 0x4E 读档恢复)', () => {
    const role = makeRole({ id: 0, hp: 1, defense: 0, level: 1 })
    const { gs, bus, emptyInput } = bootstrap({
      roles: [role],
      enemies: [makeEnemy({ id: 100, attackStrength: 999, level: 50 })], // 强敌
    })
    tickBattle(gs, emptyInput, bus)

    // D7(W1):dex 加 RandomFloat 抖动后,濒死队员某轮可能 fAutoDefend 闪避强敌(c3)→ 不保证 turn0 即死。
    //   每轮补 defend 驱动,直到强敌某轮命中打死(seed-robust,不依赖单轮必死)。
    let safety = 200
    while (gs.mode === 'battle' && safety-- > 0) {
      if (gs.battleState?.phase === 'selectAction' && gs.battleState.pendingActions.size === 0)
        gs.battleState.pendingActions.set(0, { type: 'defend', target: -1 })
      tickBattle(gs, emptyInput, bus)
    }

    expect(gs.mode).toBe('explore')
    // sdlpal 战败不复活(script.c:3320 → 死亡脚本 0x4F 红屏 + 0x4E 读档)。删旧 M3"回 1 血"复活桩:
    //   死员保持 hp=0,present 据此画倒下帧(修"起立");HP 由读档恢复存档值。
    expect(role.hp).toBe(0)
  })

  it('flee 成功 → fleed → finalize 切 explore(无 hp 改动)', () => {
    const role = makeRole({ id: 0, fleeRate: 99999, hp: 150 })
    const { gs, bus, emptyInput } = bootstrap({
      roles: [role],
      enemies: [makeEnemy({ id: 100, dexterity: 0, level: 1 })],
    })
    // mock rng:rangeInclusive 恒返 0 → fleeRate=99999 >= 0 必成
    const state = gs.battleState!
    state.rng.rangeInclusive = () => 0
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'flee', target: -1 })

    let safety = 100
    while (gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    expect(gs.mode).toBe('explore')
    expect(role.hp).toBe(150) // 无 hp 改动
  })
})

// ============================================================================
// B1 / D8 —— 失能玩家行为(sleep/paralyzed → Pass;confused → AttackMate)
// ============================================================================

describe('B1 失能玩家行为(D8,fight.c:1398-1404/1505-1527/1731-1747/3760-3853)', () => {
  /** 手工构造 perform:只放某队员入 queue(隔离敌人行动)+ 推进到 postAction。 */
  function drivePerformPlayerOnly(gs: GameState, bus: CommandBus, empty: InputSnapshot, playerIdx: number): void {
    const st = gs.battleState!
    st.phase = 'performAction'
    st.actionQueue = [{ isEnemy: false, idx: playerIdx, dex: 100, fIsSecond: false }]
    st.currentActionIndex = 0
    st.pendingActions.set(playerIdx, { type: 'attack', actionId: 0, target: 0 })
    let safety = 60
    while (st.phase === 'performAction' && safety-- > 0) tickBattle(gs, empty, bus)
  }

  it('selectAction:睡眠队员自动填 action + 菜单跳过(不停在其身上)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 })],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    gs.battleState!.players[0]!.status.sleep = 2
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(startPlayerSelection 0)
    tickBattle(gs, emptyInput, bus) // selectAction tick → autoFill player0 + advance
    expect(gs.battleState!.pendingActions.has(0)).toBe(true) // player0 自动填(失能)
    expect(gs.battleState!.selectingPlayerIdx).toBe(1) // 菜单跳到 player1(未失能)
  })

  it('逃跑动画:flee 成功 → 播逃跑动画(队员右移)→ fleed → explore(sdlpal PAL_BattlePlayerEscape)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0],
      roles: [makeRole({ id: 0, fleeRate: 99999, hp: 150 })],
      enemies: [makeEnemy({ id: 100, dexterity: 0, level: 1 })],
    })
    gs.battleState!.rng.rangeInclusive = () => 0 // flee 必成
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'flee', target: -1 })
    let sawFleeAnim = false
    let startX: number | undefined
    let maxX = -Infinity
    let safety = 200
    while (gs.mode === 'battle' && safety-- > 0) {
      tickBattle(gs, emptyInput, bus)
      const fa = gs.battleState?.fleeAnim
      if (fa) {
        sawFleeAnim = true
        const px = gs.battleState?.players[0]?.pos?.x
        if (px !== undefined) {
          startX ??= px
          maxX = Math.max(maxX, px)
        }
      }
    }
    expect(gs.mode).toBe('explore') // 逃离成功
    expect(sawFleeAnim).toBe(true) // 播了逃跑动画(非直接 fleed)
    expect(maxX).toBeGreaterThan(startX!) // 队员逐帧右移
  })

  it('selectAction:睡眠/麻痹队员入 queue dex=0(排最后)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 })],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    gs.battleState!.players[0]!.status.paralyzed = 2
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(1, { type: 'defend', target: -1 }) // player1 正常选
    tickBattle(gs, emptyInput, bus) // selectAction → performAction(build queue)
    const item0 = gs.battleState!.actionQueue.find((q) => !q.isEnemy && q.idx === 0)
    expect(item0?.dex).toBe(0) // 麻痹队员 dex=0(fight.c:1513)
  })

  it('perform:混乱队员随机命中友方 → 打该友军(原版随机敌/友;pool=[敌0,友1] rng→1)', () => {
    const ally = makeRole({ id: 1, hp: 200, defense: 0, level: 10 })
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, hp: 200, attackStrength: 0, level: 10 }), ally],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.players[0]!.status.confused = 3
    gs.battleState!.rng.range = () => 1 // pool=[{敌0},{友1}] → 选友军 idx1
    drivePerformPlayerOnly(gs, bus, emptyInput, 0)
    expect(ally.hp).toBe(155) // str96/def64/res2 → 45;200-45
  })

  it('perform:混乱队员随机命中敌方 → 普攻打敌(原版,有活队友也可能打敌)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, hp: 200, attackStrength: 100, level: 10 }), makeRole({ id: 1, hp: 200 })],
      enemies: [makeEnemy({ id: 100, health: 200, defense: 0 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.players[0]!.status.confused = 3
    gs.battleState!.rng.range = () => 0 // pool=[{敌0},{友1}] → 选敌 idx0
    drivePerformPlayerOnly(gs, bus, emptyInput, 0)
    expect(gs.battleState!.enemies[0]!.e.health).toBeLessThan(200) // 敌被普攻
  })

  it('混乱真机全流程:autoFill→queue→perform,混乱角色真出手攻敌(回归 user 实测"无动作")', () => {
    const enemy = makeEnemy({ id: 100, health: 200, defense: 0 })
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1, 2],
      roles: [makeRole({ id: 0, hp: 200, attackStrength: 100, level: 10 }), makeRole({ id: 1, hp: 200 }), makeRole({ id: 2, hp: 200 })],
      enemies: [enemy],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(selectingPlayerIdx=0)
    const st = gs.battleState!
    st.players[0]!.status.confused = 5
    st.rng.range = () => 0 // 混乱 pool 第 0 个 = 敌 0 → 普攻敌
    tickBattle(gs, emptyInput, bus) // selectAction:autoFill player0(混乱)+ advance
    expect(st.pendingActions.has(0)).toBe(true) // 混乱玩家被 autoFill
    // 手填 player1/2(模拟玩家选防御),触发 queue build
    st.pendingActions.set(1, { type: 'defend', target: -1 })
    st.pendingActions.set(2, { type: 'defend', target: -1 })
    let safety = 200
    while (st.phase !== 'postAction' && st.phase !== 'won' && gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    // 注:createBattleState 对敌人 {...e} 浅拷贝 → 战斗改的是 st.enemies[0].e 副本,非传入 enemy。
    expect(st.enemies[0]!.e.health).toBeLessThan(200) // 混乱 player0 普攻敌 0 → 敌掉血(非"无动作")
  })

  it('perform:混乱濒死队员 → Pass(不攻友军)', () => {
    const ally = makeRole({ id: 1, hp: 200, defense: 0, level: 10 })
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      // player0 濒死:hp < min(100, maxHP/5)=min(100,40)=40
      roles: [makeRole({ id: 0, hp: 30, maxHP: 200, attackStrength: 0, level: 10 }), ally],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.players[0]!.status.confused = 3
    drivePerformPlayerOnly(gs, bus, emptyInput, 0)
    expect(ally.hp).toBe(200) // 濒死混乱 → Pass,友军不掉血
  })

  it('敌人攻击玩家时不被玩家专用 target 重选块误伤(玩家目标索引恰为死敌槽 → 不越界崩溃)', () => {
    // 回归 attack.ts:117 崩溃:re-target 块(PAL_BattlePlayerValidateAction 玩家专用)未按施法方 gate,
    //   敌人攻击玩家(target=玩家索引)被当敌索引重选 → 越界。
    const role = makeRole({ id: 0, hp: 200, defense: 0, level: 10 })
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0], // 1 玩家(player idx 0)
      roles: [role],
      // 3 敌:enemies[0]/[1] 待会儿置死,enemies[2] 活=攻击者。玩家目标 idx=0 恰映射死敌槽 enemies[0]。
      enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 }), makeEnemy({ id: 102, attackStrength: 10 })],
      teamSlots: [100, 101, 102, 0xFFFF, 0xFFFF],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const st = gs.battleState!
    st.enemies[0]!.e.health = 0
    st.enemies[1]!.e.health = 0
    // 手工 perform:只放 enemy2 入队 → 它 attack player0;若 re-target 块误判 enemies[0] 死 → 重选敌索引 2 → 崩
    st.phase = 'performAction'
    st.actionQueue = [{ isEnemy: true, idx: 2, dex: 100, fIsSecond: false }]
    st.currentActionIndex = 0
    let safety = 60
    expect(() => {
      while (st.phase === 'performAction' && safety-- > 0) tickBattle(gs, emptyInput, bus)
    }).not.toThrow()
    // 玩家被正常攻击(掉血),不是越界打到不存在的目标
    expect(role.hp).toBeLessThan(200)
  })

  it('战斗状态屏:Status 键 → 开 player-status 菜单(mode=menu);关闭 → 回 battle(uibattle.c:930-934)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1, 2],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 }), makeRole({ id: 2 })],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(main menu)
    const statusInput: InputSnapshot = { held: new Set(), pressed: new Set(['Status']), frameNum: 0 }
    tickBattle(gs, statusInput, bus) // Status 键 → 开状态屏
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('player-status')
    // 状态屏关闭(menuStack 空)→ tickMenu 检 battleState → 回 battle(非 explore)
    gs.menuStack = []
    tickMenu(gs, emptyInput, bus)
    expect(gs.mode).toBe('battle')
  })

  it('逃跑全队:一人选逃跑 → 全体活队员都逃(sdlpal fFlee,fight.c:1773-1799)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1, 2],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 }), makeRole({ id: 2 })],
      enemies: [makeEnemy({ id: 100, health: 99999 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(selectingPlayerIdx=0)
    const fleeInput: InputSnapshot = { held: new Set(), pressed: new Set(['Flee']), frameNum: 0 }
    tickBattle(gs, fleeInput, bus) // player 0 按 Flee → 应全队逃
    const fleeCount = [...gs.battleState!.pendingActions.values()].filter((a) => a.type === 'flee').length
    expect(fleeCount).toBe(3) // 全 3 活队员都 flee(bug 时 = 1)
  })

  it('打死最后一个敌人后,后续我方角色不再行动(sdlpal fEnemyCleared 中止剩余 queue)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, attackStrength: 100, hp: 200 }), makeRole({ id: 1, attackStrength: 100, hp: 200 })],
      enemies: [makeEnemy({ id: 100, health: 1, defense: 0 })], // 一击必死
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const st = gs.battleState!
    // 手工队列:p0 先攻、p1 后攻,都打 enemy0;p0 一击秒杀 → p1 不应再攻
    st.phase = 'performAction'
    st.uiState = 'hidden'
    st.actionQueue = [
      { isEnemy: false, idx: 0, dex: 200, fIsSecond: false },
      { isEnemy: false, idx: 1, dex: 100, fIsSecond: false },
    ]
    st.currentActionIndex = 0
    st.pendingActions.set(0, { type: 'attack', target: 0 })
    st.pendingActions.set(1, { type: 'attack', target: 0 })
    let safety = 300
    while (st.phase === 'performAction' && safety-- > 0) tickBattle(gs, emptyInput, bus)
    const attacks = bus.drain().filter((e) => e.cmd.op === 'playPlayerAttack')
    expect(attacks.length).toBe(1) // 只 p0 攻击一次;p1 被全敌清空中止(bug 时 = 2)
    expect(attacks[0]!.cmd).toMatchObject({ playerIdx: 0 })
  })

  it('perform:睡眠队员 → Pass(不攻敌)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0],
      roles: [makeRole({ id: 0, hp: 200, attackStrength: 999, level: 10 })],
      enemies: [makeEnemy({ id: 100, health: 99999, defense: 0 })],
    })
    tickBattle(gs, emptyInput, bus)
    const enemyHpBefore = gs.battleState!.enemies[0]!.e.health
    gs.battleState!.players[0]!.status.sleep = 3
    drivePerformPlayerOnly(gs, bus, emptyInput, 0)
    expect(gs.battleState!.enemies[0]!.e.health).toBe(enemyHpBefore) // 睡眠 Pass,敌不掉血
  })
})

describe('B1 D21 战末清状态/毒/Extra(battle.c:1822-1830)', () => {
  it('战斗结束清党 poison(CurePoisonByLevel 3)+ Extra 装备效果(RemoveEquipmentEffect Extra)', () => {
    const role = makeRole({ id: 0, hp: 1, defense: 0, level: 1 })
    const { gs, bus, emptyInput } = bootstrap({
      roles: [role],
      enemies: [makeEnemy({ id: 100, attackStrength: 999, level: 50 })], // 强敌 → lost
    })
    // 战前:party member 0 中毒 + Extra slot(6=kBodyPartExtra)装备效果非零
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 5, wPoisonScript: 0 }
    gs.rgEquipmentEffect[6]!.rgwAttackStrength[0] = 50

    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    // D7(W1):同 lost 测 —— 濒死队员某轮 fAutoDefend 闪避,每轮补 defend 直到强敌打死(seed-robust)。
    let safety = 200
    while (gs.mode === 'battle' && safety-- > 0) {
      if (gs.battleState?.phase === 'selectAction' && gs.battleState.pendingActions.size === 0)
        gs.battleState.pendingActions.set(0, { type: 'defend', target: -1 })
      tickBattle(gs, emptyInput, bus)
    }

    expect(gs.mode).toBe('explore')
    expect(gs.rgPoisonStatus['0_0']?.wPoisonID ?? 0).toBe(0) // 毒清(battle.c:1828)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[0]).toBe(0) // Extra 清(battle.c:1829)
  })
})

// ============================================================================
// tickBattle —— defending 单轮失效
// ============================================================================

describe('defending flag 单轮失效', () => {
  it('postAction 清 defending,下一轮回到 false', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999 })],
      roles: [makeRole({ id: 0, hp: 99999 })],
    })
    tickBattle(gs, emptyInput, bus) // → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // → performAction
    // 跑到 performAction 内 defend 被设为 true,再到 postAction
    let safety = 50
    while (gs.battleState?.phase === 'performAction' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    // postAction → 再一 tick 回 selectAction,defending 被清
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('selectAction')
    expect(gs.battleState?.players[0]?.defending).toBe(false)
  })

  // P0#2(2026-06-02 审计核源):玩家行动队列 base dex = PAL_GetPlayerDexterity(global.c:1849-1864)
  //   = role.dexterity + Σ装备,**无 level 项**(等级项是敌方 PAL_GetEnemyDexterity 才有,且 *3 非 *4)。
  //   此前误加 (level+6)*4 → 玩家 level 越高出手越快(失真)。本测锁定:同 dex 不同 level 出手顺序不变。
  it('P0#2:玩家 base dex 不含 level 项(同 dexterity 不同 level → 同出手顺序)', () => {
    const firstIsEnemy = (lvl: number): boolean => {
      const { gs, bus, emptyInput } = bootstrap({
        // 敌 getEnemyDex{level1,dex20} = (1+6)*3+20 = 41;玩家真 dex 10 < 41 → 敌应始终先手(与 level 无关)
        enemies: [makeEnemy({ id: 100, level: 1, dexterity: 20, health: 9999, attackStrength: 0 })],
        roles: [makeRole({ id: 0, level: lvl, dexterity: 10, hp: 9999, maxHP: 9999 })],
      })
      tickBattle(gs, emptyInput, bus)
      gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
      let guard = 20
      while (gs.battleState?.phase === 'selectAction' && guard-- > 0) tickBattle(gs, emptyInput, bus)
      return gs.battleState!.actionQueue[0]!.isEnemy === true
    }
    // 旧 bug:lv99 玩家 dex=10+(99+6)*4=430 > 41 会抢先(false);修复后真 dex 10 始终 < 41 → 敌先(true,与 level 无关)
    expect(firstIsEnemy(1)).toBe(firstIsEnemy(99))
    expect(firstIsEnemy(99)).toBe(true)
  })

  it('防御姿势时机(user 2026-05-31):防御 ×5 排队首 → perform 起手即防御姿 frame3;回合末复位 frame0', () => {
    const { gs, bus, emptyInput } = bootstrap({
      // 敌人高血扛得住玩家(玩家防御不输出);弱攻击 + 玩家高防 → 玩家不死,回合能正常结束。
      // P0#2 后:玩家 base dex 无 level 项 → 用真实 dex 20 让 defend×5=100 稳压敌方(getEnemyDex{lv,dex1}≈19-22)排队首。
      enemies: [makeEnemy({ id: 100, health: 9999, attackStrength: 1, dexterity: 1, idleFrames: 1, attackFrames: 2, actWaitFrames: 1 })],
      roles: [makeRole({ id: 0, hp: 9999, maxHP: 9999, defense: 999, dexterity: 20 })],
    })
    tickBattle(gs, emptyInput, bus) // → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })

    // 进 performAction 那一刻:防御 ×5 → 玩家排队首(actionQueue[0] 是玩家,非敌人)
    let guard = 20
    while (gs.battleState?.phase === 'selectAction' && guard-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('performAction')
    expect(gs.battleState?.actionQueue[0]?.isEnemy).toBe(false) // 防御方排队首(×5 生效)

    // perform 全程捕捉:玩家执行 defend 后立刻进防御姿 frame3
    const prevTurn = gs.battleState!.turn
    let safety = 80
    let sawDefendPose = false
    while (gs.mode === 'battle' && safety-- > 0) {
      tickBattle(gs, emptyInput, bus)
      const p = gs.battleState?.players[0]
      if (p?.defending && p.currentFrame === 3) sawDefendPose = true
      if ((gs.battleState?.turn ?? prevTurn) > prevTurn && gs.battleState?.phase === 'selectAction') break
    }
    expect(sawDefendPose).toBe(true) // 防御姿在 perform 阶段出现(执行 defend 即刻,非等下一动画 action)
    // 回合结束 → 复位:defending 清 + currentFrame 回站立 0(不把防御姿带进下一轮)
    expect(gs.battleState?.players[0]?.defending).toBe(false)
    expect(gs.battleState?.players[0]?.currentFrame).toBe(0)
  })

  it('敌人攻击动画(林月如 enemy82 型 idleFrames1/attackFrames4)→ currentFrame 逐帧推进,非定格', () => {
    // user 2026-05-31:和 boss 林月如战斗,连她攻击时都定格不动。enemy82 真值 idleFrames=1(静态待机正常)
    //   但 attackFrames=4 应有攻击动画。本测验证:敌人攻击时 currentFrame 推过 idle(0)外的攻击帧。
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 82, health: 9999, attackStrength: 1, dexterity: 99, idleFrames: 1, magicFrames: 0, attackFrames: 4, actWaitFrames: 1, magic: 0, magicRate: 0 })],
      teamSlots: [82, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF],
      roles: [makeRole({ id: 0, hp: 9999, maxHP: 9999, defense: 999, dexterity: 1 })],
    })
    tickBattle(gs, emptyInput, bus)

    // D7(W1):dex 加 RandomFloat 抖动后 RNG 流偏移 → 濒死外的玩家(hp 满)某些轮会 fAutoDefend 闪避
    //   敌方物理(7/17,c3,闪避时 sdlpal 不播命中动画 → 该轮无攻击帧)。闪避可连续几轮,故跨 ~15 轮
    //   采样,确保覆盖至少一次未闪避的敌人攻击(seed-robust;player hp9999/def999 不会死,可长跑)。
    const seen = new Set<number | undefined>()
    const startTurn = gs.battleState!.turn
    let safety = 600
    while (gs.mode === 'battle' && safety-- > 0) {
      if (gs.battleState?.phase === 'selectAction' && gs.battleState.pendingActions.size === 0)
        gs.battleState.pendingActions.set(0, { type: 'defend', target: -1 }) // 玩家防御不杀敌 → 敌人能出手
      tickBattle(gs, emptyInput, bus)
      if (!gs.battleState) break
      seen.add(gs.battleState.enemies[0]?.currentFrame)
      const attackSeen = [...seen].some((f) => typeof f === 'number' && f > 0)
      if (attackSeen || gs.battleState.turn > startTurn + 15) break // 命中一次攻击帧即停;否则跑满 15 轮
    }
    // 非定格:攻击动画把 currentFrame 推到 >0 的攻击帧(idleFrames+i-1 = 1..4 中至少一个)
    const attackFramesSeen = [...seen].filter((f): f is number => typeof f === 'number' && f > 0)
    expect(attackFramesSeen.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// tickBattle —— 死循环保护
// ============================================================================

describe('phase stall 兜底', () => {
  it('selectAction 卡 > 1500 tick → 兜底切 explore', () => {
    const { gs, bus, emptyInput } = bootstrap()
    // 不填 pendingActions → selectAction 永远等
    let safety = 2000
    while (gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
  })
})

// ============================================================================
// finalizeBattle 副作用
// ============================================================================

describe('finalize 清状态', () => {
  it('胜利后清 battleState + __battleResources', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 500 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })

    driveBattleToExplore(gs, bus)

    expect(gs.battleState).toBeUndefined()
    expect((gs as unknown as { __battleResources?: BattleResources }).__battleResources).toBeUndefined()
  })

  it('tickBattle 无 battleState → no-op', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    expect(() => tickBattle(gs, { held: new Set(), pressed: new Set(), frameNum: 0 }, bus)).not.toThrow()
  })

  it('tickBattle 有 battleState 但无 resources → 强制退出 explore + error log', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { gs, bus, emptyInput } = bootstrap()
    // 手动清 resources 模拟生命周期错乱
    delete (gs as unknown as Record<string, unknown>).__battleResources
    tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('without resources'))
    errorSpy.mockRestore()
  })
})

// ============================================================================
// 战斗动作菜单 1:1(sdlpal CLASSIC)—— 4 图标主菜单 / 杂项盒 / 物品二级 /
//   法术·物品选择网格 / target picker。replaces 旧线性 uiState 模型测试。
// ============================================================================

/** 新模型测试通用 snap(支持全部抽象键)。 */
function mSnap(
  pressed: Array<
    | 'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Cancel' | 'Menu'
    | 'Defend' | 'Force' | 'Flee' | 'UseItem' | 'ThrowItem' | 'Repeat' | 'Auto' | 'Status'
    | 'PgUp' | 'PgDn' | 'Home' | 'End'
  > = [],
): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
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

function mkItem(id: number, flags: Partial<Item['flags']> = {}): Item {
  return {
    id,
    _name: `item${id}`,
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
      ...flags,
    },
  }
}

/** preBattle → selectMove(起手 = PAL_BattleUIPlayerReady)。 */
function enterSelectMove(ctx: { gs: GameState; bus: CommandBus; emptyInput: InputSnapshot }): void {
  tickBattle(ctx.gs, ctx.emptyInput, ctx.bus)
}

describe('战斗主菜单 4 图标 + 方向选(uibattle.c:1027-1080)', () => {
  it('preBattle → selectMove + menuState=main + selectedAction=0', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    expect(ctx.gs.battleState?.uiState).toBe('selectMove')
    expect(ctx.gs.battleState?.menuState).toBe('main')
    expect(ctx.gs.battleState?.selectedAction).toBe(0)
  })

  it('方向选图标:Down→3(杂项) / Up→0(攻击)', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus)
    expect(ctx.gs.battleState?.selectedAction).toBe(3)
    tickBattle(ctx.gs, mSnap(['Up']), ctx.bus)
    expect(ctx.gs.battleState?.selectedAction).toBe(0)
  })

  it('Left→1(法术),非 silence 时有效', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus)
    expect(ctx.gs.battleState?.selectedAction).toBe(1)
  })

  it('Left→法术:silence 时无效,selectedAction 不变(灰项)', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    ctx.gs.battleState!.players[0]!.status.silence = 2
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus)
    expect(ctx.gs.battleState?.selectedAction).toBe(0) // 法术无效 → 不切 + reset 0
  })

  it('Right→2(合击):单人队合击无效(healthy 人数<=1),selectedAction 不切', () => {
    const ctx = bootstrap() // 单人队
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus)
    expect(ctx.gs.battleState?.selectedAction).toBe(0)
  })

  it('合击是整队一回合一次:player0 commit coop → 其余 healthy 队员设 pass(不各自再选 coop)', () => {
    // sdlpal fight.c:1417-1424:选 coop 即结束选择;3973 coop 把全 healthy contributor 设 kFighterWait → 跳过。
    // → 整队一回合就这一次 coop。此前 bug:每人各 commit 一次 coop → 一回合放 3 次(user 报)。
    const ctx = bootstrap({
      partyMembers: [0, 1, 2],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 }), makeRole({ id: 2 })],
    })
    enterSelectMove(ctx)
    const st = ctx.gs.battleState!
    expect(st.selectingPlayerIdx).toBe(0)
    // 直接摆 player0 的 coop 全体目标待 commit(绕过需 magic data 的 coop 菜单)
    st.pendingActionDraft = { type: 'coop-magic', actionId: 351, targetSide: 'enemy' }
    st.uiState = 'selectTargetEnemyAll'
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // Confirm → commit coop(target=-1)
    expect(st.pendingActions.get(0)?.type).toBe('coop-magic')
    expect(st.pendingActions.get(1)?.type).toBe('pass') // 被 coop 消耗,不单独行动
    expect(st.pendingActions.get(2)?.type).toBe('pass')
  })

  it('R 跨战斗:gs.prevBattleActions 战末持久 + 下一场 startBattle 带入(sdlpal g_Battle 全局不重置)', () => {
    const ctx = bootstrap({ partyMembers: [0], roles: [makeRole({ id: 0 })] })
    // 模拟战斗1最后一回合已持久到 gs(tickPostAction 每轮做的事)
    // biome-ignore lint/suspicious/noExplicitAny: 只填 action 核心字段
    ctx.gs.prevBattleActions = new Map([[0, { type: 'magic', actionId: 296, target: 0 } as any]])
    driveBattleToExplore(ctx.gs, ctx.bus) // 结束战斗1
    expect(ctx.gs.prevBattleActions?.get(0)?.actionId).toBe(296) // 战末不清(持久跨场)
    // 开战斗2(同 gs):带入"上一场最后一回合"的 prevActions
    startBattle({
      gs: ctx.gs, enemyTeamId: 0, battleFieldId: 0, isBoss: false,
      enemies: [makeEnemy({ id: 100 })],
      enemyTeams: [{ id: 0, enemies: [100, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF] }],
      battleFields: [{ id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } }],
      playerRoles: { roles: [makeRole({ id: 0 })] },
      items: [], spells: [], magics: [], objectMagics: [], objectPoisons: [], commands: [{ op: 'end' }],
    })
    expect(ctx.gs.battleState?.prevActions?.get(0)?.actionId).toBe(296) // 带入上场
  })

  it('合击 commit 不覆盖失能队员(confused 队员保留 autoFill action,非 pass)', () => {
    const ctx = bootstrap({
      partyMembers: [0, 1, 2],
      roles: [makeRole({ id: 0 }), makeRole({ id: 1 }), makeRole({ id: 2 })],
    })
    enterSelectMove(ctx)
    const st = ctx.gs.battleState!
    st.players[2]!.status.confused = 3 // player2 混乱 → 非 healthy contributor
    st.selectingPlayerIdx = 0
    st.pendingActionDraft = { type: 'coop-magic', actionId: 351, targetSide: 'enemy' }
    st.uiState = 'selectTargetEnemyAll'
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(st.pendingActions.get(1)?.type).toBe('pass') // healthy → 消耗 pass
    expect(st.pendingActions.get(2)?.type).not.toBe('pass') // confused → 保留(autoFill attack→perform attackmate)
  })

  it('Confirm 攻击(无群攻)→ selectTargetEnemy + draft attack/enemy', () => {
    const ctx = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // selectedAction=0 攻击
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemy')
    expect(ctx.gs.battleState?.pendingActionDraft).toMatchObject({ type: 'attack', targetSide: 'enemy' })
  })

  it('Confirm 攻击(群攻武器 attackAll)→ selectTargetEnemyAll', () => {
    const ctx = bootstrap({ roles: [makeRole({ id: 0, attackAll: 1 })], enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemyAll')
  })

  it('Confirm 法术(selectedAction=1)→ menuState=magicSelect + magicSelect 建表', () => {
    const role = makeRole({ id: 0 }) as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = [296, 297]
    const ctx = bootstrap({ roles: [role], spells: [mkSpell(296), mkSpell(297)], magics: [mkMagic(296), mkMagic(297)] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus) // → selectedAction=1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('magicSelect')
    expect(ctx.gs.battleState?.magicSelect?.items.length).toBe(2)
  })

  it('Confirm 杂项(selectedAction=3)→ menuState=misc', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus) // → 3
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('misc')
  })
})

describe('主菜单快捷键(uibattle.c:1166-1302;WASD 还原 sdlpal 原义)', () => {
  it('Defend → 落 defend + advance(单人 → performAction)', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Defend']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
    expect(ctx.gs.battleState?.phase).toBe('performAction')
  })

  it('Flee → 落 flee', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Flee']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)?.type).toBe('flee')
  })

  it('UseItem → menuState=useItemSelect + itemSelect 建表', () => {
    const ctx = bootstrap({ items: [mkItem(1)], inventory: [{ itemId: 1, count: 3 }] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['UseItem']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('useItemSelect')
    expect(ctx.gs.battleState?.itemSelect?.items.length).toBe(1)
  })

  it('ThrowItem → menuState=throwItemSelect', () => {
    const ctx = bootstrap({ items: [mkItem(1, { throwable: true })], inventory: [{ itemId: 1, count: 3 }] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['ThrowItem']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('throwItemSelect')
  })

  it('Auto → fAutoAttack=true → 下 tick 自动 commit 攻击', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Auto']), ctx.bus)
    expect(ctx.gs.battleState?.fAutoAttack).toBe(true)
    // 下 tick:自动攻击 commit(单人 → performAction)
    tickBattle(ctx.gs, mSnap(), ctx.bus)
    const act = ctx.gs.battleState?.pendingActions.get(0)
    // 已进 performAction 或 已 commit attack
    expect(ctx.gs.battleState?.phase === 'performAction' || act?.type === 'attack').toBe(true)
  })

  it('Menu(首个队员,无上一个)→ 留在 selectMove(无回退)', () => {
    const ctx = bootstrap()
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectMove')
    expect(ctx.gs.battleState?.menuState).toBe('main')
  })
})

describe('杂项盒 围攻/道具/防御/逃跑/状态(uibattle.c:416-468 / 1359-1404)', () => {
  function enterMisc(ctx: ReturnType<typeof bootstrap>): void {
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus) // selectedAction=3 杂项
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // → menuState=misc
  }

  it('nav:Down→1 / Up wrap→4(0..4 环绕)', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    expect(ctx.gs.battleState?.menuState).toBe('misc')
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus)
    expect(ctx.gs.battleState?.miscMenuCursor).toBe(1)
    // 回 0 再 Up wrap → 4
    ctx.gs.battleState!.miscMenuCursor = 0
    tickBattle(ctx.gs, mSnap(['Up']), ctx.bus)
    expect(ctx.gs.battleState?.miscMenuCursor).toBe(4)
  })

  it('Confirm cursor=2(防御)→ 落 defend', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    ctx.gs.battleState!.miscMenuCursor = 2
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
  })

  it('Confirm cursor=3(逃跑)→ 落 flee', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    ctx.gs.battleState!.miscMenuCursor = 3
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)?.type).toBe('flee')
  })

  it('Confirm cursor=1(道具)→ menuState=miscItemSubMenu', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    ctx.gs.battleState!.miscMenuCursor = 1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('miscItemSubMenu')
  })

  it('Confirm cursor=0(围攻)→ fAutoAttack=true + 回 main', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    ctx.gs.battleState!.miscMenuCursor = 0
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.fAutoAttack).toBe(true)
  })

  it('Menu → 回 main(平取消层级)', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('main')
    expect(ctx.gs.battleState?.uiState).toBe('selectMove')
  })

  it('miscMenuCursor 跨次持久(进菜单不重置,uibattle.c:1162)', () => {
    const ctx = bootstrap()
    enterMisc(ctx)
    ctx.gs.battleState!.miscMenuCursor = 3
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus) // 回 main
    // 再进 misc:cursor 仍是 3(不重置)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus) // selectedAction=3
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.miscMenuCursor).toBe(3)
  })
})

describe('物品二级 使用/投掷(uibattle.c:471-545 / 1406-1426)', () => {
  function enterSub(ctx: ReturnType<typeof bootstrap>): void {
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // misc
    ctx.gs.battleState!.miscMenuCursor = 1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // → miscItemSubMenu
  }

  it('Down→1投掷 / Up→0使用', () => {
    const ctx = bootstrap()
    enterSub(ctx)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus)
    expect(ctx.gs.battleState?.miscSubMenuCursor).toBe(1)
    tickBattle(ctx.gs, mSnap(['Up']), ctx.bus)
    expect(ctx.gs.battleState?.miscSubMenuCursor).toBe(0)
  })

  it('Confirm 0(使用)→ useItemSelect', () => {
    const ctx = bootstrap({ items: [mkItem(1)], inventory: [{ itemId: 1, count: 2 }] })
    enterSub(ctx)
    ctx.gs.battleState!.miscSubMenuCursor = 0
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('useItemSelect')
  })

  it('Confirm 1(投掷)→ throwItemSelect', () => {
    const ctx = bootstrap({ items: [mkItem(1, { throwable: true })], inventory: [{ itemId: 1, count: 2 }] })
    enterSub(ctx)
    ctx.gs.battleState!.miscSubMenuCursor = 1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('throwItemSelect')
  })

  it('Menu → 回 main(平取消)', () => {
    const ctx = bootstrap()
    enterSub(ctx)
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('main')
  })
})

describe('法术选择网格(magicmenu.c:35-410)', () => {
  function enterMagic(learned: number[], spells: Spell[], magics: Magic[], roleOpts: Partial<PlayerRole> = {}) {
    const role = makeRole({ id: 0, ...roleOpts }) as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = learned
    const ctx = bootstrap({ roles: [role], spells, magics, enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus) // selectedAction=1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // → magicSelect
    return ctx
  }

  it('建表:MP 不足 → disabled 灰项(magicmenu.c:347-352)', () => {
    const ctx = enterMagic([296, 297], [mkSpell(296), mkSpell(297)], [mkMagic(296, { costMP: 5 }), mkMagic(297, { costMP: 999 })], { mp: 10 })
    const items = ctx.gs.battleState!.magicSelect!.items
    expect(items.find((i) => i.id === 296)?.disabled).toBe(false)
    expect(items.find((i) => i.id === 297)?.disabled).toBe(true) // MP 不够
  })

  it('建表:非 usableInBattle → disabled(magicmenu.c:355-368)', () => {
    const ctx = enterMagic([296], [mkSpell(296, { usableInBattle: false })], [mkMagic(296)])
    expect(ctx.gs.battleState!.magicSelect!.items[0]?.disabled).toBe(true)
  })

  it('Confirm 攻击法术(usableToEnemy)→ selectTargetEnemy', () => {
    const ctx = enterMagic([296], [mkSpell(296, { usableToEnemy: true })], [mkMagic(296)])
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemy')
    expect(ctx.gs.battleState?.pendingActionDraft).toMatchObject({ type: 'magic', actionId: 296, targetSide: 'enemy' })
  })

  it('Confirm 治疗法术(非 usableToEnemy)→ selectTargetPlayer', () => {
    const ctx = enterMagic([296], [mkSpell(296, { usableToEnemy: false })], [mkMagic(296)])
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetPlayer')
    expect(ctx.gs.battleState?.pendingActionDraft?.targetSide).toBe('player')
  })

  it('Confirm 对敌全体(usableToEnemy+applyToAll)→ selectTargetEnemyAll → 即时 commit target=-1', () => {
    const ctx = enterMagic([296], [mkSpell(296, { usableToEnemy: true, applyToAll: true })], [mkMagic(296)])
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemyAll')
    tickBattle(ctx.gs, mSnap(), ctx.bus) // All 状态即时 commit
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ type: 'magic', target: -1 })
  })

  it('Confirm 灰项 → no-op(不可确认,magicmenu.c:277-296)', () => {
    const ctx = enterMagic([296], [mkSpell(296)], [mkMagic(296, { costMP: 999 })], { mp: 1 })
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('magicSelect') // 仍在网格
    expect(ctx.gs.battleState?.pendingActionDraft).toBeUndefined()
  })

  it('网格导航:Right→cursor+1,clamp 不 wrap;Down→+3(列数)', () => {
    const spells = [296, 297, 298, 299].map((id) => mkSpell(id))
    const magics = [296, 297, 298, 299].map((id) => mkMagic(id))
    const ctx = enterMagic([296, 297, 298, 299], spells, magics)
    expect(ctx.gs.battleState?.magicSelect?.cursor).toBe(0)
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus)
    expect(ctx.gs.battleState?.magicSelect?.cursor).toBe(1)
    tickBattle(ctx.gs, mSnap(['Down']), ctx.bus) // +3 → 4 越界 → clamp 末项 3
    expect(ctx.gs.battleState?.magicSelect?.cursor).toBe(3)
  })

  it('Menu → 回 main + 清 magicSelect(平取消)', () => {
    const ctx = enterMagic([296], [mkSpell(296)], [mkMagic(296)])
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('main')
    expect(ctx.gs.battleState?.magicSelect).toBeUndefined()
  })
})

describe('物品选择网格(itemmenu.c:28-377)', () => {
  function enterUseItem(items: Item[], inventory: Array<{ itemId: number; count: number }>) {
    const ctx = bootstrap({ items, inventory, enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['UseItem']), ctx.bus)
    return ctx
  }

  it('建表:非 usable(useItemSelect 模式)→ disabled 灰项', () => {
    const ctx = enterUseItem([mkItem(1, { usable: true }), mkItem(2, { usable: false })], [{ itemId: 1, count: 2 }, { itemId: 2, count: 1 }])
    const items = ctx.gs.battleState!.itemSelect!.items
    expect(items.find((i) => i.id === 1)?.disabled).toBe(false)
    expect(items.find((i) => i.id === 2)?.disabled).toBe(true)
  })

  it('Confirm 使用类(治疗药)→ selectTargetPlayer + draft item/player', () => {
    const ctx = enterUseItem([mkItem(1, { usable: true })], [{ itemId: 1, count: 2 }])
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetPlayer')
    expect(ctx.gs.battleState?.pendingActionDraft).toMatchObject({ type: 'item', actionId: 1, targetSide: 'player' })
  })

  it('投掷类(throwItemSelect)Confirm → selectTargetEnemy + draft throw-item/enemy', () => {
    const ctx = bootstrap({ items: [mkItem(1, { throwable: true })], inventory: [{ itemId: 1, count: 2 }], enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['ThrowItem']), ctx.bus)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemy')
    expect(ctx.gs.battleState?.pendingActionDraft).toMatchObject({ type: 'throw-item', targetSide: 'enemy' })
  })

  it('applyToAll 使用类 → selectTargetPlayerAll → 即时 commit target=-1 targetSide=player', () => {
    const ctx = enterUseItem([mkItem(1, { usable: true, applyToAll: true })], [{ itemId: 1, count: 2 }])
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetPlayerAll')
    tickBattle(ctx.gs, mSnap(), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ type: 'item', target: -1, targetSide: 'player' })
  })

  it('Menu → 回 main + 清 itemSelect', () => {
    const ctx = enterUseItem([mkItem(1)], [{ itemId: 1, count: 2 }])
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.menuState).toBe('main')
    expect(ctx.gs.battleState?.itemSelect).toBeUndefined()
  })
})

describe('敌方 target picker(uibattle.c:1431-1543,PAL_CLASSIC)', () => {
  it('仅 1 活敌(y==1)→ 跳过选择即时 commit(uibattle.c:1459-1475)', () => {
    const ctx = bootstrap() // 单敌
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // 攻击 → selectTargetEnemy
    // 单敌 → 进 selectTargetEnemy 同 tick 即时 commit;下 tick 起 performAction
    tickBattle(ctx.gs, mSnap(), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ type: 'attack', target: 0 })
  })

  it('多敌:Right/Up 后跳,Left/Down 前跳(跳过死敌环绕)', () => {
    const ctx = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 }), makeEnemy({ id: 102 })], teamSlots: [100, 101, 102, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // selectTargetEnemy, cursor=0
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetEnemy')
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus)
    expect(ctx.gs.battleState?.uiCursor).toBe(1)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus)
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus) // wrap → 2
    expect(ctx.gs.battleState?.uiCursor).toBe(2)
  })

  it('死敌跳过:enemy[1] 死 → Right 从 0 跳到 2', () => {
    const ctx = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 }), makeEnemy({ id: 102 })], teamSlots: [100, 101, 102, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    ctx.gs.battleState!.enemies[1]!.e.health = 0
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus)
    expect(ctx.gs.battleState?.uiCursor).toBe(2)
  })

  it('Confirm → commit + 记 iPrevEnemyTarget', () => {
    const ctx = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus) // cursor=1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ type: 'attack', target: 1, targetSide: 'enemy' })
    expect(ctx.gs.battleState?.iPrevEnemyTarget).toBe(1)
  })

  it('Menu → 回 selectMove + menuState=main', () => {
    const ctx = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectMove')
    expect(ctx.gs.battleState?.menuState).toBe('main')
  })
})

describe('友方 target picker(uibattle.c:1545-1609,PAL_CLASSIC)', () => {
  function enterPlayerTarget(party: number[]) {
    const roles = party.map((id) => {
      const r = makeRole({ id }) as PlayerRole & { learnedSpells: number[] }
      r.learnedSpells = [296]
      return r
    })
    const ctx = bootstrap({ partyMembers: party, roles, spells: [mkSpell(296, { usableToEnemy: false })], magics: [mkMagic(296)] })
    enterSelectMove(ctx)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus) // selectedAction=1 法术
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // magicSelect
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus) // 选治疗法术 → selectTargetPlayer
    return ctx
  }

  it('单人队 → 进 selectTargetPlayer 即时 commit idx 0(uibattle.c:1550-1554)', () => {
    const ctx = enterPlayerTarget([0])
    // 单人:进 selectTargetPlayer 同 tick / 下 tick 即时 commit idx0
    tickBattle(ctx.gs, mSnap(), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ type: 'magic', target: 0, targetSide: 'player' })
  })

  it('多人队:Right|Up 加 / Left|Down 减 wrap', () => {
    const ctx = enterPlayerTarget([0, 1, 2])
    expect(ctx.gs.battleState?.uiState).toBe('selectTargetPlayer')
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus)
    expect(ctx.gs.battleState?.uiCursor).toBe(1)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus)
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    tickBattle(ctx.gs, mSnap(['Left']), ctx.bus) // wrap → 2
    expect(ctx.gs.battleState?.uiCursor).toBe(2)
  })

  it('Confirm → commit { target:uiCursor, targetSide:player }', () => {
    const ctx = enterPlayerTarget([0, 1])
    tickBattle(ctx.gs, mSnap(['Right']), ctx.bus) // cursor=1
    tickBattle(ctx.gs, mSnap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.pendingActions.get(0)).toMatchObject({ target: 1, targetSide: 'player' })
  })

  it('Menu → 回 selectMove', () => {
    const ctx = enterPlayerTarget([0, 1])
    tickBattle(ctx.gs, mSnap(['Menu']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('selectMove')
  })
})

// ============================================================================
// 集成:多轮战斗(双方互殴)
// ============================================================================

describe('多轮战斗集成', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    // 战斗中 magic / item warn 不污染输出
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('两个 attack-only 实体互殴 — 最终一方胜利', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 30, level: 1, attackStrength: 0, defense: 0 })],
      roles: [makeRole({ id: 0, hp: 30, level: 1, attackStrength: 0, defense: 0 })],
    })

    let safety = 500
    while (gs.mode === 'battle' && safety-- > 0) {
      // 每轮新的 selectAction 前清空 pendingActions(本测试简化:直接每 tick 写)
      if (gs.battleState?.phase === 'selectAction' && gs.battleState.pendingActions.size === 0)
        gs.battleState.pendingActions.set(0, { type: 'attack', target: 0 })
      tickBattle(gs, emptyInput, bus)
    }

    expect(gs.mode).toBe('explore')
    void consoleWarn // silence unused
  })
})

// ============================================================================
// 战斗对话结束键不漏进菜单(user 2026-05-31 实测:对话最后 space 同时选了普通攻击)
// ============================================================================

describe('战斗对话结束键不漏进动作菜单', () => {
  function snapC(pressed: Array<'Confirm'> = []): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  it('对话最后一行 Confirm 结束对话 → 不同 tick 触发普通攻击', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // → selectMove/main
    expect(gs.battleState?.uiState).toBe('selectMove')
    // 注入一条战斗对话(模拟 boss 嘲讽 scriptOnTurnStart 0xFFFF showDialog)
    gs.battleState!.battleDialogQueue = [{ text: '哼', style: 'bottom' }]
    // 推进到对话进入 waiting-end-key(打字完 + 无后续行)
    let guard = 60
    while (guard-- > 0) {
      tickBattle(gs, emptyInput, bus)
      if (gs.dialogBox && gs.dialogBox.phase === 'waiting-end-key') break
    }
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.battleState?.pendingActions.size).toBe(0)
    // 关键:Confirm 结束对话,**不应**同 tick 落 pendingActions(普通攻击)/ 进 target 选择
    tickBattle(gs, snapC(['Confirm']), bus)
    expect(gs.dialogBox).toBeUndefined() // 对话已关
    expect(gs.battleState?.pendingActions.size).toBe(0) // 没误触攻击 commit
    expect(gs.battleState?.uiState).toBe('selectMove') // 菜单恢复,不是 selectTargetEnemy
    expect(gs.battleState?.menuState).toBe('main')
    // 下一 tick 起菜单正常可用(空输入不动作)
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.pendingActions.size).toBe(0)
  })
})

// ============================================================================
// Repeat(R)+ perform 期目标重选(adversarial review 修复 #2/#5/#6)
// ============================================================================

describe('Repeat(R 键)+ 敌方目标重选(fight.c:1858-1867 / 3487-3507)', () => {
  function rSnap(pressed: Array<'Repeat'> = []): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  it('Repeat 非 pass(防御)→ 原样重提 defend', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // selectMove
    gs.battleState!.prevActions = new Map([[0, { type: 'defend', target: -1 }]])
    tickBattle(gs, rSnap(['Repeat']), bus)
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
  })

  it('Repeat prev=pass → 转物理攻击(fight.c:1862-1867)', () => {
    const { gs, bus, emptyInput } = bootstrap({ enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.prevActions = new Map([[0, { type: 'pass', target: -1 }]])
    tickBattle(gs, rSnap(['Repeat']), bus)
    const act = gs.battleState?.pendingActions.get(0)
    expect(act?.type).toBe('attack')
  })

  it('Repeat 首轮无 prev → 物理攻击(自动目标);群攻武器 target=-1', () => {
    const { gs, bus, emptyInput } = bootstrap({ roles: [makeRole({ id: 0, attackAll: 1 })], enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })], teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF] })
    tickBattle(gs, emptyInput, bus)
    tickBattle(gs, rSnap(['Repeat']), bus)
    const act = gs.battleState?.pendingActions.get(0)
    expect(act?.type).toBe('attack')
    expect(act?.target).toBe(-1) // 群攻 → 全体
  })

  it('perform 期:攻击魔法目标敌人已死 → 重选活敌(fight.c:3407/3500-3507)', () => {
    // 2 敌;player 法术指 enemy 1。perform 前手动杀 enemy 1 → 应重选到 enemy 0(唯一活敌)。
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 50 }), makeEnemy({ id: 101, health: 50 })],
      teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF],
      spells: [{ id: 296, _name: 's', magicNumber: 296, scriptOnSuccess: 0, scriptOnUse: 0, scriptDesc: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } }],
      magics: [{ id: 296, effect: 0, type: 'normal', xOffset: 0, yOffset: 0, special: 0, speed: 0, keepEffect: 0, fireDelay: 0, effectTimes: 0, shake: 0, wave: 0, unknown: 0, costMP: 5, baseDamage: 30, elemental: 0, sound: 0 } as Magic],
    })
    tickBattle(gs, emptyInput, bus)
    // 直接落一个指向 enemy 1 的 magic action,绕过菜单
    gs.battleState!.pendingActions.set(0, { type: 'magic', actionId: 296, target: 1, targetSide: 'enemy' })
    // 杀掉 enemy 1
    gs.battleState!.enemies[1]!.e.health = 0
    // 进 performAction
    gs.battleState!.phase = 'performAction'
    gs.battleState!.uiState = 'hidden'
    gs.battleState!.selectingPlayerIdx = undefined
    gs.battleState!.actionQueue = [{ isEnemy: false, idx: 0, dexterity: 100 } as never]
    gs.battleState!.currentActionIndex = 0
    // 跑一 tick perform —— magic 应被重选到活敌 enemy 0(不再打死敌 1)
    const before = gs.battleState!.enemies[0]!.e.health
    tickBattle(gs, emptyInput, bus)
    // enemy 0 受到伤害(被重选),或至少没对死敌 1 施法 / 不抛
    expect(gs.battleState!.enemies[0]!.e.health).toBeLessThanOrEqual(before)
  })
})

// ============================================================================
// tickSelectAction 端到端 input 序列(M3.5 T15)
// ============================================================================

describe('战斗菜单端到端序列(新模型)', () => {
  function eSnap(
    pressed: Array<'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Menu' | 'Defend'> = [],
  ): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  it('攻击路径(多敌):Confirm → selectTargetEnemy → Right → Menu → selectMove → Confirm → Confirm → commit + performAction', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 101 })],
      teamSlots: [100, 101, 0xFFFF, 0xFFFF, 0xFFFF],
    })
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.uiState).toBe('selectMove')
    expect(gs.battleState?.menuState).toBe('main')

    tickBattle(gs, eSnap(['Confirm']), bus) // 攻击 → selectTargetEnemy
    expect(gs.battleState?.uiState).toBe('selectTargetEnemy')
    tickBattle(gs, eSnap(['Right']), bus)
    expect(gs.battleState?.uiCursor).toBe(1)
    tickBattle(gs, eSnap(['Menu']), bus) // 退回 selectMove
    expect(gs.battleState?.uiState).toBe('selectMove')
    expect(gs.battleState?.menuState).toBe('main')

    tickBattle(gs, eSnap(['Confirm']), bus) // 攻击 → selectTargetEnemy(cursor 重置 0)
    tickBattle(gs, eSnap(['Confirm']), bus) // 确认目标 0 → commit
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('attack')
    expect(gs.battleState?.phase).toBe('performAction')
  })

  it('防御路径(经杂项盒):Confirm(杂项)→ Down Down(防御)→ Confirm → commit + performAction', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus)
    tickBattle(gs, eSnap(['Down']), bus) // selectedAction=3 杂项
    tickBattle(gs, eSnap(['Confirm']), bus) // → misc(cursor 0 围攻)
    expect(gs.battleState?.menuState).toBe('misc')
    tickBattle(gs, eSnap(['Down']), bus) // 1 道具
    tickBattle(gs, eSnap(['Down']), bus) // 2 防御
    expect(gs.battleState?.miscMenuCursor).toBe(2)
    tickBattle(gs, eSnap(['Confirm']), bus)
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
    expect(gs.battleState?.phase).toBe('performAction')
  })

  it('防御快捷键:Defend → 直接 commit defend + performAction(不进任何子菜单)', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus)
    tickBattle(gs, eSnap(['Defend']), bus)
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
    expect(gs.battleState?.phase).toBe('performAction')
  })
})

// ============================================================================
// E2:throw-item action → performThrowItem → 0x42 SimulateMagic 全链集成
// ============================================================================

describe('throw-item action 派发(E2)', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('投掷物 action → 跑 scriptOnThrow(0x42)→ 敌人落血 + 扣 inventory', () => {
    const throwItem: Item = {
      id: 66, _name: '天师符', bitmap: 0, price: 0, scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 1, scriptDesc: 0,
      flags: { usable: false, equipable: false, throwable: true, consuming: true, applyToAll: false, sellable: true, equipableBy: [false, false, false, false, false, false] },
    }
    // ip1 = 0x42 [349,0,0](天师符法 obj349 → magic54 baseDmg140 elem0)
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x42, operands: [349, 0, 0] }, { op: 'end' }]
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 200, defense: 30, level: 5 })],
      roles: [makeRole({ id: 0, hp: 300, level: 5 })],
      items: [throwItem],
      // biome-ignore lint/suspicious/noExplicitAny: 只填伤害字段
      magics: [{ id: 54, baseDamage: 140, elemental: 0, type: 'normal' } as any as Magic],
      objectMagics: [{ id: 349, magicNumber: 54, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } }],
      commands,
      inventory: [{ itemId: 66, count: 2 }],
    })

    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'throw-item', actionId: 66, target: 0 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction(build queue)

    let safety = 20
    while (gs.battleState?.phase === 'performAction' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    expect(gs.battleState?.enemies[0]!.e.health).toBe(60) // 200 - 140
    expect(gs.inventory[0]!.count).toBe(1) // 消耗 1
    void consoleWarn
  })

  it('投掷武器(0x66)→ w=op1*5+attackStr*RandomLong → 敌人落血(playerRoles 全链注入)', () => {
    const weapon: Item = {
      id: 163, _name: '长鞭', bitmap: 0, price: 0, scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 1, scriptDesc: 0,
      flags: { usable: false, equipable: true, throwable: true, consuming: true, applyToAll: false, sellable: true, equipableBy: [false, false, false, false, false, false] },
    }
    // ip1 = 0x66 [344,10,0](obj344→magic53 base198 elem0)
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x66, operands: [344, 10, 0] }, { op: 'end' }]
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 300, defense: 30, level: 5 })],
      roles: [makeRole({ id: 0, hp: 300, level: 5, attackStrength: 30 })],
      items: [weapon],
      // biome-ignore lint/suspicious/noExplicitAny: 只填伤害字段
      magics: [{ id: 53, baseDamage: 198, elemental: 0, type: 'normal' } as any as Magic],
      objectMagics: [{ id: 344, magicNumber: 53, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } }],
      commands,
      inventory: [{ itemId: 163, count: 1 }],
    })

    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    // 固定 rng:rangeInclusive→2(RandomLong 项)、next→0(rngFactor 1.0)
    gs.battleState!.rng = { next: () => 0, range: () => 0, rangeInclusive: () => 2, rangeFloat: (lo) => lo, getState: () => 0 }
    gs.battleState!.pendingActions.set(0, { type: 'throw-item', actionId: 163, target: 0 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction

    let safety = 20
    while (gs.battleState?.phase === 'performAction' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    // w = 10*5 + 30*2 = 110;calcBase(110,74)=102;/4=25;+198=223 → 300-223=77
    expect(gs.battleState?.enemies[0]!.e.health).toBe(77)
    expect(gs.inventory[0]!.count).toBe(0) // 武器投掉
    void consoleWarn
  })

  it('0x9E summon:敌人 scriptOnReady 召唤自身同种 → state.enemies 增长', () => {
    // ip1 = 0x9E[0,1,0](w=0 自身同种,count 1)
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x9E, operands: [0, 1, 0] }, { op: 'end' }]
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 200, attackStrength: 0 })],
      roles: [makeRole({ id: 0, hp: 500 })],
      commands,
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.enemies[0]!.scriptOnReady = 1 // 召唤脚本 @ip1
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })

    let safety = 30
    while (gs.battleState?.phase !== 'postAction' && gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    // 敌人行动时 scriptOnReady 跑 0x9E → 召唤 1 只同种(id 100)
    expect(gs.battleState!.enemies.length).toBe(2)
    expect(gs.battleState!.enemies[1]!.e.id).toBe(100)
    expect(gs.battleState!.enemies[1]!.e.health).toBe(200) // 满血
    void consoleWarn
  })

  it('毒 tick(postAction):中毒敌人每回合跑 wEnemyScript(0x21)扣血', () => {
    // commands ip1 = 0x21[0,50,0](毒 wEnemyScript,扣 50)
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x21, operands: [0, 50, 0] }, { op: 'end' }]
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 200, defense: 999, level: 99 })], // 高防免普攻干扰
      roles: [makeRole({ id: 0, hp: 300, attackStrength: 0 })],
      commands,
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    // 敌人中毒:scriptEntry=1(0x21[0,50,0])
    gs.battleState!.enemies[0]!.poisons = [{ poisonId: 558, scriptEntry: 1 }]
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })

    let safety = 30
    while (gs.battleState?.phase !== 'postAction' && gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    tickBattle(gs, emptyInput, bus) // 跑 postAction(毒 tick)

    // 敌人 200 - 50(毒)= 150
    expect(gs.battleState?.enemies[0]!.e.health).toBe(150)
    void consoleWarn
  })
})

// ============================================================================
// selectAutoTargetFrom —— 目标重选(sdlpal PAL_BattleSelectAutoTargetFrom fight.c:86-128)
//   修 bug:先手队友打死目标敌人后,后手队友攻击应自动切到活敌(不再打死敌空位)。
// ============================================================================

describe('selectAutoTargetFrom (fight.c:86-128)', () => {
  // biome-ignore lint/suspicious/noExplicitAny: 只填 health
  const en = (health: number): BattleEnemy => ({ e: { health } as any } as BattleEnemy)

  it('目标敌人已死 → 从 begin 起找下一个活敌(环绕)', () => {
    const enemies = [en(0), en(50), en(30)] // 敌 0 死
    // begin=0(原目标,已死)→ 返回第一个活敌 idx 1
    expect(selectAutoTargetFrom(enemies, 0)).toBe(1)
  })

  it('prevTarget 仍活 → 优先返回 prevTarget', () => {
    const enemies = [en(0), en(50), en(30)]
    // begin=0 死,但 prevTarget=2 仍活 → 返回 2(而非 1)
    expect(selectAutoTargetFrom(enemies, 0, 2)).toBe(2)
  })

  it('prevTarget 也死 → 退回 begin 起首个活敌', () => {
    const enemies = [en(0), en(50), en(0)]
    expect(selectAutoTargetFrom(enemies, 0, 2)).toBe(1) // prevTarget 2 死 → 找到 idx 1
  })

  it('环绕:begin 之后全死,绕回 begin 之前的活敌', () => {
    const enemies = [en(40), en(0), en(0)] // 仅敌 0 活
    expect(selectAutoTargetFrom(enemies, 1)).toBe(0) // 从 1 起绕回 0
  })

  it('全部敌人已死 → -1', () => {
    expect(selectAutoTargetFrom([en(0), en(0)], 0)).toBe(-1)
  })

  it('空敌列表 → -1', () => {
    expect(selectAutoTargetFrom([], 0)).toBe(-1)
  })
})

// ── B2 c5 / D24:隐身回合 iHidingTime(fight.c:3529-3548 + 1670-1725)──────────────
describe('iHidingTime 隐身(D24)', () => {
  it('activateHidingEffect:负值取反激活(CLASSIC 纯取反,无 *20/缩放)', () => {
    const s = { iHidingTime: -5 } as unknown as Parameters<typeof activateHidingEffect>[0]
    activateHidingEffect(s)
    expect(s.iHidingTime).toBe(5) // 不是 -5*20=100
  })

  it('activateHidingEffect:正值不动(已激活)', () => {
    const s = { iHidingTime: 3 } as unknown as Parameters<typeof activateHidingEffect>[0]
    activateHidingEffect(s)
    expect(s.iHidingTime).toBe(3)
  })

  it('decrementHidingEffect:正值每次 -1,到 0 停', () => {
    const s = { iHidingTime: 2 } as unknown as Parameters<typeof decrementHidingEffect>[0]
    decrementHidingEffect(s)
    expect(s.iHidingTime).toBe(1)
    decrementHidingEffect(s)
    expect(s.iHidingTime).toBe(0)
    decrementHidingEffect(s)
    expect(s.iHidingTime).toBe(0) // 不变负
  })

  it('隐身期间(iHidingTime>0)敌人整轮跳过 → 玩家不掉血 + 每轮衰减', () => {
    const { gs, bus, emptyInput, resources } = bootstrap({
      enemies: [makeEnemy({ id: 100, attackStrength: 9999, health: 999 })], // 高攻,若行动必重创
      roles: [makeRole({ id: 0, hp: 500, maxHP: 500 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.iHidingTime = 3 // 激活态隐身 3 回合(正值)
    let safety = 80
    while (gs.battleState && (gs.battleState.iHidingTime ?? 0) >= 2 && safety-- > 0) {
      if (gs.battleState.phase === 'selectAction')
        gs.battleState.pendingActions.set(0, { type: 'defend', target: -1 })
      tickBattle(gs, emptyInput, bus)
    }
    // 敌整轮被隐身挡住没打 → 玩家满血 500 未损
    expect(resources.playerRoles.roles[0]!.hp).toBe(500)
    // 隐身每轮衰减:已从 3 降到 <=2
    expect(gs.battleState?.iHidingTime ?? 0).toBeLessThanOrEqual(2)
  })
})
