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

  it('态1 setProgress 写大条宽度与字节文本,单调不回退', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setProgress(168 * 1024 * 1024, 336 * 1024 * 1024) // 50%
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('50%')
    expect(document.getElementById('boot-loading-status')!.textContent).toContain('168/336MB')
    ui.setProgress(84 * 1024 * 1024, 336 * 1024 * 1024) // 回退到 25% → 不回退
    expect(fill.style.width).toBe('50%')
  })

  it('markPlayable 显示按钮,click 同步触发 onEnter', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    const onEnter = vi.fn()
    ui.markPlayable(onEnter)
    const box = document.getElementById('boot-loading-enter')!
    expect(box.hasAttribute('hidden')).toBe(false)
    document.getElementById('boot-loading-enter-btn')!.dispatchEvent(new MouseEvent('click'))
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('enterGame 移除覆盖层并建右上角 widget,之后 setProgress 走 widget', () => {
    vi.useFakeTimers()
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.enterGame()
    expect(document.getElementById('boot-loading')!.classList.contains('boot-loading-done')).toBe(true)
    expect(document.getElementById('precache-widget')).not.toBeNull()
    vi.advanceTimersByTime(600)
    expect(document.getElementById('boot-loading')).toBeNull()
    ui.setProgress(336 * 1024 * 1024, 336 * 1024 * 1024)
    expect(document.getElementById('precache-widget')!.textContent).toContain('100%')
    ui.done()
    expect((document.getElementById('precache-widget') as HTMLElement).style.opacity).toBe('0')
  })
})
