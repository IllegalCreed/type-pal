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
    uiState: 'mainMenu',
    uiCursor: 0,
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
    ...createInitialGameState({ col: 0, row: 0, facing: 'down' }),
    ...overrides,
  }
}

function fbHasWrites(fb: ReturnType<typeof createFramebuffer>): boolean {
  for (let i = 0; i < fb.indices.length; i++) {
    if (fb.indices[i] !== 0) return true
  }
  return false
}

describe('drawBattleUI', () => {
  it('mainMenu —— 画状态栏 + 主菜单(framebuffer 有写入,不抛错)', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'mainMenu', uiCursor: 1 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('magicMenu(无 learnedSpells)—— 走「无法术」分支不抛', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'magicMenu', uiCursor: 0 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('magicMenu(有 learnedSpells)—— 列法术名,不抛', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0) as PlayerRole & { learnedSpells: number[] }
    role.learnedSpells = [12, 20]
    const playerRoles: PlayerRoles = { roles: [role] }
    const spells = [mkSpell(12, '雷震子'), mkSpell(20, '玄冰指')]
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'magicMenu', uiCursor: 1 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, spells, [], mkGs())).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('itemMenu(空 inventory)—— 走「无物品」分支不抛', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'itemMenu', uiCursor: 0 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('itemMenu(有库存)—— 列 count>0 的物品,count=0 不画', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const items = [mkItem(1, '金创药'), mkItem(2, '雪莲'), mkItem(3, '空瓶')]
    const gs = mkGs({
      inventory: [
        { itemId: 1, count: 3 },
        { itemId: 3, count: 0 }, // 应被过滤
        { itemId: 2, count: 1 },
      ],
    })
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'itemMenu', uiCursor: 0 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], items, gs)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('targetSelect —— 在敌方位置上方画光标,framebuffer 有写入', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))],
      { uiState: 'targetSelect', uiCursor: 1 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('targetSelect —— uiCursor 超界时 clamp 到最后一个敌人,不抛', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'targetSelect', uiCursor: 99 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
  })

  it('targetSelect —— 无敌人时 no-op 不抛', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [],
      { uiState: 'targetSelect', uiCursor: 0 },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
  })

  it('hidden —— 只画状态栏,不画菜单', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'hidden', selectingPlayerIdx: undefined },
    )
    drawBattleUI(fb, state, playerRoles, [], [], mkGs())
    // 状态栏写在底部 y=175 附近;菜单区(顶部 y=5)应无写入
    let topWrites = 0
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] !== 0) topWrites++
      }
    }
    expect(topWrites).toBe(0)
    expect(fbHasWrites(fb)).toBe(true) // 但底部状态栏有写入
  })

  it('mainMenu —— selectingPlayerIdx undefined 时只画状态栏(不抛)', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0)
    const playerRoles: PlayerRoles = { roles: [role] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'mainMenu', selectingPlayerIdx: undefined },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
  })

  it('状态栏 —— role 找不到时跳过该位,不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] } // 空
    const state = mkState(
      [mkBattlePlayer(99)],
      [mkBattleEnemy(minimalEnemy(50))],
      { uiState: 'hidden' },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
  })
})
