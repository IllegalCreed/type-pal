import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import {
  blitFrameDeathFade,
  computeIdleFrameIndex,
  computePlayerBattleIdleFrame,
  confusedShakeDelta,
  DEATH_FADE_TOTAL_STEPS,
  drawBattleSprites,
  enemyTargetHighlightShift,
  type SpriteAsset,
  type SpriteFrame,
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
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // M3.5 fix:1 player 真位置 (240, 170)(sdlpal g_rgPlayerPos[0][0][])。
    // anchor 底中:px = 240 - 1 = 239, py = 170 - 2 = 168
    expect(fb.indices[168 * 320 + 239]).toBe(8)
    expect(fb.indices[169 * 320 + 240]).toBe(8)
    // 敌方位置 (160, 80)(M3 简版,M5 改 ENEMYPOS table),anchor 底中:px = 159, py = 78
    expect(fb.indices[78 * 320 + 159]).toBe(9)
    expect(fb.indices[79 * 320 + 160]).toBe(9)
  })

  it('死亡队员不画;死亡敌方 deathFadeStep undefined(刚死未淡)→ 照常画', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 1, hp: 0 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', mkSpriteAsset(2, 2, 8)],
      ['enemy-50', mkSpriteAsset(2, 2, 9)],
    ])
    const deadEnemy = minimalEnemy(50, 0)
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(deadEnemy)])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // 死亡队员 (159,148) 仍不画 = 0(注:sdlpal 死队员显 frame2 死尸,ts 暂不画 — 另列 follow-up)
    expect(fb.indices[168 * 320 + 239]).toBe(0)
    // 死亡敌方 (159,78):deathFadeStep undefined(刚被打死、淡出未开始)→ **照常画**(非瞬隐)
    expect(fb.indices[78 * 320 + 159]).toBe(9)
  })

  it('sprite Map 缺资源时跳过,不抛错', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 99 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>() // 空
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))])
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
    const roles = [0, 1, 2, 3, 4, 5].map((i) => minimalRole(i, { spriteNumInBattle: 1 }))
    const playerRoles: PlayerRoles = { roles }
    const sprites = new Map<string, SpriteAsset>([['player-1', mkSpriteAsset(2, 2, 5)]])
    const state = mkState(
      [0, 1, 2, 3, 4, 5].map((i) => mkBattlePlayer(i)),
      [],
    )
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)).not.toThrow()
  })
})

/**
 * D17a iColorShift blit — 对照 sdlpal palcommon.c:397-411 PAL_RLEBlitWithColorShift。
 * 每 opaque 像素低 nibble +shift clamp[0,0x0F],高 nibble(0xF0)保留;透明(opaque=0)跳过。
 * 通过 player render-state iColorShift 触发 drawBattleSprites 的染色路径(像素级断言)。
 */
