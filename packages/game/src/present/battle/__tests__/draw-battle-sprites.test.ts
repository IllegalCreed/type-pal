import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import {
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
    drawBattleSprites(fb, state, sprites, playerRoles)
    // 队员位置 (160, 150),anchor 底中:px = 160 - 1 = 159, py = 150 - 2 = 148
    expect(fb.indices[148 * 320 + 159]).toBe(8)
    expect(fb.indices[149 * 320 + 160]).toBe(8)
    // 敌方位置 (160, 80),anchor 底中:px = 159, py = 78
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
    drawBattleSprites(fb, state, sprites, playerRoles)
    // 两个 sprite 都不该画 — 队员 (159,148) / 敌方 (159,78) 仍 = 0
    expect(fb.indices[148 * 320 + 159]).toBe(0)
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
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles)).not.toThrow()
  })

  it('sprite opaque=0 透明,不覆盖背景(M3.5 fix:透明判定走 opaque,不再 idx===0)', () => {
    const fb = createFramebuffer()
    // 队员 anchor 中心 (160, 150),底中 anchor 后 (159, 148) 是 frame[0,0]
    fb.writePixel(159, 148, 77)
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const indices = new Uint8Array(4) // 全 0
    const opaque = new Uint8Array(4) // 全 0 = 全透明(RLE-skip)
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [{ width: 2, height: 2, indices, opaque }] }],
    ])
    const state = mkState([mkBattlePlayer(0)], [])
    drawBattleSprites(fb, state, sprites, playerRoles)
    expect(fb.indices[148 * 320 + 159]).toBe(77) // 未被透明像素覆盖
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
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles)).not.toThrow()
  })
})
