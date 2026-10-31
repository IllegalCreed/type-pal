import type { Tilemap } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { sceneContext, sceneMap, sceneSprite } from './__tests__/scene-render-fixtures.js'
import * as drawSpriteModule from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'
import { type PresentContext, presentFrame } from './present.js'
import { resetScreenWavePhase } from './screen-wave.js'

describe('Scene sprite ordering', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetScreenWavePhase()
  })
  describe('NPC 屏外剔除(sdlpal scene.c:286-314:屏外对象不画精灵、不产生 cover tile)', () => {
    function rendersNpc(npcX: number, npcY: number): boolean {
      const npcSprite = sceneSprite(3) // 16×24
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      // camera 固定 (0,0):party 放屏幕中央等价位置
      const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
      gs.npcs = [{ id: 1, x: npcX, y: npcY, spriteNum: 1 }]
      const ctx: PresentContext = {
        tilemap: sceneMap(40, 40),
        tileImages: { get: () => undefined },
        partyFrames: [sceneSprite(5)],
        partyWalkFrames: 3,
        npcSprites: new Map([[1, npcSprite]]),
      }
      presentFrame(fb, gs, ctx)
      return spy.mock.calls.some(([, image]) => image === npcSprite)
    }

    it('屏内 NPC 正常绘制(基准)', () => {
      expect(rendersNpc(160, 100)).toBe(true)
    })

    it('右侧屏外(left = sx-w/2 ≥ 320)→ 跳过', () => {
      // camera (0,0),npc.x=336 → left = 336-8 = 328 ≥ 320 → cull(scene.c:293)
      expect(rendersNpc(336, 100)).toBe(false)
    })

    it('左侧完全屏外(left < -width)→ 跳过;部分可见仍绘制', () => {
      // npc.x=-12 → left=-20 < -16 → cull(scene.c:293)
      expect(rendersNpc(-12, 100)).toBe(false)
      // npc.x=0 → left=-8 ≥ -16 → 部分可见,画
      expect(rendersNpc(0, 100)).toBe(true)
    })

    it('下方屏外(vy ≥ 200)→ 跳过;贴底仍绘制', () => {
      // sLayer=0:vy = y+9-24+2 = y-13;y=215 → vy=202 ≥ 200 → cull(scene.c:306-313)
      expect(rendersNpc(160, 215)).toBe(false)
      // y=210 → vy=197 < 200 → 画
      expect(rendersNpc(160, 210)).toBe(true)
    })

    it('上方完全屏外(vy < -height)→ 跳过', () => {
      // y=-40 → vy=-53 < -24 → cull
      expect(rendersNpc(160, -40)).toBe(false)
    })
  })

  describe('P0.b Y-sort + cover-tile', () => {
    it('party.y > npc.y → party 在 NPC 之下方(屏幕),Y-sort 后 NPC 先绘 / party 后绘', () => {
      const partySprite = sceneSprite(5)
      const npc1Sprite = sceneSprite(3)
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')

      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 100, y: 200, facing: 'down' }) // party y=200(大 = 屏幕下方)
      gs.npcs = [{ id: 1, x: 100, y: 100, spriteNum: 1 }] // npc y=100(小 = 屏幕上方)

      const ctx: PresentContext = {
        tilemap: sceneMap(10, 20),
        tileImages: { get: () => undefined },
        partyFrames: [partySprite],
        partyWalkFrames: 3,
        npcSprites: new Map([[1, npc1Sprite]]),
      }

      presentFrame(fb, gs, ctx)

      // NPC(y=100+9=109)< party(y=200+10=210) → NPC 先,party 后
      const order = spy.mock.calls.map(([, sprite]) =>
        sprite === partySprite ? 'party' : sprite === npc1Sprite ? 'npc-1' : 'unexpected',
      )
      expect(order).toEqual(['npc-1', 'party'])
    })

    it('party.y < npc.y → NPC 在 party 之下方,Y-sort 后 party 先绘 / NPC 后绘', () => {
      const partySprite = sceneSprite(5)
      const npc1Sprite = sceneSprite(3)
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')

      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' }) // party y=50(小)
      // npc y=150(大):C 屏外剔除(scene.c:286-314)下需留在屏内(camera y=-62 → vy=199<200)
      gs.npcs = [{ id: 1, x: 100, y: 150, spriteNum: 1 }]

      const ctx: PresentContext = {
        tilemap: sceneMap(10, 30),
        tileImages: { get: () => undefined },
        partyFrames: [partySprite],
        partyWalkFrames: 3,
        npcSprites: new Map([[1, npc1Sprite]]),
      }

      presentFrame(fb, gs, ctx)

      // party(y=50+10=60)< npc(y=150+9=159) → party 先,npc 后
      const order = spy.mock.calls.map(([, sprite]) =>
        sprite === partySprite ? 'party' : sprite === npc1Sprite ? 'npc-1' : 'unexpected',
      )
      expect(order).toEqual(['party', 'npc-1'])
    })

    it('3 个 NPC 不同 y — Y-sort 正确(y 小先绘,y 大后绘)', () => {
      const sprites = new Map([
        [1, sceneSprite(1)],
        [2, sceneSprite(2)],
        [3, sceneSprite(3)],
      ])
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')

      const fb = createFramebuffer()
      // party 居中(camera 0,0;party sprite 不入 order,不干扰)。npc y 全收屏内(C 屏外剔除)。
      const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
      gs.npcs = [
        { id: 3, x: 0, y: 180, spriteNum: 3 }, // y=180(最大 → 最后画)
        { id: 1, x: 0, y: 60, spriteNum: 1 }, // y=60(最小 → 最先画)
        { id: 2, x: 0, y: 120, spriteNum: 2 }, // y=120(中间)
      ]

      const ctx: PresentContext = {
        tilemap: sceneMap(10, 50),
        tileImages: { get: () => undefined },
        partyFrames: [sceneSprite(99)],
        partyWalkFrames: 3,
        npcSprites: sprites,
      }

      presentFrame(fb, gs, ctx)

      // npc-1(y=60+9=69)< npc-2(y=120+9=129)< npc-3(y=180+9=189)
      const order = spy.mock.calls.flatMap(([, sprite]) =>
        [...sprites].filter(([, image]) => image === sprite).map(([id]) => `npc-${id}`),
      )
      expect(order).toEqual(['npc-1', 'npc-2', 'npc-3'])
    })

    it('vanishTime>0 隐藏 NPC;vanishTime<0 仍绘制但由更新层冻结', () => {
      const partySprite = sceneSprite(5)
      const hiddenNpcSprite = sceneSprite(3)
      const frozenNpcSprite = sceneSprite(4)
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      // party 居中(camera 0,0)→ npc 屏内(C 屏外剔除下 -9999 party 会把 npc 推到屏外)
      const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
      gs.npcs = [
        { id: 1, x: 100, y: 100, spriteNum: 1, sState: 1, sVanishTime: 5 },
        { id: 2, x: 100, y: 120, spriteNum: 2, sState: 1, sVanishTime: -5 },
      ]
      const ctx: PresentContext = {
        tilemap: sceneMap(20, 20),
        tileImages: { get: () => undefined },
        partyFrames: [partySprite],
        partyWalkFrames: 3,
        npcSprites: new Map([
          [1, hiddenNpcSprite],
          [2, frozenNpcSprite],
        ]),
      }

      presentFrame(fb, gs, ctx)

      const drawn = spy.mock.calls.map(([, image]) => image)
      expect(drawn).not.toContain(hiddenNpcSprite)
      expect(drawn).toContain(frozenNpcSprite)
    })

    it('非方向性姿势对象 nSpriteFrames=0 + scriptedFrame=13 → 实际绘制 frame 13', () => {
      const frame0 = sceneSprite(3)
      const frame13 = sceneSprite(13)
      const frames = Array.from({ length: 14 }, () => frame0)
      frames[13] = frame13
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      // party 居中(camera 0,0)→ npc 屏内(同上,C 屏外剔除)
      const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
      gs.npcs = [
        {
          id: 346,
          x: 100,
          y: 100,
          spriteNum: 193,
          sState: 1,
          nSpriteFrames: 0,
          scriptedFrame: 13,
          facing: 'down',
        },
      ]
      const ctx: PresentContext = {
        tilemap: sceneMap(20, 20),
        tileImages: { get: () => undefined },
        partyFrames: [sceneSprite(99)],
        partyWalkFrames: 3,
        npcSprites: new Map([[193, frame0]]),
        npcSpriteFrames: new Map([[193, frames]]),
      }

      presentFrame(fb, gs, ctx)

      const drawn = spy.mock.calls.map(([, image]) => image)
      expect(drawn).toContain(frame13)
      expect(drawn).not.toContain(frame0)
    })

    it('cover-tile blit_y 公式 = dy*16 + dh*8 + 7 - bitmap.height(sdlpal scene.c:358 相消化)', () => {
      // sdlpal PAL_AddSpriteToDraw 入数组 pos.y = dy*16 + dh*8 + 7 + l + iTileHeight*8 - vp.y,
      // iLayer = iTileHeight*8 + l;blit_y = pos.y - bitmap.height - iLayer →
      // iTileHeight*8 + l 项相消,净 blit_y = dy*16 + dh*8 + 7 - bitmap.height - vp.y。
      //
      // 直接核屏幕像素：cover 重画带 y=59..106，全画带 y=92..139；
      // y=60/80 仅可能来自 cover，排除只做全画的假绿。

      // 高 tile:48 px(屋顶/高柱子类),idx=9
      const coverTileImg = {
        width: 4,
        height: 48,
        indices: new Uint8Array(4 * 48).fill(9),
        opaque: new Uint8Array(4 * 48).fill(1),
      }
      const tileImages = {
        get: (idx: number) => (idx === 1 ? coverTileImg : undefined),
      }

      // cell(2, 3).lower:layer-1 tileId=1, height=2 → hi = 0x0202 → DWORD 0x02020000
      const L1_DWORD = 0x02020000
      const cells = Array.from({ length: 10 }, (_, r) =>
        Array.from({ length: 10 }, (__, c) =>
          r === 3 && c === 2 ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
        ),
      )
      const tilemap: Tilemap = { width: 10, height: 10, cells, tileset: 'fake' }

      // sdlpal scene.c:480-491 真值:layer 0 + layer 1 全画 → 再 Y-sort sprites + cover tiles
      // 全画位置:h=0 tile 落在 (dx*32 - 16 + offsetX, dy*16 - 8 + offsetY) = (144, 92)
      // cover tile 重画位置(新公式):(dx*32 - 16 + offsetX, dy*16 + 7 - bitmap.height + offsetY) = (144, 59)
      //
      // 测视觉:cover tile 重画的 (144, 59..106) 范围内 fb 像素应为 idx=9,且独立于
      // 全画位置(144, 92..139)证明 cover tile 落点不同 — fb 在 (144, 65) 该像素应为 9,
      // 但 fb 在 (144, 60) 也应为 9(cover tile 重画起点 y=59)。
      //
      // 全画 alone 不会覆盖 (144, 60..91) 区域,cover-tile 重画后才填上 — 验证新 blit_y 真生效。
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 64, y: 48, facing: 'down' })
      // new camera 语义 = sdlpal viewport(屏幕左上 world 坐标)。
      // 测试本身只关心 cover tile blit_y 公式,camera 任意都可;
      // 为保持下方像素断言不变(旧用 offsetX=96 / offsetY=52),设 camera=(-96, -52)
      // 让新 offsetX=-camera.x=96, offsetY=-camera.y=52,与旧公式等价。
      gs.camera = { x: -96, y: -52 }
      const ctx: PresentContext = {
        tilemap,
        tileImages,
        partyFrames: [sceneSprite(5)],
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }

      presentFrame(fb, gs, ctx)

      // cover tile 重画起点 y=59 → (144, 60) 应为 idx=9。
      // 全画起点 y=92,(144, 60) 不在全画范围内,所以只有 cover tile 重画到这里 → 必为 9。
      expect(fb.indices[60 * 320 + 144]).toBe(9)
      // (144, 80) 也在 cover tile 重画范围 (59..106),全画范围 (92..139) 外 → 必为 9
      expect(fb.indices[80 * 320 + 144]).toBe(9)
      // (144, 58) 是 cover tile 重画 1 px 之上 + 全画 34 px 之上 → 不应为 9
      expect(fb.indices[58 * 320 + 144]).not.toBe(9)
    })

    it('cover-tile:零高度瓦片仍全画，但不在精灵队列中重画', () => {
      // PAL_CalcCoverTiles rejects height=0 even when the geometry is otherwise eligible.
      // cell(5,5) lower layer1 raw id2, height0; viewport(0,-32).
      const tilemap = sceneMap(10, 10)
      tilemap.cells[5]![5]!.lower = 0x00020000
      const cover = {
        width: 4,
        height: 4,
        indices: new Uint8Array(16).fill(7),
        opaque: new Uint8Array(16).fill(1),
      }
      // Opaque base tiles prevent seam repair from spreading the isolated cover color.
      const ground = {
        width: 32,
        height: 16,
        indices: new Uint8Array(512),
        opaque: new Uint8Array(512).fill(1),
      }
      const party = sceneSprite(5)
      party.opaque.fill(0)
      const gs = createInitialGameState({ x: 160, y: 76, facing: 'down' })
      gs.camera = { x: 0, y: -32 }
      const fb = createFramebuffer()
      presentFrame(fb, gs, {
        ...sceneContext(tilemap),
        partyFrames: [party],
        tileImages: { get: (id) => (id === 1 ? cover : id === 0 ? ground : undefined) },
      })
      // Full layer1 blit starts (144,104); an erroneous cover redraw starts (144,115).
      expect(fb.indices[104 * 320 + 144]).toBe(7)
      expect(fb.indices[115 * 320 + 144]).toBe(0)
    })
  })
})