describe('drawBattleSprites — iColorShift 染色 blit(D17a,palcommon.c:397-411)', () => {
  function mkOneFramePlayer(values: number[]): SpriteAsset {
    // 1×N 单行 frame(便于逐像素断言);全 opaque。
    const indices = new Uint8Array(values)
    const opaque = new Uint8Array(values.length).fill(1)
    return { frames: [{ width: values.length, height: 1, indices, opaque }] }
  }

  function drawPlayerWithShift(values: number[], iColorShift: number): Uint8Array {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([['player-1', mkOneFramePlayer(values)]])
    const state = mkState([mkBattlePlayer(0)], [])
    // 注入 render-state pos + currentFrame=0 + iColorShift,触发染色路径
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.players[0]!.currentFrame = 0
    state.players[0]!.iColorShift = iColorShift
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    return fb.indices
  }

  it('low-nibble 0x03 + 6 = 0x09', () => {
    // 1×N frame,anchor 底中:baseY = 170-1 = 169;baseX = 240 - (N>>1)
    const N = 4
    const idx = drawPlayerWithShift([0x03, 0x03, 0x03, 0x03], 6)
    const baseX = 240 - (N >> 1)
    expect(idx[169 * 320 + baseX]).toBe(0x09)
  })

  it('low-nibble 0x0C + 6 = 0x12 → clamp 0x0F(高 nibble 0)', () => {
    const N = 4
    const idx = drawPlayerWithShift([0x0c, 0x0c, 0x0c, 0x0c], 6)
    const baseX = 240 - (N >> 1)
    expect(idx[169 * 320 + baseX]).toBe(0x0f)
  })

  it('high-nibble 0xF0 保留:0xF3 + 6 → 低 nibble clamp 0x0F → 0xFF', () => {
    const N = 4
    const idx = drawPlayerWithShift([0xf3, 0xf3, 0xf3, 0xf3], 6)
    const baseX = 240 - (N >> 1)
    // (0x3+6=0x9) | 0xF0 = 0xF9
    expect(idx[169 * 320 + baseX]).toBe(0xf9)
  })

  it('high-nibble 不变示例:0x53 + 6 → 0x59(高 nibble 5 保留)', () => {
    const N = 4
    const idx = drawPlayerWithShift([0x53, 0x53, 0x53, 0x53], 6)
    const baseX = 240 - (N >> 1)
    expect(idx[169 * 320 + baseX]).toBe(0x59)
  })

  it('opaque 像素 idx 值 0 → 也偏移(0+6=6)(sdlpal direct run 不豁免 0)', () => {
    const N = 4
    const idx = drawPlayerWithShift([0x00, 0x00, 0x00, 0x00], 6)
    const baseX = 240 - (N >> 1)
    expect(idx[169 * 320 + baseX]).toBe(6)
  })

  it('iColorShift=0:退化为原值(等价旧 blit,不染色)', () => {
    const N = 4
    const idx = drawPlayerWithShift([0x35, 0x35, 0x35, 0x35], 0)
    const baseX = 240 - (N >> 1)
    expect(idx[169 * 320 + baseX]).toBe(0x35)
  })

  it('透明像素(opaque=0)无视 shift,背景不变', () => {
    const fb = createFramebuffer()
    fb.writePixel(238, 169, 77) // 背景
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const indices = new Uint8Array([0x03, 0x03])
    const opaque = new Uint8Array([0, 0]) // 全透明
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [{ width: 2, height: 1, indices, opaque }] }],
    ])
    const state = mkState([mkBattlePlayer(0)], [])
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.iColorShift = 6
    state.players[0]!.currentFrame = 0
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[169 * 320 + 238]).toBe(77) // 透明 → 背景保留,未被 shift 写入
  })
})

/**
 * D17a:render-state pos / currentFrame 优先 — drawBattleSprites 用 fighter.pos / currentFrame
 * (动画期间逐帧 mutate),旧 fixture(无 render state)走 anchor + idle 时钟兜底。
 */
