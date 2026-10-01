/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G09-C。
 * 默认分母、缺节点、合并刷新和还原 fetch。不重领 3/4、99 封顶和 onProgress 0.5。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  failBootLoading,
  finishBootLoading,
  initBootLoading,
  restoreBootFetch,
  setBootLoadingNote,
} from './boot-loading.js'

const realFetch = globalThis.fetch

function mount(opts: { fill?: boolean; status?: boolean } = {}): void {
  const fill = opts.fill === false ? '' : '<div id="boot-loading-fill"></div>'
  const status = opts.status === false ? '' : '<div id="boot-loading-status">正在加载…</div>'
  document.body.innerHTML = `<div id="boot-loading">${fill}${status}</div>`
}

async function flushRender(): Promise<void> {
  await new Promise((resolve) => {
    requestAnimationFrame(() => resolve(undefined))
  })
}

beforeEach(() => {
  globalThis.fetch = (async () => new Response('{}')) as typeof fetch
})

afterEach(() => {
  finishBootLoading()
  globalThis.fetch = realFetch
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('G09-C 启动加载宿主', () => {
  it('G09-C01 不传预估总量时，状态文本的分母是 810，进度条为 0%', async () => {
    mount()
    initBootLoading()
    setBootLoadingNote('')
    await flushRender()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 0 / 810')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('0%')
  })

  it('G09-C02 fetch 拒绝后完成数仍加一', async () => {
    mount()
    globalThis.fetch = (async () => {
      throw new Error('net')
    }) as typeof fetch
    initBootLoading(2)
    await fetch('/a').then(
      () => undefined,
      () => undefined,
    )
    await flushRender()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 1 / 2')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('50%')
  })

  it('G09-C03 只有状态节点时写入 1 / 4', async () => {
    mount({ fill: false })
    initBootLoading(4)
    await fetch('/a')
    await flushRender()
    expect(document.getElementById('boot-loading-fill')).toBeNull()
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载资源 1 / 4')
  })

  it('G09-C04 只有进度条时宽度写成 25%', async () => {
    mount({ status: false })
    initBootLoading(4)
    await fetch('/a')
    await flushRender()
    expect(document.getElementById('boot-loading-status')).toBeNull()
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('25%')
  })

  it('G09-C05 没有状态节点时失败仍加上错误类，之后的说明不再改条宽', async () => {
    mount({ status: false })
    initBootLoading(4)
    failBootLoading('无状态')
    const root = document.getElementById('boot-loading')
    const fill = document.getElementById('boot-loading-fill')
    expect(root?.classList.contains('boot-loading-error')).toBe(true)
    expect(document.getElementById('boot-loading-status')).toBeNull()
    if (fill) fill.style.width = '12%'
    setBootLoadingNote('不该写')
    await flushRender()
    expect(fill?.style.width).toBe('12%')
  })

  it('G09-C06 没有进度条时完成仍淡出并在 600ms 后移除', () => {
    mount({ fill: false })
    vi.useFakeTimers()
    initBootLoading(4)
    finishBootLoading()
    const root = document.getElementById('boot-loading')
    expect(root?.classList.contains('boot-loading-done')).toBe(true)
    vi.advanceTimersByTime(600)
    expect(document.getElementById('boot-loading')).toBeNull()
  })

  it('G09-C07 restoreBootFetch 还原 fetch，之后的请求不再回调进度', async () => {
    mount()
    const fractions: number[] = []
    initBootLoading(4, (fraction) => {
      fractions.push(fraction)
    })
    await fetch('/a')
    await flushRender()
    restoreBootFetch()
    await fetch('/b')
    await flushRender()
    expect(fractions).toEqual([0.25])
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载…')
  })

  it('G09-C08 同一帧里的两次说明只排一次 rAF，文本留下后一次', async () => {
    mount()
    initBootLoading(4)
    const orig = globalThis.requestAnimationFrame.bind(globalThis)
    let calls = 0
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      calls += 1
      return orig(cb)
    }) as typeof requestAnimationFrame
    try {
      setBootLoadingNote('甲')
      setBootLoadingNote('乙')
      expect(calls).toBe(1)
      await flushRender()
      expect(document.getElementById('boot-loading-status')?.textContent).toBe(
        '正在加载资源 0 / 4 — 乙',
      )
    } finally {
      globalThis.requestAnimationFrame = orig as typeof requestAnimationFrame
    }
  })

  it('G09-C09 requestAnimationFrame 不是函数时，改用 16ms 的 setTimeout 写出说明', () => {
    mount()
    initBootLoading(4)
    const origRaf = globalThis.requestAnimationFrame
    const origTimeout = globalThis.setTimeout
    const queued: Array<{ ms: number; run: () => void }> = []
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    globalThis.setTimeout = ((handler: TimerHandler, ms?: number) => {
      if (typeof handler === 'function') queued.push({ ms: ms ?? 0, run: () => handler() })
      return 0
    }) as typeof setTimeout
    try {
      setBootLoadingNote('只等超时')
      expect(queued.length).toBe(1)
      expect(queued[0]?.ms).toBe(16)
      queued[0]?.run()
      expect(document.getElementById('boot-loading-status')?.textContent).toBe(
        '正在加载资源 0 / 4 — 只等超时',
      )
    } finally {
      globalThis.setTimeout = origTimeout
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: origRaf,
      })
    }
  })

  it('G09-C10 预估和已发起都是 0 时，进度回调得到 0 且不写 DOM', async () => {
    mount()
    const fractions: number[] = []
    initBootLoading(0, (fraction) => {
      fractions.push(fraction)
    })
    setBootLoadingNote('空分母')
    await flushRender()
    expect(fractions).toEqual([0])
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('正在加载…')
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe('')
  })

  it('G09-C11 失败文案是启动失败加原文，并带上错误类', () => {
    mount()
    initBootLoading(4)
    failBootLoading('磁盘满')
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('启动失败:磁盘满')
    expect(document.getElementById('boot-loading')?.classList.contains('boot-loading-error')).toBe(
      true,
    )
  })
})
