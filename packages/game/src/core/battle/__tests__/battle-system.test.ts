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
 *  - tickBattle:队员死光 → lost → finalize 切 explore + hp=1
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
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createInitialGameState, type GameState } from '../../game-state.js'
import { startBattle, tickBattle, type BattleResources, type RunScriptFn } from '../battle-system.js'

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
  /** E2 投掷物测试用:注入 items / magics / objectMagics / commands / inventory。 */
  items?: Item[]
  magics?: Magic[]
  spells?: Spell[]
  objectMagics?: ObjectMagicView[]
  objectPoisons?: ObjectPoisonView[]
  commands?: Command[]
  inventory?: { itemId: number, count: number }[]
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
    expect(gs.battleState?.uiState).toBe('mainMenu')
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

    let safety = 100
    while (gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    // M5.B-w1.c:exp/cash 入账走 gs.Exp.rgPrimaryExp + gs.dwCash 真 schema
    expect(gs.dwCash).toBe(200)
    expect(gs.Exp.rgPrimaryExp[0]?.wExp).toBeGreaterThan(0)
  })

  it('队员死光 → lost → finalize 切 explore + hp=1', () => {
    const role = makeRole({ id: 0, hp: 1, defense: 0, level: 1 })
    const { gs, bus, emptyInput } = bootstrap({
      roles: [role],
      enemies: [makeEnemy({ id: 100, attackStrength: 999, level: 50 })], // 强敌
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'defend', target: -1 })

    let safety = 200
    while (gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

    expect(gs.mode).toBe('explore')
    expect(role.hp).toBe(1) // M3 简版 lost 后回 1 hp
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

    let safety = 100
    while (gs.mode === 'battle' && safety-- > 0)
      tickBattle(gs, emptyInput, bus)

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
// tickSelectAction mainMenu input(M3.5 T13)
// ============================================================================

describe('tickSelectAction mainMenu input(M3.5 T13)', () => {
  /** 构造一个只含一个键 pressed 的 InputSnapshot。 */
  function snap(pressed: Array<'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Cancel' | 'Menu'> = []): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  it('Up wrap:cursor=0 + Up → cursor=4', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(uiState=mainMenu, cursor=0)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    tickBattle(gs, snap(['Up']), bus)
    expect(gs.battleState?.uiCursor).toBe(4)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.phase).toBe('selectAction')
  })

  it('Down wrap:cursor=4 + Down → cursor=0', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.uiCursor = 4
    tickBattle(gs, snap(['Down']), bus)
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.uiState).toBe('mainMenu')
  })

  it('Confirm 攻击(cursor=0)→ uiState=targetSelect + pendingActionDraft={type:"attack"}', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    expect(gs.battleState?.uiCursor).toBe(0)
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'attack' })
    // 攻击未落 pendingActions(还要选 target)
    expect(gs.battleState?.pendingActions.has(0)).toBe(false)
    expect(gs.battleState?.phase).toBe('selectAction')
  })

  it('Confirm 攻击 + attackAll 群攻武器(role.attackAll≠0)→ 跳过 targetSelect,直接落 target=-1', () => {
    const { gs, bus, emptyInput } = bootstrap({ roles: [makeRole({ id: 0, attackAll: 1 })] })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(cursor=0 攻击)
    tickBattle(gs, snap(['Confirm']), bus)
    // 不进 targetSelect,直接落全体攻击 action
    expect(gs.battleState?.pendingActions.get(0)).toEqual({ type: 'attack', target: -1 })
    expect(gs.battleState?.uiState).not.toBe('targetSelect')
  })

  it('Confirm 防御(cursor=3)→ pendingActions[0]={type:"defend"} + advance(单队员 → performAction)', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.uiCursor = 3
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.pendingActions.has(0)).toBe(true)
    const action = gs.battleState!.pendingActions.get(0)!
    expect(action.type).toBe('defend')
    // 单队员 party — pendingActions 填满后由 tickSelectAction 主流程切 performAction
    expect(gs.battleState?.phase).toBe('performAction')
  })

  it('Confirm 逃跑(cursor=4)→ pendingActions[0]={type:"flee"} + advance', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.uiCursor = 4
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.pendingActions.has(0)).toBe(true)
    const action = gs.battleState!.pendingActions.get(0)!
    expect(action.type).toBe('flee')
    expect(gs.battleState?.phase).toBe('performAction')
  })
})

// ============================================================================
// tickSelectAction magicMenu / itemMenu / targetSelect input(M3.5 T14)
// ============================================================================

