import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dumpHost, readHost } from '../__tests__/grok-render-r1/dump-evidence.js'
import { createPrecacheUiTestHost, mountBootLoading } from '../__tests__/precache-ui-host.js'
import { createUnifiedProgressUi } from './precache-ui.js'

const host = createPrecacheUiTestHost()
beforeEach(host.prepare)
afterEach(host.close)

describe('Unified progress and entry lifecycle', () => {
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

describe('Progress boundaries and missing nodes', () => {
  function fillWidth(): string {
    return document.getElementById('boot-loading-fill')?.style.width ?? ''
  }

  function statusText(): string {
    return document.getElementById('boot-loading-status')?.textContent ?? ''
  }
  it('playableFraction 0.25 把虚线放在 25%，必要资源满格也停在 25%', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi({ playableFraction: 0.25 })
    expect(document.getElementById('boot-loading-mark')?.style.left).toBe('25%')
    ui.setNecessaryProgress(1)
    expect(fillWidth()).toBe('25%')
    expect(statusText()).toBe('加载必要资源 100%')
  })
  it('负数的必要进度钳到 0%', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(-0.2)
    expect(fillWidth()).toBe('0%')
    expect(statusText()).toBe('加载必要资源 0%')
  })
  it('大于 1 的必要进度钳到虚线 12%', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(1.5)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('加载必要资源 100%')
  })
  it('非有限必要进度不污染单调状态，后续合法进度仍可更新', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(Number.NaN)
    expect(fillWidth()).toBe('')
    expect(statusText()).toBe('')
    ui.setNecessaryProgress(0.5)
    expect(fillWidth()).toBe('6%')
    expect(statusText()).toBe('加载必要资源 50%')
  })
  it('过了虚线之后 setNecessaryProgress 不再改文案', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setNecessaryProgress(1)
    expect(statusText()).toBe('必要资源就绪 — 可进入')
    expect(fillWidth()).toBe('12%')
  })
  it('第二次 markPlayable 不调用 onEnter', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    const onEnter = vi.fn()
    const repeated = vi.fn()
    ui.markPlayable(onEnter)
    ui.markPlayable(repeated)
    expect(onEnter).not.toHaveBeenCalled()
    expect(repeated).not.toHaveBeenCalled()
    document.getElementById('boot-loading-enter-btn')?.dispatchEvent(new MouseEvent('click'))
    expect(onEnter).toHaveBeenCalledOnce()
    expect(repeated).not.toHaveBeenCalled()
  })
  it('没有进入按钮容器时 markPlayable 立刻放行', async () => {
    document.body.innerHTML = `
      <div id="boot-loading">
        <div id="boot-loading-fill"></div>
        <div id="boot-loading-status"></div>
      </div>`
    const ui = createUnifiedProgressUi()
    let calls = 0
    ui.markPlayable(() => {
      calls += 1
    })
    expect(calls).toBe(1)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('必要资源就绪 — 可进入')
    await dumpHost('G09-D08', [
      readHost(
        'enter-without-button',
        document.getElementById('boot-loading-status'),
        document.getElementById('boot-loading-fill'),
        document.getElementById('boot-loading'),
      ),
    ])
  })
  it('有容器但没有按钮时立刻放行，容器保持 hidden', () => {
    document.body.innerHTML = `
      <div id="boot-loading">
        <div id="boot-loading-fill"></div>
        <div id="boot-loading-status"></div>
        <div id="boot-loading-enter" hidden></div>
      </div>`
    const ui = createUnifiedProgressUi()
    let calls = 0
    ui.markPlayable(() => {
      calls += 1
    })
    expect(calls).toBe(1)
    expect(document.getElementById('boot-loading-enter')?.hasAttribute('hidden')).toBe(true)
  })
  it('全量阶段总字节为 0 时条宽停在虚线，文案是 0/0MB', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(0, 0)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('已缓存 0/0MB')
  })
  it('非有限全量字节被忽略，后续合法进度仍可更新', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(Number.NaN, 100)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('必要资源就绪 — 可进入')
    ui.setFullProgress(50 * 1024 * 1024, 100 * 1024 * 1024)
    expect(fillWidth()).toBe('50%')
    expect(statusText()).toBe('已缓存 50/100MB')
  })
  it('第二次 enterGame 不再多挂一个小组件', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    ui.enterGame()
    expect(document.querySelectorAll('#precache-widget').length).toBe(1)
  })
  it('没有记过总字节时，小组件保持占位文案', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存中…')
  })
  it('进入之后 fail 不再给覆盖层加错误类', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    ui.fail('晚了')
    const root = document.getElementById('boot-loading')
    expect(root?.classList.contains('boot-loading-error')).toBe(false)
    expect(root?.classList.contains('boot-loading-done')).toBe(true)
  })
  it('没有状态节点时 fail 仍加上错误类', () => {
    document.body.innerHTML = '<div id="boot-loading"><div id="boot-loading-fill"></div></div>'
    const ui = createUnifiedProgressUi()
    ui.fail('无状态')
    expect(document.getElementById('boot-loading')?.classList.contains('boot-loading-error')).toBe(
      true,
    )
    expect(document.getElementById('boot-loading-status')).toBeNull()
  })
  it('必要阶段收到的全量字节在 enterGame 时写进小组件', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setFullProgress(10 * 1024 * 1024, 40 * 1024 * 1024)
    expect(fillWidth()).toBe('')
    ui.enterGame()
    expect(document.getElementById('precache-widget')?.textContent).toBe(
      '后台缓存资源 25% (10/40MB)',
    )
  })
  it('没有进度条时必要进度仍写状态文案', () => {
    document.body.innerHTML = '<div id="boot-loading"><div id="boot-loading-status"></div></div>'
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5)
    expect(document.getElementById('boot-loading-fill')).toBeNull()
    expect(statusText()).toBe('加载必要资源 50%')
  })
  it('没有状态节点时必要进度仍写 6% 条宽', () => {
    document.body.innerHTML = '<div id="boot-loading"><div id="boot-loading-fill"></div></div>'
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5)
    expect(fillWidth()).toBe('6%')
    expect(document.getElementById('boot-loading-status')).toBeNull()
  })
  it('进入按钮的 click 只触发一次 onEnter', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    let calls = 0
    ui.markPlayable(() => {
      calls += 1
    })
    const btn = document.getElementById('boot-loading-enter-btn')
    btn?.dispatchEvent(new MouseEvent('click'))
    btn?.dispatchEvent(new MouseEvent('click'))
    expect(calls).toBe(1)
  })
  it('没有覆盖层时 enterGame 仍挂上占位小组件', () => {
    const ui = createUnifiedProgressUi()
    ui.enterGame()
    expect(document.getElementById('boot-loading')).toBeNull()
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存中…')
  })
})
