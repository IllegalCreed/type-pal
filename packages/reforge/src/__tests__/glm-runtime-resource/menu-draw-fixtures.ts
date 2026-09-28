/**
 * TEST-GLM-RUNTIME-RESOURCE-2 批C/R09–R12 共用绘制 fixture（仅本卡使用）。
 * 提供：录制型 CanvasRenderingContext2D 替身（浏览器端口替身，沿用 residual 测试模式）、
 * MenuAssets 假图集、手写 GlyphTable、document.createElement 桩（drawBoxShadow 离屏画布）。
 */
import { type Mock, vi } from 'vitest'
import type { BoxTiles, MenuAssets } from '../../menu/menu-box.js'
import type { GlyphTable } from '../../text/glyph.js'

export interface DrawHost {
  ctx: CanvasRenderingContext2D
  drawImage: Mock
  rect: Mock
  save: Mock
  restore: Mock
  beginPath: Mock
  clip: Mock
  fillRect: Mock
}

export function drawHost(): DrawHost {
  const drawImage = vi.fn()
  const rect = vi.fn()
  const save = vi.fn()
  const restore = vi.fn()
  const beginPath = vi.fn()
  const clip = vi.fn()
  const fillRect = vi.fn()
  const ctx = {
    drawImage,
    rect,
    save,
    restore,
    beginPath,
    clip,
    fillRect,
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
  return { ctx, drawImage, rect, save, restore, beginPath, clip, fillRect }
}

export const image = (id: string, width = 8, height = 8): ImageBitmap =>
  ({ id, width, height, close() {} }) as unknown as ImageBitmap

/** 九宫格：真实不规则 frame 尺寸（左8/中16/右9 列宽、上下行高4）。 */
export function boxTiles(prefix = 'b'): BoxTiles {
  return {
    tiles: [
      image(`${prefix}-tl`, 8, 4),
      image(`${prefix}-top`, 16, 4),
      image(`${prefix}-tr`, 13, 4),
      image(`${prefix}-left`, 8, 18),
      image(`${prefix}-center`, 16, 18),
      image(`${prefix}-right`, 9, 18),
      image(`${prefix}-bl`, 8, 4),
      image(`${prefix}-bottom`, 16, 4),
      image(`${prefix}-br`, 13, 4),
    ],
  }
}

export function menuAssets(): MenuAssets {
  const tiles = boxTiles()
  const red = boxTiles('r')
  const scroll = boxTiles('s')
  const itembox = boxTiles('i')
  const digits = (id: string): ImageBitmap[] =>
    Array.from({ length: 10 }, (_, d) => image(`${id}-${d}`, 6, 8))
  return {
    box: tiles,
    itembox,
    statusBg: image('statusbg', 320, 200),
    equipSlot: image('slot'),
    scroll,
    nums: digits('n'),
    avatar: undefined,
    numsBlue: digits('nb'),
    numsCyan: digits('nc'),
    slash: image('slash', 3, 8),
    itemIcons: { 'icon-61': image('icon-61', 32, 32) },
    redBox: red,
    magicPlayerBox: image('pbox', 74, 30),
    cursorGrid: image('cursor-grid'),
    cursorUp: image('cursor-up'),
    cursorUpRed: image('cursor-up-red'),
    cursorDown: image('cursor-down'),
    settleArrow: image('settle-arrow'),
    battleIcons: [],
  }
}

/** 手写 GlyphTable：'A'=半宽8、'中'=全宽16，其余缺失。 */
export function glyphTable(): GlyphTable {
  const half: import('../../text/glyph.js').Glyph = {
    width: 8,
    height: 16,
    bitmap: new Uint8Array(16),
  }
  const full: import('../../text/glyph.js').Glyph = {
    width: 16,
    height: 16,
    bitmap: new Uint8Array(32),
  }
  return {
    size: 2,
    has: (cp) => cp === 0x41 || cp === 0x4e2d,
    get: (cp) => (cp === 0x41 ? half : cp === 0x4e2d ? full : undefined),
  }
}

/** drawBoxShadow 离屏画布桩：返回可断言的 created 列表，离屏 ctx 独立录制。 */
export function stubDocumentCanvas(host: DrawHost): {
  created: { width: number; height: number }[]
} {
  const created: { width: number; height: number }[] = []
  vi.stubGlobal('document', {
    createElement(tag: string) {
      if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`)
      const off = {
        width: 0,
        height: 0,
        getContext: () => ({
          ...host.ctx,
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          rect: vi.fn(),
          clip: vi.fn(),
          fillRect: vi.fn(),
        }),
      }
      created.push(off)
      return off
    },
  })
  return { created }
}
