import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleState } from '../../../core/battle/battle-state.js'
import { pixel, SENTINEL } from '../../__tests__/raster-fixtures.js'
import type { Framebuffer } from '../../framebuffer.js'
import { createFramebuffer } from '../../framebuffer.js'
import type { SpriteAsset } from '../draw-battle-sprites.js'
import { drawBattleSprites } from '../draw-battle-sprites.js'
import { markedFramebuffer, rowFrame, twoByTwoSprites } from './battle-sprite-frames.js'
import {
  battleEnemy,
  battlePlayer,
  spriteEnemy,
  spriteRole,
  spriteState,
} from './battle-sprite-state.js'

describe('battle sprite resources and baseline anchors', () => {
  it('画一个队员 + 一个敌方,落在预期位置(底中 anchor)', () => {
    const fb = createFramebuffer()
    const role = spriteRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['enemy-50', twoByTwoSprites([9])],
    ])
    const state = spriteState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    // M3.5 fix:1 player 真位置 (240, 170)(sdlpal g_rgPlayerPos[0][0][])。
    // anchor 底中:px = 240 - 1 = 239, py = 170 - 2 = 168
    expect(fb.indices[168 * 320 + 239]).toBe(8)
    expect(fb.indices[169 * 320 + 240]).toBe(8)
    // 此例未提供ENEMYPOS，首敌使用fallback(160,80)，底中锚落在(159,78)。
    expect(fb.indices[78 * 320 + 159]).toBe(9)
    expect(fb.indices[79 * 320 + 160]).toBe(9)
  })

  it('死亡队员使用倒下帧2而非站立帧0', () => {
    const fb = createFramebuffer()
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 0 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [8, 18, 28].map((color) => twoByTwoSprites([color]).frames[0]!) }],
      ['enemy-50', twoByTwoSprites([9])],
    ])
    const deadEnemy = spriteEnemy(50, 0)
    const state = spriteState([battlePlayer(0)], [battleEnemy(deadEnemy)])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[168 * 320 + 239]).toBe(28)
    // 死亡敌方 (159,78):deathFadeStep undefined(刚被打死、淡出未开始)→ **照常画**(非瞬隐)
    expect(fb.indices[78 * 320 + 159]).toBe(9)
  })

  it('sprite Map 缺资源时跳过,不抛错', () => {
    const fb = createFramebuffer()
    const role = spriteRole(0, { spriteNumInBattle: 99 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>() // 空
    const state = spriteState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))])
    fb.indices.fill(77)
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })

  it('sprite opaque=0 透明,不覆盖背景(M3.5 fix:透明判定走 opaque,不再 idx===0)', () => {
    const fb = createFramebuffer()
    // M3.5 fix:1 player 真位置 (240, 170),底中 anchor 后 (239, 168) 是 frame[0,0]
    fb.writePixel(239, 168, 77)
    const role = spriteRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const indices = new Uint8Array(4) // 全 0
    const opaque = new Uint8Array(4) // 全 0 = 全透明(RLE-skip)
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [{ width: 2, height: 2, indices, opaque }] }],
    ])
    const state = spriteState([battlePlayer(0)], [])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[168 * 320 + 239]).toBe(77) // 未被透明像素覆盖
  })
})

