import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createBootLoadingHost,
  mountBootOverlay,
  mountProgressNodes,
} from './__tests__/boot-loading-host.js'
import { initBootLoading, restoreBootFetch, setBootLoadingNote } from './boot-loading.js'

let host: ReturnType<typeof createBootLoadingHost>
beforeEach(() => {
  host = createBootLoadingHost()
})
afterEach(async () => {
  await host.close()
})
describe('Fetch accounting and ownership', () => {
  it('init 后 fetch 计数驱动状态文本与进度条(分母 = max(已发起, 预估总量))', async () => {
    mountBootOverlay()
    initBootLoading(4) // 预估 4 项
    expect(globalThis.fetch).not.toBe(host.transport)

    await Promise.all([fetch('/a'), fetch('/b'), fetch('/c')])
    await host.advanceRenderFrame()

    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toContain('3 / 4') // 完成 3 / 预估 4
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('75%')
  })
  it('进度单调不回退:新一波请求发起(分母涨)时显示值保持(2026-06-12 用户反馈条回退)', async () => {
    mountBootOverlay()
    initBootLoading(4)
    // 第一波完成 4/4，原始比例 100%，加载显示封顶 99%；finish 才补满。
    await Promise.all([fetch('/1'), fetch('/2'), fetch('/3'), fetch('/4')])
    await host.advanceRenderFrame()
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('99%')
    // 第二波:再发起 4 项未完成(挂着的 fetch 抬高分母)→ raw = 4/8 = 50,显示不回退仍 99
    const resolveResponses: Array<(response: Response) => void> = []
    host.transport.mockImplementation(
      () => new Promise<Response>((resolve) => resolveResponses.push(resolve)),
    )
    const requests = ['/5', '/6', '/7', '/8'].map((url) => fetch(url))
    try {
      await host.advanceRenderFrame()
      expect(document.getElementById('boot-loading-status')!.textContent).toBe('正在加载资源 4 / 8')
      expect(fill.style.width).toBe('99%')
    } finally {
      for (const resolve of resolveResponses) resolve(new Response('{}'))
      await Promise.all(requests)
    }
  })
  it('Request/init 与 Response 身份透传，包装层不丢 headers 或 signal', async () => {
    mountBootOverlay()
    const response = new Response('asset')
    host.transport.mockResolvedValue(response)
    initBootLoading()
    const request = new Request('https://assets.test/table.json')
    const init: RequestInit = {
      headers: { 'X-Boot': 'resource' },
      signal: new AbortController().signal,
    }
    expect(await fetch(request, init)).toBe(response)
    expect(host.transport).toHaveBeenCalledTimes(1)
    expect(host.transport).toHaveBeenCalledWith(request, init)
  })
  it('重复 init 幂等(不双层包 fetch)', () => {
    mountBootOverlay()
    initBootLoading()
    const once = globalThis.fetch
    initBootLoading()
    expect(globalThis.fetch).toBe(once)
  })
  it('释放计数时保留后来安装的 fetch 层及其请求透传', async () => {
    mountBootOverlay()
    const onProgress = vi.fn<(fraction: number) => void>()
    initBootLoading(2, onProgress)
    const bootFetch = globalThis.fetch
    const laterFetch: typeof fetch = (...args) => bootFetch(...args)
    vi.stubGlobal('fetch', laterFetch)

    restoreBootFetch()

    expect(globalThis.fetch).toBe(laterFetch)
    await fetch('/unrelated')
    await host.advanceRenderFrame()
    expect(host.transport).toHaveBeenCalledExactlyOnceWith('/unrelated')
    expect(onProgress).not.toHaveBeenCalled()
  })
  it('释放后在途请求照常完成，不计入随后新建的启动轮次', async () => {
    mountBootOverlay()
    let resolveResponse!: (response: Response) => void
    host.transport.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveResponse = resolve)),
    )
    initBootLoading(2)
    const inFlight = fetch('/old-round')
    const response = new Response('late asset')
    try {
      await host.advanceRenderFrame()
      restoreBootFetch()
      const fractions: number[] = []
      initBootLoading(2, (fraction) => fractions.push(fraction))
      await fetch('/new-round')
      await host.advanceRenderFrame()
      expect(fractions).toEqual([0.5])

      resolveResponse(response)
      expect(await inFlight).toBe(response)
      await host.advanceRenderFrame()
      expect(fractions).toEqual([0.5])
    } finally {
      resolveResponse(response)
      await inFlight
    }
  })
})

describe('Callback accounting boundaries', () => {
  it('fetch 拒绝后完成数仍加一', async () => {
    mountProgressNodes()
    const failure = new Error('net')
    globalThis.fetch = async () => {
      throw failure
    }
    initBootLoading(2)
    await expect(fetch('/a')).rejects.toBe(failure)
    await host.advanceRenderFrame()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 1 / 2')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('50%')
  })
  it('restoreBootFetch 还原 fetch，之后的请求不再回调进度', async () => {
    mountProgressNodes()
    const fractions: number[] = []
    initBootLoading(4, (fraction) => {
      fractions.push(fraction)
    })
    await fetch('/a')
    await host.advanceRenderFrame()
    restoreBootFetch()
    await fetch('/b')
    await host.advanceRenderFrame()
    expect(fractions).toEqual([0.25])
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载…')
  })
  it('预估和已发起都是 0 时，进度回调得到 0 且不写 DOM', async () => {
    mountProgressNodes()
    const fractions: number[] = []
    initBootLoading(0, (fraction) => {
      fractions.push(fraction)
    })
    setBootLoadingNote('空分母')
    await host.advanceRenderFrame()
    expect(fractions).toEqual([0])
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载…')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('')
  })
})