describe('tickSelectAction magicMenu / itemMenu / targetSelect(M3.5 T14)', () => {
  function snap(pressed: Array<'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Cancel' | 'Menu'> = []): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  /**
   * 把 BattleState 推进到 'magicMenu' uiState(模拟 mainMenu 上 Confirm 法术)。
   * 顺便往 role 上挂 learnedSpells。
   */
  function enterMagicMenu(learned: number[]) {
    const ctx = bootstrap()
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus) // preBattle → selectAction
    // 直接 mutate 已 bootstrap 的 role
    const role = ctx.resources.playerRoles.roles[0] as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = learned
    // cursor=1 → Confirm 进 magicMenu
    ctx.gs.battleState!.uiCursor = 1
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('magicMenu')
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    return ctx
  }

  function enterItemMenu(inventory: Array<{ itemId: number, count: number }>) {
    const ctx = bootstrap()
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus)
    ctx.gs.inventory = inventory
    ctx.gs.battleState!.uiCursor = 2
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('itemMenu')
    expect(ctx.gs.battleState?.uiCursor).toBe(0)
    return ctx
  }

  // ---------- magicMenu ----------

  it('magicMenu Up wrap(learned=[12,20,33]):cursor=0 + Up → cursor=2', () => {
    const { gs, bus } = enterMagicMenu([12, 20, 33])
    tickBattle(gs, snap(['Up']), bus)
    expect(gs.battleState?.uiCursor).toBe(2)
    expect(gs.battleState?.uiState).toBe('magicMenu')
  })

  it('magicMenu Down wrap(learned=[12,20,33]):cursor=2 + Down → cursor=0', () => {
    const { gs, bus } = enterMagicMenu([12, 20, 33])
    gs.battleState!.uiCursor = 2
    tickBattle(gs, snap(['Down']), bus)
    expect(gs.battleState?.uiCursor).toBe(0)
  })

  it('magicMenu Confirm(选中 spellId=20)→ uiState=targetSelect + draft.actionId=20', () => {
    const { gs, bus } = enterMagicMenu([12, 20, 33])
    gs.battleState!.uiCursor = 1 // 选中 learned[1] = 20
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'magic', actionId: 20 })
    expect(gs.battleState?.pendingActions.has(0)).toBe(false)
  })

  it('magicMenu Confirm 全体法术(magic.type=attackAll,flags.applyToAll=false)→ 跳过 targetSelect,落 target=-1', () => {
    const ctx = bootstrap({
      spells: [{ id: 296, magicNumber: 5, scriptOnSuccess: 0, scriptOnUse: 0, scriptDesc: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } }],
      // biome-ignore lint/suspicious/noExplicitAny: 只填 type(AoE 判定按 type)
      magics: [{ id: 5, type: 'attackAll' } as any as Magic],
    })
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus) // → selectAction
    const role = ctx.resources.playerRoles.roles[0] as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = [296]
    ctx.gs.battleState!.uiCursor = 1 // 法术
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus) // mainMenu → magicMenu
    expect(ctx.gs.battleState?.uiState).toBe('magicMenu')
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus) // magicMenu Confirm 选 attackAll 法术
    expect(ctx.gs.battleState?.pendingActions.get(0)).toEqual({ type: 'magic', actionId: 296, target: -1 })
    expect(ctx.gs.battleState?.uiState).not.toBe('targetSelect')
  })

  it('magicMenu Cancel → 回 mainMenu + cursor=0 + 清 draft', () => {
    const { gs, bus } = enterMagicMenu([12, 20])
    expect(gs.battleState?.pendingActionDraft).toBeDefined()
    tickBattle(gs, snap(['Cancel']), bus)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
  })

  it('magicMenu(无 learnedSpells)Confirm → 不切 targetSelect(空表 no-op)', () => {
    const { gs, bus } = enterMagicMenu([])
    tickBattle(gs, snap(['Confirm']), bus)
    // 仍停在 magicMenu(没有可选项)
    expect(gs.battleState?.uiState).toBe('magicMenu')
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'magic' })
  })

  // ---------- itemMenu ----------

  it('itemMenu Up wrap(inv=[a,b,c count>0]):cursor=0 + Up → cursor=2', () => {
    const { gs, bus } = enterItemMenu([
      { itemId: 10, count: 1 },
      { itemId: 11, count: 2 },
      { itemId: 12, count: 3 },
    ])
    tickBattle(gs, snap(['Up']), bus)
    expect(gs.battleState?.uiCursor).toBe(2)
    expect(gs.battleState?.uiState).toBe('itemMenu')
  })

  it('itemMenu Down wrap(inv=2 entries):cursor=1 + Down → cursor=0', () => {
    const { gs, bus } = enterItemMenu([
      { itemId: 10, count: 1 },
      { itemId: 11, count: 2 },
    ])
    gs.battleState!.uiCursor = 1
    tickBattle(gs, snap(['Down']), bus)
    expect(gs.battleState?.uiCursor).toBe(0)
  })

  it('itemMenu Confirm(选中 itemId=11)→ uiState=targetSelect + draft.actionId=11', () => {
    const { gs, bus } = enterItemMenu([
      { itemId: 10, count: 1 },
      { itemId: 11, count: 2 },
    ])
    gs.battleState!.uiCursor = 1
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'item', actionId: 11 })
  })

  it('itemMenu Confirm 选投掷物(throwable + scriptOnThrow)→ draft type=throw-item(E2)', () => {
    const throwItem: Item = {
      id: 66, _name: '天师符', bitmap: 0, price: 0, scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 1, scriptDesc: 0,
      flags: { usable: false, equipable: false, throwable: true, consuming: true, applyToAll: false, sellable: true, equipableBy: [false, false, false, false, false, false] },
    }
    const ctx = bootstrap({ items: [throwItem], inventory: [{ itemId: 66, count: 2 }] })
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus) // preBattle → selectAction
    ctx.gs.battleState!.uiCursor = 2 // 物品
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus) // mainMenu → itemMenu
    expect(ctx.gs.battleState?.uiState).toBe('itemMenu')
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus) // itemMenu Confirm 选投掷物
    expect(ctx.gs.battleState?.pendingActionDraft).toEqual({ type: 'throw-item', actionId: 66 })
    expect(ctx.gs.battleState?.uiState).toBe('targetSelect')
  })

  it('itemMenu Up wrap 跳过 count=0(只算可用)', () => {
    const { gs, bus } = enterItemMenu([
      { itemId: 10, count: 1 },
      { itemId: 11, count: 0 }, // 已用完,不计入
      { itemId: 12, count: 3 },
    ])
    // 可用 = [10, 12],N=2;cursor=0 + Up → cursor=1
    tickBattle(gs, snap(['Up']), bus)
    expect(gs.battleState?.uiCursor).toBe(1)
    // Confirm 拿 itemId=12(usable[1])
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.pendingActionDraft?.actionId).toBe(12)
  })

  it('itemMenu Cancel → 回 mainMenu + 清 draft', () => {
    const { gs, bus } = enterItemMenu([{ itemId: 10, count: 1 }])
    tickBattle(gs, snap(['Cancel']), bus)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
  })

  // ---------- targetSelect ----------

  /**
   * 推进到 targetSelect uiState(走完 mainMenu Confirm 攻击的路径)。
   * 默认 2 个活敌人,raw index = [0, 1]。
   */
  function enterTargetSelectViaAttack(opts: { enemies?: Enemy[] } = {}) {
    const enemies = opts.enemies ?? [makeEnemy({ id: 100 }), makeEnemy({ id: 200 })]
    const ctx = bootstrap({
      enemies,
      teamSlots: [100, 200, 0xFFFF, 0xFFFF, 0xFFFF],
    })
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus) // preBattle → selectAction
    // cursor=0 = 攻击;Confirm 切 targetSelect
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('targetSelect')
    expect(ctx.gs.battleState?.pendingActionDraft).toEqual({ type: 'attack' })
    return ctx
  }

  it('targetSelect Left wrap(2 个活敌):cursor=0 + Left → cursor=1', () => {
    const { gs, bus } = enterTargetSelectViaAttack()
    tickBattle(gs, snap(['Left']), bus)
    expect(gs.battleState?.uiCursor).toBe(1)
  })

  it('targetSelect Right wrap(2 个活敌):cursor=1 + Right → cursor=0', () => {
    const { gs, bus } = enterTargetSelectViaAttack()
    gs.battleState!.uiCursor = 1
    tickBattle(gs, snap(['Right']), bus)
    expect(gs.battleState?.uiCursor).toBe(0)
  })

  it('targetSelect 跳过已死敌人:enemies[0].health=0 → Right 从 1 跳回 1(N=1 自旋)', () => {
    const { gs, bus } = enterTargetSelectViaAttack()
    gs.battleState!.enemies[0]!.e.health = 0
    gs.battleState!.uiCursor = 1
    tickBattle(gs, snap(['Right']), bus)
    // 只剩 1 个活敌 → cursor 仍 1
    expect(gs.battleState?.uiCursor).toBe(1)
  })

  it('targetSelect Confirm → pendingActions 落 + advance(单队员 → performAction)', () => {
    const { gs, bus } = enterTargetSelectViaAttack()
    gs.battleState!.uiCursor = 1
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.pendingActions.has(0)).toBe(true)
    const action = gs.battleState!.pendingActions.get(0)!
    expect(action.type).toBe('attack')
    expect(action.target).toBe(1)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
    // 单队员 → 切 performAction
    expect(gs.battleState?.phase).toBe('performAction')
  })

  it('targetSelect Cancel → 回 mainMenu + cursor=0 + 清 draft', () => {
    const { gs, bus } = enterTargetSelectViaAttack()
    expect(gs.battleState?.pendingActionDraft).toBeDefined()
    tickBattle(gs, snap(['Cancel']), bus)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
  })

  it('targetSelect Confirm 带 magic draft → action.target 为 raw enemy index', () => {
    const ctx = bootstrap({
      enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 200 })],
      teamSlots: [100, 200, 0xFFFF, 0xFFFF, 0xFFFF],
    })
    tickBattle(ctx.gs, ctx.emptyInput, ctx.bus)
    const role = ctx.resources.playerRoles.roles[0] as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = [7]
    // 1) main → magicMenu
    ctx.gs.battleState!.uiCursor = 1
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('magicMenu')
    // 2) magicMenu(cursor=0)Confirm → targetSelect
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    expect(ctx.gs.battleState?.uiState).toBe('targetSelect')
    expect(ctx.gs.battleState?.pendingActionDraft).toEqual({ type: 'magic', actionId: 7 })
    // 3) targetSelect cursor=1 → Confirm
    ctx.gs.battleState!.uiCursor = 1
    tickBattle(ctx.gs, snap(['Confirm']), ctx.bus)
    const action = ctx.gs.battleState!.pendingActions.get(0)!
    expect(action).toEqual({ type: 'magic', actionId: 7, target: 1 })
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
// tickSelectAction 端到端 input 序列(M3.5 T15)
// ============================================================================