describe('render-state colour shift', () => {
  function drawPlayerWithShift(values: number[], iColorShift: number): Uint8Array {
    const fb = createFramebuffer()
    const role = spriteRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([['player-1', { frames: [rowFrame(values)] }]])
    const state = spriteState([battlePlayer(0)], [])
    // 注入 render-state pos + currentFrame=0 + iColorShift,触发染色路径
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.players[0]!.currentFrame = 0
    state.players[0]!.iColorShift = iColorShift
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    return fb.indices
  }

  it('low-nibble 0x03 + 6 = 0x09', () => {
    // rowWidth×1 的单行帧，底中锚：baseY=169，baseX=240-(rowWidth>>1)。
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0x03, 0x03, 0x03, 0x03], 6)
    const baseX = 240 - (rowWidth >> 1)
    expect(pixels[169 * 320 + baseX]).toBe(0x09)
  })

  it('low-nibble 0x0C + 6 = 0x12 → clamp 0x0F(高 nibble 0)', () => {
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0x0c, 0x0c, 0x0c, 0x0c], 6)
    const baseX = 240 - (rowWidth >> 1)
    expect(pixels[169 * 320 + baseX]).toBe(0x0f)
  })

  it('high-nibble 0xF0 保留:0xF3 + 6 → 0xF9', () => {
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0xf3, 0xf3, 0xf3, 0xf3], 6)
    const baseX = 240 - (rowWidth >> 1)
    // (0x3+6=0x9) | 0xF0 = 0xF9
    expect(pixels[169 * 320 + baseX]).toBe(0xf9)
  })

  it('high-nibble 不变示例:0x53 + 6 → 0x59(高 nibble 5 保留)', () => {
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0x53, 0x53, 0x53, 0x53], 6)
    const baseX = 240 - (rowWidth >> 1)
    expect(pixels[169 * 320 + baseX]).toBe(0x59)
  })

  it('opaque 像素 idx 值 0 → 也偏移(0+6=6)(sdlpal direct run 不豁免 0)', () => {
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0x00, 0x00, 0x00, 0x00], 6)
    const baseX = 240 - (rowWidth >> 1)
    expect(pixels[169 * 320 + baseX]).toBe(6)
  })

  it('iColorShift=0:退化为原值(等价旧 blit,不染色)', () => {
    const rowWidth = 4
    const pixels = drawPlayerWithShift([0x35, 0x35, 0x35, 0x35], 0)
    const baseX = 240 - (rowWidth >> 1)
    expect(pixels[169 * 320 + baseX]).toBe(0x35)
  })

  it('透明像素(opaque=0)无视 shift,背景不变', () => {
    const fb = createFramebuffer()
    fb.writePixel(239, 169, 77) // frame 的第一个像素，而非精灵左侧屏外点
    const role = spriteRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    const indices = new Uint8Array([0x03, 0x03])
    const opaque = new Uint8Array([0, 1]) // 同一行同时核透明和着色正控
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', { frames: [{ width: 2, height: 1, indices, opaque }] }],
    ])
    const state = spriteState([battlePlayer(0)], [])
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.iColorShift = 6
    state.players[0]!.currentFrame = 0
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[169 * 320 + 239]).toBe(77)
    expect(fb.indices[169 * 320 + 240]).toBe(9)
  })
})

describe('render position, frame precedence and ordering', () => {
  it('enemy.pos 覆盖 anchor:画在 render-state pos 而非 EnemyPos 表', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const e = spriteEnemy(50)
    e.idleFrames = 1
    e.idleAnimSpeed = 1
    const be = battleEnemy(e)
    be.pos = { x: 100, y: 100 } // 动画 mutate 后的位置(非默认 160,80)
    be.posOriginal = { x: 160, y: 80 }
    be.currentFrame = 0
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([7])]])
    const state = spriteState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    // anchor 底中 (100,100) → frame[0,0] 落在 (99,98)
    expect(fb.indices[98 * 320 + 99]).toBe(7)
    // 旧 anchor (160,80) 处不应有像素
    expect(fb.indices[78 * 320 + 159]).toBe(0)
  })

  it('enemy.currentFrame 优先于 per-enemy idleFrame', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const e = spriteEnemy(50)
    e.idleFrames = 2
    e.idleAnimSpeed = 1
    const be = battleEnemy(e)
    be.pos = { x: 160, y: 80 }
    be.currentFrame = 1 // 显式动画帧优先于 idleFrame
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([11, 22])]])
    const state = spriteState([], [be])
    // idleFrame=0 与 currentFrame=1 冲突时，使用动画帧。
    be.idleFrame = 0
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[78 * 320 + 159]).toBe(22)
  })

  it('Y-then-X 排序:Y 大的(屏幕下方)后画盖前', () => {
    const fb = createFramebuffer()
    const role = spriteRole(0, { spriteNumInBattle: 1 })
    const playerRoles: PlayerRoles = { roles: [role] }
    // 两个2×2精灵在 y=99 重叠；上/下独占行同时验证两个精灵确实绘制。
    const be = battleEnemy(spriteEnemy(50))
    be.pos = { x: 160, y: 101 }
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
    const bp = battlePlayer(0)
    bp.pos = { x: 160, y: 100 }
    bp.currentFrame = 0
    const state = spriteState([bp], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(Array.from(fb.indices.slice(98 * 320 + 159, 98 * 320 + 161))).toEqual([8, 8])
    expect(Array.from(fb.indices.slice(99 * 320 + 159, 99 * 320 + 161))).toEqual([9, 9])
    expect(Array.from(fb.indices.slice(100 * 320 + 159, 100 * 320 + 161))).toEqual([9, 9])
  })
})

