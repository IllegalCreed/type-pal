import { describe, it, expect } from 'vitest'
import { createFramebuffer } from './framebuffer.js'
import {
  startDialog,
  tickDialog,
  nextPage,
  getDialogBoxRect,
  drawDialogBox,
  FRAMES_PER_CHAR,
} from './dialog-box.js'

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

  it('isComplete=true 时 keyIconBlink 是 boolean(不报错)', () => {
    const s = startDialog('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.isComplete).toBe(true)
    for (let i = 0; i < 60; i++) tickDialog(s)
    expect(typeof s.keyIconBlink).toBe('boolean')
  })

  it('isComplete 后继续 tick — keyIconBlink 在 blink-period 内切换', () => {
    const s = startDialog('A', { style: 'bottom' })
    // complete it
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    const firstBlink = s.keyIconBlink
    // tick enough to cross at least 2 blink-periods (at period=16, 40 frames crosses 2)
    for (let i = 0; i < 40; i++) tickDialog(s)
    // after 40 more frames we've crossed blink-periods; blink should have been different at some point
    // Rather than asserting exact value, verify it differs from what it'd be after just 1 period
    const blinkAfter16 = (() => {
      const s2 = startDialog('A', { style: 'bottom' })
      for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s2)
      for (let i = 0; i < 16; i++) tickDialog(s2)
      return s2.keyIconBlink
    })()
    // After 16 frames (one blink period), keyIconBlink should have flipped
    expect(blinkAfter16).not.toBe(firstBlink)
  })
})

describe('Sync.2 DialogBox · nextPage 三段式', () => {
  it('typing 进行中 → 跳至当前页末(skip typing),return true,不翻页', () => {
    const s = startDialog('hello world', { style: 'bottom' })
    tickDialog(s); tickDialog(s)  // 只跑 2 帧,远未完
    expect(s.charsRevealed).toBeLessThan('hello world'.length)
    const result = nextPage(s)
    expect(result).toBe(true)
    expect(s.charsRevealed).toBe('hello world'.length)
    expect(s.isComplete).toBe(true)
    expect(s.currentPage).toBe(0)  // 未翻页
  })

  it('isComplete + 有下一页 → 翻页 + 重置 typing,return true', () => {
    const s = startDialog('A\rB', { style: 'bottom' })
    // complete 第一页
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
    expect(completeAndFlip()).toBe(true)  // P1 → P2
    expect(completeAndFlip()).toBe(true)  // P2 → P3
    expect(completeAndFlip()).toBe(false) // P3 → end
  })
})

describe('Sync.2 DialogBox · getDialogBoxRect', () => {
  it('4 styles 返回不同 y 坐标', () => {
    const top = getDialogBoxRect('top')
    const center = getDialogBoxRect('center')
    const bottom = getDialogBoxRect('bottom')
    const narration = getDialogBoxRect('narration')
    // top 在屏幕上方 → y 最小
    expect(top.y).toBeLessThan(center.y)
    expect(center.y).toBeLessThan(bottom.y)
    // narration 与 bottom 位置相同(sdlpal 行为:无边框版)
    expect(narration.y).toBe(bottom.y)
  })

  it('所有 rects w > 0 && h > 0', () => {
    for (const style of ['top', 'center', 'bottom', 'narration'] as const) {
      const r = getDialogBoxRect(style)
      expect(r.w).toBeGreaterThan(0)
      expect(r.h).toBeGreaterThan(0)
    }
  })
})

describe('Sync.2 DialogBox · drawDialogBox', () => {
  it('基本绘制不抛错,且 fb 有像素(边框)', () => {
    const fb = createFramebuffer()
    const state = startDialog('你好', { style: 'bottom' })
    tickDialog(state)
    const ok = () => drawDialogBox(fb, state, undefined)
    expect(ok).not.toThrow()
    // 边框色 255 应存在
    const hasBorder = Array.from(fb.indices).some((i) => i === 255)
    expect(hasBorder).toBe(true)
  })

  it('charsRevealed=0 时文本区域比 charsRevealed>0 时更"空"(字像素更少)', () => {
    const fb0 = createFramebuffer()
    const s0 = startDialog('你好', { style: 'bottom', fontColor: 200 })
    drawDialogBox(fb0, s0, undefined)
    const count0 = Array.from(fb0.indices).filter((i) => i === 200).length

    const fb1 = createFramebuffer()
    const s1 = startDialog('你好', { style: 'bottom', fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR * 2; i++) tickDialog(s1)
    drawDialogBox(fb1, s1, undefined)
    const count1 = Array.from(fb1.indices).filter((i) => i === 200).length

    // 更多字显示 → 更多该颜色像素
    expect(count1).toBeGreaterThan(count0)
  })

  it('shadow=true → box 区域内有两种深度像素(主色 200 + 阴影色 50)', () => {
    const fb = createFramebuffer()
    const state = startDialog('A', { style: 'bottom', shadow: true, fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR * 10; i++) tickDialog(state)
    drawDialogBox(fb, state, undefined)
    // 主色(200)和阴影色(50)都应出现
    const hasMain = Array.from(fb.indices).some((i) => i === 200)
    const hasShadow = Array.from(fb.indices).some((i) => i === 50)
    expect(hasMain).toBe(true)
    expect(hasShadow).toBe(true)
  })

  it('4 styles 绘制不抛错', () => {
    for (const style of ['top', 'center', 'bottom', 'narration'] as const) {
      const fb = createFramebuffer()
      const state = startDialog('x', { style })
      const ok = () => drawDialogBox(fb, state, undefined)
      expect(ok).not.toThrow()
    }
  })

  it('narration 样式无边框 — 边框像素数为 0(无白色 255 来自边框)', () => {
    // narration 用 noBorder=true,背景全 0
    const fb = createFramebuffer()
    const state = startDialog('x', { style: 'narration' })
    drawDialogBox(fb, state, undefined)
    // narration 没有边框,因此没有 255 像素(字也未显示,charsRevealed=0)
    const has255 = Array.from(fb.indices).some((i) => i === 255)
    expect(has255).toBe(false)
  })
})
