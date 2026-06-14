import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerPrecache } from './precache-client.js'

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
})
