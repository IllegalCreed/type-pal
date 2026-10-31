import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadyWorkerPort } from '../__tests__/precache-client-host.js'
import {
  createPrecacheClientTestHost,
  installServiceWorker,
} from '../__tests__/precache-client-host.js'

const host = createPrecacheClientTestHost()
beforeEach(host.prepare)
afterEach(host.close)
let client: typeof import('./precache-client.js')
beforeEach(async () => {
  vi.resetModules()
  client = await import('./precache-client.js')
})

describe('Service worker registration and messages', () => {
  it('PROD=false(dev/e2e)→ 不注册', async () => {
    const { container } = installServiceWorker()
    await client.registerPrecache({ isProd: false, onProgress: () => {} })
    expect(container.register).not.toHaveBeenCalled()
  })
  it('无 serviceWorker 能力 → 安全 no-op', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    await expect(
      client.registerPrecache({ isProd: true, onProgress: () => {} }),
    ).resolves.toBeUndefined()
  })
  it('PROD + SW → onReady 触发,但 registerPrecache 不自动触发预缓存;start/pause/resume 各发对应消息', async () => {
    const { container, post } = installServiceWorker()
    const onReady = vi.fn()
    await client.registerPrecache({ isProd: true, onProgress: () => {}, onReady })
    expect(container.register.mock.calls).toEqual([['/sw.js', { updateViaCache: 'none' }]])
    expect(onReady).toHaveBeenCalledOnce()
    expect(post).not.toHaveBeenCalled()
    client.startPrecache()
    client.pausePrecache()
    client.resumePrecache()
    expect(post.mock.calls).toEqual([
      [{ type: 'precache' }],
      [{ type: 'precache-pause' }],
      [{ type: 'precache-resume' }],
    ])
  })
  it('无 SW 能力 → onUnavailable 触发(调用方据此自动放行门)', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    const onUnavailable = vi.fn()
    await client.registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable })
    expect(onUnavailable).toHaveBeenCalledOnce()
  })
  it('register 抛错 → onUnavailable 触发,不向上抛', async () => {
    const failure = new Error('registration unavailable')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = installServiceWorker()
    container.register.mockRejectedValueOnce(failure)
    const onUnavailable = vi.fn()
    await expect(
      client.registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable }),
    ).resolves.toBeUndefined()
    expect(onUnavailable).toHaveBeenCalledOnce()
    expect(warning.mock.calls).toEqual([
      ['[precache] SW register failed, fallback to on-demand fetch:', failure],
    ])
  })
  it('startPrecache 早于 SW ready → 缓冲,registerPrecache 就绪后补发 precache', async () => {
    let resolveReady: (registration: ReadyWorkerPort) => void = () => {}
    const ready = new Promise<ReadyWorkerPort>((resolve) => {
      resolveReady = resolve
    })
    const { worker, post } = installServiceWorker(ready)
    const pending = client.registerPrecache({ isProd: true, onProgress: () => {} })
    try {
      client.startPrecache()
      expect(post).not.toHaveBeenCalled()
      resolveReady({ active: worker })
      await pending
      expect(post.mock.calls).toEqual([[{ type: 'precache' }]])
    } finally {
      resolveReady({ active: worker })
      await pending
    }
  })
  it.each([
    { type: 'precache-done', total: 2, totalBytes: 2048 },
    { type: 'precache-error', message: 'storage quota unavailable' },
  ])('真实 message：进度原样转发，$type 收尾，其他消息不触发回调', async (terminal) => {
    const { container } = installServiceWorker()
    const onProgress = vi.fn()
    const onDone = vi.fn()
    await client.registerPrecache({ isProd: true, onProgress, onDone })
    container.dispatchEvent(new MessageEvent('message', { data: { type: 'unrelated' } }))
    expect(onProgress).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    const progress = { type: 'precache-progress', done: 1, total: 2, bytes: 1024, totalBytes: 2048 }
    container.dispatchEvent(new MessageEvent('message', { data: progress }))
    expect(onProgress.mock.calls).toEqual([[progress]])
    expect(onProgress.mock.calls[0]?.[0]).toBe(progress)
    expect(onDone).not.toHaveBeenCalled()
    container.dispatchEvent(new MessageEvent('message', { data: terminal }))
    expect(onDone.mock.calls).toEqual([[]])
    expect(onProgress).toHaveBeenCalledOnce()
  })
})

describe('Commands before worker readiness', () => {
  it('pause/resume 早于 ready：静默丢弃，不缓冲也不补发', async () => {
    client.pausePrecache()
    client.resumePrecache()
    const { post } = installServiceWorker()
    await client.registerPrecache({ isProd: true, onProgress: () => {} })
    expect(post.mock.calls).toEqual([])
  })
})
