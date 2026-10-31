import { describe, expect, it } from 'vitest'
import { dialogGlyphs, dialogItem, dialogSprite } from '../__tests__/dialog-fixtures.js'
import type { IndexedImage } from '../assets/png.js'
import type { DialogBoxState } from '../core/game-state.js'
import { finishDefaultTickLine } from './__tests__/dialog-state-fixtures.js'
import { pixel } from './__tests__/raster-fixtures.js'
import {
  appendDialogLine,
  type DialogSprite,
  drawDialogBox,
  FONT_COLOR_CYAN_ALT,
  FONT_COLOR_RED,
  FONT_COLOR_YELLOW,
  resetDialogBody,
  setWaitingEndKey,
  setWaitingPageKey,
  startDialogLine,
  tickDialog,
} from './dialog-box.js'
import { createFramebuffer } from './framebuffer.js'

describe('Sync.2 DialogBox · tickDialog typing', () => {
  // sdlpal 真值:箭头**常显**,"闪烁"由 present 层 palette 0xF9-0xFE 轮转产生(text.c:1408-1426),
  //   不是 show/hide。等键期间每帧都应画出 icon(旧版会在 blink-off 帧消失)。
  it('等键 phase → icon 常显(不随 tick show/hide)', () => {
    const fb = createFramebuffer()
    const icon = dialogSprite(8, 8, 99)
    const s = startDialogLine('A', { style: 'bottom' })
    finishDefaultTickLine(s)
    setWaitingEndKey(s)
    for (let n = 0; n < 40; n++) {
      fb.indices.fill(0)
      tickDialog(s)
      drawDialogBox(fb, s, undefined, { iconFrames: new Map([[0, icon]]) })
      expect(Array.from(fb.indices).some((i) => i === 99)).toBe(true)
    }
  })
})

describe('Sync.2 DialogBox · drawDialogBox 不画 box bg', () => {
  it('charsRevealed=0 且无 portrait → fb 完全空', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('x', { style: 'bottom' })
    drawDialogBox(fb, state, undefined, undefined)
    const nonZero = Array.from(fb.indices).some((i) => i !== 0)
    expect(nonZero).toBe(false)
  })

  it('typing 完一字 → fontColor 像素存在,无 255 边框色', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    finishDefaultTickLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true)
    expect(Array.from(fb.indices).some((i) => i === 255)).toBe(false)
  })

  it('多行(shownLines + currentLine)都画在 fb', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('l1', { style: 'bottom', fontColor: 200 })
    finishDefaultTickLine(state)
    appendDialogLine(state, 'l2')
    finishDefaultTickLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(fb.indices[126 * 320 + 44]).toBe(200)
    expect(fb.indices[144 * 320 + 44]).toBe(200)
    expect(fb.indices[162 * 320 + 44]).toBe(0)
  })

  // sdlpal text.c:1144-1156 真值:文字阴影 = 三层 (+1,0)/(0,+1)/(+1,+1) **color 0**(非旧单层 color 50)。
  //   color 0 与空 fb 默认值同 → 用非 0 背景填充让阴影像素可辨。
  it('对话文字 → 主色 200 + 三层阴影 color 0(取代旧单层 color 50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77) // 非 0 背景:阴影 color 0 才能与背景区分
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    finishDefaultTickLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true) // 主色
    expect(Array.from(fb.indices).some((i) => i === 0)).toBe(true) // 三层阴影 color 0
    expect(Array.from(fb.indices).some((i) => i === 50)).toBe(false) // 不再是旧单层 color 50
  })

  it('initial styles preserve the background except the narration glyph', () => {
    for (const style of ['top', 'center', 'bottom', 'narration', 'item-box'] as const) {
      const fb = createFramebuffer()
      fb.indices.fill(0x5a)
      const state = startDialogLine('x', { style })
      drawDialogBox(fb, state, dialogGlyphs({ x: 8 }), undefined)
      const expected = new Uint8Array(320 * 200).fill(0x5a)
      if (style === 'narration') expected[50 * 320 + 168] = 0
      expect(fb.indices).toEqual(expected)
    }
  })

  it('item-box 物品框:居中 ITEMBOX 精灵 + 物品 BALL 图标@box+(8,7)(script.c:1483-1508)', () => {
    const fb = createFramebuffer()
    // uiSpriteFrames:SingleLineBox(44/45/46)+ ITEMBOX(70,64×64)
    const ui: IndexedImage[] = []
    ui[44] = dialogSprite(4, 16, 11)
    ui[45] = dialogSprite(8, 16, 11)
    ui[46] = dialogSprite(4, 16, 11)
    ui[70] = dialogSprite(64, 64, 22)
    const icon = dialogSprite(24, 24, 33) // 物品 BALL 图标(bitmap=5)
    const state = startDialogLine('', { style: 'item-box', fontColor: 0, shadow: true })
    state.itemBox = { itemId: 100, line1: '炼出', line2: '金创药' }
    drawDialogBox(fb, state, undefined, {
      uiSpriteFrames: ui,
      itemIcons: new Map([[5, icon]]),
      items: [dialogItem(100, 5)],
    })
    // ITEMBOX 屏幕居中:(320-64)/2=128, (200-64)/2=68 → 画了 22
    expect(fb.indices[68 * 320 + 128]).toBe(22)
    // 物品图标 @ box+(8,7) = (136, 75) → 画了 33
    expect(fb.indices[75 * 320 + 136]).toBe(33)
  })
})

