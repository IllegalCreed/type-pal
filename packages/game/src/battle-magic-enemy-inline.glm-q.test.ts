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

import type { Enemy, Magic, PlayerRole, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { performMagic } from './core/battle/actions/magic.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
import { createCommandBus } from './core/command-bus.js'
import { runScript as realRunScript } from './core/event-system.js'
import { createInitialGameState } from './core/game-state.js'

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

function magicDef(baseDamage = 30): Magic {
  return {
    id: 7,
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
    baseDamage,
    elemental: 0,
    sound: 0,
  }
}

/**
 * Q08 r14 · enemy cast inline 排除臂（真实 runScript，typed 零强转）。
 *
 * 排重 basis：magic-inline-damage.test.ts 全部 player→enemy inline 例；旧 enemy cast 例
 * (actions.test.ts :1859-1894) 断言 emit/脚本/MP 但未断言**敌方施法不触发 E1 inline
 * 伤害**（magic.ts:327 !casterIsEnemy 门——inline 路径仅 player→enemy，敌施法伤害
 * 由 0x42 SimulateMagic/敌 AI 系统另行结算）。本文件补该排除臂 + 语义对照。
 */

function enemyWithHealth(hp: number): BattleEnemy['e'] {
  return {
    ...(battleState().enemies[0]!.e as Enemy),
    health: hp,
  }
}

describe('Q08 performMagic 敌方施法不触发 E1 inline 伤害（!casterIsEnemy 门）', () => {
  test('敌 cast 时 E1 不结算（施法敌自身与友军 HP 原样、无 enemy 目标数字）', () => {
    const st = battleState()
    st.enemies[0]!.e = enemyWithHealth(100)
    st.enemies.push({
      ...st.enemies[0]!,
      e: enemyWithHealth(80),
    })
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    performMagic({
      state: st,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false, // 敌施法目标队员（E2 路径；E1 被排除门挡下）
      targetIdx: 0,
      spells: [spellDef(7, 0)],
      magics: [magicDef(0)], // baseDamage=0：同时排除 E2 → 隔离出纯 E1 排除观察
      playerRoles: { roles: [role()] },
      bus,
      commands: [{ op: 'end' }],
      runScript: realRunScript,
      gs,
    })
    expect(st.enemies[0]!.e.health).toBe(100) // 施法敌自身 HP 原样
    expect(st.enemies[1]!.e.health).toBe(80) // 友军敌 HP 原样——E1 全程未运行
    const enemyNums = bus
      .drain()
      .filter((c) => c.cmd.op === 'showDamageNum')
      .filter((c) => (c.cmd as { target?: { kind?: string } }).target?.kind === 'enemy')
    expect(enemyNums).toHaveLength(0) // 无 enemy 目标伤害数字
  })

  test('对照：同输入由队员 cast → E1 运行（敌 HP 扣减 + enemy 目标数字）', () => {
    const st = battleState()
    st.enemies[0]!.e = enemyWithHealth(100)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    performMagic({
      state: st,
      casterIsEnemy: false, // 唯一差异：队员 cast
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spellDef(7, 0)],
      magics: [magicDef(7)], // baseDamage=30
      playerRoles: { roles: [role()] },
      bus,
      commands: [{ op: 'end' }],
      runScript: realRunScript,
      gs,
    })
    expect(st.enemies[0]!.e.health).toBeLessThan(100) // E1 扣减发生
    const enemyNums = bus
      .drain()
      .filter((c) => c.cmd.op === 'showDamageNum')
      .filter((c) => (c.cmd as { target?: { kind?: string } }).target?.kind === 'enemy')
    expect(enemyNums).toHaveLength(1) // 单目标一条 enemy 数字
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
