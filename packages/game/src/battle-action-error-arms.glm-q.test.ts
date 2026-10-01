// Q08 · 8b/10b 展开批 —— 战斗动作公开入口的**错误/资源所有权臂**（typed driver，零强转）。
//
// 对应 r4 ledger 拆行：
//   8b  performMagic caster 缺失两臂 + selectAutoTargetFrom 两臂（旧六例之外的未覆盖条件）；
//   10b capture：game 全源无 capture 公开符号（grep packages/game/src 零命中，r5 已核），
//       该行由「展开中」改记 N/A —— 误设行，非停线轴。
// 排重 basis：actions.test.ts 已证「MP 不足不扣/spell id not found/magic id 不在表」；
//   本文件只打 caster/role 缺失、无 inventory 三臂与 selectAutoTargetFrom 两臂。

import type { Enemy, Item, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { performItem } from './core/battle/actions/item.js'
import { performMagic } from './core/battle/actions/magic.js'
import { performThrowItem } from './core/battle/actions/throw-item.js'
import type { BattleState } from './core/battle/battle-state.js'
import { selectAutoTargetFrom } from './core/battle/battle-system.js'
import { type CommandBus, createCommandBus } from './core/command-bus.js'
import { createInitialGameState, type GameState } from './core/game-state.js'

function role(opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id: 0,
    _name: 'Role0',
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

function enemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'Enemy0',
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

function item(opts: Partial<Item> = {}): Item {
  return {
    id: 117,
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: true,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
    ...opts,
  }
}

function spell(id: number): Spell {
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
    },
  }
}

function magic(id: number): Magic {
  return {
    id,
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
    baseDamage: 30,
    elemental: 0,
    sound: 0,
  }
}

function state(): BattleState {
  return {
    players: [
      {
        roleId: 0,
        prevHp: 200,
        prevMp: 30,
        defending: false,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      },
    ],
    enemies: [
      {
        e: enemy(),
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
        prevHp: 100,
        scriptOnTurnStart: 0,
        scriptOnBattleEnd: 0,
        scriptOnReady: 0,
        resistanceToSorcery: 0,
        poisons: [],
      },
    ],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
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
    rng: {
      next: () => 0,
      range: () => 0,
      rangeInclusive: () => 0,
      rangeFloat: () => 0,
      getState: () => 0,
    },
    phaseStallTicks: 0,
  }
}

function roles(): PlayerRoles {
  return { roles: [role()] }
}

function gs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

describe('Q08-8b performMagic caster 缺失臂', () => {
  test('caster 索引越界：warn + 不扣 MP + 不 emit + 不跑脚本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const st = state()
    const playerRoles = roles()
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn()
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 9,
      spellId: 297,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell(297)],
      magics: [magic(297)],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('caster player idx 9 越界'))
    expect(playerRoles.roles[0]!.mp).toBe(30) // 不扣
    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('caster role 不在 playerRoles：warn + 不扣 MP + 不 emit + 不跑脚本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const st = state()
    const playerRoles: PlayerRoles = { roles: [] } // caster roleId 0 缺席
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn()
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 297,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell(297)],
      magics: [magic(297)],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('caster role 0 不在 playerRoles'))
    expect(bus.drain()).toEqual([])
    expect(runScript).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('Q08-8b 无 inventory 资源臂（item / throw-item）', () => {
  test('performItem 队员库存缺 entry：warn + 不跑 scriptOnUse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const game = gs() // inventory 空 → 无 entry
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn()
    performItem({
      state: state(),
      gs: game,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 117,
      targetIsEnemy: true,
      targetIdx: 0,
      items: [item({ id: 117, scriptOnUse: 1 })],
      playerRoles: roles(),
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[item] no inventory for item 117'))
    expect(runScript).not.toHaveBeenCalled()
    expect(game.inventory).toEqual([])
    warn.mockRestore()
  })

  test('performItem count=0 保留 entry：同 warn 早退（不剔除、不跑脚本）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const game = gs()
    game.inventory = [{ itemId: 117, count: 0 }]
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn()
    performItem({
      state: state(),
      gs: game,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 117,
      targetIsEnemy: true,
      targetIdx: 0,
      items: [item({ id: 117, scriptOnUse: 1 })],
      playerRoles: roles(),
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no inventory for item 117'))
    expect(runScript).not.toHaveBeenCalled()
    expect(game.inventory).toEqual([{ itemId: 117, count: 0 }]) // count=0 entry 保留
    warn.mockRestore()
  })

  test('performThrowItem 队员无 inventory：warn + 不跑 scriptOnThrow + 不 emit', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const game = gs()
    const bus: CommandBus = createCommandBus()
    const runScript = vi.fn()
    performThrowItem({
      state: state(),
      gs: game,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 117,
      targetIdx: 0,
      items: [item({ id: 117, scriptOnThrow: 1 })],
      magics: [magic(297)],
      objectMagics: [],
      objectPoisons: [],
      playerRoles: roles(),
      bus,
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[throw-item] no inventory for item 117'),
    )
    expect(runScript).not.toHaveBeenCalled()
    expect(bus.drain()).toEqual([])
    warn.mockRestore()
  })
})

describe('Q08-8b selectAutoTargetFrom 未覆盖条件臂', () => {
  test('begin<0 规范化为从 0 起扫首个活敌', () => {
    const enemies = [
      { e: enemy({ health: 50 }), status: {} as BattleState['enemies'][0]['status'] },
      { e: enemy({ health: 0 }), status: {} as BattleState['enemies'][0]['status'] },
    ] as BattleState['enemies']
    expect(selectAutoTargetFrom(enemies, -1, -1)).toBe(0)
  })

  test('prevTarget 越界(≥n)时回 begin 起扫，不读越界槽', () => {
    const enemies = [
      { e: enemy({ health: 0 }), status: {} as BattleState['enemies'][0]['status'] },
      { e: enemy({ health: 50 }), status: {} as BattleState['enemies'][0]['status'] },
    ] as BattleState['enemies']
    expect(selectAutoTargetFrom(enemies, 1, 9)).toBe(1) // prev 9 越界 → begin=1 活敌命中
    expect(selectAutoTargetFrom(enemies, 0, 9)).toBe(1) // begin=0 死敌 → 环绕到 1
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
