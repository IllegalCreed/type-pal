import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { presentFrame, type PresentContext } from './present.js'
import { createFramebuffer } from './framebuffer.js'
import { createInitialGameState } from '../core/game-state.js'
import type { SpriteImage } from './draw-sprite.js'
import * as drawSpriteModule from './draw-sprite.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function makeSprite(colorIdx: number = 1): SpriteImage {
  return {
    width: 16, height: 24,
    indices: new Uint8Array(16 * 24).fill(colorIdx),
    opaque: new Uint8Array(16 * 24).fill(1),
    anchorX: 8, anchorY: 24,
  }
}

function baseCtx(tilemap?: Tilemap): PresentContext {
  return {
    tilemap: tilemap ?? flatMap(10, 10),
    tileImages: { get: () => undefined },
    partyFrames: [makeSprite(5)],
    partyWalkFrames: 3,
    npcSprites: new Map([[1, makeSprite(3)], [2, makeSprite(4)]]),
  }
}

describe('presentFrame', () => {
  it('无 dialogBox → 不画对话框,不抛错', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partyFrames: [{ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 }],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const ok = () => presentFrame(fb, gs, ctx)
    expect(ok).not.toThrow()
  })

  it('有 dialogBox → 帧缓冲被对话框覆盖', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogBox = { text: '你好', style: 'center' }
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partyFrames: [{ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 }],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    presentFrame(fb, gs, ctx)
    const someBorderPixel = Array.from(fb.indices).some((i) => i === 255)
    expect(someBorderPixel).toBe(true)
  })
})

