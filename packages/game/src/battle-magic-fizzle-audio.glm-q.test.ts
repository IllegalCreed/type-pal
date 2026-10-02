// Q08 r13 · performMagic 合法 fizzle 施法音臂（typed driver，零强转，真实 runScript）。
//
// Q-R12-01 修正：r12 版用 mock 手置 fScriptSuccess=false 且 commands 只有 1 条 end 却
// scriptOnUse=42（越界 entry），不是合法 fizzle。本版改用**真实 runScript**（与旧
// actions.test.ts 同一导入）+ 合成最小合法脚本：commands = [end, raw 0x41, end]，
// scriptOnUse entry = 1（0x41 = mark-script-failed，script.c:1623-1627 →
// fScriptSuccess=false）。Codex 独立实跑已证明该路径：无 warning、失败旗 false、
// 动画 0、sound9 → pendingSounds[9]、sound0 → 无队列。
//
// Q-R12-02：r12 的两个 enemy 例（无 gs 脚本照跑 / 未建链即时施法音）已被旧
// actions.test.ts「敌人 cast → 不扣 MP + 仍 emit + 仍 runScript」（:1859-1894，无 gs、
// 精确单动画/callback 次数/ctx）与「M6 法术音」敌 cast 音完整数组直证（:1297-1342），
// 属 existing-proof，本版删除不重复。文件头的「数字缓冲」主张一并撤回（本文件无数字
// oracle——那是 r12 未交的表述错误）。

import type { Command, Magic, PlayerRole, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { performMagic } from './core/battle/actions/magic.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
import { type CommandBus, createCommandBus } from './core/command-bus.js'
import { runScript } from './core/event-system.js'
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
    magicSound: 9, // sdlpal rgwMagicSound[李逍遥]=9（magic.ts 注释真值）
    deathSound: 0,
    ...opts,
  }
}

function battleState(): BattleState {
  const enemySlot: BattleEnemy = {
    e: {
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
      magicSound: 47,
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
    },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: 100,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    resistanceToSorcery: 0,
    poisons: [],
  }
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
    enemies: [enemySlot],
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

/** 合法最小失败脚本：ip1 = raw 0x41（mark-script-failed）。 */
const FIZZLE_COMMANDS: Command[] = [
  { op: 'end' },
  { op: 'raw', opcode: 0x41, operands: [0, 0, 0] },
  { op: 'end' },
]

function spellDef(id: number, scriptOnUse: number): Spell {
  return {
    id,
    _name: `spell${id}`,
    magicNumber: id,
    scriptOnSuccess: 0,
    scriptOnUse,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  }
}

function magicDef(id: number): Magic {
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
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

describe('Q08 performMagic 合法 fizzle 施法音（真实 runScript + 0x41）', () => {
  test('fizzle（scriptOnUse entry1 = raw 0x41）施法音仍即时播（fight.c:4184 vs 4215）', () => {
    const st = battleState()
    const gs: GameState = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus: CommandBus = createCommandBus()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spellDef(7, 1)], // entry1 = 0x41（合法脚本内 entry）
      magics: [magicDef(7)],
      playerRoles: { roles: [role()] },
      bus,
      commands: FIZZLE_COMMANDS,
      runScript, // 真实产品 runner；0x41 在其中置 fScriptSuccess=false
      gs,
    })
    expect(warn).not.toHaveBeenCalled() // 合法 entry，无越界 warning
    expect(gs.fScriptSuccess).toBe(false) // 0x41 真实置失败
    expect(gs.pendingSounds).toEqual([9]) // 施法音 9 fizzle 仍播
    expect(bus.drain().filter((c) => c.cmd.op === 'playMagicAnim')).toHaveLength(0)
    warn.mockRestore()
  })

  test('fizzle 施法音=0（magicSound 0）不 push、pendingSounds 通道不初始化', () => {
    const st = battleState()
    const gs: GameState = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spellDef(7, 1)],
      magics: [magicDef(7)],
      playerRoles: { roles: [role({ magicSound: 0 })] },
      bus: createCommandBus(),
      commands: FIZZLE_COMMANDS,
      runScript,
      gs,
    })
    expect(warn).not.toHaveBeenCalled()
    expect(gs.fScriptSuccess).toBe(false)
    expect(gs.pendingSounds).toBeUndefined() // pendingCastSound=0 → 不 push 不初始化
    warn.mockRestore()
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
