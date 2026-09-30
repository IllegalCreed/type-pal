// @vitest-environment jsdom

import type { CharacterInstance, WorldState } from '@type-pal/content'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { openMenu } from '../menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import {
  type BoxTiles,
  drawNumber,
  drawScroll,
  drawSlicedBox,
  type MenuAssets,
  MenuBox,
} from './menu-box.js'

const image = (id: string, width = 8, height = 8): ImageBitmap =>
  ({ id, width, height, close() {} }) as ImageBitmap
const tile = image
const nine = (): ImageBitmap[] => Array.from({ length: 9 }, (_, i) => image(`tile-${i}`))
const boxOf = (tiles: ImageBitmap[]): BoxTiles => ({ tiles })

function fullAssets(): MenuAssets {
  const tiles = { tiles: nine() }
  return {
    box: tiles,
    statusBg: image('status-background', 320, 200),
    equipSlot: image('equip-slot', 34, 34),
    scroll: tiles,
    nums: Array.from({ length: 10 }, (_, index) => image(`number-${index}`)),
    avatar: image('fallback-avatar', 32, 40),
    numsBlue: Array.from({ length: 10 }, (_, index) => image(`blue-${index}`)),
    numsCyan: Array.from({ length: 10 }, (_, index) => image(`cyan-${index}`)),
    slash: image('slash'),
    itemIcons: {},
    redBox: tiles,
    magicPlayerBox: tile('magic-playerbox'),
    cursorGrid: tile('cursor-grid'),
    cursorUp: tile('cursor-up'),
    cursorUpRed: tile('cursor-up-red'),
    cursorDown: tile('cursor-down'),
    settleArrow: tile('settle-arrow'),
    battleIcons: [],
    itembox: tiles,
  }
}

/** 类型化外部宿主边界：jsdom 真实 2D 上下文。实例层拦 drawImage（假位图不真画），
 *  原型层另拦一次保证阴影离屏画布的假位图绘制不真执行；其余成员保持真实行为。 */
let createdCanvases: HTMLCanvasElement[]
const realCreateElement = document.createElement.bind(document)

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  createdCanvases = []
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const element = realCreateElement(tag, options)
    if (element instanceof HTMLCanvasElement) createdCanvases.push(element)
    return element
  })
})

/** 主画布 ctx + 主层 drawImage 记录（unknown[][]，避免九参签名把长度钉成字面量）。 */
function hostCtx(): { ctx: CanvasRenderingContext2D; mainDraws: unknown[][] } {
  const canvas = realCreateElement('canvas')
  createdCanvases = createdCanvases.filter((item) => item !== canvas) // 主画布不计入离屏账
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('jsdom 2d canvas unavailable')
  vi.spyOn(Object.getPrototypeOf(ctx), 'drawImage').mockImplementation(() => {})
  const mainDraws: unknown[][] = []
  const drawImage = vi.spyOn(ctx, 'drawImage')
  drawImage.mockImplementation((...args: unknown[]) => {
    mainDraws.push(args)
  })
  return { ctx, mainDraws }
}

describe('N03 九宫格退化尺寸与零输入', () => {
  test('框尺寸小于边框合计：tileFill 全部早退，仅阴影 + 四角', () => {
    const { ctx, mainDraws } = hostCtx()
    drawSlicedBox(ctx, boxOf(nine()), 0, 0, 4, 4)
    const onMain = mainDraws.filter((call) => call.length === 3)
    expect(onMain).toHaveLength(5) // 4 角 + 1 阴影贴回，无任何平铺
    // 阴影仍执行：离屏画布被创建（主画布已排除）。
    expect(createdCanvases).toHaveLength(1)
  })

  test('drawScroll 空 tiles 零绘制；显式 shadow:false 不创建阴影画布', () => {
    const { ctx, mainDraws } = hostCtx()
    drawScroll(ctx, boxOf([]), 0, 0, 5)
    expect(mainDraws).toHaveLength(0)
    expect(createdCanvases).toHaveLength(0)

    drawScroll(ctx, boxOf(nine()), 2, 3, 2, { shadow: false })
    // 平铺 + 四角照画，但全程无离屏画布。
    expect(mainDraws.length).toBeGreaterThan(0)
    expect(createdCanvases).toHaveLength(0)
  })

  test('阴影离屏画布缺 2d 上下文：静默跳过阴影且不阻止本体绘制', () => {
    const { ctx, mainDraws } = hostCtx()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => drawSlicedBox(ctx, boxOf(nine()), 0, 0, 61, 94)).not.toThrow()
    // 九块全部直接落在传入 ctx（平铺 + 四角），无任何 canvas 创建。
    expect(mainDraws.filter((call) => call.length === 3).length).toBeGreaterThan(0)
  })
})

describe('N03 数字绘制的缺字形臂', () => {
  test('部分字形缺失：存在的数字照排、缺失位跳过但右缘推进', () => {
    const { ctx, mainDraws } = hostCtx()
    const digits: (ImageBitmap | undefined)[] = Array.from({ length: 10 }, (_, d) =>
      d === 0 ? undefined : image(`digit-${d}`, 4, 8),
    )
    drawNumber(ctx, 100, 40, 5, digits)
    expect(mainDraws).toEqual([[expect.anything(), 36, 5]])
  })
})

describe('N03 MenuBox 无 imageCache 的状态板渲染', () => {
  const member = (portrait?: string): CharacterInstance => ({
    id: 'hero-instance',
    template: 'hero',
    level: 1,
    exp: 3,
    hp: 45,
    maxHP: 100,
    mp: 8,
    maxMP: 40,
    attack: 10,
    defense: 8,
    magicAttack: 12,
    speed: 5,
    luck: 3,
    equipment: {},
    tags: [],
    ...(portrait ? { appearance: { portrait } } : {}),
  })
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }

  test('extras 缺 imageCache：appearance.portrait 存在也不崩、不发起读取、回落模板立绘', () => {
    const assets = fullAssets()
    const box = new MenuBox(glyphs, { 'name.hero': '主角' }, assets, {}, {})
    const { ctx, mainDraws } = hostCtx()
    const state: WorldState = {
      party: [member('portrait.p')],
      reserve: [],
      money: 70,
      inventory: [],
      learnedSkills: {},
    }
    expect(() => box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)).not.toThrow()
    // 回落模板缺省立绘（assets.avatar），而非崩溃或绘制空白。
    expect(mainDraws.some((call) => call[0] === assets.avatar)).toBe(true)
  })
})
