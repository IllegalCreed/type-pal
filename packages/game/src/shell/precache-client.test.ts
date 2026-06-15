import { afterEach, describe, expect, it, vi } from 'vitest'
import { pausePrecache, registerPrecache, resumePrecache, startPrecache } from './precache-client.js'

function mockSW() {
  const sw = {
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn(),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
  return sw
}

afterEach(() => { vi.restoreAllMocks() })

describe('registerPrecache', () => {
  it('PROD=false(dev/e2e)→ 不注册', async () => {
    const sw = mockSW()
    await registerPrecache({ isProd: false, onProgress: () => {} })
    expect(sw.register).not.toHaveBeenCalled()
  })

  it('PROD=true → 以 updateViaCache:none 注册 /sw.js', async () => {
    const sw = mockSW()
    await registerPrecache({ isProd: true, onProgress: () => {} })
    expect(sw.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' })
  })

  it('无 serviceWorker 能力 → 安全 no-op', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    await expect(registerPrecache({ isProd: true, onProgress: () => {} })).resolves.toBeUndefined()
  })

  it('PROD + SW → onReady 触发,但 registerPrecache 不自动触发预缓存;start/pause/resume 各发对应消息', async () => {
    const post = vi.fn()
    const sw = {
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({ active: { postMessage: post } }),
      addEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
    const onReady = vi.fn()
    await registerPrecache({ isProd: true, onProgress: () => {}, onReady })
    expect(onReady).toHaveBeenCalledOnce()
    expect(post).not.toHaveBeenCalled() // 早注册不触发,避免可玩前抢必要资源带宽
    startPrecache()
    expect(post).toHaveBeenCalledWith({ type: 'precache' }) // 虚线后显式启动(全速)
    pausePrecache()
    expect(post).toHaveBeenCalledWith({ type: 'precache-pause' }) // 视频期间暂停
    resumePrecache()
    expect(post).toHaveBeenCalledWith({ type: 'precache-resume' }) // 进游戏恢复
  })

  it('无 SW 能力 → onUnavailable 触发(调用方据此自动放行门)', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    const onUnavailable = vi.fn()
    await registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable })
    expect(onUnavailable).toHaveBeenCalledOnce()
  })

  it('register 抛错 → onUnavailable 触发,不向上抛', async () => {
    const sw = { register: vi.fn().mockRejectedValue(new Error('boom')), addEventListener: vi.fn() }
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
    const onUnavailable = vi.fn()
    await expect(
      registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable }),
    ).resolves.toBeUndefined()
    expect(onUnavailable).toHaveBeenCalledOnce()
  })

  it('startPrecache 早于 SW ready → 缓冲,registerPrecache 就绪后补发 precache', async () => {
    vi.resetModules() // 隔离模块级 _activeWorker/_pendingStart
    const mod = await import('./precache-client.js')
    const post = vi.fn()
    let resolveReady: (v: { active: { postMessage: typeof post } }) => void = () => {}
    const sw = {
      register: vi.fn().mockResolvedValue({}),
      ready: new Promise<{ active: { postMessage: typeof post } }>((r) => {
        resolveReady = r
      }),
      addEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
    const p = mod.registerPrecache({ isProd: true, onProgress: () => {} })
    mod.startPrecache() // SW 还没 ready → 缓冲,不应立即发
    expect(post).not.toHaveBeenCalled()
    resolveReady({ active: { postMessage: post } })
    await p
    expect(post).toHaveBeenCalledWith({ type: 'precache' }) // ready 后补发
  })
})