describe('enemy death-fade lifecycle', () => {
  it('health<=0 + deathFadeStep undefined:照常画(刚被打死、淡出未开始 → 受击帧仍可见,不瞬隐)', () => {
    // 修"先消失再淡出"bug:攻击动画期间敌人 HP 已 0 但淡出未开始,不能提前瞬隐
    //   (对照 sdlpal:wObjectID 仍 !=0 照常画,动画收尾才 FadeScene)。
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const be = battleEnemy(spriteEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    be.currentFrame = 0
    // deathFadeStep 留 undefined → **照常 blit**(非瞬隐)
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([9])]])
    const state = spriteState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[78 * 320 + 159]).toBe(9) // 照常画(非瞬隐 0)
  })

  it('health<=0 + deathFadeStep 已开始:crossfade 画(高 nibble 换背景)', () => {
    const fb = createFramebuffer()
    // 背景:落点 (159,78) 写 0x50(high5 low0)
    fb.writePixel(159, 78, 0x50)
    const playerRoles: PlayerRoles = { roles: [] }
    const be = battleEnemy(spriteEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    // (159,78):k=78*320+159=25119,residue 3 → jr=rgIndexInv[3]=1 → step=1 是该像素首次处理。
    be.deathFadeStep = 1
    be.currentFrame = 0
    // sprite 像素 0x33(high3 low3);step=1>=jr=1,nudges=0 → high=a&F0=0x50,low=bLow=3 → 0x53
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([0x33])]])
    const state = spriteState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[78 * 320 + 159]).toBe(0x53)
  })

  it('health<=0 + deathFadeStep>=72:不画(淡完消失)', () => {
    const fb = createFramebuffer()
    fb.writePixel(159, 78, 0x40)
    const playerRoles: PlayerRoles = { roles: [] }
    const be = battleEnemy(spriteEnemy(50, 0))
    be.pos = { x: 160, y: 80 }
    be.deathFadeStep = 72
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([0x33])]])
    const state = spriteState([], [be])
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[78 * 320 + 159]).toBe(0x40) // 背景保留,未画 sprite
  })
})

describe('enemy idle-frame consumption', () => {
  it('DM11:idle 帧读 per-enemy idleFrame(battle-system 推进,渲染不再走全局时钟)', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = spriteEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([11, 22])]])
    const state = spriteState([], [battleEnemy(enemyA)])

    // 敌方位置 (160, 80),anchor 底中 → frame[0,0] 落在 (159, 78)
    const fb0 = createFramebuffer()
    state.enemies[0]!.idleFrame = 0
    drawBattleSprites(fb0, state, sprites, playerRoles, undefined)
    expect(fb0.indices[78 * 320 + 159]).toBe(11) // frames[0]

    const fb1 = createFramebuffer()
    state.enemies[0]!.idleFrame = 1
    drawBattleSprites(fb1, state, sprites, playerRoles, undefined)
    expect(fb1.indices[78 * 320 + 159]).toBe(22) // frames[1]
  })

  it('sleep>0:不轮播,任意帧恒画 frames[0]', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = spriteEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([11, 22])]])
    const be = battleEnemy(enemyA)
    be.status.sleep = 3
    be.idleFrame = 1
    const state = spriteState([], [be])

    const fb = createFramebuffer()
    drawBattleSprites(fb, state, sprites, playerRoles, undefined)
    expect(fb.indices[78 * 320 + 159]).toBe(11) // 定格 frames[0]
  })

  it('越界兜底:frames 仅 1 帧但 idleFrames=2 时不越界(fallback frames[0])', () => {
    const playerRoles: PlayerRoles = { roles: [] }
    const enemyA = spriteEnemy(50)
    enemyA.idleFrames = 2
    enemyA.idleAnimSpeed = 1
    // sprite 只 1 帧(资源不全),idx=1 时 frames[1] === undefined → fallback frames[0]
    const sprites = new Map<string, SpriteAsset>([['enemy-50', twoByTwoSprites([33])]])
    const state = spriteState([], [battleEnemy(enemyA)])
    state.enemies[0]!.idleFrame = 1

    const fb = createFramebuffer()
    expect(() => drawBattleSprites(fb, state, sprites, playerRoles, undefined)).not.toThrow()
    expect(fb.indices[78 * 320 + 159]).toBe(33) // fallback frames[0]
  })
})

