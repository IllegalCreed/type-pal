/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G09-D。
 * 零字节、自定义虚线、缺按钮和进入后的错误门。不重领默认 12% 单调和按钮点击。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dumpHost, readHost } from '../__tests__/grok-render-r1/dump-evidence.js'
import { createPrecacheWidget, createUnifiedProgressUi } from './precache-ui.js'

function mount(html: string): void {
  document.body.innerHTML = html
}

function fullBoot(): void {
  mount(`
    <div id="boot-loading">
      <div id="boot-loading-bar">
        <div id="boot-loading-fill"></div>
        <div id="boot-loading-mark"></div>
      </div>
      <div id="boot-loading-status"></div>
      <div id="boot-loading-enter" hidden><button id="boot-loading-enter-btn"></button></div>
    </div>`)
}

function fillWidth(): string {
  return document.getElementById('boot-loading-fill')?.style.width ?? ''
}

function statusText(): string {
  return document.getElementById('boot-loading-status')?.textContent ?? ''
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('G09-D 预缓存宿主', () => {
  it('G09-D01 总字节为 0 时小组件百分比和条宽都是 0', async () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 0, total: 0, bytes: 0, totalBytes: 0 })
    const el = document.getElementById('precache-widget')
    const bar = el?.children[1]
    const fill = bar?.children[0]
    expect(fill instanceof HTMLElement ? fill.style.width : '').toBe('0%')
    expect(el?.textContent).toBe('后台缓存资源 0% (0/0MB)')
    await dumpHost('G09-D01', [
      readHost('precache-zero', el, fill instanceof HTMLElement ? fill : null, el),
    ])
  })

  it('G09-D02 半兆字节按四舍五入写成 1MB，百分比取 floor', () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 0, total: 0, bytes: 524288, totalBytes: 1048576 })
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存资源 50% (1/1MB)')
  })

  it('G09-D03 playableFraction 0.25 把虚线放在 25%，必要资源满格也停在 25%', () => {
    fullBoot()
    const ui = createUnifiedProgressUi({ playableFraction: 0.25 })
    expect(document.getElementById('boot-loading-mark')?.style.left).toBe('25%')
    ui.setNecessaryProgress(1)
    expect(fillWidth()).toBe('25%')
    expect(statusText()).toBe('加载必要资源 100%')
  })

  it('G09-D04 负数的必要进度钳到 0%', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(-0.2)
    expect(fillWidth()).toBe('0%')
    expect(statusText()).toBe('加载必要资源 0%')
  })

  it('G09-D05 大于 1 的必要进度钳到虚线 12%', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(1.5)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('加载必要资源 100%')
  })

  it('G09-D06 过了虚线之后 setNecessaryProgress 不再改文案', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setNecessaryProgress(1)
    expect(statusText()).toBe('必要资源就绪 — 可进入')
    expect(fillWidth()).toBe('12%')
  })

  it('G09-D07 第二次 markPlayable 不调用 onEnter', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    let calls = 0
    const onEnter = (): void => {
      calls += 1
    }
    ui.markPlayable(onEnter)
    ui.markPlayable(onEnter)
    expect(calls).toBe(0)
    document.getElementById('boot-loading-enter-btn')?.dispatchEvent(new MouseEvent('click'))
    expect(calls).toBe(1)
  })

  it('G09-D08 没有进入按钮容器时 markPlayable 立刻放行', async () => {
    mount(`
      <div id="boot-loading">
        <div id="boot-loading-fill"></div>
        <div id="boot-loading-status"></div>
      </div>`)
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

  it('G09-D09 有容器但没有按钮时立刻放行，容器保持 hidden', () => {
    mount(`
      <div id="boot-loading">
        <div id="boot-loading-fill"></div>
        <div id="boot-loading-status"></div>
        <div id="boot-loading-enter" hidden></div>
      </div>`)
    const ui = createUnifiedProgressUi()
    let calls = 0
    ui.markPlayable(() => {
      calls += 1
    })
    expect(calls).toBe(1)
    expect(document.getElementById('boot-loading-enter')?.hasAttribute('hidden')).toBe(true)
  })

  it('G09-D10 全量阶段总字节为 0 时条宽停在虚线，文案是 0/0MB', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(0, 0)
    expect(fillWidth()).toBe('12%')
    expect(statusText()).toBe('已缓存 0/0MB')
  })

  it('G09-D11 第二次 enterGame 不再多挂一个小组件', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    ui.enterGame()
    expect(document.querySelectorAll('#precache-widget').length).toBe(1)
  })

  it('G09-D12 没有记过总字节时，小组件保持占位文案', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存中…')
  })

  it('G09-D13 进入之后 fail 不再给覆盖层加错误类', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.enterGame()
    ui.fail('晚了')
    const root = document.getElementById('boot-loading')
    expect(root?.classList.contains('boot-loading-error')).toBe(false)
    expect(root?.classList.contains('boot-loading-done')).toBe(true)
  })

  it('G09-D14 没有状态节点时 fail 仍加上错误类', () => {
    mount('<div id="boot-loading"><div id="boot-loading-fill"></div></div>')
    const ui = createUnifiedProgressUi()
    ui.fail('无状态')
    expect(document.getElementById('boot-loading')?.classList.contains('boot-loading-error')).toBe(
      true,
    )
    expect(document.getElementById('boot-loading-status')).toBeNull()
  })

  it('G09-D15 必要阶段收到的全量字节在 enterGame 时写进小组件', () => {
    fullBoot()
    const ui = createUnifiedProgressUi()
    ui.setFullProgress(10 * 1024 * 1024, 20 * 1024 * 1024)
    expect(fillWidth()).toBe('')
    ui.enterGame()
    expect(document.getElementById('precache-widget')?.textContent).toBe(
      '后台缓存资源 50% (10/20MB)',
    )
  })

  it('G09-D16 没有进度条时必要进度仍写状态文案', () => {
    mount('<div id="boot-loading"><div id="boot-loading-status"></div></div>')
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5)
    expect(document.getElementById('boot-loading-fill')).toBeNull()
    expect(statusText()).toBe('加载必要资源 50%')
  })

  it('G09-D17 没有状态节点时必要进度仍写 6% 条宽', () => {
    mount('<div id="boot-loading"><div id="boot-loading-fill"></div></div>')
    const ui = createUnifiedProgressUi()
    ui.setNecessaryProgress(0.5)
    expect(fillWidth()).toBe('6%')
    expect(document.getElementById('boot-loading-status')).toBeNull()
  })

  it('G09-D18 进入按钮的 click 只触发一次 onEnter', () => {
    fullBoot()
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

  it('G09-D19 没有覆盖层时 enterGame 仍挂上占位小组件', () => {
    const ui = createUnifiedProgressUi()
    ui.enterGame()
    expect(document.getElementById('boot-loading')).toBeNull()
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存中…')
  })

  it('G09-D20 done 立刻把透明度设为 0，599ms 仍在，600ms 移除', async () => {
    vi.useFakeTimers()
    const widget = createPrecacheWidget()
    widget.done()
    const el = document.getElementById('precache-widget')
    expect(el?.style.opacity).toBe('0')
    const atDone = readHost('done', el, null, el)
    atDone.flags = [`opacity:${el?.style.opacity ?? ''}`, ...atDone.flags]
    vi.advanceTimersByTime(599)
    const mid = document.getElementById('precache-widget')
    expect(mid).not.toBeNull()
    const at599 = readHost('599ms', mid, null, mid)
    at599.flags = [`opacity:${mid?.style.opacity ?? ''}`, ...at599.flags]
    vi.advanceTimersByTime(1)
    expect(document.getElementById('precache-widget')).toBeNull()
    vi.useRealTimers()
    await dumpHost('G09-D20', [
      atDone,
      at599,
      { label: '600ms', text: '', width: '', flags: ['absent'] },
    ])
  })
})