describe('drawBattleSprites — render-state pos/currentFrame(D17a)', () => {
  function mkMultiFrameEnemy(fills: number[]): SpriteAsset {
    return {
      frames: fills.map((fill) => {
        const indices = new Uint8Array(4).fill(fill)
        const opaque = new Uint8Array(4).fill(1)
        return { width: 2, height: 2, indices, opaque }
      }),
    }
  }

  it('enemy.pos 覆盖 anchor:画在 render-state pos 而非 EnemyPos 表', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const e = minimalEnemy(50)
    e.idleFrames = 1
    e.idleAnimSpeed = 1
    const be = mkBattleEnemy(e)
    be.pos = { x: 100, y: 100 } // 动画 mutate 后的位置(非默认 160,80)
    be.posOriginal = { x: 160, y: 80 }
    be.currentFrame = 0
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkMultiFrameEnemy([7])]])
    const state = mkState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // anchor 底中 (100,100) → frame[0,0] 落在 (99,98)
    expect(fb.indices[98 * 320 + 99]).toBe(7)
    // 旧 anchor (160,80) 处不应有像素
    expect(fb.indices[78 * 320 + 159]).toBe(0)
  })

  it('enemy.currentFrame 覆盖 idle 时钟:固定取该帧(动画攻击帧)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const e = minimalEnemy(50)
    e.idleFrames = 2
    e.idleAnimSpeed = 1
    const be = mkBattleEnemy(e)
    be.pos = { x: 160, y: 80 }
    be.currentFrame = 1 // 显式攻击帧 — 不走 idle 时钟
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkMultiFrameEnemy([11, 22])]])
    const state = mkState([], [be])
    // frameNum=0:idle 时钟会算 frame0,但 render-state currentFrame=1 优先 → 画 frames[1]=22
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[78 * 320 + 159]).toBe(22)
  })

  it('Y-then-X 排序:Y 大的(屏幕下方)后画盖前', () => {
    const fb = createFramebuffer()
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    // player 在 (160,100)(Y=100),enemy 在 (160,100)(Y=100) 同点同 Y → X 平局比较
    // 这里测 Y 不同:enemy Y=80 先画,player Y=100 后画;若重叠,player 盖 enemy。
    const be = mkBattleEnemy(minimalEnemy(50))
    be.pos = { x: 160, y: 102 } // 与 player 底锚附近重叠
    const sprites = new Map<string, SpriteAsset>([
      [
        'enemy-50',
        {
          frames: [
            {
              width: 2,
              height: 2,
              indices: new Uint8Array(4).fill(9),
              opaque: new Uint8Array(4).fill(1),
            },
          ],
        },
      ],
      [
        'player-1',
        {
          frames: [
            {
              width: 2,
              height: 2,
              indices: new Uint8Array(4).fill(8),
              opaque: new Uint8Array(4).fill(1),
            },
          ],
        },
      ],
    ])
    const bp = mkBattlePlayer(0)
    bp.pos = { x: 160, y: 100 } // Y=100 < enemy Y=102 → player 先画,enemy 后画盖之
    bp.currentFrame = 0
    const state = mkState([bp], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    // enemy 底锚 (160,102) → frame 占 (159,100)-(160,101);player 底锚 (160,100) → (159,98)-(160,99)
    // 重叠区 (159,100)/(160,100):enemy Y 大后画 → 9
    expect(fb.indices[100 * 320 + 159]).toBe(9)
  })
})

/**
 * D17c 敌人 idle 帧轮播闭式索引 — 对照 sdlpal fight.c:991-1019 PAL_BattleUpdateFighters
 * 敌方段(25fps,每 idleAnimSpeed 帧推进 1 格,wCurrentFrame >= idleFrames 环绕回 0)。
 */
describe('computeIdleFrameIndex', () => {
  it('idleFrames=2 speed=5:每 5 帧推进 1 格,frame 0/1 交替(fight.c:1008-1018)', () => {
    // frameNum 0-4 → 0;5-9 → 1;10-14 → 0(环绕);15-19 → 1 …
    for (let f = 0; f <= 4; f++) expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(0)
    for (let f = 5; f <= 9; f++) expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(1)
    for (let f = 10; f <= 14; f++) expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(0)
    for (let f = 15; f <= 19; f++) expect(computeIdleFrameIndex(f, 2, 5, false)).toBe(1)
  })

  it('idleFrames=4 speed=1(蜜蜂 id6):每帧推进,t → t%4', () => {
    for (let t = 0; t < 20; t++) expect(computeIdleFrameIndex(t, 4, 1, false)).toBe(t % 4)
  })

  it('idleFrames=1(烂香菇 speed=99):任意帧恒 0(永远定格 frame 0)', () => {
    for (const f of [0, 1, 50, 99, 1000, 99999])
      expect(computeIdleFrameIndex(f, 1, 99, false)).toBe(0)
  })

  it('isSleepOrParalyzed=true:任意帧恒 0(fight.c:1001-1006 定格)', () => {
    for (const f of [0, 3, 5, 7, 10, 13]) expect(computeIdleFrameIndex(f, 2, 5, true)).toBe(0)
  })

  it('idleAnimSpeed=0(id0 占位):任意帧恒 0 且不抛(防除 0)', () => {
    for (const f of [0, 1, 5, 100])
      expect(() => computeIdleFrameIndex(f, 4, 0, false)).not.toThrow()
    for (const f of [0, 1, 5, 100]) expect(computeIdleFrameIndex(f, 4, 0, false)).toBe(0)
  })

  it('idleFrames=0(退化):恒 0,不产生负 / NaN 索引', () => {
    for (const f of [0, 1, 5, 100]) expect(computeIdleFrameIndex(f, 0, 5, false)).toBe(0)
  })
})

