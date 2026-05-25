import { describe, it, expect } from 'vitest'
import { createFramebuffer } from './framebuffer.js'
import {
  startDialog,
  tickDialog,
  nextPage,
  getDialogBoxRect,
  getDialogTextPos,
  drawDialogBox,
  FRAMES_PER_CHAR,
  type DialogSprite,
} from './dialog-box.js'

/** 测试用 portrait/icon sprite — 固定 colorIdx,opaque mask 全 1。 */
function mockSprite(w: number, h: number, colorIdx: number): DialogSprite {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(colorIdx),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

describe('Sync.2 DialogBox · startDialog', () => {
  it('初始化 state:pages 按 \\r 切分 + 计数归零', () => {
    const s = startDialog('你好\r第二页', { style: 'top' })
    expect(s.pages).toEqual(['你好', '第二页'])
    expect(s.currentPage).toBe(0)
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.isComplete).toBe(false)
    expect(s.keyIconBlink).toBe(false)
  })

  it('无 \\r 时 pages = [text]', () => {
    const s = startDialog('单页', { style: 'bottom' })
    expect(s.pages).toEqual(['单页'])
  })

  it('defaults:fontColor=255, shadow=false, portraitIcon=undefined', () => {
    const s = startDialog('x', { style: 'bottom' })
    expect(s.fontColor).toBe(255)
    expect(s.shadow).toBe(false)
    expect(s.portraitIcon).toBeUndefined()
  })

  it('opts 覆盖 defaults', () => {
    const s = startDialog('x', { style: 'narration', fontColor: 12, shadow: true, portraitIcon: 3 })
    expect(s.fontColor).toBe(12)
    expect(s.shadow).toBe(true)
    expect(s.portraitIcon).toBe(3)
    expect(s.style).toBe('narration')
  })

  it('text 字段保留原始文本(含 \\r)', () => {
    const s = startDialog('A\rB', { style: 'bottom' })
    expect(s.text).toBe('A\rB')
  })
})

describe('Sync.2 DialogBox · tickDialog typing animation', () => {
  it(`每 ${FRAMES_PER_CHAR} frame 出 1 字`, () => {
    const s = startDialog('你好世界', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(1)
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(2)
  })

  it('isComplete 在 charsRevealed === pageText.length 时置 true', () => {
    const s = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(1)
    expect(s.isComplete).toBe(true)
  })

  it('isComplete 后 charsRevealed 不再增长(已达 pageText.length)', () => {
    const s = startDialog('AB', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR * 10; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(2)
    expect(s.isComplete).toBe(true)
  })

  it('isComplete 后 keyIconBlink 在 blink-period 内切换', () => {
    const s = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    const firstBlink = s.keyIconBlink

    const s2 = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s2)
    for (let i = 0; i < 16; i++) tickDialog(s2)
    expect(s2.keyIconBlink).not.toBe(firstBlink)
  })
})

describe('Sync.2 DialogBox · nextPage 三段式', () => {
  it('typing 进行中 → 跳至当前页末(skip typing),return true,不翻页', () => {
    const s = startDialog('hello world', { style: 'bottom' })
    expect(s.charsRevealed).toBeLessThan('hello world'.length)
    expect(s.isComplete).toBe(false)
    const result = nextPage(s)
    expect(result).toBe(true)
    expect(s.charsRevealed).toBe('hello world'.length)
    expect(s.isComplete).toBe(true)
    expect(s.currentPage).toBe(0)
  })

  it('isComplete + 有下一页 → 翻页 + 重置 typing,return true', () => {
    const s = startDialog('A\rB', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR * 20; i++) tickDialog(s)
    expect(s.isComplete).toBe(true)
    expect(s.currentPage).toBe(0)
    const result = nextPage(s)
    expect(result).toBe(true)
    expect(s.currentPage).toBe(1)
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.isComplete).toBe(false)
    expect(s.keyIconBlink).toBe(false)
  })

  it('isComplete + 最后一页 → return false(dialog 结束信号)', () => {
    const s = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR * 20; i++) tickDialog(s)
    expect(s.isComplete).toBe(true)
    const result = nextPage(s)
    expect(result).toBe(false)
  })

  it('多页:翻完所有页后最后 nextPage 返 false', () => {
    const s = startDialog('P1\rP2\rP3', { style: 'bottom' })
    function completeAndFlip(): boolean {
      for (let i = 0; i < FRAMES_PER_CHAR * 100; i++) tickDialog(s)
      return nextPage(s)
    }
    expect(completeAndFlip()).toBe(true)
    expect(completeAndFlip()).toBe(true)
    expect(completeAndFlip()).toBe(false)
  })
})