describe('Sync.2 DialogBox · portrait 真做(sdlpal text.c:1289-1310 真位置)', () => {
  it('top + portrait → blit 在 (48 - w/2, 55 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = dialogSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'top', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(fb.indices[39 * 320 + 32]).toBe(77)
    expect(fb.indices[(39 + 31) * 320 + (32 + 31)]).toBe(77)
    expect(fb.indices[39 * 320 + 31]).toBe(0)
  })

  it('bottom + portrait → blit 在 (270 - w/2, 144 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = dialogSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'bottom', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(fb.indices[128 * 320 + 254]).toBe(77)
    expect(fb.indices[(128 + 31) * 320 + (254 + 31)]).toBe(77)
  })

  it('center style → 不画 portrait', () => {
    const fb = createFramebuffer()
    const portrait = dialogSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'center', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(Array.from(fb.indices).some((i) => i === 77)).toBe(false)
  })

  it('portraitLayout=true 但 portraitIcon=undefined(0x05 擦立绘后续话):不画图、文本仍缩进 x≥96', () => {
    // 扬州师爷"大人息怒"解耦真值:立绘图被 PAL_MakeScene 擦(portraitIcon=undefined),但 posDialogText
    //   持久缩进(portraitLayout=true)→ 屏上无立绘像素、文本 x≥96(非无缩进的 44)。画图与布局解耦。
    const fb = createFramebuffer()
    const portrait = dialogSprite(32, 32, 77)
    const state = startDialogLine('A', {
      style: 'top',
      portraitIcon: undefined,
      portraitLayout: true,
      fontColor: 200,
    })
    finishDefaultTickLine(state)
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]), // 图库在,但 portraitIcon=undefined → 不取用
    })
    expect(Array.from(fb.indices).some((i) => i === 77)).toBe(false) // 不画立绘图
    let minX = 320
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 200 && x < minX) minX = x
      }
    }
    expect(minX).toBeGreaterThanOrEqual(96) // 缩进保留(对齐有立绘布局,而非无缩进 44)
  })

  it('top + portrait → text X 起始 ≥ 96', () => {
    const fb = createFramebuffer()
    const portrait = dialogSprite(32, 32, 77)
    const state = startDialogLine('A', { style: 'top', portraitIcon: 5, fontColor: 200 })
    finishDefaultTickLine(state)
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    let minX = 320
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 200 && x < minX) minX = x
      }
    }
    expect(minX).toBeGreaterThanOrEqual(96)
  })
})

describe('Sync.2 DialogBox · key icon(sdlpal text.c:1391)', () => {
  it('waiting-page-key → blit icon(常显,不再 gate keyIconBlink)', () => {
    const fb = createFramebuffer()
    const icon = dialogSprite(8, 8, 99)
    const state = startDialogLine('A', { style: 'bottom' })
    finishDefaultTickLine(state)
    setWaitingPageKey(state)
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(true)
  })

  // sdlpal text.c:1745 `posIcon = PAL_XY(x, y)`:x = 本行文字画完后的末尾 x,y = 本行 y。
  // 不是固定右下角(旧 bug:iconX=280, iconY=行y+12)。
  it('icon 位置 = 本行文字末尾 x + 本行 y(sdlpal posIcon 真值)', () => {
    const fb = createFramebuffer()
    const icon = dialogSprite(8, 8, 99)
    // style=bottom 无 portrait → basePos=(44,126);glyphs=undefined → measureText 每字 16px。
    const state = startDialogLine('AB', { style: 'bottom' })
    finishDefaultTickLine(state)
    setWaitingEndKey(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    let minX = 320
    let minY = 200
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 99) {
          if (x < minX) minX = x
          if (y < minY) minY = y
        }
      }
    }
    // 'AB' = 2 字 × 16px = 32 → iconX = 44 + 32 = 76;iconY = 126 + 0*18 = 126(无 +12)
    expect(minX).toBe(76)
    expect(minY).toBe(126)
  })

  it('typing 中(phase=typing)→ 不画 icon', () => {
    const fb = createFramebuffer()
    const icon = dialogSprite(8, 8, 99)
    const state = startDialogLine('A long line', { style: 'bottom' })
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(false)
  })

  // sdlpal text.c:1385-1386 守卫:bDialogPosition==kDialogCenter 即便等键也**不**画 icon。
  it('center style 即使 waiting → 不画 icon(sdlpal kDialogCenter 守卫)', () => {
    const fb = createFramebuffer()
    const icon = dialogSprite(8, 8, 99)
    const state = startDialogLine('画外音', { style: 'center' })
    finishDefaultTickLine(state)
    setWaitingEndKey(state) // 即便强行进等键态
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(false) // center 无箭头
  })
})