/**
 * D17 死亡淡出 crossfade blit —— 对照 sdlpal PAL_BattleFadeScene(battle.c:608-682)。
 * 像素级:step=0 高 nibble 即换 bg、低 nibble 未移;step 增大 → 低 nibble 收敛到 bg low;
 * step >= |diff| → 完全等于背景。透明像素跳过。
 */
describe('blitFrameDeathFade — 死亡淡出 crossfade(D17,battle.c:650-662)', () => {
  function mkFrame(values: number[], opaqueVals?: number[]): SpriteFrame {
    const indices = new Uint8Array(values)
    const opaque = new Uint8Array(opaqueVals ?? values.map(() => 1))
    return { width: values.length, height: 1, indices, opaque }
  }

  // 注:像素落点 (12,0) → k=12 → residue 0 → jr=rgIndexInv[0]=0(块内第一个处理,step=0 即生效)。
  it('residue 0 像素:step=0 高 nibble 立即换背景,低 nibble 未移(仍 bLow)', () => {
    const fb = createFramebuffer()
    // 背景 a = 0x57;sprite b = 0x32。1×1 frame anchor (12,1) → 落点 (12,0)
    fb.writePixel(12, 0, 0x57)
    blitFrameDeathFade(fb, mkFrame([0x32]), 12, 1, 0)
    expect(fb.indices[0 * 320 + 12]).toBe(0x52) // high=a&0xF0=0x50;low=bLow(2 未移)
  })

  it('residue 0 像素 step 中途:低 nibble 朝 aLow 逼近 floor((step-jr)/6) 格', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x09) // a high0 low9
    // jr=0;b low=2;diff=9-2=7;step=18 → nudges=floor(18/6)=3 → low=2+3=5;high=0 → 0x05
    blitFrameDeathFade(fb, mkFrame([0x02]), 12, 1, 18)
    expect(fb.indices[0 * 320 + 12]).toBe(0x05)
  })

  it('6 帧节奏:同一外层 i 内(jr..jr+5)低 nibble 不动,+6 才推进 1 格(battle.c:634-650)', () => {
    // residue 0(jr=0):diff=9-2=7。step=5 → nudges=0(仅高换 bg);step=6 → nudges=1。
    const fb0 = createFramebuffer(); fb0.writePixel(12, 0, 0x09)
    blitFrameDeathFade(fb0, mkFrame([0x02]), 12, 1, 5)
    expect(fb0.indices[0 * 320 + 12]).toBe(0x02) // low 未移(仍 2),high=0
    const fb1 = createFramebuffer(); fb1.writePixel(12, 0, 0x09)
    blitFrameDeathFade(fb1, mkFrame([0x02]), 12, 1, 6)
    expect(fb1.indices[0 * 320 + 12]).toBe(0x03) // nudges=1 → low=3
  })

  it('rgIndex 抖动错峰:residue!=0 的像素淡出起点 jr 滞后(step<jr 仍显原敌像素)', () => {
    // (10,0):k=10,residue 4 → jr=rgIndexInv[4]=5;(12,0):residue 0 → jr=0。step=2 时:
    //   r0 已换高 nibble,r4 还没轮到(显原敌像素)→ 抖动错峰的核心证据。
    const fb = createFramebuffer()
    fb.writePixel(10, 0, 0x57)
    fb.writePixel(12, 0, 0x57)
    blitFrameDeathFade(fb, mkFrame([0x32]), 10, 1, 2) // r4 jr5:step2<5 → 原像素 0x32
    blitFrameDeathFade(fb, mkFrame([0x32]), 12, 1, 2) // r0 jr0:step2>=0 → 0x52
    expect(fb.indices[0 * 320 + 10]).toBe(0x32) // 还没轮到 → 原敌像素
    expect(fb.indices[0 * 320 + 12]).toBe(0x52) // 已换高 nibble
  })

  it('aLow < bLow:低 nibble 朝下逼近(diff<0)', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x01) // aLow=1
    // jr=0;bLow=9;diff=1-9=-8;step=18 → nudges=3 → low=9-3=6;high=0 → 0x06
    blitFrameDeathFade(fb, mkFrame([0x09]), 12, 1, 18)
    expect(fb.indices[0 * 320 + 12]).toBe(0x06)
  })

  it('step 足够大:低 nibble 完全收敛到 aLow → 像素 == 背景', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x5a) // a high5 low10(0xA)
    // jr=0;bLow=2;|diff|=8;step=66 → nudges=min(floor(66/6),8)=min(11,8)=8 → low=0xA;high=0x50 → 0x5A
    blitFrameDeathFade(fb, mkFrame([0x32]), 12, 1, 66)
    expect(fb.indices[0 * 320 + 12]).toBe(0x5a)
  })

  it('透明像素(opaque=0)跳过:背景不变', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x77)
    blitFrameDeathFade(fb, mkFrame([0x32], [0]), 12, 1, 5)
    expect(fb.indices[0 * 320 + 12]).toBe(0x77) // 未写入
  })

  it('DEATH_FADE_TOTAL_STEPS = 72(battle.c:634-636 外12×内6)', () => {
    expect(DEATH_FADE_TOTAL_STEPS).toBe(72)
  })
})

