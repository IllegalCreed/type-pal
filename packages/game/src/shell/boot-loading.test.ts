import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  failBootLoading,
  finishBootLoading,
  initBootLoading,
  restoreBootFetch,
  setBootLoadingNote,
} from './boot-loading.js'

/** 注入 index.html 同款 overlay 骨架(id 必须与 boot-loading.ts 约定一致)。 */
function mountOverlay(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div></div>
      <div id="boot-loading-status">正在加载…</div>
    </div>`
}

let transport = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers()
  transport = vi.fn<typeof fetch>(async () => new Response('{}'))
  vi.stubGlobal('fetch', transport)
})

afterEach(async () => {
  restoreBootFetch()
  await flushRender() // Drain the pending render so its module-owned flag is cleared.
  vi.clearAllTimers()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})

async function flushRender(): Promise<void> {
  await vi.advanceTimersByTimeAsync(16)
}

describe('boot-loading(启动加载覆盖层)', () => {
  it('init 后 fetch 计数驱动状态文本与进度条(分母 = max(已发起, 预估总量))', async () => {
    mountOverlay()
    initBootLoading(4) // 预估 4 项
    expect(globalThis.fetch).not.toBe(transport)

    await Promise.all([fetch('/a'), fetch('/b'), fetch('/c')])
    await flushRender()

    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toContain('3 / 4') // 完成 3 / 预估 4
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('75%')
  })

  it('进度单调不回退:新一波请求发起(分母涨)时显示值保持(2026-06-12 用户反馈条回退)', async () => {
    mountOverlay()
    initBootLoading(4)
    // 第一波:4 项全完成 → raw 99(满格只由 finish 给)
    await Promise.all([fetch('/1'), fetch('/2'), fetch('/3'), fetch('/4')])
    await flushRender()
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('99%')
    // 第二波:再发起 4 项未完成(挂着的 fetch 抬高分母)→ raw = 4/8 = 50,显示不回退仍 99
    const resolveResponses: Array<(response: Response) => void> = []
    transport.mockImplementation(
      () => new Promise<Response>((resolve) => resolveResponses.push(resolve)),
    )
    const requests = ['/5', '/6', '/7', '/8'].map((url) => fetch(url))
    try {
      await flushRender()
      expect(document.getElementById('boot-loading-status')!.textContent).toBe('正在加载资源 4 / 8')
      expect(fill.style.width).toBe('99%')
    } finally {
      for (const resolve of resolveResponses) resolve(new Response('{}'))
      await Promise.all(requests)
    }
  })

  it('Request/init 与 Response 身份透传，包装层不丢 headers 或 signal', async () => {
    mountOverlay()
    const response = new Response('asset')
    transport.mockResolvedValue(response)
    initBootLoading()
    const request = new Request('https://assets.test/table.json')
    const init: RequestInit = {
      headers: { 'X-Boot': 'resource' },
      signal: new AbortController().signal,
    }
    expect(await fetch(request, init)).toBe(response)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport).toHaveBeenCalledWith(request, init)
  })

  it('finish 还原 fetch、补满格并在 600ms 过渡后移除 overlay', () => {
    mountOverlay()
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
    mountOverlay()
    initBootLoading(4)
    await fetch('/a')
    setBootLoadingNote('音色库 31MB')
    await flushRender()
    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toBe('正在加载资源 1 / 4 — 音色库 31MB')
    setBootLoadingNote('')
    await flushRender()
    expect(status.textContent).toBe('正在加载资源 1 / 4')
  })

  it('无 overlay 节点时不包装 fetch，公开入口安全', async () => {
    expect(() => initBootLoading()).not.toThrow()
    expect(() => finishBootLoading()).not.toThrow()
    expect(() => failBootLoading('x')).not.toThrow()
    expect(() => setBootLoadingNote('x')).not.toThrow()
    expect(globalThis.fetch).toBe(transport)
    await expect(fetch('/ok')).resolves.toBeInstanceOf(Response)
  })

  it('重复 init 幂等(不双层包 fetch)', () => {
    mountOverlay()
    initBootLoading()
    const once = globalThis.fetch
    initBootLoading()
    expect(globalThis.fetch).toBe(once)
  })

  it('未 init(PROD 走 SW 统一进度)时 render 不抢写 #boot-loading-status/fill', async () => {
    mountOverlay()
    const status = document.getElementById('boot-loading-status')!
    const fill = document.getElementById('boot-loading-fill')!
    // 模拟 createUnifiedProgressUi 已写入统一进度
    status.textContent = '已缓存 100/336MB (30%)'
    fill.style.width = '30%'
    // PROD 下 bootstrap 也会调 setBootLoadingNote,但未 initBootLoading → render 须 no-op,不得覆盖
    setBootLoadingNote('音色库')
    await flushRender()
    expect(status.textContent).toBe('已缓存 100/336MB (30%)')
    expect(fill.style.width).toBe('30%')
  })

  it('PROD 模式(传 onProgress)→ render 回调 fraction、不写 #boot-loading DOM', async () => {
    mountOverlay()
    const fractions: number[] = []
    initBootLoading(4, (f) => fractions.push(f))
    await Promise.all([fetch('/a'), fetch('/b')]) // _done 2 / max(2,4)
    await flushRender()
    expect(fractions.at(-1)).toBeCloseTo(0.5)
    // DOM 未被 boot-loading 写(虚线前段由统一 UI 渲染)
    expect(document.getElementById('boot-loading-status')!.textContent).toBe('正在加载…')
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('')
  })
})
