import { afterEach, expect, test, vi } from 'vitest'
import titlePng from './assets/title.png?inline'
import statusBackground from './assets/ui/status/bg.png?inline'
import statusSlot from './assets/ui/status/slot.png?inline'

afterEach(() => vi.unstubAllGlobals())

async function registry() {
  vi.resetModules()
  return import('./registry.js')
}

function pngBytes(dataUrl: string) {
  return Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (byte) =>
    byte.charCodeAt(0),
  )
}

function image(width: number, height: number): ImageBitmap {
  return { width, height, close: vi.fn() }
}

test('同一槽复用正在加载的位图，不同槽分别解自己的打包文件', async () => {
  const mod = await registry()
  const backgroundUrl = mod.engineChromeUiUrl('status/bg.png')
  const slotUrl = mod.engineChromeUiUrl('status/slot.png')
  const files = new Map([
    [backgroundUrl, pngBytes(statusBackground)],
    [slotUrl, pngBytes(statusSlot)],
  ])
  const background = image(320, 200)
  const slot = image(24, 24)
  const get = vi.fn(async (url: string) => {
    const bytes = files.get(url)
    return bytes
      ? new Response(bytes, { headers: { 'Content-Type': 'image/png' } })
      : new Response(null, { status: 404 })
  })
  const decode = vi.fn(async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (bytes.length === files.get(backgroundUrl)?.length) {
      expect(bytes).toEqual(pngBytes(statusBackground))
      return background
    }
    expect(bytes).toEqual(pngBytes(statusSlot))
    return slot
  })
  vi.stubGlobal('fetch', get)
  vi.stubGlobal('createImageBitmap', decode)
  const first = mod.loadEngineChromeImage('status/bg.png')
  expect(mod.loadEngineChromeImage('status/bg.png')).toBe(first)
  const separate = mod.loadEngineChromeImage('status/slot.png')
  await expect(first).resolves.toBe(background)
  await expect(separate).resolves.toBe(slot)
  expect(get.mock.calls).toEqual([[backgroundUrl], [slotUrl]])
})

test('HTTP 非 OK 带自身槽位和状态，下一次仍能解码同槽位', async () => {
  const mod = await registry()
  const bytes = pngBytes(statusSlot)
  const restored = image(24, 24)
  const url = mod.engineChromeUiUrl('status/slot.png')
  const fetch = vi
    .fn<(url: string) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(bytes, { headers: { 'Content-Type': 'image/png' } }))
  const decode = vi.fn(async (blob: Blob) => {
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
    return restored
  })
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('createImageBitmap', decode)
  await expect(mod.loadEngineChromeImage('status/slot.png')).rejects.toThrow(
    '引擎 chrome 图像 slot "status/slot.png" 加载失败:HTTP 503',
  )
  expect(decode).not.toHaveBeenCalled()
  await expect(mod.loadEngineChromeImage('status/slot.png')).resolves.toBe(restored)
  expect(fetch.mock.calls).toEqual([[url], [url]])
})

test('位图解码错误带实际槽位和原因，其他槽仍能解码', async () => {
  const mod = await registry()
  const healthy = image(24, 24)
  vi.stubGlobal('fetch', async () => new Response(pngBytes(statusSlot)))
  const decode = vi
    .fn<(blob: Blob) => Promise<ImageBitmap>>()
    .mockRejectedValueOnce(new Error('corrupt'))
    .mockResolvedValueOnce(healthy)
  vi.stubGlobal('createImageBitmap', decode)
  await expect(mod.loadEngineChromeImage('status/bg.png')).rejects.toThrow(
    '引擎 chrome 图像 slot "status/bg.png" 加载失败:corrupt',
  )
  await expect(mod.loadEngineChromeImage('status/slot.png')).resolves.toBe(healthy)
})

test('独立标题槽使用实际打包标题 PNG，并把文件字节交给图像端口', async () => {
  const mod = await registry()
  const bytes = pngBytes(titlePng)
  const title = image(320, 200)
  const fetch = vi.fn(async (url: string) => {
    if (url !== mod.ENGINE_CHROME.defaultTitle) return new Response(null, { status: 404 })
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } })
  })
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('createImageBitmap', async (blob: Blob) => {
    expect(blob.type).toBe('image/png')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
    return title
  })
  await expect(mod.loadEngineChromeImage('opening.default-title')).resolves.toBe(title)
  expect(fetch).toHaveBeenCalledExactlyOnceWith(mod.ENGINE_CHROME.defaultTitle)
})
