import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initBootLoading, finishBootLoading, failBootLoading } from './boot-loading.js'

/** 注入 index.html 同款 overlay 骨架(id 必须与 boot-loading.ts 约定一致)。 */
function mountOverlay(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div></div>
      <div id="boot-loading-status">正在加载…</div>
    </div>`
}

const realFetch = globalThis.fetch

afterEach(() => {
  // 还原全局 fetch(失败的测试可能留 wrapper)
  finishBootLoading()
  globalThis.fetch = realFetch
  document.body.innerHTML = ''
  vi.useRealTimers()
})

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => new Response('{}')) as unknown as typeof fetch
})

/** flush rAF 节流的渲染(jsdom rAF 是宏任务,等一拍)。 */
async function flushRender(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => r(undefined)))
}

describe('boot-loading(启动加载覆盖层)', () => {
  it('init 后 fetch 计数驱动状态文本与进度条(分母 = max(已发起, 预估总量))', async () => {
    mountOverlay()
    initBootLoading(4) // 预估 4 项
    expect(globalThis.fetch).not.toBe(realFetch)

    await Promise.all([fetch('/a'), fetch('/b'), fetch('/c')])
    await flushRender()

    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toContain('3 / 4') // 完成 3 / 预估 4
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('75%')
  })

  it('进度单调不回退:新一波请求发起(分母涨)时显示值保持(2026-06-12 用户反馈条回退)', async () => {
    mountOverlay()
    const underlying = globalThis.fetch as ReturnType<typeof vi.fn> // wrapper 包之前抓底层 mock
    initBootLoading(4)
    // 第一波:4 项全完成 → raw 99(满格只由 finish 给)
    await Promise.all([fetch('/1'), fetch('/2'), fetch('/3'), fetch('/4')])
    await flushRender()
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('99%')
    // 第二波:再发起 4 项未完成(挂着的 fetch 抬高分母)→ raw = 4/8 = 50,显示不回退仍 99
    underlying.mockImplementation(() => new Promise<Response>(() => {})) // 永不 resolve
    void fetch('/5'); void fetch('/6'); void fetch('/7'); void fetch('/8')
    await flushRender()
    expect(fill.style.width).toBe('99%')
  })

  it('finish 还原 fetch、补满格并移除 overlay(过渡后)', async () => {
    mountOverlay()
    vi.useFakeTimers()
    initBootLoading()
    const wrapped = globalThis.fetch
    finishBootLoading()
    expect(globalThis.fetch).not.toBe(wrapped) // fetch 已还原
    expect(document.getElementById('boot-loading-fill')!.style.width).toBe('100%')
    vi.advanceTimersByTime(1000) // 淡出过渡后移除节点
    expect(document.getElementById('boot-loading')).toBeNull()
  })

  it('fail 显示错误文本、还原 fetch、overlay 保留', () => {
    mountOverlay()
    initBootLoading()
    failBootLoading('资源加载失败 (500)')
    const status = document.getElementById('boot-loading-status')!
    expect(status.textContent).toContain('资源加载失败')
    expect(document.getElementById('boot-loading')).not.toBeNull()
  })

  it('无 overlay 节点(单测/SSR)时全部 no-op 不抛错', async () => {
    expect(() => initBootLoading()).not.toThrow()
    expect(() => finishBootLoading()).not.toThrow()
    expect(() => failBootLoading('x')).not.toThrow()
    await expect(fetch('/ok')).resolves.toBeInstanceOf(Response) // fetch 未被包(或包了也透传)
  })

  it('重复 init 幂等(不双层包 fetch)', async () => {
    mountOverlay()
    initBootLoading()
    const once = globalThis.fetch
    initBootLoading()
    expect(globalThis.fetch).toBe(once)
  })
})
