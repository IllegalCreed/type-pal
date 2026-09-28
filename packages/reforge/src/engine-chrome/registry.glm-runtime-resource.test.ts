/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R10（reforge/engine-chrome/registry.ts）。
 * 去重账：registry.test 覆盖 85 slot 完整性/bundler URL/失败清缓存重试；registry.lifecycle
 * （ASSET-IO B10）覆盖成功缓存 Promise 身份/跨 slot 独立/网络与解码失败带 slot。
 * 本文件只做未占用合同：'opening.default-title' 非 UI slot 走 ENGINE_CHROME.defaultTitle。
 * （engineChromeUiUrl 缺 slot 抛错支：85 slot 全部物理存在，合法 typed 入口不可达，不写强转绿测。）
 */
import { describe, expect, test } from 'vitest'
import { ENGINE_CHROME, loadEngineChromeImage } from './registry.js'

describe('R10 loadEngineChromeImage default-title 通道', () => {
  test('非 UI slot opening.default-title：fetch ENGINE_CHROME.defaultTitle 并成功解码', async () => {
    const originalFetch = globalThis.fetch
    const originalCreate = globalThis.createImageBitmap
    const fetched: string[] = []
    try {
      globalThis.fetch = (async (url: unknown) => {
        fetched.push(String(url))
        return new Response('img', { status: 200 })
      }) as typeof fetch
      globalThis.createImageBitmap = (async () =>
        ({ id: 'title-bm' }) as unknown as ImageBitmap) as typeof createImageBitmap

      const bitmap = await loadEngineChromeImage('opening.default-title')
      expect((bitmap as unknown as { id: string }).id).toBe('title-bm')
      expect(fetched).toEqual([ENGINE_CHROME.defaultTitle])
    } finally {
      globalThis.fetch = originalFetch
      globalThis.createImageBitmap = originalCreate
    }
  })
})
