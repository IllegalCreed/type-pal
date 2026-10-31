import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dumpHost, readHost } from '../__tests__/grok-render-r1/dump-evidence.js'
import {
  createBootLoadingHost,
  mountBootOverlay,
  mountProgressNodes,
} from './__tests__/boot-loading-host.js'
import {
  failBootLoading,
  finishBootLoading,
  initBootLoading,
  setBootLoadingNote,
} from './boot-loading.js'

let host: ReturnType<typeof createBootLoadingHost>
beforeEach(() => {
  host = createBootLoadingHost()
})
afterEach(async () => {
  await host.close()
})
describe('Overlay lifecycle and notes', () => {
  it('finish 还原 fetch、补满格并在 600ms 过渡后移除 overlay', () => {
    mountBootOverlay()
    initBootLoading()
    const wrapped = globalThis.fetch
    finishBootLoading()
    expect(globalThis.fetch).not.toBe(wrapped) // fetch 已还原
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('100%')
    vi.advanceTimersByTime(599)
    expect(document.getElementById('boot-loading')?.classList.contains('boot-loading-done')).toBe(
      true,
    )
    vi.advanceTimersByTime(1)
    expect(document.getElementById('boot-loading')).toBeNull()
  })
  it('setBootLoadingNote 追加说明到计数文本,清空恢复(soundfont 尾段等待文案)', async () => {
    mountBootOverlay()
    initBootLoading(4)
    await fetch('/a')
    setBootLoadingNote('音色库 31MB')
    await host.advanceRenderFrame()
    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toBe('正在加载资源 1 / 4 — 音色库 31MB')
    setBootLoadingNote('')
    await host.advanceRenderFrame()
    expect(status.textContent).toBe('正在加载资源 1 / 4')
  })
  it('无 overlay 节点时不包装 fetch，公开入口安全', async () => {
    expect(() => initBootLoading()).not.toThrow()
    expect(() => finishBootLoading()).not.toThrow()
    expect(() => failBootLoading('x')).not.toThrow()
    expect(() => setBootLoadingNote('x')).not.toThrow()
    expect(globalThis.fetch).toBe(host.transport)
    await expect(fetch('/ok')).resolves.toBeInstanceOf(Response)
  })
  it('未 init(PROD 走 SW 统一进度)时 render 不抢写 #boot-loading-status/fill', async () => {
    mountBootOverlay()
    const status = document.getElementById('boot-loading-status')!
    const fill = document.getElementById('boot-loading-fill')!
    // 模拟 createUnifiedProgressUi 已写入统一进度
    status.textContent = '已缓存 100/336MB (30%)'
    fill.style.width = '30%'
    // PROD 下 bootstrap 也会调 setBootLoadingNote,但未 initBootLoading → render 须 no-op,不得覆盖
    setBootLoadingNote('音色库')
    await host.advanceRenderFrame()
    expect(status.textContent).toBe('已缓存 100/336MB (30%)')
    expect(fill.style.width).toBe('30%')
  })
  it('PROD 模式(传 onProgress)→ render 回调 fraction、不写 #boot-loading DOM', async () => {
    mountBootOverlay()
    const fractions: number[] = []
    initBootLoading(4, (f) => fractions.push(f))
    await Promise.all([fetch('/a'), fetch('/b')]) // _done 2 / max(2,4)
    await host.advanceRenderFrame()
    expect(fractions.at(-1)).toBeCloseTo(0.5)
    // DOM 未被 boot-loading 写(虚线前段由统一 UI 渲染)
    expect(document.getElementById('boot-loading-status')!.textContent).toBe('正在加载…')
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('')
  })
})

describe('Progress nodes and render scheduling', () => {
  it('不传预估总量时，状态文本的分母是 810，进度条为 0%', async () => {
    mountProgressNodes()
    initBootLoading()
    setBootLoadingNote('')
    await host.advanceRenderFrame()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 0 / 810')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('0%')
    await dumpHost('G09-C01', [
      readHost(
        'boot-default',
        document.getElementById('boot-loading-status'),
        document.getElementById('boot-loading-fill'),
        document.getElementById('boot-loading'),
      ),
    ])
  })
  it('只有状态节点时写入 1 / 4', async () => {
    mountProgressNodes({ fill: false })
    initBootLoading(4)
    await fetch('/a')
    await host.advanceRenderFrame()
    expect(document.getElementById('boot-loading-fill')).toBeNull()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 1 / 4')
  })
  it('只有进度条时宽度写成 25%', async () => {
    mountProgressNodes({ status: false })
    initBootLoading(4)
    await fetch('/a')
    await host.advanceRenderFrame()
    expect(document.getElementById('boot-loading-status')).toBeNull()
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('25%')
    await dumpHost('G09-C04', [
      readHost(
        'fill-only',
        document.getElementById('boot-loading-status'),
        document.getElementById('boot-loading-fill'),
        document.getElementById('boot-loading'),
      ),
    ])
  })
  it('没有状态节点时失败仍加上错误类，之后的说明不再改条宽', async () => {
    mountProgressNodes({ status: false })
    initBootLoading(4)
    failBootLoading('无状态')
    const root = document.getElementById('boot-loading')
    const fill = document.getElementById('boot-loading-fill')
    expect(root?.classList.contains('boot-loading-error')).toBe(true)
    expect(document.getElementById('boot-loading-status')).toBeNull()
    if (fill) fill.style.width = '12%'
    setBootLoadingNote('不该写')
    await host.advanceRenderFrame()
    expect(fill?.style.width).toBe('12%')
  })
  it('没有进度条时完成仍淡出并在 600ms 后移除', () => {
    mountProgressNodes({ fill: false })

    initBootLoading(4)
    finishBootLoading()
    const root = document.getElementById('boot-loading')
    expect(root?.classList.contains('boot-loading-done')).toBe(true)
    vi.advanceTimersByTime(600)
    expect(document.getElementById('boot-loading')).toBeNull()
  })
  it('同一帧里的两次说明只排一次 rAF，文本留下后一次', async () => {
    mountProgressNodes()
    initBootLoading(4)
    const schedule = vi.spyOn(globalThis, 'requestAnimationFrame')
    setBootLoadingNote('甲')
    setBootLoadingNote('乙')
    expect(schedule).toHaveBeenCalledTimes(1)
    await host.advanceRenderFrame()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      '正在加载资源 0 / 4 — 乙',
    )
  })
  it('requestAnimationFrame 不是函数时，改用 16ms 的 setTimeout 写出说明', async () => {
    mountProgressNodes()
    initBootLoading(4)
    vi.stubGlobal('requestAnimationFrame', undefined)
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    setBootLoadingNote('只等超时')
    expect(timeout.mock.calls.map((call) => call[1])).toEqual([16])
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(15)
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载…')
    await vi.advanceTimersByTimeAsync(1)
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      '正在加载资源 0 / 4 — 只等超时',
    )
  })
  it('失败文案是启动失败加原文，并带上错误类', async () => {
    mountProgressNodes()
    initBootLoading(4)
    const root = document.getElementById('boot-loading')
    const wrapped = globalThis.fetch
    failBootLoading('磁盘满')
    expect(globalThis.fetch).not.toBe(wrapped)
    expect(document.getElementById('boot-loading')).toBe(root)
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('启动失败:磁盘满')
    expect(document.getElementById('boot-loading')?.classList.contains('boot-loading-error')).toBe(
      true,
    )
    await dumpHost('G09-C11', [
      readHost(
        'boot-failed',
        document.getElementById('boot-loading-status'),
        document.getElementById('boot-loading-fill'),
        document.getElementById('boot-loading'),
      ),
    ])
  })
})
