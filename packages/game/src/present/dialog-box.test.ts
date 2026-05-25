import { describe, it, expect } from 'vitest'
import { createFramebuffer } from './framebuffer.js'
import {
  startDialogLine,
  appendDialogLine,
  shouldWaitPageKey,
  setWaitingPageKey,
  setWaitingEndKey,
  tickDialog,
  confirmDialog,
  getDialogBoxRect,
  getDialogTextPos,
  drawDialogBox,
  FRAMES_PER_CHAR,
  FONT_COLOR_DEFAULT,
  MAX_LINES_PER_PAGE,
  type DialogSprite,
} from './dialog-box.js'

function mockSprite(w: number, h: number, colorIdx: number): DialogSprite {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(colorIdx),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

/** typing 完 1 行(任何长度)— 跑足够多 tick。 */
function completeLine(s: ReturnType<typeof startDialogLine>): void {
  if (s.currentLineText === null) return
  for (let i = 0; i < FRAMES_PER_CHAR * s.currentLineText.length; i++) tickDialog(s)
}

describe('Sync.2 DialogBox · startDialogLine / appendDialogLine', () => {
  it('startDialogLine 初始化:shownLines 空,currentLineText=text,phase=typing', () => {
    const s = startDialogLine('你好', { style: 'top' })
    expect(s.shownLines).toEqual([])
    expect(s.currentLineText).toBe('你好')
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.phase).toBe('typing')
    expect(s.keyIconBlink).toBe(false)
  })

  it('defaults:fontColor=FONT_COLOR_DEFAULT(0x4F=79),shadow=false,portraitIcon=undefined', () => {
    const s = startDialogLine('x', { style: 'bottom' })
    expect(s.fontColor).toBe(FONT_COLOR_DEFAULT)
    expect(s.fontColor).toBe(0x4F)
    expect(s.shadow).toBe(false)
    expect(s.portraitIcon).toBeUndefined()
  })

  it('opts 覆盖 defaults(含 portraitIcon)', () => {
    const s = startDialogLine('x', { style: 'top', fontColor: 12, shadow: true, portraitIcon: 55 })
    expect(s.fontColor).toBe(12)
    expect(s.shadow).toBe(true)
    expect(s.portraitIcon).toBe(55)
    expect(s.style).toBe('top')
  })

  it('appendDialogLine 把上行(已 line-done)沉进 shownLines + 新行 typing', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    completeLine(s)
    expect(s.phase).toBe('line-done')
    appendDialogLine(s, 'line2')
    expect(s.shownLines).toEqual(['line1'])
    expect(s.currentLineText).toBe('line2')
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.phase).toBe('typing')
  })

  it('shouldWaitPageKey:第 4 行 line-done 后返 true(下条 showDialog 会撞)', () => {
    const s = startDialogLine('l1', { style: 'bottom' })
    completeLine(s)
    expect(shouldWaitPageKey(s)).toBe(false)
    appendDialogLine(s, 'l2'); completeLine(s)
    appendDialogLine(s, 'l3'); completeLine(s)
    appendDialogLine(s, 'l4'); completeLine(s)
    // shownLines=[l1,l2,l3] currentLineText='l4' phase='line-done' → effective=4
    expect(shouldWaitPageKey(s)).toBe(true)
  })
})

describe('Sync.2 DialogBox · tickDialog typing', () => {
  it(`每 ${FRAMES_PER_CHAR} frame 出 1 字`, () => {
    const s = startDialogLine('你好世界', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(1)
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(2)
  })

  it('charsRevealed === currentLineText.length 时 phase → line-done', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(1)
    expect(s.phase).toBe('line-done')
  })

  it('line-done 后继续 tick → charsRevealed 不再增长', () => {
    const s = startDialogLine('AB', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR * 10; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(2)
    expect(s.phase).toBe('line-done')
  })

  it('非 typing phase 下 keyIconBlink 在 blink-period 内切换', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    completeLine(s)
    const firstBlink = s.keyIconBlink
    for (let i = 0; i < 16; i++) tickDialog(s)
    expect(s.keyIconBlink).not.toBe(firstBlink)
  })
})

