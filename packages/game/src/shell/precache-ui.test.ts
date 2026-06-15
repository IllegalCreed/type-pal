import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPrecacheWidget, createUnifiedProgressUi } from './precache-ui.js'

afterEach(() => {
  vi.useRealTimers()
  document.getElementById('precache-widget')?.remove()
})

describe('createPrecacheWidget', () => {
  it('挂到 document.body,update 写百分比与 MB,done 后淡出移除', () => {
    vi.useFakeTimers()
    const w = createPrecacheWidget()
    const el = document.getElementById('precache-widget')
    expect(el).not.toBeNull()
    w.update({ done: 50, total: 100, bytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024 })
    expect(el!.textContent).toContain('50%')
    expect(el!.textContent).toContain('5/10MB')
    w.done()
    // done() 触发 0.6s 淡出后从 DOM 移除(用 fake timers 推进动画时长再断言)
    vi.advanceTimersByTime(600)
    expect(document.getElementById('precache-widget')).toBeNull()
  })
})

function mountBootLoading(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div><div id="boot-loading-mark"></div></div>
      <div id="boot-loading-status"></div>
      <div id="boot-loading-enter" hidden><button id="boot-loading-enter-btn"></button></div>
    </div>`
}

describe('createUnifiedProgressUi', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('虚线前 setNecessaryProgress 映射到 0→虚线(12%),单调不回退', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5) // 0.5 × 12% = 6%
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('6%')
    expect(document.getElementById('boot-loading-status')!.textContent).toContain('加载必要资源 50%')
    ui.setNecessaryProgress(0.25) // 回退 → 不回退
    expect(fill.style.width).toBe('6%')
  })

  it('markPlayable:进度到虚线(12%)+ 显示按钮,click 同步触发 onEnter', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    const onEnter = vi.fn()
    ui.markPlayable(onEnter)
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('12%')
    const box = document.getElementById('boot-loading-enter')!
    expect(box.hasAttribute('hidden')).toBe(false)
    document.getElementById('boot-loading-enter-btn')!.dispatchEvent(new MouseEvent('click'))
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('虚线后 setFullProgress = SW 真实进度 bytes/total,单调不回退;necessary 段不响应', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setFullProgress(168 * 1024 * 1024, 336 * 1024 * 1024) // necessary 段忽略
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('') // 没写
    ui.markPlayable(() => {}) // 进 full,fill → 12%
    ui.setFullProgress(168 * 1024 * 1024, 336 * 1024 * 1024) // 50%
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('50%')
    expect(document.getElementById('boot-loading-status')!.textContent).toContain('168/336MB')
    ui.setFullProgress(84 * 1024 * 1024, 336 * 1024 * 1024) // 回退 → 不回退
    expect(fill.style.width).toBe('50%')
  })

  it('enterGame 移除覆盖层并建右上角 widget,之后 setFullProgress 走 widget', () => {
    vi.useFakeTimers()
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    expect(document.getElementById('boot-loading')!.classList.contains('boot-loading-done')).toBe(true)
    expect(document.getElementById('precache-widget')).not.toBeNull()
    vi.advanceTimersByTime(600)
    expect(document.getElementById('boot-loading')).toBeNull()
    ui.setFullProgress(336 * 1024 * 1024, 336 * 1024 * 1024)
    expect(document.getElementById('precache-widget')!.textContent).toContain('100%')
    ui.done()
    expect((document.getElementById('precache-widget') as HTMLElement).style.opacity).toBe('0')
  })

  it('进入前 SW 已 done(竞速等满 100%)→ enterGame 不建右上角 widget', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(336 * 1024 * 1024, 336 * 1024 * 1024) // 100%
    ui.done() // SW done 发生在进入之前(widget 尚未建)
    ui.enterGame()
    expect(document.getElementById('precache-widget')).toBeNull() // 不留空白进度框
  })

  it('enterGame 用最后进度初始化 widget,消除空白瞬间', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(168 * 1024 * 1024, 336 * 1024 * 1024) // 50%,记 lastBytes/lastTotal
    ui.enterGame()
    const w = document.getElementById('precache-widget')
    expect(w).not.toBeNull()
    expect(w!.textContent).toContain('50%') // 初始化即有内容,非空白
  })
})
