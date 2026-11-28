import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vi } from 'vitest'
import { installBrowserHardwarePorts as installBitmapPort } from './bitmap-test-port.js'

export { dispatchDragEvent, MemoryDataTransfer } from './drag-test-ports.js'
export { pngFileOf, pngRgba } from './png-fixtures.js'

function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

/** Node Blob/crypto、真实 PNG createImageBitmap，以及 jsdom 缺失的 node-canvas ImageData。 */
export function installBrowserHardwarePorts(): void {
  installBitmapPort()
  const canvasModule: Record<string, unknown> = createRequire(
    join(selfDir(), '../../../game/package.json'),
  )('canvas')
  const imageDataCtor = canvasModule.ImageData
  if (typeof imageDataCtor !== 'function') {
    throw new Error('node-canvas ImageData constructor unavailable')
  }
  vi.stubGlobal('ImageData', imageDataCtor)
}
