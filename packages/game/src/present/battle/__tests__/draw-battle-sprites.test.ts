import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import {
  computeIdleFrameIndex,
  drawBattleSprites,
  type SpriteAsset,
} from '../draw-battle-sprites.js'

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
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
}

function mkSpriteAsset(w: number, h: number, fill: number): SpriteAsset {
  const indices = new Uint8Array(w * h).fill(fill)
  // M3.5 fix:opaque mask 全 1 = 完全 opaque(对应 RLE 全 direct run)。
  const opaque = new Uint8Array(w * h).fill(1)
  return { frames: [{ width: w, height: h, indices, opaque }] }
}

describe('drawBattleSprites', () => {
  it('画一个队员 + 一个敌方,落在预期位置(底中 anchor)', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', mkSpriteAsset(2, 2, 8)],
      ['enemy-50', mkSpriteAsset(2, 2, 9)],
    ])
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
    )
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // M3.5 fix:1 player 真位置 (240, 170)(sdlpal g_rgPlayerPos[0][0][])。
    // anchor 底中:px = 240 - 1 = 239, py = 170 - 2 = 168
    expect(fb.indices[168 * 320 + 239]).toBe(8)
    expect(fb.indices[169 * 320 + 240]).toBe(8)
    // 敌方位置 (160, 80)(M3 简版,M5 改 ENEMYPOS table),anchor 底中:px = 159, py = 78
    expect(fb.indices[78 * 320 + 159]).toBe(9)
    expect(fb.indices[79 * 320 + 160]).toBe(9)
  })

  it('死亡(hp ≤ 0)队员 + 敌方不画', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 0 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', mkSpriteAsset(2, 2, 8)],
      ['enemy-50', mkSpriteAsset(2, 2, 9)],
    ])
    const deadEnemy = minimalEnemy(50, 0)
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(deadEnemy)],
    )
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // 两个 sprite 都不该画 — 队员 (159,148) / 敌方 (159,78) 仍 = 0
    expect(fb.indices[168 * 320 + 239]).toBe(0)
    expect(fb.indices[78 * 320 + 159]).toBe(0)
  })

  it('sprite Map 缺资源时跳过,不抛错', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 99 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>() // 空
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
    )
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)).not.toThrow()
  })

  it('sprite opaque=0 透明,不覆盖背景(M3.5 fix:透明判定走 opaque,不再 idx===0)', () => {
    const fb = createFramebuffer()
    // M3.5 fix:1 player 真位置 (240, 170),底中 anchor 后 (239, 168) 是 frame[0,0]
    fb.writePixel(239, 168, 77)
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const indices = new Uint8Array(4) // 全 0
    const opaque = new Uint8Array(4) // 全 0 = 全透明(RLE-skip)
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [{ width: 2, height: 2, indices, opaque }] }],
    ])
    const state = mkState([mkBattlePlayer(0)], [])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[168 * 320 + 239]).toBe(77) // 未被透明像素覆盖
  })

  it('超过 5 个队员/敌方:多出来的不画(POSITIONS 数组限制)', () => {
    const fb = createFramebuffer()
    const roles = [0, 1, 2, 3, 4, 5].map((i) =>
      minimalRole(i, { spriteNumInBattle: 1 }),
    )
    const playerRoles: PlayerRoles = { roles }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', mkSpriteAsset(2, 2, 5)],
    ])
    const state = mkState(
      [0, 1, 2, 3, 4, 5].map((i) => mkBattlePlayer(i)),
      [],
    )
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)).not.toThrow()
  })
})

/**
 * D17c 敌人 idle 帧轮播闭式索引 — 对照 sdlpal fight.c:991-1019 PAL_BattleUpdateFighters
 * 敌方段(25fps,每 idleAnimSpeed 帧推进 1 格,wCurrentFrame >= idleFrames 环绕回 0)。
 */