function renderSpriteState(
  state: BattleState,
  sprites: Map<string, SpriteAsset>,
  roles: PlayerRoles,
  hidePlayers = false,
  overlays?: Array<{ x: number; sortY: number; draw: (fb: Framebuffer) => void }>,
): Framebuffer {
  const fb = markedFramebuffer()
  drawBattleSprites(fb, state, sprites, roles, undefined, hidePlayers, overlays)
  return fb
}

function spritePixelSnapshot(asset: SpriteAsset) {
  return asset.frames.map((frame) => ({
    width: frame.width,
    height: frame.height,
    indices: Array.from(frame.indices),
    opaque: Array.from(frame.opaque),
  }))
}

describe('battle visibility, animation and overlay ordering', () => {
  it('染色精灵被前排队员盖住后，第二遍恢复重叠点的染色', () => {
    const player = battlePlayer(0)
    player.pos = { x: 80, y: 41 }
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    enemy.iColorShift = 1
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([0x21])],
      ['enemy-7', twoByTwoSprites([0x13])],
    ])
    const fb = renderSpriteState(spriteState([player], [enemy]), sprites, roles)
    // 敌 (79,38)-(80,39) 先画成 0x14；队员 (79,39)-(80,40) 盖住第 39 行；第二遍把 39 行染回。
    expect(pixel(fb, 79, 39)).toBe(0x14)
    expect(pixel(fb, 79, 38)).toBe(0x14)
    expect(pixel(fb, 79, 40)).toBe(0x21)
  })

  it('召唤隐藏队员时敌方像素仍在，队员锚点保持哨兵', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 180 })
    const roles: PlayerRoles = { roles: [role] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['enemy-7', twoByTwoSprites([9])],
    ])
    const fb = renderSpriteState(spriteState([player], [enemy]), sprites, roles, true)
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
    expect(role.hp).toBe(180)
  })

  it('隐身计时大于 0 且无染色时不画队员，计时本身不被消耗', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.iColorShift = 0
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const state = spriteState([player], [enemy])
    state.iHidingTime = 6
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['enemy-7', twoByTwoSprites([9])],
    ])
    const fb = renderSpriteState(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
    expect(state.iHidingTime).toBe(6)
  })

  it('隐身期间染色不为 0 仍画出偏移后的低半字节', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.iColorShift = 2
    const state = spriteState([player], [])
    state.iHidingTime = 6
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([['player-1', twoByTwoSprites([0x13])]])
    const fb = renderSpriteState(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(0x15)
    expect(pixel(fb, 70, 70)).toBe(SENTINEL)
  })

  it('负的隐身计时是待激活标记，队员照常画出', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const state = spriteState([player], [])
    state.iHidingTime = -5
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([['player-1', twoByTwoSprites([8])]])
    const fb = renderSpriteState(state, sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(8)
    expect(state.iHidingTime).toBe(-5)
  })

  it('spriteNumOverride 取 player-覆盖号，不用角色战斗图号', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.spriteNumOverride = 4
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['player-4', twoByTwoSprites([22])],
    ])
    const fb = renderSpriteState(spriteState([player], []), sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(22)
  })

  it('覆盖号 0 不是空值，仍查 player-0', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.spriteNumOverride = 0
    const roles: PlayerRoles = { roles: [spriteRole(0, { spriteNumInBattle: 1 })] }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['player-0', twoByTwoSprites([30])],
    ])
    const fb = renderSpriteState(spriteState([player], []), sprites, roles)
    expect(pixel(fb, 99, 78)).toBe(30)
  })

  it('已击败且淡出未开始的空槽不画，旁边活敌照画', () => {
    const empty = battleEnemy(spriteEnemy(7, 0))
    empty.defeated = true
    empty.pos = { x: 30, y: 30 }
    const live = battleEnemy(spriteEnemy(8))
    live.pos = { x: 50, y: 30 }
    const sprites = new Map<string, SpriteAsset>([
      ['enemy-7', twoByTwoSprites([9])],
      ['enemy-8', twoByTwoSprites([8])],
    ])
    const fb = renderSpriteState(spriteState([], [empty, live]), sprites, { roles: [] })
    expect(pixel(fb, 29, 28)).toBe(SENTINEL)
    expect(pixel(fb, 49, 28)).toBe(8)
  })

  it('战斗动画进行时用 currentFrame，不用倒下帧 2', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 0
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = spriteState([player], [])
    state.battleAnim = { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', twoByTwoSprites([8, 9, 10])]])
    const fb = renderSpriteState(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(8)
  })

  it('动画帧号越界时退回第 0 帧，不退回倒下帧', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 7
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = spriteState([player], [])
    state.battleAnim = { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', twoByTwoSprites([8, 9, 10])]])
    const fb = renderSpriteState(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(8)
  })

  it('只有逃跑动画时也读 currentFrame', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    player.currentFrame = 1
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 0 })
    const state = spriteState([player], [])
    state.fleeAnim = { step: 0 }
    const sprites = new Map<string, SpriteAsset>([['player-1', twoByTwoSprites([8, 9, 10])]])
    const fb = renderSpriteState(state, sprites, { roles: [role] })
    expect(pixel(fb, 99, 78)).toBe(9)
  })

  it('角色资料缺失时跳过该队员，敌方像素保留', () => {
    const player = battlePlayer(4)
    player.pos = { x: 100, y: 80 }
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 40, y: 40 }
    const sprites = new Map<string, SpriteAsset>([
      ['player-1', twoByTwoSprites([8])],
      ['enemy-7', twoByTwoSprites([9])],
    ])
    const fb = renderSpriteState(spriteState([player], [enemy]), sprites, {
      roles: [spriteRole(0)],
    })
    expect(pixel(fb, 99, 78)).toBe(SENTINEL)
    expect(pixel(fb, 39, 38)).toBe(9)
  })

  it('sortY=90 的法术在 y=40 敌人之后绘制并覆盖', () => {
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    const sprites = new Map<string, SpriteAsset>([['enemy-7', twoByTwoSprites([11])]])
    const fb = renderSpriteState(spriteState([], [enemy]), sprites, { roles: [] }, false, [
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

  it('sortY=10 的法术先于 y=40 敌人绘制，框外像素保留', () => {
    const enemy = battleEnemy(spriteEnemy(7))
    enemy.pos = { x: 80, y: 40 }
    const sprites = new Map<string, SpriteAsset>([['enemy-7', twoByTwoSprites([11])]])
    const fb = renderSpriteState(spriteState([], [enemy]), sprites, { roles: [] }, false, [
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

  it('绘制保留角色体力、全部帧字节和隐身计数', () => {
    const player = battlePlayer(0)
    player.pos = { x: 100, y: 80 }
    const role = spriteRole(0, { spriteNumInBattle: 1, hp: 144 })
    const asset = twoByTwoSprites([8])
    const before = spritePixelSnapshot(asset)
    const state = spriteState([player], [])
    state.iHidingTime = 0
    renderSpriteState(state, new Map([['player-1', asset]]), { roles: [role] })
    expect(role.hp).toBe(144)
    expect(spritePixelSnapshot(asset)).toEqual(before)
    expect(state.iHidingTime).toBe(0)
  })
})
