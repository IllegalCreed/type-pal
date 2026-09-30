// @vitest-environment jsdom

import type { WorldState } from '@type-pal/content'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MenuState } from '../menu-state.js'
import type { ProjectImageCache } from '../project-image-cache.js'
import type { GlyphTable } from '../text/glyph.js'
import { type BoxTiles, drawNumber, drawScroll, drawSlicedBox, MenuBox } from './menu-box.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const tile = (width = 8, height = 8): ImageBitmap => ({ width, height }) as ImageBitmap
const nine = (): ImageBitmap[] => Array.from({ length: 9 }, () => tile())
const boxOf = (tiles: ImageBitmap[]): BoxTiles => ({ tiles })

const recorder = () => vi.fn()
type Recorder = ReturnType<typeof recorder>
type FakeCtx = CanvasRenderingContext2D & {
  drawImage: Recorder
  fillRect: Recorder
  save: Recorder
  restore: Recorder
  beginPath: Recorder
  rect: Recorder
  clip: Recorder
}

function fakeCtx(): FakeCtx {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    imageSmoothingEnabled: false,
    canvas: undefined,
    filter: 'none',
  } as unknown as FakeCtx
}

let createdCanvases: HTMLCanvasElement[]

beforeEach(() => {
  createdCanvases = []
  // drawBoxShadow 的离屏画布走同一替身，避免 jsdom 对非真实位图实参的校验。
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind,
  ) {
    if (kind !== '2d') return null
    createdCanvases.push(this)
    return fakeCtx()
  })
})

describe('N03 九宫格缺块与零尺寸早退', () => {
  test('仅中块：只铺中心 tile；tileFill 尺寸非正零铺贴', () => {
    const ctx = fakeCtx()
    const centerOnly = boxOf(
      Array.from({ length: 9 }, (_, i) =>
        i === 4 ? tile(6, 6) : (undefined as unknown as ImageBitmap),
      ),
    )
    drawSlicedBox(ctx, centerOnly, 10, 10, 30, 24)
    // 阴影先贴回 (16,16)，随后中心 tile 平铺 (30/6)×(24/6)=20 次；四角/四边缺席全跳过。
    const drawn = ctx.drawImage.mock.calls.filter((call) => call.length === 3)
    expect(drawn).toHaveLength(21)
    expect(drawn[0]?.slice(1)).toEqual([16, 16]) // 阴影贴回
    expect(drawn[1]?.slice(1)).toEqual([10, 10]) // 首块 tile
    expect(drawn.at(-1)?.slice(1)).toEqual([34, 28]) // 末块 tile

    // 宽/高小于边框合计 → tileFill 的 dw/dh ≤ 0 早退臂：五路铺贴全跳过，仅阴影 + 四角。
    ctx.drawImage.mockClear()
    createdCanvases.length = 0
    drawSlicedBox(ctx, boxOf(nine()), 0, 0, 4, 4)
    const onMain = ctx.drawImage.mock.calls.filter((call) => call.length === 3)
    expect(onMain).toHaveLength(5) // 4 角 + 1 阴影贴回，无任何平铺
    // 阴影仍执行：离屏画布被创建。
    expect(createdCanvases).toHaveLength(1)
    expect(ctx.save).toHaveBeenCalled()
  })

  test('drawScroll 空 tiles 零绘制；显式 shadow:false 不创建阴影画布', () => {
    const ctx = fakeCtx()
    drawScroll(ctx, boxOf([]), 0, 0, 5)
    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect(createdCanvases).toHaveLength(0)

    drawScroll(ctx, boxOf(nine()), 2, 3, 2, { shadow: false })
    // 平铺 + 四角照画，但全程无离屏画布。
    expect(ctx.drawImage).toHaveBeenCalled()
    expect(createdCanvases).toHaveLength(0)
  })

  test('阴影离屏画布缺 2d 上下文：静默跳过阴影且不阻止本体绘制', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const ctx = fakeCtx()
    expect(() => drawSlicedBox(ctx, boxOf(nine()), 0, 0, 61, 94)).not.toThrow()
    // 九块全部直接落在传入 ctx（平铺 + 四角），无任何 canvas 创建。
    expect(ctx.drawImage.mock.calls.filter((call) => call.length === 3).length).toBeGreaterThan(0)
  })
})

describe('N03 数字绘制的缺字形臂', () => {
  test('部分字形缺失：存在的数字照排、缺失位跳过但右缘推进', () => {
    const ctx = fakeCtx()
    const digits = Array.from({ length: 10 }, (_, d) => (d === 0 ? undefined : tile(4, 8))) as (
      | ImageBitmap
      | undefined
    )[]
    drawNumber(ctx, 100, 40, 5, digits)
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 36, 5)
  })
})

describe('N03 MenuBox portraitFor 无缓存与加载中回落', () => {
  const worldWith = (portrait?: string): WorldState =>
    ({
      money: 0,
      party: [
        {
          id: 'hero-instance',
          template: 'hero',
          exp: 0,
          level: 1,
          hp: 10,
          maxHP: 10,
          mp: 5,
          maxMP: 5,
          attack: 1,
          magicAttack: 1,
          defense: 1,
          speed: 1,
          luck: 1,
          equipment: {},
          appearance: portrait ? { portrait } : undefined,
        },
      ],
    }) as unknown as WorldState
  const statusState: MenuState = { openPanel: 'status', stack: [] } as unknown as MenuState
  const bareAssets = {
    statusBg: undefined,
    equipSlot: undefined,
    nums: [],
    numsBlue: [],
    numsCyan: [],
    slash: undefined,
    avatar: undefined,
    itemIcons: {},
  } as unknown as import('./menu-box.js').MenuAssets
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }

  test('无 imageCache：appearance.portrait 存在也不崩、不读', () => {
    const bare = new MenuBox(glyphs, {}, bareAssets, {}, {})
    const ctx = fakeCtx()
    expect(() => bare.render(ctx, statusState, worldWith('portrait.p'), 0)).not.toThrow()
  })

  test('加载未就绪回落缺省头像且单次读取；就绪后换真图', async () => {
    let resolvePortrait: (value: ImageBitmap) => void = () => {}
    const load = vi.fn(
      () =>
        new Promise<ImageBitmap>((resolve) => {
          resolvePortrait = resolve
        }),
    )
    const menu = new MenuBox(
      glyphs,
      {},
      bareAssets,
      {},
      {
        imageCache: { load } as unknown as ProjectImageCache,
      },
    )
    const ctx = fakeCtx()
    menu.render(ctx, statusState, worldWith('portrait.p'), 0)
    expect(load).toHaveBeenCalledTimes(1)
    menu.render(ctx, statusState, worldWith('portrait.p'), 0)
    expect(load).toHaveBeenCalledTimes(1) // 未就绪窗口内不追加读取
    const fallback = tile(20, 30)
    resolvePortrait(fallback)
    await Promise.resolve()
    await Promise.resolve()
    // 就绪后的下一次渲染换真图。
    menu.render(ctx, statusState, worldWith('portrait.p'), 0)
    expect(load).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage.mock.calls.some((call) => call[0] === fallback)).toBe(true)
  })
})
