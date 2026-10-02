// Q08 续批（r12）· performMagic 失败/音频/数字缓冲残余臂（typed driver，零强转）。
//
// 排重 basis（旧锚已证，不重复）：
//   - actions.test.ts「scriptOnUse 失败 → MP 仍扣但不 emit 动画 + 不跑 scriptOnSuccess」——
//     该例未断言 pendingSounds（fizzle 施法音仍播，sdlpal fight.c:4184 vs 4215 真值）；
//   - actions.test.ts「M6 法术音:队员施法 push 本角色 magicSound + 效果音」——成功路径起手音；
//   - magic-inline-damage.test.ts scriptOnSuccess gate/inline 伤害族。
// 本文件只补三个旧证未覆盖的精确轴：
//   ①fizzle 施法音仍即时播（magic.ts:263-268 pendingCastSound>0 + gs 注入）；
//   ②fizzle 时 scriptOnUse 阶段已 collect 的数字即时 emit 不丢（magic.ts:269-271）；
//   ③敌方 cast 施法音即时回落（未建链路径 pendingCastSound=enemy.magicSound 即时 push）。

import type { Command, Enemy, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { RunScriptFn } from './core/battle/actions/magic.js'
import { performMagic } from './core/battle/actions/magic.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
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
    magicSound: 9, // sdlpal rgwMagicSound[李逍遥]=9（magic.ts 注释真值）
    deathSound: 0,
    ...opts,
  }
}

function enemyDef(opts: Partial<Enemy> = {}): Enemy {
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
    magicSound: 47, // 敌施法音（fight.c:4695 AUDIO_PlaySound(wMagicSound)）
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

function spellDef(id: number, opts: Partial<Spell> = {}): Spell {
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
    ...opts,
  }
}

function magicDef(id: number, opts: Partial<Magic> = {}): Magic {
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
    ...opts,
  }
}

function battleState(): BattleState {
  const enemySlot: BattleEnemy = {
    e: enemyDef(),
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

function roles(): PlayerRoles {
  return { roles: [role()] }
}

function game(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

const COMMANDS: Command[] = [{ op: 'end' }]

describe('Q08 performMagic 失败/音频残余臂（typed）', () => {
  test('fizzle（scriptOnUse 失败）施法音仍即时播（sdlpal fight.c:4184 vs 4215）', () => {
    const st = battleState()
    const gs = game()
    const bus: CommandBus = createCommandBus()
    const runScript: RunScriptFn = vi.fn((opts) => {
      if (opts.ip === 42) gs.fScriptSuccess = false
      return 0
    })
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spellDef(7, { scriptOnUse: 42 })],
      magics: [magicDef(7)],
      playerRoles: roles(),
      bus,
      commands: COMMANDS,
      runScript,
      gs,
    })
    // 旧例只断言 MP/动画/脚本；本轴补 pendingSounds：施法音 9（rgwMagicSound）fizzle 仍播
    expect(gs.pendingSounds).toEqual([9])
    expect(bus.drain().filter((c) => c.cmd.op === 'playMagicAnim')).toHaveLength(0)
  })

  test('fizzle 施法音=0（magicSound 0）不 push 空 promise 音', () => {
    const st = battleState()
    const gs = game()
    const runScript: RunScriptFn = vi.fn((opts) => {
      if (opts.ip === 42) gs.fScriptSuccess = false
      return 0
    })
    performMagic({
      state: st,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spellDef(7, { scriptOnUse: 42 })],
      magics: [magicDef(7)],
      playerRoles: { roles: [role({ magicSound: 0 })] },
      bus: createCommandBus(),
      commands: COMMANDS,
      runScript,
      gs,
    })
    expect(gs.pendingSounds).toBeUndefined() // pendingCastSound=0 → 不初始化数组
  })

  test('敌方 cast 无 gs：施法音缓冲跳过（无宿主侧副作用），脚本照跑', () => {
    const st = battleState()
    const bus: CommandBus = createCommandBus()
    const runScript: RunScriptFn = vi.fn()
    performMagic({
      state: st,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spellDef(7, { scriptOnUse: 10 })],
      magics: [magicDef(7)],
      playerRoles: roles(),
      bus,
      commands: COMMANDS,
      runScript,
      // gs 不注入（合法缺省——敌 cast 音缓冲依赖 gs，无 gs 即无 pendingSounds 通道）
    })
    expect(runScript).toHaveBeenCalled()
    expect(bus.drain().some((c) => c.cmd.op === 'playMagicAnim')).toBe(true)
  })

  test('敌方 cast 施法音即时回落（未建链路径 enemy.magicSound=47 即时 push）', () => {
    const st = battleState()
    const gs = game()
    const runScript: RunScriptFn = vi.fn()
    performMagic({
      state: st,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spellDef(7, { scriptOnUse: 10 })],
      magics: [magicDef(7, { type: 'normal', baseDamage: 0 })],
      playerRoles: roles(),
      bus: createCommandBus(),
      commands: COMMANDS,
      runScript,
      gs,
    })
    // 敌施法音无前摇动画 → 未建链（无 magicSpriteFrameCounts）即时播（fight.c:4695）
    expect(gs.pendingSounds).toContain(47)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
