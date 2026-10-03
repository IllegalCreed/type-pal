/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G08-A。
 * 隐身、变身、空槽、动画帧和染色二次叠绘。不重领死亡淡出、idle 时钟和 Y 排序回调顺序。
 */
import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../core/battle/battle-state.js'
import { createSeedableRng } from '../../core/rng.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/grok-present/images.js'
import { createFramebuffer, type Framebuffer } from '../framebuffer.js'
import { drawBattleSprites, type SpriteAsset } from './draw-battle-sprites.js'

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
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  }
}

function mkBattleEnemy(e: Enemy): BattleEnemy {
  return {
    e: { ...e },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: e.health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function mkState(players: BattlePlayer[], enemies: BattleEnemy[]): BattleState {
  return {
    players,
    enemies,
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
}

function spriteFills(fills: number[], w = 2, h = 2): SpriteAsset {
  return {
    frames: fills.map((fill) => ({
      width: w,
      height: h,
      indices: new Uint8Array(w * h).fill(fill),
      opaque: new Uint8Array(w * h).fill(1),
    })),
  }
}

function draw(
  state: BattleState,
  sprites: Map<string, SpriteAsset>,
  roles: PlayerRoles,
  hidePlayers = false,
  overlays?: Array<{ x: number; sortY: number; draw: (fb: Framebuffer) => void }>,
): Framebuffer {
  const fb = createFramebuffer()
  fillSentinel(fb)
  drawBattleSprites(fb, state, sprites, roles, undefined, 0, hidePlayers, overlays)
  return fb
}

describe('G08-A 战斗精灵像素', () => {
  it('G08-A01 染色精灵被后排盖住后，第二遍仍把重叠点染回低半字节', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 80, y: 41 }
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    enemy.iColorShift = 1
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([0x21])],
      ['enemy-7', spriteFills([0x13])],
    ])
    const fb = draw(mkState([player], [enemy]), sprites, roles)
    // 敌 (79,38)-(80,39) 先画成 0x14；队员 (79,39)-(80,40) 盖住第 39 行；第二遍把 39 行染回。
    expect(pixel(fb, 79, 39)).toBe(0x14)
    expect(pixel(fb, 79, 38)).toBe(0x14)
    expect(pixel(fb, 79, 40)).toBe(0x21)
  })

  it('G08-A02 召唤隐藏队员时敌方像素仍在，队员锚点保持哨兵', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 180 })
    const roles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([8])],
      ['enemy-7', spriteFills([9])],
    ])
    const fb = draw(mkState([player], [enemy]), sprites, roles, true)
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
    expect(role.hp).toBe(180)
  })

  it('G08-A03 隐身计时大于 0 且无染色时不画队员，计时本身不被消耗', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.iColorShift = 0
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const state = mkState([player], [enemy])
    state.iHidingTime = 6
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([8])],
      ['enemy-7', spriteFills([9])],
    ])
    const fb = draw(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
    expect(state.iHidingTime).toBe(6)
  })

  it('G08-A04 隐身期间染色不为 0 仍画出偏移后的低半字节', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.iColorShift = 2
    const state = mkState([player], [])
    state.iHidingTime = 6
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([['player-1', spriteFills([0x13])]])
    const fb = draw(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(0x15)
    expect(pixel(fb, 70, 70)).toBe(SENTINEL)
  })

  it('G08-A05 负的隐身计时是待激活标记，队员照常画出', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const state = mkState([player], [])
    state.iHidingTime = -5
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([['player-1', spriteFills([8])]])
    const fb = draw(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(8)
    expect(state.iHidingTime).toBe(-5)
  })

  it('G08-A06 spriteNumOverride 取 player-覆盖号，不用角色战斗图号', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.spriteNumOverride = 4
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([8])],
      ['player-4', spriteFills([22])],
    ])
    const fb = draw(mkState([player], []), sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(22)
  })

  it('G08-A07 覆盖号 0 不是空值，仍查 player-0', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.spriteNumOverride = 0
    const roles: PlayerRoles = { roles: [minimalRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([8])],
      ['player-0', spriteFills([30])],
    ])
    const fb = draw(mkState([player], []), sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(30)
  })

  it('G08-A08 已击败且淡出未开始的空槽不画，旁边活敌照画', () => {
    const empty = mkBattleEnemy(minimalEnemy(7, 0))
    empty.defeated = true
    empty.pos = { x: 30, y: 30 }
    const live = mkBattleEnemy(minimalEnemy(8))
    live.pos = { x: 50, y: 30 }
    const sprites = new Map<string, SpriteAsset>([
      ['enemy-7', spriteFills([9])],
      ['enemy-8', spriteFills([8])],
    ])
    const fb = draw(mkState([], [empty, live]), sprites, { roles: [] })
    expect(pixel(fb, 29, 28)).toBe(SENTINEL)
    expect(pixel(fb, 49, 28)).toBe(8)
  })

  it('G08-A09 战斗动画进行时用 currentFrame，不用倒下帧 2', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 0
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = mkState([player], [])
    state.battleAnim = { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', spriteFills([8, 9, 10])]])
    const fb = draw(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(8)
  })

  it('G08-A10 动画帧号越界时退回第 0 帧，不退回倒下帧', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 7
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = mkState([player], [])
    state.battleAnim = { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', spriteFills([8, 9, 10])]])
    const fb = draw(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(8)
  })

  it('G08-A11 只有逃跑动画时也读 currentFrame', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 1
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = mkState([player], [])
    state.fleeAnim = { step: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', spriteFills([8, 9, 10])]])
    const fb = draw(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(9)
  })

  it('G08-A12 角色资料缺失时跳过该队员，敌方像素保留', () => {
    const player = mkBattlePlayer(4)
    player.pos = { x: 100, y: 80 }
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', spriteFills([8])],
      ['enemy-7', spriteFills([9])],
    ])
    const fb = draw(mkState([player], [enemy]), sprites, { roles: [minimalRole(0)] })
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
  })

  it('G08-A13 排序更靠前的法术回调盖住未染色敌方像素', () => {
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    const sprites = new Map<string, SpriteAsset>([['enemy-7', spriteFills([11])]])
    const fb = draw(mkState([], [enemy]), sprites, { roles: [] }, false, [
      {
        x: 80,
        sortY: 90,
        draw: (surface) => {
          surface.writePixel(79, 38, 77)
        },
      },
    ])
    expect(pixel(fb, 79, 38)).toBe(77)
  })

  it('G08-A14 排序更靠后的法术回调被敌方盖住，框外那一点留下', () => {
    const enemy = mkBattleEnemy(minimalEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    const sprites = new Map<string, SpriteAsset>([['enemy-7', spriteFills([11])]])
    const fb = draw(mkState([], [enemy]), sprites, { roles: [] }, false, [
      {
        x: 10,
        sortY: 10,
        draw: (surface) => {
          surface.writePixel(79, 38, 77)
          surface.writePixel(12, 12, 77)
        },
      },
    ])
    expect(pixel(fb, 79, 38)).toBe(11)
    expect(pixel(fb, 12, 12)).toBe(77)
  })

  it('G08-A15 绘制不改角色体力，也不改精灵帧里的索引', () => {
    const player = mkBattlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 144 })
    const asset = spriteFills([8])
    const before = asset.frames[0]?.indices[0]
    const state = mkState([player], [])
    state.iHidingTime = 0
    draw(state, new Map([['player-1', asset]]), { roles: [role] })
    expect(role.hp).toBe(144)
    expect(asset.frames[0]?.indices[0]).toBe(before)
    expect(state.iHidingTime).toBe(0)
  })
})
