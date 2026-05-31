import type { Enemy, Item, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'

function minimalRole(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: id,
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

function minimalEnemy(id: number, health = 50): Enemy {
  return {
    id,
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
    health,
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
  }
}

function mkBattlePlayer(roleId: number): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
  }
}

function mkBattleEnemy(e: Enemy): BattleEnemy {
  return {
    e: { ...e },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: e.health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function mkState(
  players: BattlePlayer[],
  enemies: BattleEnemy[],
  overrides: Partial<BattleState> = {},
): BattleState {
  return {
    players,
    enemies,
    field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    selectingPlayerIdx: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...overrides,
  }
}

function mkSpell(id: number, name?: string): Spell {
  return {
    id,
    _name: name,
    magicNumber: 0,
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

function mkItem(id: number, name?: string): Item {
  return {
    id,
    _name: name,
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
  }
}

function mkGs(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    ...overrides,
  }
}

function fbHasWrites(fb: ReturnType<typeof createFramebuffer>): boolean {
  for (let i = 0; i < fb.indices.length; i++) {
    if (fb.indices[i] !== 0) return true
  }
  return false
}

/** 假 SPRITEUI 帧集(80 帧,每帧 4×4 全不透明)—— 让 drawBox / 图标 / cursor / 箭头 sprite 路径可跑。 */
function fakeUiFrames(): Array<{ width: number; height: number; indices: Uint8Array; opaque: Uint8Array }> {
  return Array.from({ length: 80 }, () => ({
    width: 4,
    height: 4,
    indices: new Uint8Array(16).fill(15),
    opaque: new Uint8Array(16).fill(1),
  }))
}

/** 顶部菜单区(y<50)是否有写入 —— 判断动作菜单是否被画。 */
function topRegionWrites(fb: ReturnType<typeof createFramebuffer>): number {
  let n = 0
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x < 320; x++) {
      if (fb.indices[y * 320 + x] !== 0) n++
    }
  }
  return n
}

const UI = fakeUiFrames() as unknown as Parameters<typeof drawBattleUI>[7]

describe('drawBattleUI(新模型 1:1)', () => {
  it('selectMove + main —— 画状态栏 + 4 图标(framebuffer 有写入,不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main', selectedAction: 0,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('无 uiSpriteFrames —— 优雅跳过 sprite(只画底部状态栏,不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main',
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    // 4 图标在底部(y 140-180),顶部 y<50 无写入
    expect(topRegionWrites(fb)).toBe(0)
    expect(fbHasWrites(fb)).toBe(true) // 底部状态栏
  })

  it('selectMove + magicSelect —— 画法术网格(不抛,顶部有写入)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'magicSelect',
      magicSelect: { items: [{ id: 296, label: '雷震子', rightText: 'MP 5', disabled: false }, { id: 297, label: '玄冰指', rightText: 'MP 8', disabled: true }], cursor: 0, pageSize: 15, pageOffset: 0 },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [mkSpell(296), mkSpell(297)], [], mkGs(), undefined, UI)).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + magicSelect(长列表 cursor=50)—— 分页不越界不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const items = Array.from({ length: 100 }, (_, i) => ({ id: 296 + i, label: `法术${i}`, rightText: 'MP 5', disabled: false }))
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'magicSelect',
      magicSelect: { items, cursor: 50, pageSize: 15, pageOffset: 0 },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectMove + useItemSelect —— 画物品网格(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'useItemSelect',
      itemSelect: { items: [{ id: 1, label: '金创药', rightText: '×3', disabled: false }], cursor: 0, pageSize: 21, pageOffset: 0 },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [mkItem(1)], mkGs(), undefined, UI)).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + misc —— 画杂项盒(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'misc', miscMenuCursor: 2,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + miscItemSubMenu —— 画杂项盒 + 物品二级(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'miscItemSubMenu', miscSubMenuCursor: 1,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetEnemy —— 选中敌人上方画箭头(不抛,有写入)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))], {
      uiState: 'selectTargetEnemy', uiCursor: 1, pendingActionDraft: { type: 'attack', targetSide: 'enemy' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('selectTargetPlayer —— 队员上方画箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0), minimalRole(1)] }
    const state = mkState([mkBattlePlayer(0), mkBattlePlayer(1)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectTargetPlayer', uiCursor: 1, pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'player' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('selectTargetEnemyAll —— 全体敌人画箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))], {
      uiState: 'selectTargetEnemyAll', pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'enemy' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetPlayerAll —— 全体队员画箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0), minimalRole(1)] }
    const state = mkState([mkBattlePlayer(0), mkBattlePlayer(1)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectTargetPlayerAll', pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'player' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetEnemy —— 无敌人时 no-op 不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [], {
      uiState: 'selectTargetEnemy', uiCursor: 0, pendingActionDraft: { type: 'attack', targetSide: 'enemy' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  // ---------- C7:战斗对话显示时隐藏动作菜单(user 2026-05-31 实测 bug)----------

  it('对话队列非空 —— 隐藏动作菜单(顶部无写入),只画底部状态栏', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main', battleDialogQueue: [{ text: '林月如', style: 'bottom' }],
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(topRegionWrites(fb)).toBe(0)
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('gs.dialogBox 非空 —— 隐藏动作菜单(顶部无写入)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main',
    })
    const gs = mkGs({ dialogBox: { phase: 'typing' } as unknown as GameState['dialogBox'] })
    drawBattleUI(fb, state, playerRoles, [], [], gs, undefined, UI)
    expect(topRegionWrites(fb)).toBe(0)
  })

  it('hidden(perform 阶段)—— 啥都不画(信息框仅选择阶段;sdlpal Phase!=PerformAction)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'hidden', selectingPlayerIdx: undefined,
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false) // perform 期信息框隐藏,飘字由其它 draw 层负责
  })

  it('selectMove —— 画底部队员信息框(PAL_PlayerInfoBox:框+头像+HP/MP,y≈165)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0, { hp: 123, maxHP: 200, mp: 45, maxMP: 60 })] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main',
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    // 信息框在底部(y≈165)有写入
    let bottomWrites = 0
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 200; x++) if (fb.indices[y * 320 + x] !== 0) bottomWrites++
    }
    expect(bottomWrites).toBeGreaterThan(0)
  })

  it('fAutoAttack —— 信息框隐藏(sdlpal !fAutoAttack)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove', menuState: 'main', fAutoAttack: true,
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    let bottomWrites = 0
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 200; x++) if (fb.indices[y * 320 + x] !== 0) bottomWrites++
    }
    expect(bottomWrites).toBe(0) // auto 模式不画信息框
  })

  it('状态栏 —— role 找不到时跳过该位,不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const state = mkState([mkBattlePlayer(99)], [mkBattleEnemy(minimalEnemy(50))], { uiState: 'hidden' })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })
})