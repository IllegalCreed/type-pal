import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  assertEngineChromeComplete,
  ENGINE_CHROME,
  ENGINE_CHROME_UI_SLOTS,
  loadEngineChromeImage,
} from './registry.js'

describe('engine chrome registry', () => {
  afterEach(() => vi.unstubAllGlobals())
  test('85 个 UI slot 唯一且与 bundler 物理文件一一对应', () => {
    expect(ENGINE_CHROME_UI_SLOTS).toHaveLength(85)
    expect(new Set(ENGINE_CHROME_UI_SLOTS).size).toBe(85)
    expect(() => assertEngineChromeComplete()).not.toThrow()
  })

  test('标题、光标、字形、来源与许可均由 bundler 产生 URL', () => {
    for (const url of Object.values(ENGINE_CHROME)) {
      expect(url).toBeTruthy()
      expect(url).not.toMatch(/^\/(?:ui|extracted|baked)\//)
    }
  })

  test('图像失败带 slot，失败 promise 会清缓存并允许重试', async () => {
    const bitmap = { width: 1, height: 1 } as ImageBitmap
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(new Blob([Uint8Array.from([1])])))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )

    await expect(loadEngineChromeImage('status/equip-demo/weapon.png')).rejects.toThrow(
      '引擎 chrome 图像 slot "status/equip-demo/weapon.png" 加载失败:HTTP 503',
    )
    await expect(loadEngineChromeImage('status/equip-demo/weapon.png')).resolves.toBe(bitmap)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
