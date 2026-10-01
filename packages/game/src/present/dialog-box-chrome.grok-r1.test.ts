/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G05-D。
 * 不重复默认箭头位置、底框立绘和物品框图标的正向坐标。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import {
  appendDialogLine,
  type DialogSprite,
  drawDialogBox,
  getDialogBoxRect,
  getDialogTextPos,
  getDialogTitlePos,
  setWaitingEndKey,
  startDialogLine,
} from './dialog-box.js'
import type { Glyph, GlyphTable } from './font.js'
import { createFramebuffer, type Framebuffer } from './framebuffer.js'

function at(fb: Framebuffer, x: number, y: number): number {
  return fb.indices[y * 320 + x] ?? 0
}

function solidSprite(width: number, height: number, color: number): DialogSprite {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(color),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function dotImage(width: number, height: number, color: number): IndexedImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  indices[0] = color
  opaque[0] = 1
  return { width, height, indices, opaque }
}

function glyphs(specs: Record<string, number>): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const [ch, width] of Object.entries(specs)) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const bytesPerRow = Math.ceil(width / 8)
    const bitmap = new Uint8Array(bytesPerRow * 16)
    bitmap[0] = 0x80
    map.set(cp, { width, height: 16, bitmap })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

function item(id: number, bitmap: number): Item {
  return {
    id,
    bitmap,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

function boxFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  frames[44] = dotImage(4, 16, 0x44)
  frames[45] = dotImage(8, 16, 0x45)
  frames[46] = dotImage(4, 16, 0x46)
  return frames
}

function digitFrames(): IndexedImage[] {
  const frames = boxFrames()
  for (let digit = 0; digit <= 9; digit++) {
    const image = dotImage(6, 8, 0)
    image.indices[0] = 0xb0 + digit
    image.opaque[0] = 1
    frames[19 + digit] = image
  }
  return frames
}

describe('G05-D dialog 图标物品框与旁白', () => {
  it('G05-D01 右括号把等键图标切到第 1 帧，而不是默认第 0 帧', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A)', { style: 'bottom' })
    state.charsRevealed = state.currentLineText?.length ?? 0
    setWaitingEndKey(state)
    drawDialogBox(fb, state, undefined, {
      iconFrames: new Map([
        [0, solidSprite(8, 8, 11)],
        [1, solidSprite(8, 8, 22)],
      ]),
    })
    expect(at(fb, 60, 126)).toBe(22)
  })

  it('G05-D02 半角字宽 8 时，箭头落在文字末尾 x=52', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    state.charsRevealed = 1
    setWaitingEndKey(state)
    drawDialogBox(fb, state, glyphs({ A: 8 }), {
      iconFrames: new Map([[0, solidSprite(8, 8, 11)]]),
    })
    expect(at(fb, 52, 126)).toBe(11)
    expect(at(fb, 60, 126)).toBe(0)
  })

  it('G05-D03 当前行为空时，箭头画在最后一条已显示行上', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲', { style: 'bottom', fontColor: 200 })
    appendDialogLine(state, '乙')
    appendDialogLine(state, '丙')
    state.currentLineText = null
    state.phase = 'waiting-end-key'
    drawDialogBox(fb, state, glyphs({ 甲: 16, 乙: 16, 丙: 16 }), {
      iconFrames: new Map([[0, solidSprite(8, 8, 11)]]),
    })
    expect(at(fb, 60, 144)).toBe(11)
    expect(at(fb, 60, 162)).toBe(0)
  })

  it('G05-D04 两个半角单位的旁白框从 (152,40) 起，文字在 (160,50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'narration' })
    drawDialogBox(fb, state, glyphs({ 甲: 16 }), { uiSpriteFrames: boxFrames() })
    expect(at(fb, 152, 40)).toBe(0x44)
    expect(at(fb, 160, 50)).toBe(0)
    expect(at(fb, 148, 40)).toBe(0x5a)
  })

  it('G05-D05 旁白连续数字按 8 像素步进，第二位不落在 +6', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('12', { style: 'narration' })
    drawDialogBox(fb, state, undefined, { uiSpriteFrames: digitFrames() })
    expect(at(fb, 160, 54)).toBe(0xb1)
    expect(at(fb, 168, 54)).toBe(0xb2)
    expect(at(fb, 166, 54)).toBe(0x5a)
  })

  it('G05-D06 旁白样式不画头像，正文仍写在 (160,50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'narration', portraitIcon: 5 })
    drawDialogBox(fb, state, glyphs({ 甲: 16 }), {
      portraitFrames: new Map([[5, solidSprite(8, 8, 77)]]),
    })
    expect(at(fb, 160, 50)).toBe(0)
    expect(fb.indices.some((value) => value === 77)).toBe(false)
  })

  it('G05-D07 物品框没有 itemBox 时，画面保持调用前的底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'item-box' })
    drawDialogBox(fb, state, glyphs({ 甲: 16 }), { uiSpriteFrames: boxFrames() })
    expect(fb.indices.every((value) => value === 0x5a)).toBe(true)
  })

  it('G05-D08 物品框两行文字分别落在 y=40 和 y=58，右侧一点不是阴影', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'bottom' })
    state.style = 'item-box'
    state.itemBox = { itemId: 100, line1: '甲', line2: '乙' }
    drawDialogBox(fb, state, glyphs({ 甲: 16, 乙: 16 }))
    expect(at(fb, 160, 40)).toBe(0)
    expect(at(fb, 160, 58)).toBe(0)
    expect(at(fb, 161, 40)).toBe(0x5a)
  })

  it('G05-D09 物品目录里没有该 id 时，框仍居中，图标像素不出现', () => {
    const fb = createFramebuffer()
    const frames = boxFrames()
    frames[70] = solidSprite(64, 64, 22)
    const state = startDialogLine('甲', { style: 'bottom' })
    state.style = 'item-box'
    state.itemBox = { itemId: 100, line1: '甲', line2: '乙' }
    drawDialogBox(fb, state, glyphs({ 甲: 16, 乙: 16 }), {
      uiSpriteFrames: frames,
      itemIcons: new Map([[5, dotImage(8, 8, 33)]]),
      items: [item(7, 5)],
    })
    expect(at(fb, 128, 68)).toBe(22)
    expect(at(fb, 136, 75)).toBe(22)
    expect(fb.indices.some((value) => value === 33)).toBe(false)
  })

  it('G05-D10 头像 opaque 必须等于 1 才写入，2 的孔保留底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const portrait: DialogSprite = {
      width: 2,
      height: 2,
      indices: Uint8Array.of(77, 66, 0, 0),
      opaque: Uint8Array.of(2, 1, 0, 0),
    }
    const state = startDialogLine('甲', { style: 'bottom', portraitIcon: 4, fontColor: 200 })
    drawDialogBox(fb, state, glyphs({ 甲: 16 }), {
      portraitFrames: new Map([[4, portrait]]),
    })
    expect(at(fb, 269, 143)).toBe(0x5a)
    expect(at(fb, 270, 143)).toBe(66)
  })

  it('G05-D11 物品框正文坐标是 (160,30)，有无头像都一样', () => {
    expect(getDialogTextPos('item-box', false)).toEqual({ x: 160, y: 30 })
    expect(getDialogTextPos('item-box', true)).toEqual({ x: 160, y: 30 })
  })

  it('G05-D12 物品框姓名坐标也是占位 (160,30)', () => {
    expect(getDialogTitlePos('item-box', false)).toEqual({ x: 160, y: 30 })
    expect(getDialogTitlePos('item-box', true)).toEqual({ x: 160, y: 30 })
  })

  it('G05-D13 物品框占位矩形是 (8,80,304,48)', () => {
    expect(getDialogBoxRect('item-box')).toEqual({ x: 8, y: 80, w: 304, h: 48 })
  })
})