describe('Sync.2 DialogBox · confirmDialog 4 case', () => {
  it('typing 中 → skip-typing(跳行末,不翻页)', () => {
    const s = startDialogLine('hello world', { style: 'bottom' })
    expect(s.charsRevealed).toBeLessThan(11)
    const r = confirmDialog(s)
    expect(r).toBe('skip-typing')
    expect(s.charsRevealed).toBe(11)
    expect(s.phase).toBe('line-done')
  })

  it('line-done 状态下 Confirm → noop(等自动推进)', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    completeLine(s)
    expect(s.phase).toBe('line-done')
    const r = confirmDialog(s)
    expect(r).toBe('noop')
  })

  it('waiting-page-key 状态 → page-advance + 清 shownLines / currentLineText', () => {
    const s = startDialogLine('l1', { style: 'bottom' })
    completeLine(s)
    setWaitingPageKey(s)
    expect(s.phase).toBe('waiting-page-key')
    const r = confirmDialog(s)
    expect(r).toBe('page-advance')
    expect(s.shownLines).toEqual([])
    expect(s.currentLineText).toBeNull()
  })

  it('waiting-end-key 状态 → dialog-end', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    completeLine(s)
    setWaitingEndKey(s)
    expect(s.phase).toBe('waiting-end-key')
    const r = confirmDialog(s)
    expect(r).toBe('dialog-end')
  })
})

describe('Sync.2 DialogBox · getDialogBoxRect', () => {
  it('4 styles 返回不同 y 坐标', () => {
    expect(getDialogBoxRect('top').y).toBeLessThan(getDialogBoxRect('center').y)
    expect(getDialogBoxRect('center').y).toBeLessThan(getDialogBoxRect('bottom').y)
    expect(getDialogBoxRect('narration').y).toBe(getDialogBoxRect('bottom').y)
  })
})

describe('Sync.2 DialogBox · getDialogTextPos(sdlpal text.c:1313-1346 真值)', () => {
  it('top 无 portrait → (44, 26)', () => {
    expect(getDialogTextPos('top', false)).toEqual({ x: 44, y: 26 })
  })
  it('top 有 portrait → (96, 26)', () => {
    expect(getDialogTextPos('top', true)).toEqual({ x: 96, y: 26 })
  })
  it('center → (80, 40),不论 portrait', () => {
    expect(getDialogTextPos('center', false)).toEqual({ x: 80, y: 40 })
    expect(getDialogTextPos('center', true)).toEqual({ x: 80, y: 40 })
  })
  it('bottom 无 portrait → (44, 126)', () => {
    expect(getDialogTextPos('bottom', false)).toEqual({ x: 44, y: 126 })
  })
  it('bottom 有 portrait → (20, 126)', () => {
    expect(getDialogTextPos('bottom', true)).toEqual({ x: 20, y: 126 })
  })
  it('narration 同 bottom', () => {
    expect(getDialogTextPos('narration', false)).toEqual(getDialogTextPos('bottom', false))
    expect(getDialogTextPos('narration', true)).toEqual(getDialogTextPos('bottom', true))
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
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true)
    expect(Array.from(fb.indices).some((i) => i === 255)).toBe(false)
  })

  it('多行(shownLines + currentLine)都画在 fb', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('l1', { style: 'bottom', fontColor: 200 })
    completeLine(state)
    appendDialogLine(state, 'l2')
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    const count = Array.from(fb.indices).filter((i) => i === 200).length
    expect(count).toBeGreaterThan(0)
  })

  it('shadow=true → 主色 + 阴影色 50 都存在', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A', { style: 'bottom', shadow: true, fontColor: 200 })
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true)
    expect(Array.from(fb.indices).some((i) => i === 50)).toBe(true)
  })

  it('4 styles 绘制不抛错', () => {
    for (const style of ['top', 'center', 'bottom', 'narration'] as const) {
      const fb = createFramebuffer()
      const state = startDialogLine('x', { style })
      expect(() => drawDialogBox(fb, state, undefined, undefined)).not.toThrow()
    }
  })
})

describe('Sync.2 DialogBox · portrait 真做(sdlpal text.c:1289-1310 真位置)', () => {
  it('top + portrait → blit 在 (48 - w/2, 55 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
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
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'bottom', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(fb.indices[128 * 320 + 254]).toBe(77)
    expect(fb.indices[(128 + 31) * 320 + (254 + 31)]).toBe(77)
  })

  it('center style → 不画 portrait', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'center', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(Array.from(fb.indices).some((i) => i === 77)).toBe(false)
  })

  it('top + portrait → text X 起始 ≥ 96', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('A', { style: 'top', portraitIcon: 5, fontColor: 200 })
    completeLine(state)
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
  it('waiting-page-key + blink=true → blit icon', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialogLine('A', { style: 'bottom' })
    completeLine(state)
    setWaitingPageKey(state)
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(true)
  })

  it('typing 中(phase=typing)→ 不画 icon', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialogLine('A long line', { style: 'bottom' })
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(false)
  })
})

describe('Sync.2 DialogBox · MAX_LINES_PER_PAGE 真值', () => {
  it('MAX_LINES_PER_PAGE = 4(sdlpal text.c:1649 nCurrentDialogLine > 3)', () => {
    expect(MAX_LINES_PER_PAGE).toBe(4)
  })
})