function firstPixelImage(width: number, height: number, color: number): IndexedImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  indices[0] = color
  opaque[0] = 1
  return { width, height, indices, opaque }
}

function dialogLineBoxFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  frames[44] = firstPixelImage(4, 16, 0x44)
  frames[45] = firstPixelImage(8, 16, 0x45)
  frames[46] = firstPixelImage(4, 16, 0x46)
  return frames
}

function narrationDigitFrames(): IndexedImage[] {
  const frames = dialogLineBoxFrames()
  for (let digit = 0; digit <= 9; digit++) {
    const image = firstPixelImage(6, 8, 0)
    image.indices[0] = 0xb0 + digit
    image.opaque[0] = 1
    frames[19 + digit] = image
  }
  return frames
}

function revealLineForDrawing(state: DialogBoxState): void {
  if (state.currentLineText === null) return
  state.charsRevealed = state.currentLineText.length
  state.phase = 'line-done'
}

const wideGlyphs = dialogGlyphs({ 李: 16, ':': 16, 甲: 16, 乙: 16, 丙: 16 })

describe('Dialogue text portraits and resource pixels', () => {
  it('G05-D01 右括号把等键图标切到第 1 帧，而不是默认第 0 帧', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A)', { style: 'bottom' })
    state.charsRevealed = state.currentLineText?.length ?? 0
    setWaitingEndKey(state)
    drawDialogBox(fb, state, undefined, {
      iconFrames: new Map([
        [0, dialogSprite(8, 8, 11)],
        [1, dialogSprite(8, 8, 22)],
      ]),
    })
    expect(pixel(fb, 60, 126)).toBe(22)
  })

  it('G05-D02 半角字宽 8 时，箭头落在文字末尾 x=52', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    state.charsRevealed = 1
    setWaitingEndKey(state)
    drawDialogBox(fb, state, dialogGlyphs({ A: 8 }), {
      iconFrames: new Map([[0, dialogSprite(8, 8, 11)]]),
    })
    expect(pixel(fb, 52, 126)).toBe(11)
    expect(pixel(fb, 60, 126)).toBe(0)
  })

  it('G05-D03 当前行为空时，箭头画在最后一条已显示行上', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲', { style: 'bottom', fontColor: 200 })
    appendDialogLine(state, '乙')
    appendDialogLine(state, '丙')
    state.currentLineText = null
    state.phase = 'waiting-end-key'
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16, 乙: 16, 丙: 16 }), {
      iconFrames: new Map([[0, dialogSprite(8, 8, 11)]]),
    })
    expect(pixel(fb, 60, 144)).toBe(11)
    expect(pixel(fb, 60, 162)).toBe(0)
  })

  it('G05-D04 两个半角单位的旁白框从 (152,40) 起，文字在 (160,50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'narration' })
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16 }), { uiSpriteFrames: dialogLineBoxFrames() })
    expect(pixel(fb, 152, 40)).toBe(0x44)
    expect(pixel(fb, 160, 50)).toBe(0)
    expect(pixel(fb, 148, 40)).toBe(0x5a)
  })

  it('G05-D05 旁白连续数字按 8 像素步进，第二位不落在 +6', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('12', { style: 'narration' })
    drawDialogBox(fb, state, undefined, { uiSpriteFrames: narrationDigitFrames() })
    expect(pixel(fb, 160, 54)).toBe(0xb1)
    expect(pixel(fb, 168, 54)).toBe(0xb2)
    expect(pixel(fb, 166, 54)).toBe(0x5a)
  })

  it('G05-D06 旁白样式不画头像，正文仍写在 (160,50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'narration', portraitIcon: 5 })
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16 }), {
      portraitFrames: new Map([[5, dialogSprite(8, 8, 77)]]),
    })
    expect(pixel(fb, 160, 50)).toBe(0)
    expect(fb.indices.some((value) => value === 77)).toBe(false)
  })

  it('G05-D07 物品框没有 itemBox 时，画面保持调用前的底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'item-box' })
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16 }), { uiSpriteFrames: dialogLineBoxFrames() })
    expect(fb.indices.every((value) => value === 0x5a)).toBe(true)
  })

  it('G05-D08 物品框两行文字分别落在 y=40 和 y=58，右侧一点不是阴影', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    const state = startDialogLine('甲', { style: 'bottom' })
    state.style = 'item-box'
    state.itemBox = { itemId: 100, line1: '甲', line2: '乙' }
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16, 乙: 16 }))
    expect(pixel(fb, 160, 40)).toBe(0)
    expect(pixel(fb, 160, 58)).toBe(0)
    expect(pixel(fb, 161, 40)).toBe(0x5a)
  })

  it('G05-D09 物品目录里没有该 id 时，框仍居中，图标像素不出现', () => {
    const fb = createFramebuffer()
    const frames = dialogLineBoxFrames()
    frames[70] = dialogSprite(64, 64, 22)
    const state = startDialogLine('甲', { style: 'bottom' })
    state.style = 'item-box'
    state.itemBox = { itemId: 100, line1: '甲', line2: '乙' }
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16, 乙: 16 }), {
      uiSpriteFrames: frames,
      itemIcons: new Map([[5, firstPixelImage(8, 8, 33)]]),
      items: [dialogItem(7, 5)],
    })
    expect(pixel(fb, 128, 68)).toBe(22)
    expect(pixel(fb, 136, 75)).toBe(22)
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
    drawDialogBox(fb, state, dialogGlyphs({ 甲: 16 }), {
      portraitFrames: new Map([[4, portrait]]),
    })
    expect(pixel(fb, 269, 143)).toBe(0x5a)
    expect(pixel(fb, 270, 143)).toBe(66)
  })

  it('G05-A01 上框无头像时姓名在 (12,8) 为 0x8C，正文在 (44,26)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', fontColor: 200 })
    appendDialogLine(state, '甲')
    revealLineForDrawing(state)
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(pixel(fb, 44, 26)).toBe(200)
  })

  it('G05-A02 上框有头像时姓名改到 (80,8)，正文改到 (96,26)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', portraitIcon: 3, fontColor: 200 })
    appendDialogLine(state, '甲')
    revealLineForDrawing(state)
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 80, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(pixel(fb, 96, 26)).toBe(200)
    expect(pixel(fb, 12, 8)).toBe(0)
  })

  it('G05-A03 居中框的冒号句画在 (80,40)，不画到姓名位 (12,8)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'center', fontColor: 200 })
    revealLineForDrawing(state)
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 80, 40)).toBe(200)
    expect(pixel(fb, 12, 8)).toBe(0)
  })

  it('G05-A04 charsRevealed 为 1 时只画第一个字，第二个字的位置保持 0', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲乙', { style: 'bottom', fontColor: 200 })
    state.charsRevealed = 1
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 44, 126)).toBe(200)
    expect(pixel(fb, 60, 126)).toBe(0)
  })

  it('G05-A05 已沉入的第二行在首行之下 18 像素，黄字与红字分行', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"甲"', { style: 'bottom' })
    revealLineForDrawing(state)
    appendDialogLine(state, "'乙'")
    revealLineForDrawing(state)
    appendDialogLine(state, '丙')
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 44, 144)).toBe(FONT_COLOR_RED)
    expect(pixel(fb, 44, 126)).toBe(FONT_COLOR_YELLOW)
  })

  it('G05-A06 普通对话引号里的字画成黄色 0x2D，不是默认 0x4F', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"甲"', { style: 'bottom' })
    revealLineForDrawing(state)
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 44, 126)).toBe(FONT_COLOR_YELLOW)
  })

  it('G05-A07 清正文后姓名像素还在 (12,8)，正文位回到 0', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', fontColor: 200 })
    appendDialogLine(state, '甲')
    revealLineForDrawing(state)
    resetDialogBody(state)
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(pixel(fb, 44, 26)).toBe(0)
  })

  it('G05-A08 带引号的姓名仍画成 0x8C，不使用引号切出的黄色', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"李":', { style: 'top', fontColor: 200 })
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(pixel(fb, 44, 26)).toBe(0)
  })

  it('G05-A09 当前行没有逐字色时，像素用 state.fontColor 而不是 0x4F', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲', { style: 'bottom', fontColor: 200 })
    state.currentLineColors = undefined
    state.charsRevealed = 1
    drawDialogBox(fb, state, wideGlyphs)
    expect(pixel(fb, 44, 126)).toBe(200)
  })

  it('G05-A10 半角字形宽 8 时，第二个字从 x+8 起画，不落到 x+16', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('AB', { style: 'bottom', fontColor: 200 })
    revealLineForDrawing(state)
    drawDialogBox(fb, state, dialogGlyphs({ A: 8, B: 8 }))
    expect(pixel(fb, 44, 126)).toBe(200)
    expect(pixel(fb, 52, 126)).toBe(200)
    expect(pixel(fb, 60, 126)).toBe(0)
  })
})