/**
 * D17 drawBattleSprites 死亡淡出集成 —— deathFadeStep 0..71 → crossfade blit;
 * undefined(活/刚死未开淡出)→ 照常画(受击帧可见);>=72(淡完)→ 不画。
 */
describe('drawBattleSprites — 敌人死亡淡出集成(D17)', () => {
  function mkSprite(fill: number): SpriteAsset {
    const indices = new Uint8Array(4).fill(fill)
    const opaque = new Uint8Array(4).fill(1)
    return { frames: [{ width: 2, height: 2, indices, opaque }] }
  }

  it('health<=0 + deathFadeStep undefined:照常画(刚被打死、淡出未开始 → 受击帧仍可见,不瞬隐)', () => {
    // 修"先消失再淡出"bug:攻击动画期间敌人 HP 已 0 但淡出未开始,不能提前瞬隐
    //   (对照 sdlpal:wObjectID 仍 !=0 照常画,动画收尾才 FadeScene)。
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const be = mkBattleEnemy(minimalEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    be.currentFrame = 0
    // deathFadeStep 留 undefined → **照常 blit**(非瞬隐)
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkSprite(9)]])
    const state = mkState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[78 * 320 + 159]).toBe(9) // 照常画(非瞬隐 0)
  })

  it('health<=0 + deathFadeStep 已开始:crossfade 画(高 nibble 换背景)', () => {
    const fb = createFramebuffer()
    // 背景:落点 (159,78) 写 0x50(high5 low0)
    fb.writePixel(159, 78, 0x50)
    const playerRoles: PlayerRoles = { roles: [] }
    const be = mkBattleEnemy(minimalEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    // (159,78):k=78*320+159=25119,residue 3 → jr=rgIndexInv[3]=1 → step=1 是该像素首次处理。
    be.deathFadeStep = 1
    be.currentFrame = 0
    // sprite 像素 0x33(high3 low3);step=1>=jr=1,nudges=0 → high=a&F0=0x50,low=bLow=3 → 0x53
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkSprite(0x33)]])
    const state = mkState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[78 * 320 + 159]).toBe(0x53)
  })

  it('health<=0 + deathFadeStep>=72:不画(淡完消失)', () => {
    const fb = createFramebuffer()
    fb.writePixel(159, 78, 0x40)
    const playerRoles: PlayerRoles = { roles: [] }
    const be = mkBattleEnemy(minimalEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    be.deathFadeStep = 72
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkSprite(0x33)]])
    const state = mkState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[78 * 320 + 159]).toBe(0x40) // 背景保留,未画 sprite
  })

  it('health>0 + deathFadeStep undefined:照常普通 blit(不受淡出影响)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const e = minimalEnemy(50, 50)
    e.idleFrames = 1
    e.idleAnimSpeed = 1
    const be = mkBattleEnemy(e)
    be.pos = { x: 160, y: 80 }
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkSprite(9)]])
    const state = mkState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined, 0)
    expect(fb.indices[78 * 320 + 159]).toBe(9) // 普通画
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
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkMultiFrameSprite([11, 22])]])
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
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkMultiFrameSprite([11, 22])]])
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
    const sprites = new Map<string, SpriteAsset>([['enemy-50', mkMultiFrameSprite([33])]])
    const state = mkState([], [mkBattleEnemy(enemyA)])

    const fb = createFramebuffer()
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles, undefined, 1)).not.toThrow()
    expect(fb.indices[78 * 320 + 159]).toBe(33) // fallback frames[0]
  })
})

