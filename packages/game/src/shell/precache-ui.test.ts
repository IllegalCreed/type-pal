import { describe, expect, it, vi } from 'vitest'
import { installPrecacheUiTestHooks, mountBootLoading } from '../__tests__/precache-ui-host.js'
import { createPrecacheWidget, createUnifiedProgressUi } from './precache-ui.js'

installPrecacheUiTestHooks()

describe('createPrecacheWidget', () => {
  it('挂到 document.body，update 写完整字节进度和条宽', () => {
    const w = createPrecacheWidget()
    const el = document.getElementById('precache-widget')
    expect(el).not.toBeNull()
    w.update({ done: 50, total: 100, bytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024 })
    expect(el?.textContent).toBe('后台缓存资源 50% (5/10MB)')
    const fill = el?.lastElementChild?.firstElementChild
    expect(fill instanceof HTMLElement ? fill.style.width : '').toBe('50%')
  })
})

describe('createUnifiedProgressUi', () => {
  it('虚线前 setNecessaryProgress 映射到 0→虚线(12%),单调不回退', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5) // 0.5 × 12% = 6%
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('6%')
    expect(document.getElementById('boot-loading-status')!.textContent).toContain(
      '加载必要资源 50%',
    )
    ui.setNecessaryProgress(0.25) // 回退 → 不回退
    expect(fill.style.width).toBe('6%')
  })

  it.each(['necessary', 'full'])('%s 阶段失败后迟到进度保留错误文本和条宽', (phase) => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    if (phase === 'full') ui.markPlayable(() => {})
    else ui.setNecessaryProgress(0.5)
    const fill = document.getElementById('boot-loading-fill')!
    const widthAtFailure = fill.style.width
    ui.fail('主资源加载失败')

    ui.setNecessaryProgress(1)
    ui.setFullProgress(10 * 1024 * 1024, 20 * 1024 * 1024)

    expect(document.getElementById('boot-loading-status')!.textContent).toBe(
      '启动失败:主资源加载失败',
    )
    expect(fill.style.width).toBe(widthAtFailure)
    expect(document.getElementById('boot-loading')!.classList.contains('boot-loading-error')).toBe(
      true,
    )
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
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    expect(document.getElementById('boot-loading')!.classList.contains('boot-loading-done')).toBe(
      true,
    )
    expect(document.getElementById('precache-widget')).not.toBeNull()
    vi.advanceTimersByTime(600)
    expect(document.getElementById('boot-loading')).toBeNull()
    ui.setFullProgress(336 * 1024 * 1024, 336 * 1024 * 1024)
    expect(document.getElementById('precache-widget')!.textContent).toContain('100%')
    ui.done()
    expect(document.getElementById('precache-widget')?.style.opacity).toBe('0')
    vi.advanceTimersByTime(600)
    expect(document.getElementById('precache-widget')).toBeNull()
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