describe('Sync.2 DialogBox · getDialogBoxRect', () => {
  it('4 styles 返回不同 y 坐标', () => {
    const top = getDialogBoxRect('top')
    const center = getDialogBoxRect('center')
    const bottom = getDialogBoxRect('bottom')
    const narration = getDialogBoxRect('narration')
    expect(top.y).toBeLessThan(center.y)
    expect(center.y).toBeLessThan(bottom.y)
    expect(narration.y).toBe(bottom.y)
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

describe('Sync.2 DialogBox · drawDialogBox 不画 box bg(sdlpal upper/lower/center 真值)', () => {
  it('无文字 / 无 portrait → fb 完全空(palette 0 = 未写)', () => {
    const fb = createFramebuffer()
    const state = startDialog('x', { style: 'bottom' })
    drawDialogBox(fb, state, undefined, undefined)
    const nonZero = Array.from(fb.indices).some((i) => i !== 0)
    expect(nonZero).toBe(false)
  })

  it('有文字但无 portrait → 仅文本区域有像素,无 255 边框色', () => {
    const fb = createFramebuffer()
    const state = startDialog('A', { style: 'bottom', fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(state)
    drawDialogBox(fb, state, undefined, undefined)
    const has200 = Array.from(fb.indices).some((i) => i === 200)
    expect(has200).toBe(true)
    const has255 = Array.from(fb.indices).some((i) => i === 255)
    expect(has255).toBe(false)
  })

  it('charsRevealed=0 时文本像素比 charsRevealed>0 时少', () => {
    const fb0 = createFramebuffer()
    const s0 = startDialog('你好', { style: 'bottom', fontColor: 200 })
    drawDialogBox(fb0, s0, undefined, undefined)
    const count0 = Array.from(fb0.indices).filter((i) => i === 200).length

    const fb1 = createFramebuffer()
    const s1 = startDialog('你好', { style: 'bottom', fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR * 2; i++) tickDialog(s1)
    drawDialogBox(fb1, s1, undefined, undefined)
    const count1 = Array.from(fb1.indices).filter((i) => i === 200).length

    expect(count1).toBeGreaterThan(count0)
  })

  it('shadow=true → 两种颜色像素都存在(主色 200 + 阴影色 50)', () => {
    const fb = createFramebuffer()
    const state = startDialog('A', { style: 'bottom', shadow: true, fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR * 10; i++) tickDialog(state)
    drawDialogBox(fb, state, undefined, undefined)
    const hasMain = Array.from(fb.indices).some((i) => i === 200)
    const hasShadow = Array.from(fb.indices).some((i) => i === 50)
    expect(hasMain).toBe(true)
    expect(hasShadow).toBe(true)
  })

  it('4 styles 绘制不抛错', () => {
    for (const style of ['top', 'center', 'bottom', 'narration'] as const) {
      const fb = createFramebuffer()
      const state = startDialog('x', { style })
      const ok = () => drawDialogBox(fb, state, undefined, undefined)
      expect(ok).not.toThrow()
    }
  })
})

describe('Sync.2 DialogBox · portrait 真做(sdlpal text.c:1289-1310 真位置)', () => {
  it('top + portrait → blit 在 (48 - w/2, 55 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialog('hi', { style: 'top', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    // upper: x=48-16=32, y=55-16=39
    expect(fb.indices[39 * 320 + 32]).toBe(77)
    expect(fb.indices[(39 + 31) * 320 + (32 + 31)]).toBe(77)
    // (31, 39) 在 portrait 左外 → 0
    expect(fb.indices[39 * 320 + 31]).toBe(0)
  })

  it('bottom + portrait → blit 在 (270 - w/2, 144 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialog('hi', { style: 'bottom', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    // lower: x=270-16=254, y=144-16=128
    expect(fb.indices[128 * 320 + 254]).toBe(77)
    expect(fb.indices[(128 + 31) * 320 + (254 + 31)]).toBe(77)
  })

  it('center style → 不画 portrait(sdlpal center 不画)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialog('hi', { style: 'center', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    const has77 = Array.from(fb.indices).some((i) => i === 77)
    expect(has77).toBe(false)
  })

  it('top + portrait → text X 起始 ≥ 96(避让 portrait)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialog('A', { style: 'top', portraitIcon: 5, fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(state)
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

  it('portraitIcon 设了但 ctx 无对应 frame → 不渲染 portrait + text 走无 portrait 路径', () => {
    const fb = createFramebuffer()
    const state = startDialog('A', { style: 'top', portraitIcon: 99, fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(state)
    drawDialogBox(fb, state, undefined, { portraitFrames: new Map() })
    let minX = 320
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 200 && x < minX) minX = x
      }
    }
    expect(minX).toBeGreaterThanOrEqual(44)
    expect(minX).toBeLessThan(96)
  })
})

describe('Sync.2 DialogBox · key icon 真 sprite(sdlpal text.c:1391)', () => {
  it('isComplete + 有下页 + blink=true + ctx 有 icon → blit icon', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialog('A\rB', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(state)
    expect(state.isComplete).toBe(true)
    expect(state.keyIconBlink).toBe(true)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    const has99 = Array.from(fb.indices).some((i) => i === 99)
    expect(has99).toBe(true)
  })

  it('最后一页 complete → 不画 icon(无下页)', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    const has99 = Array.from(fb.indices).some((i) => i === 99)
    expect(has99).toBe(false)
  })
})