describe('enemyTargetHighlightShift(敌方目标 ColorShift 高亮,sdlpal uibattle.c:1495-1510)', () => {
  const mk = (uiState: string, uiCursor: number, healths: number[]): BattleState =>
    ({
      uiState,
      uiCursor,
      enemies: healths.map((h) => ({ e: { health: h } })),
    }) as unknown as BattleState

  it('blinkOn=false → 恒 0(blink off 帧不高亮,sprite 正常)', () => {
    expect(enemyTargetHighlightShift(mk('selectTargetEnemy', 0, [100]), 0, false)).toBe(0)
  })
  it('selectTargetEnemy:选中敌人(idx===uiCursor)+ 活 + blinkOn → 7,非选中 → 0', () => {
    const s = mk('selectTargetEnemy', 1, [100, 100])
    expect(enemyTargetHighlightShift(s, 1, true)).toBe(7)
    expect(enemyTargetHighlightShift(s, 0, true)).toBe(0)
  })
  it('selectTargetEnemyAll:每个活敌 blinkOn → 7', () => {
    const s = mk('selectTargetEnemyAll', 0, [100, 100])
    expect(enemyTargetHighlightShift(s, 0, true)).toBe(7)
    expect(enemyTargetHighlightShift(s, 1, true)).toBe(7)
  })
  it('死敌(health<=0)→ 0(不高亮)', () => {
    expect(enemyTargetHighlightShift(mk('selectTargetEnemyAll', 0, [0, 100]), 0, true)).toBe(0)
  })
  it('非 target 选择阶段(selectMove)→ 0', () => {
    expect(enemyTargetHighlightShift(mk('selectMove', 0, [100]), 0, true)).toBe(0)
  })
})

describe('computePlayerBattleIdleFrame(玩家状态空闲帧,sdlpal fight.c:961-984)', () => {
  const P = (s: Partial<{ sleep: number }>, defending = false) =>
    ({ status: { sleep: 0, ...s }, defending }) as { status: { sleep: number }; defending: boolean }
  const R = (hp: number, maxHP = 200) => ({ hp, maxHP })

  it('sleep>0 → 帧1(濒死姿)', () => {
    expect(computePlayerBattleIdleFrame(P({ sleep: 2 }), R(200))).toBe(1)
  })
  it('濒死(hp<min(100,maxHP/5))→ 帧1', () => {
    expect(computePlayerBattleIdleFrame(P({}), R(30, 200))).toBe(1) // 30 < min(100,40)
  })
  it('防御 → 帧3', () => {
    expect(computePlayerBattleIdleFrame(P({}, true), R(200))).toBe(3)
  })
  it('正常(非眠/非濒死/非防御)→ 帧0', () => {
    expect(computePlayerBattleIdleFrame(P({}), R(200))).toBe(0)
  })
  it('混乱无特殊帧 → 帧0(confused 抖动是 pos 特效,非帧;见 confusedShakeDelta)', () => {
    // confused 不在 sleep/dying/defending 判定里 → 走 else 帧0(抖动靠 confusedShakeDelta 位移)
    expect(computePlayerBattleIdleFrame(P({}), R(200))).toBe(0)
  })
})

describe('confusedShakeDelta(混乱 ±1px 抖动,sdlpal battle.c:121/196)', () => {
  it('rand01 → {-1,0,1}(RandomLong(-1,1) 等价)', () => {
    expect(confusedShakeDelta(0)).toBe(-1) // [0,1/3)
    expect(confusedShakeDelta(0.5)).toBe(0) // [1/3,2/3)
    expect(confusedShakeDelta(0.99)).toBe(1) // [2/3,1)
  })
})