describe('tickSelectAction 端到端 input 序列(M3.5 T15)', () => {
  function snap(pressed: Array<'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Cancel' | 'Menu'> = []): InputSnapshot {
    return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
  }

  it('攻击路径:Confirm → targetSelect → Right → Cancel → mainMenu → Confirm → Confirm → pendingActions + performAction', () => {
    // 单 player + 2 enemy fixture(让 targetSelect Right 真能切到 idx 1)
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100 }), makeEnemy({ id: 200 })],
      teamSlots: [100, 200, 0xFFFF, 0xFFFF, 0xFFFF],
    })

    // preBattle → selectAction(uiState=mainMenu, uiCursor=0)
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.phase).toBe('selectAction')
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)

    // Step 1: Confirm 选攻击 → targetSelect
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'attack' })

    // Step 2: Right → target 切到 idx 1
    tickBattle(gs, snap(['Right']), bus)
    expect(gs.battleState?.uiCursor).toBe(1)
    expect(gs.battleState?.uiState).toBe('targetSelect')

    // Step 3: Cancel → 回 mainMenu + 清 draft + cursor=0
    tickBattle(gs, snap(['Cancel']), bus)
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
    expect(gs.battleState?.pendingActions.has(0)).toBe(false)

    // Step 4: 再 Confirm 选攻击 → targetSelect
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect(gs.battleState?.uiCursor).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toEqual({ type: 'attack' })

    // Step 5: Confirm 选 target 0 → pendingActions 落 + 单队员 → 切 performAction
    tickBattle(gs, snap(['Confirm']), bus)
    const action = gs.battleState!.pendingActions.get(0)!
    expect(action.type).toBe('attack')
    expect(action.target).toBe(0)
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()

    // Step 6: 单 player fixture → pendingActions 全填 → 切 performAction
    expect(gs.battleState?.phase).toBe('performAction')
  })

  it('防御路径:cursor=3 + Confirm → 直接填 pendingActions + 切 performAction', () => {
    const { gs, bus, emptyInput } = bootstrap()

    // preBattle → selectAction
    tickBattle(gs, emptyInput, bus)
    expect(gs.battleState?.uiState).toBe('mainMenu')

    // cursor=3 = 防御;Confirm → 不进 targetSelect,直接落 pendingActions
    gs.battleState!.uiCursor = 3
    tickBattle(gs, snap(['Confirm']), bus)
    expect(gs.battleState?.pendingActions.has(0)).toBe(true)
    const action = gs.battleState!.pendingActions.get(0)!
    expect(action.type).toBe('defend')
    expect(gs.battleState?.pendingActionDraft).toBeUndefined()
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
    gs.battleState!.rng = { next: () => 0, range: () => 0, rangeInclusive: () => 2, getState: () => 0 }
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