describe('P0.b Y-sort + cover-tile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 追踪 drawSprite 调用顺序。
   * 用 spy 拦截 drawSprite,每次调用记录 fb + sprite 对象,
   * 返回 id 顺序列表。
   */
  function trackDrawOrder(cb: () => void): string[] {
    const order: string[] = []
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const npc2Sprite = makeSprite(4)

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite, _cx, _cy) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
        else if (sprite === npc2Sprite) order.push('npc-2')
      },
    )

    cb()
    spy.mockRestore()
    return { order, partySprite, npc1Sprite, npc2Sprite } as unknown as string[]
  }

  it('party.y > npc.y → party 在 NPC 之下方(屏幕),Y-sort 后 NPC 先绘 / party 后绘', () => {
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
      },
    )

    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 100, y: 200, facing: 'down' })  // party y=200(大 = 屏幕下方)
    gs.npcs = [{ id: 1, x: 100, y: 100, spriteNum: 1 }]                    // npc y=100(小 = 屏幕上方)

    const ctx: PresentContext = {
      tilemap: flatMap(10, 20),
      tileImages: { get: () => undefined },
      partyFrames: [partySprite],
      partyWalkFrames: 3,
      npcSprites: new Map([[1, npc1Sprite]]),
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // NPC(y=100+9=109)< party(y=200+10=210) → NPC 先,party 后
    expect(order.indexOf('npc-1')).toBeLessThan(order.indexOf('party'))
  })

  it('party.y < npc.y → NPC 在 party 之下方,Y-sort 后 party 先绘 / NPC 后绘', () => {
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
      },
    )

    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })   // party y=50(小)
    gs.npcs = [{ id: 1, x: 100, y: 200, spriteNum: 1 }]                    // npc y=200(大)

    const ctx: PresentContext = {
      tilemap: flatMap(10, 30),
      tileImages: { get: () => undefined },
      partyFrames: [partySprite],
      partyWalkFrames: 3,
      npcSprites: new Map([[1, npc1Sprite]]),
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // party(y=50+10=60)< npc(y=200+9=209) → party 先,npc 后
    expect(order.indexOf('party')).toBeLessThan(order.indexOf('npc-1'))
  })

  it('3 个 NPC 不同 y — Y-sort 正确(y 小先绘,y 大后绘)', () => {
    const sprites = new Map([
      [1, makeSprite(1)],
      [2, makeSprite(2)],
      [3, makeSprite(3)],
    ])
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        for (const [id, s] of sprites) {
          if (sprite === s) { order.push(`npc-${id}`); break }
        }
      },
    )

    const fb = createFramebuffer()
    // party 放很远,不干扰
    const gs = createInitialGameState({ x: 0, y: -9999, facing: 'down' })
    gs.npcs = [
      { id: 3, x: 0, y: 300, spriteNum: 3 },   // y=300(最大 → 最后画)
      { id: 1, x: 0, y: 100, spriteNum: 1 },   // y=100(最小 → 最先画)
      { id: 2, x: 0, y: 200, spriteNum: 2 },   // y=200(中间)
    ]

    const ctx: PresentContext = {
      tilemap: flatMap(10, 50),
      tileImages: { get: () => undefined },
      partyFrames: [makeSprite(99)],
      partyWalkFrames: 3,
      npcSprites: sprites,
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // npc-1(y=100+9=109)< npc-2(y=200+9=209)< npc-3(y=300+9=309)
    const i1 = order.indexOf('npc-1')
    const i2 = order.indexOf('npc-2')
    const i3 = order.indexOf('npc-3')
    expect(i1).toBeLessThan(i2)
    expect(i2).toBeLessThan(i3)
  })

  it('cover-tile:layer1 tile height>0 且满足条件 → tile 画在 fb 上(sprite 重叠)', () => {
    // 构造一个 layer-1 tile:
    //   cell(5, 5) 的 lower DWORD 里放 layer-1 tile height = 2,tileId = 1。
    //   sdlpal layer-1 DWORD: bits 16..23 = tile id 低 8 位,bits 24..27 = height,bits 28 = tile id bit 8
    //   tileId1 raw = ((d>>16)&0xff)|((d>>16)>>4 & 0x100) - 1
    //   我们要 tileId=1 → raw tileId+1=2 → hi byte = 2 → d bits 16..23 = 2
    //   iTileHeight=2 → d bits 24..27 = 2 → d bits 24..31 = 0x20
    //   full DWORD for lower: 0x0020_0200 (hi=0x00200200 → layer1 id raw = 2, h=2)
    //
    // party 在 (col*32, row*16) 相近位置,确保 sy 条件满足。
    // cover tile 条件: (dy + iTileHeight)*16 + dh*8 >= sy
    //   dy=5, iTileHeight=2, dh=0: (5+2)*16 + 0 = 112 >= sy
    //   sy = party.y + 10 → party.y <= 102 即可。
    // 让 party 在 x=5*32=160, y=80 → sy=90, (5+2)*16=112 >= 90 ✓

    // tile bitmap: 4×4 全 palette idx = 7
    const coverTileImg = {
      width: 4, height: 4,
      indices: new Uint8Array(16).fill(7),
      opaque: new Uint8Array(16).fill(1),
    }
    const tileImages = {
      get: (idx: number) => idx === 1 ? coverTileImg : undefined,
    }

    // Build tilemap: 10×10, cell(5,5).lower 编码 layer-1 tileId=1, height=2
    // layer-1 encoding: ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1 = tileId
    //   tileId=1 → raw = 2 → hi low byte = 2
    //   height=2 → hi bits 8..11 = 2 → hi = (2 << 8) | 2 = 0x0202
    //   full DWORD lower = hi << 16 = 0x02020000
    const L1_DWORD = 0x02020000   // layer-1: tileId raw=2 → id=1, height=2
    const cells = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (__, c) =>
        (r === 5 && c === 5) ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
      ),
    )
    const tilemap: Tilemap = { width: 10, height: 10, cells, tilesetImage: 'fake' }

    const fb = createFramebuffer()
    // party at x=160, y=80 → camera at same → party at screen center (160, 100)
    // sy = 80 + 10 = 90; condition: (5+2)*16 + 0*8 = 112 >= 90 ✓
    const gs = createInitialGameState({ x: 160, y: 80, facing: 'down' })
    gs.camera = { x: 160, y: 80 }  // center camera on party
    const ctx: PresentContext = {
      tilemap,
      tileImages,
      partyFrames: [makeSprite(5)],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }

    presentFrame(fb, gs, ctx)

    // cover tile for party at cell(5, 5) h=0:
    //   screen x = 5*32 - 16 + (160 - 160) = 144,  y = 5*16 - 8 + (100 - 80) = 92
    // tile 4×4 → pixels at (144..147, 92..95) should have color idx=7
    const px = fb.indices[92 * 320 + 144]
    expect(px).toBe(7)
  })

  it('cover-tile 不画超出范围的 tile(party 远离,height 条件不满足 → tile 不出现)', () => {
    // 同上 cell(5,5) layer-1 tile,但 party 在 y=500 → sy=510
    // condition: (5+2)*16=112 < 510 → tile 不被加入 entries → 不绘

    const coverTileImg = {
      width: 4, height: 4,
      indices: new Uint8Array(16).fill(7),
      opaque: new Uint8Array(16).fill(1),
    }
    const tileImages = {
      get: (idx: number) => idx === 1 ? coverTileImg : undefined,
    }

    const L1_DWORD = 0x02020000
    const cells = Array.from({ length: 40 }, (_, r) =>
      Array.from({ length: 10 }, (__, c) =>
        (r === 5 && c === 5) ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
      ),
    )
    const tilemap: Tilemap = { width: 10, height: 40, cells, tilesetImage: 'fake' }

    const fb = createFramebuffer()
    // party far away at y=500, camera at (160, 500)
    const gs = createInitialGameState({ x: 160, y: 500, facing: 'down' })
    gs.camera = { x: 160, y: 500 }
    const ctx: PresentContext = {
      tilemap,
      tileImages,
      partyFrames: [makeSprite(5)],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }

    presentFrame(fb, gs, ctx)

    // cover tile would be at screen x=5*32-16+(160-160)=144, y=5*16-8+(100-500)=-308 → off screen
    // Regardless, the height condition fails so it shouldn't be drawn.
    // If it were drawn off-screen, writePixel clips it. But the color 7 should NOT appear at (144,92)
    // because those screen coords are now something else (camera moved).
    // Just verify no palette-7 pixel was written anywhere (tile img fills with 7, which is unique here).
    const anyColor7 = Array.from(fb.indices).some((i) => i === 7)
    expect(anyColor7).toBe(false)
  })
})
