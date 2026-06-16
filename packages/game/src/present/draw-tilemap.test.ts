import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawTilemap, repairTilemapSeams, type TileImages } from './draw-tilemap.js'

describe('drawTilemap', () => {
  it('lower (h=0) 画在 (-16,-8) 子行;upper (h=1) 画在 col/row baseline', () => {
    // sdlpal map.c:398-414 真实公式 + camera 语义 = sdlpal viewport(屏幕左上 world 坐标):
    //   screen = world - camera
    //   h=0:xPos = 32*x - 16 - camera.x, yPos = -8 + 16*y - camera.y
    //   h=1:xPos = 32*x - camera.x,      yPos =      16*y - camera.y
    // camera=(-160, -112) → cell(0,0) 落屏幕 (160, 112);lower 落 (144, 104)。
    const fb = createFramebuffer()
    const lower = new Uint8Array(4 * 4).fill(1)
    const upper = new Uint8Array(4 * 4).fill(2)
    const lowerOpaque = new Uint8Array(4 * 4).fill(1)
    const upperOpaque = new Uint8Array(4 * 4).fill(1)
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return { width: 4, height: 4, indices: lower, opaque: lowerOpaque }
        if (idx === 2) return { width: 4, height: 4, indices: upper, opaque: upperOpaque }
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 2 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: -160, y: -112 }, 0)
    // lower (h=0) 落 (144, 104) → 该像素值 1
    expect(fb.indices[104 * 320 + 144]).toBe(1)
    // upper (h=1) 落 (160, 112) → 该像素值 2
    expect(fb.indices[112 * 320 + 160]).toBe(2)
  })

  it('±1 fence(M3.5 T6 修):layer 0 fence 位置回落到 tile(cells[0][0].lower 的 h=0)', () => {
    // 给 1×1 map,设 cells[0][0] = { lower: 5, upper: 0 }(tileIdLayer0(5)=5)。
    // fence(r=-1/height, c=-1/width)位置 cell=null,layer 0 应 fallback 到 id 5。
    // 验证手段:tiles.get 被调用时记录 id,fence 触发 id 5 多次调用。
    const fb = createFramebuffer()
    const callCounts = new Map<number, number>()
    const tiles: TileImages = {
      get(idx) {
        callCounts.set(idx, (callCounts.get(idx) ?? 0) + 1)
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 5, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 0)
    // 中心格 lower id 5 + fence 8 圈每圈 lower+upper 都 fenceFill=5。
    // 调用次数远 > 1 即证明 fence 触发(无 fence 时 layer 0 只会拿 1 次 id 5)。
    expect((callCounts.get(5) ?? 0)).toBeGreaterThan(1)
  })

  it('±1 fence:layer 1 fence 位置 fallback = -1,fence 不调 tiles.get', () => {
    // layer 1:fenceFill = -1。1×1 map, cells[0][0] = { lower: 0, upper: 0xff0000 }
    // → tileIdLayer1(0xff0000) = ((0xff & 0xff) | ((0xff >> 4) & 0x100)) - 1
    //                          = (0xff | 0x000) - 1 = 0xfe
    // 中心格 upper 调 tiles.get(0xfe) 一次;fence 位置 layer 1 跳过不调。
    const fb = createFramebuffer()
    const calls: number[] = []
    const tiles: TileImages = {
      get(idx) { calls.push(idx); return undefined },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 0, upper: 0xff0000 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 1)
    // 唯一调用应该是中心格 upper 的 0xfe;另外 lower 在 layer 1 下
    // tileIdLayer1(0)=-1 跳过;fence 全部跳过。
    expect(calls).toEqual([0xfe])
  })

  it('layer 0:9-bit tile id 从低 16 bit 提取 (d & 0xff) | ((d >> 4) & 0x100)', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) { captured.push(idx); return undefined },
    }
    // d=0x1010 → low8=0x10, (d>>4)&0x100=0x100 → id=0x110
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 0x1010, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 0)
    expect(captured).toContain(0x110)
  })

  it('layer 1:tile id 从高 16 bit 提取且 -1;高 16 bit = 0 → id < 0 → skip', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) { captured.push(idx); return undefined },
    }
    // d=0x10100000:高 16 = 0x1010 → 同上算 id 0x110,再 -1 = 0x10F
    const cellWithTop = { lower: 0x10100000, upper: 0 }
    const cellNoTop = { lower: 0x10, upper: 0 } // 高 16 = 0 → id = -1 skip
    const map: Tilemap = {
      width: 2, height: 1,
      cells: [[cellWithTop, cellNoTop]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 1)
    expect(captured).toContain(0x10f)
    expect(captured).not.toContain(-1) // 跳过,不调 tiles.get
  })

  it('传入 coverage 时标记已画像素;远处未画处不标记', () => {
    // 原版靠 gpScreen 不清屏遮住瓦片美术接缝的透明像素;我们每帧 fb.clear() 到 0,
    // 接缝会露黑(血池"黑色三角")。修复需先知道哪些像素被瓦片画过 → coverage mask。
    const fb = createFramebuffer()
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return { width: 4, height: 4, indices: new Uint8Array(16).fill(1), opaque: new Uint8Array(16).fill(1) }
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 0 }]],
      tilesetImage: 'fake',
    }
    const coverage = new Uint8Array(320 * 200)
    // camera=(-160,-112) → cell(0,0) lower(h=0) 落 (144,104),4×4 不透明 tile 1。
    drawTilemap(fb, map, tiles, { x: -160, y: -112 }, 0, coverage)
    expect(coverage[104 * 320 + 144]).toBe(1) // 画过 → 标记
    expect(coverage[0]).toBe(0)               // 远处未画 → 不标记
  })
})

describe('repairTilemapSeams(瓦片接缝漏黑修复——血池"黑色三角"根因:原版不清屏遮住,我们 clear 到 0 露黑)', () => {
  it('未覆盖像素用最近的已覆盖邻居填充', () => {
    const fb = createFramebuffer(3, 3)
    const coverage = new Uint8Array(9)
    // 覆盖除中心(1,1)外的 8 格,像素值都设 5。
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue
      fb.writePixel(i % 3, Math.floor(i / 3), 5)
      coverage[i] = 1
    }
    expect(fb.indices[4]).toBe(0) // clear 后中心为 0(漏黑)
    repairTilemapSeams(fb, coverage)
    expect(fb.indices[4]).toBe(5) // 用邻居 5 填充
  })

  it('已覆盖像素保持不变,即使其值为 0(合法的不透明 index-0,不能当漏黑)', () => {
    const fb = createFramebuffer(2, 1)
    const coverage = new Uint8Array(2)
    fb.writePixel(0, 0, 0); coverage[0] = 1 // 瓦片真画的 opaque index-0
    fb.writePixel(1, 0, 9); coverage[1] = 1
    repairTilemapSeams(fb, coverage)
    expect(fb.indices[0]).toBe(0) // 不被邻居 9 污染
    expect(fb.indices[1]).toBe(9)
  })

  it('填宽接缝:逐圈向内扩散直到填满', () => {
    // 5×1:两端覆盖(值 3),中间 3 px 未覆盖 → 需多趟扩散填满。
    const fb = createFramebuffer(5, 1)
    const coverage = new Uint8Array(5)
    fb.writePixel(0, 0, 3); coverage[0] = 1
    fb.writePixel(4, 0, 3); coverage[4] = 1
    repairTilemapSeams(fb, coverage)
    expect([...fb.indices]).toEqual([3, 3, 3, 3, 3])
  })
})
