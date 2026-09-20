/**
 * TEST-REFORGE-ASSET-IO-1 B10：chrome registry 模块级缓存生命周期（engine-chrome/registry.ts）。
 * registry.test.ts:24 已覆盖失败清缓存重试——不重复；本文件补：成功路径缓存命中返回同一
 * Promise 身份、跨 slot 独立、网络失败与解码失败分别带 slot。模块级 cache 与
 * ProjectImageCache 实例级分开（不跨例预热）；每例 vi.resetModules 隔离 + finally 恢复全局。
 */
import { describe, expect, test, vi } from 'vitest'

interface FakeBitmap {
  id: string
}

const withModule = async (
  run: (mod: typeof import('./registry.js')) => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch
  const originalCreate = globalThis.createImageBitmap
  try {
    vi.resetModules()
    const mod = await import('./registry.js')
    await run(mod)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.createImageBitmap = originalCreate
  }
}

describe('B10 registry 模块级缓存生命周期（fetch/createImageBitmap 双替身）', () => {
  test('成功路径：同 slot 二次调用返回同一 Promise 身份（缓存命中）；跨 slot 各自独立', async () => {
    await withModule(async (mod) => {
      const fetches: string[] = []
      globalThis.fetch = (async (url: unknown) => {
        fetches.push(String(url))
        return new Response('img', { status: 200 })
      }) as typeof fetch
      globalThis.createImageBitmap = (async () => ({
        id: `bm-${fetches.length}`,
      })) as unknown as typeof createImageBitmap
      const first = mod.loadEngineChromeImage('status/bg.png')
      const second = mod.loadEngineChromeImage('status/bg.png')
      expect(second).toBe(first) // 模块级缓存命中：同一 Promise 对象
      const bitmap = (await first) as unknown as FakeBitmap
      expect(bitmap.id).toBe('bm-1')
      const other = mod.loadEngineChromeImage('status/slot.png')
      expect(other).not.toBe(first)
      await other
      expect(fetches).toHaveLength(2) // 跨 slot 各自取一次
    })
  })
  test('网络层失败（HTTP 500）与解码失败分别带 slot 且互不污染其它 slot', async () => {
    await withModule(async (mod) => {
      globalThis.fetch = (async () => new Response('x', { status: 500 })) as typeof fetch
      await expect(mod.loadEngineChromeImage('num/1.png')).rejects.toThrow(
        '引擎 chrome 图像 slot "num/1.png" 加载失败:HTTP 500',
      )
      // 解码失败轴（fetch 成功、createImageBitmap 抛错）
      globalThis.fetch = (async () => new Response('x', { status: 200 })) as typeof fetch
      globalThis.createImageBitmap = (async () => {
        throw new Error('corrupt')
      }) as unknown as typeof createImageBitmap
      await expect(mod.loadEngineChromeImage('num/2.png')).rejects.toThrow(
        '引擎 chrome 图像 slot "num/2.png" 加载失败:corrupt',
      )
      // 其它 slot 不被污染（失败只清自身）
      globalThis.createImageBitmap = (async () => ({
        id: 'ok',
      })) as unknown as typeof createImageBitmap
      await expect(mod.loadEngineChromeImage('num/3.png')).resolves.toBeDefined()
    })
  })
})
