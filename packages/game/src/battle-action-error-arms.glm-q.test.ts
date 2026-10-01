// Q08 · 8b/10b 展开批 —— 战斗动作公开入口的**错误/资源所有权臂**（typed driver，零强转）。
//
// r6 修订（Q-R5-01/02/03）：
//   - selectAutoTargetFrom fixture 完整 typed 化（slot() 全必填字段，仅健康轴可变）；
//   - performItem 缺 entry/count0 两合同与 actions.test.ts:2317-2371 同源同断言，删重不计新；
//   - pickAutoMagic 学习法术输入撤回 blocked-input：PlayerRole.magic 已声明
//     （tables.ts:562），经 createInitialGameState→hydratePlayerRolesRuntime(rgwMagic)
//     →projectRuntimeToBattleRoles 公开投影链构造（bootstrap.ts:1197 真实 caller 同路）。
// 排重 basis：battle-system.test.ts:1089-1119 两条 signed-negative（负 baseDamage 跳过/
//   全负返 0）不重复；本批只打 silence 门/selectingPlayerIdx 缺席/resolve 失败/
//   costMP=1 哨兵/MP 不足门/威力择优 六个未覆盖条件。

import type { Enemy, Item, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { performMagic } from './core/battle/actions/magic.js'
import { performThrowItem } from './core/battle/actions/throw-item.js'
import type { BattleState } from './core/battle/battle-state.js'
import { pickAutoMagic, selectAutoTargetFrom } from './core/battle/battle-system.js'
import { type CommandBus, createCommandBus } from './core/command-bus.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from './core/game-state.js'

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

function magic(id: number, opts: Partial<Magic> = {}): Magic {
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
    ...opts,
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

describe('Q08-8b 无 inventory 资源臂（throw-item；performItem 同族由 actions.test.ts:2317-2371 已证，Q-R5-02 删重）', () => {
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

/** 完整 typed BattleEnemy 槽（全必填字段，仅健康轴可变；零强转）。 */
function slot(health: number): BattleState['enemies'][number] {
  return {
    e: enemy({ health }),
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    resistanceToSorcery: 0,
    poisons: [],
  }
}

describe('Q08-8b selectAutoTargetFrom 未覆盖条件臂', () => {
  test('begin<0 规范化为从 0 起扫首个活敌', () => {
    const enemies: BattleState['enemies'] = [slot(50), slot(0)]
    expect(selectAutoTargetFrom(enemies, -1, -1)).toBe(0)
  })

  test('prevTarget 越界(≥n)时回 begin 起扫，不读越界槽', () => {
    const enemies: BattleState['enemies'] = [slot(0), slot(50)]
    expect(selectAutoTargetFrom(enemies, 1, 9)).toBe(1) // prev 9 越界 → begin=1 活敌命中
    expect(selectAutoTargetFrom(enemies, 0, 9)).toBe(1) // begin=0 死敌 → 环绕到 1
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Q08-8b pickAutoMagic 展开批（typed rgwMagic 投影链；Q-R5-03 撤回 blocked-input）', () => {
  /** 真实公开链：createInitialGameState → hydratePlayerRolesRuntime(rgwMagic) → projectRuntimeToBattleRoles。 */
  function projectedRoles(learned: number[]): PlayerRoles {
    const game = gs()
    const staticRoles: PlayerRoles = { roles: [role()] }
    hydratePlayerRolesRuntime(game.PlayerRolesRuntime, staticRoles)
    for (const [slot, magicId] of learned.entries())
      game.PlayerRolesRuntime.rgwMagic[slot]![0] = magicId
    return projectRuntimeToBattleRoles(game.PlayerRolesRuntime, staticRoles)
  }

  function autoState(statusSilence = 0): BattleState {
    const st = state()
    st.selectingPlayerIdx = 0
    if (statusSilence) st.players[0]!.status.silence = statusSilence
    return st
  }

  test('公开投影链把 rgwMagic 槽位真实投影为 role.magic（caller 同路）', () => {
    const projected = projectedRoles([0, 297, 0, 296])
    expect(projected.roles[0]!.magic).toEqual([
      0, 297, 0, 296, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0,
    ])
  })

  test('silence>0 → 直接返回 0（物理攻击），不查法术表', () => {
    const r = pickAutoMagic(autoState(3), projectedRoles([297]), [spell(297)], [magic(297)], 9999)
    expect(r).toBe(0)
  })

  test('selectingPlayerIdx 缺席（undefined）→ 返回 0', () => {
    const st = state() // 不设 selectingPlayerIdx
    expect(pickAutoMagic(st, projectedRoles([297]), [spell(297)], [magic(297)], 9999)).toBe(0)
  })

  test('已学槽法术 resolve 失败（spell 不在表）→ 该槽跳过，返回 0', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([400]),
      [spell(297)], // 表里没有 400
      [magic(297)],
      0,
    )
    expect(r).toBe(0)
  })

  test('costMP=1 哨兵（sdlpal 特殊免耗位）→ 跳过不选；合法耗魔法术正常入选', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([296, 297]),
      [spell(296), spell(297)],
      [magic(296, { costMP: 1 }), magic(297, { costMP: 2 })],
      0,
    )
    expect(r).toBe(297)
  })

  test('唯一已学法术 MP 不足（costMP>role.mp）→ 跳过返回 0', () => {
    const projected = projectedRoles([297])
    expect(projected.roles[0]!.mp).toBe(30)
    const r = pickAutoMagic(autoState(), projected, [spell(297)], [magic(297, { costMP: 31 })], 0)
    expect(r).toBe(0)
  })

  test('威力择优：同 rng 下 baseDamage 高者入选（range=0 消除随机项）', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([296, 297]),
      [spell(296), spell(297)],
      [magic(296, { baseDamage: 10 }), magic(297, { baseDamage: 30 })],
      0,
    )
    expect(r).toBe(297)
  })
})