describe('computeIdleFrameIndex', () => {
  it('idleFrames=2 speed=5:每 5 帧推进 1 格,frame 0/1 交替(fight.c:1008-1018)', () => {
    // frameNum 0-4 → 0;5-9 → 1;10-14 → 0(环绕);15-19 → 1 …
    for (let f = 0; f <= 4; f++)
      expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(0)
    for (let f = 5; f <= 9; f++)
      expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(1)
    for (let f = 10; f <= 14; f++)
      expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(0)
    for (let f = 15; f <= 19; f++)
      expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(1)
  })

  it('idleFrames=4 speed=1(蜜蜂 id6):每帧推进,t → t%4', () => {
    for (let t = 0; t < 20; t++)
      expect(computeIdleFrameIndex(t, 4, 1, false)).toBe(t % 4)
  })

  it('idleFrames=1(烂香菇 speed=99):任意帧恒 0(永远定格 frame 0)', () => {
    for (const f of [0, 1, 50, 99, 1000, 99999])
      expect(computeIdleFrameIndex(f, 1, 99, false)).toBe(0)
  })

  it('isSleepOrParalyzed=true:任意帧恒 0(fight.c:1001-1006 定格)', () => {
    for (const f of [0, 3, 5, 7, 10, 13])
      expect(computeIdleFrameIndex(f, 2, 5, true)).toBe(0)
  })

  it('idleAnimSpeed=0(id0 占位):任意帧恒 0 且不抛(防除 0)', () => {
    for (const f of [0, 1, 5, 100])
      expect(() => computeIdleFrameIndex(f, 4, 0, false)).not.toThrow()
    for (const f of [0, 1, 5, 100])
      expect(computeIdleFrameIndex(f, 4, 0, false)).toBe(0)
  })

  it('idleFrames=0(退化):恒 0,不产生负 / NaN 索引', () => {
    for (const f of [0, 1, 5, 100])
      expect(computeIdleFrameIndex(f, 0, 5, false)).toBe(0)
  })
})

/**
 * D17c 集成 — drawBattleSprites 敌方段按 idle 时钟选帧 blit(像素级断言)。
 * sprite.frames=[A,B],speed=1 → currentFrame=0 blit frames[0](值 A),
 * currentFrame=1 blit frames[1](值 B)。
 */
describe('drawBattleSprites — 敌人 idle 帧轮播(D17c)', () => {
  function mkMultiFrameSprite(fills: number[]): SpriteAsset {
    return {
      frames: fills.map((fill) => {
        const indices = new Uint8Array(4).fill(fill)
        const opaque = new Uint8Array(4).fill(1)
        return { width: 2, height: 2, indices, opaque }
      }),
    }
  }

  it('idleFrames=2 speed=1:currentFrame=0 画 frames[0],=1 画 frames[1]', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = minimalEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    const sprites = new Map<string, SpriteAsset>([
      ['enemy-50', mkMultiFrameSprite([11, 22])],
    ])
    const state = mkState([], [mkBattleEnemy(enemyA)])

    // 敌方位置 (160, 80),anchor 底中 → frame[0,0] 落在 (159, 78)
    const fb0 = createFramebuffer()
    drawBattleSprites(fb0, state, sprites, playerRoles, undefined, 0)
    expect(fb0.indices[78 * 320 + 159]).toBe(11) // frames[0]

    const fb1 = createFramebuffer()
    drawBattleSprites(fb1, state, sprites, playerRoles, undefined, 1)
    expect(fb1.indices[78 * 320 + 159]).toBe(22) // frames[1]

    const fb2 = createFramebuffer()
    drawBattleSprites(fb2, state, sprites, playerRoles, undefined, 2)
    expect(fb2.indices[78 * 320 + 159]).toBe(11) // 环绕回 frames[0]
  })

  it('sleep>0:不轮播,任意帧恒画 frames[0]', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = minimalEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    const sprites = new Map<string, SpriteAsset>([
      ['enemy-50', mkMultiFrameSprite([11, 22])],
    ])
    const be = mkBattleEnemy(enemyA)
    be.status.sleep = 3
    const state = mkState([], [be])

    const fb = createFramebuffer()
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 1)
    expect(fb.indices[78 * 320 + 159]).toBe(11) // 定格 frames[0]
  })

  it('越界兜底:frames 仅 1 帧但 idleFrames=2 时不越界(fallback frames[0])', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = minimalEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    // sprite 只 1 帧(资源不全),idx=1 时 frames[1] === undefined → fallback frames[0]
    const sprites = new Map<string, SpriteAsset>([
      ['enemy-50', mkMultiFrameSprite([33])],
    ])
    const state = mkState([], [mkBattleEnemy(enemyA)])

    const fb = createFramebuffer()
    expect(() =>
      drawBattleSprites(fb, state, sprites, playerRoles, undefined, 1),
    ).not.toThrow()
    expect(fb.indices[78 * 320 + 159]).toBe(33) // fallback frames[0]
  })
})
