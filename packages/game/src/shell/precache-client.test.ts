import { afterEach, describe, expect, it, vi } from 'vitest'
import { boostPrecache, registerPrecache } from './precache-client.js'

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

  it('PROD + SW → onReady 在 ready 后触发,boostPrecache 向 active worker 发 precache-boost', async () => {
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
    expect(post).toHaveBeenCalledWith({ type: 'precache' }) // 低并发起步(让路)
    boostPrecache()
    expect(post).toHaveBeenCalledWith({ type: 'precache-boost' }) // 进入后提速
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
})
