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
}

function bootstrap(opts: BootstrapOpts = {}): {
  gs: GameState
  bus: CommandBus
  resources: BattleResources
  emptyInput: InputSnapshot
} {
  const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
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
  const items: Item[] = []
  const spells: Spell[] = []
  const magics: Magic[] = []
  const commands: Command[] = [{ op: 'end' }]

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
    commands,
    rngSeed: opts.rngSeed ?? 42,
    runScriptFn: opts.runScriptFn,
  })

  return {
    gs,
    bus,
    resources: { items, spells, magics, playerRoles, commands },
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
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
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
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
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
    // exp / cash 入账(M3 简版 — 临时 _exp + (gs as any).cash)
    const role = (gs as unknown as { __battleResources?: BattleResources }).__battleResources
    void role // (资源应已清)
    expect((gs as unknown as Record<string, number>).cash).toBe(200)
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
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
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
