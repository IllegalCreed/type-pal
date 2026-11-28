import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vi } from 'vitest'

/** 经显式端口（node-test-ports.d.ts）取得 Node 桥接，类型安全、无压制。 */
const { Blob: NodeBlob, Buffer } = createRequire(join(selfDir(), '../../package.json'))(
  'node:buffer',
)
const { webcrypto } = createRequire(join(selfDir(), '../../package.json'))('node:crypto')

/** 本文件真实磁盘路径（vitest 下 import.meta.url 可能是 http /@fs 形式，两种都还原）。 */
function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

/**
 * 安装浏览器硬件端口替身：Node Blob/crypto（jsdom 缺 CompressionStream 依赖的
 * Blob.stream 与 subtle digest）+ createImageBitmap 真实 PNG 解码（node-canvas loadImage，
 * 走真实 libpng 语义；返回对象带 close()）。jsdom 的 2d canvas 已由 node-canvas 后端
 * 提供真实 drawImage/getImageData，不在此处替换。afterEach 由 vitest 统一 unstub。
 */
export function installBrowserHardwarePorts(): void {
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  const { loadImage } = createRequire(join(selfDir(), '../../../game/package.json'))('canvas')
  vi.stubGlobal('createImageBitmap', async (source: { arrayBuffer(): Promise<ArrayBuffer> }) => {
    const image = await loadImage(Buffer.from(await source.arrayBuffer()))
    if (typeof (image as { close?: unknown }).close !== 'function')
      Object.defineProperty(image, 'close', { configurable: true, value: () => undefined })
    return image
  })
}
