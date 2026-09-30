/** Wave-N 专属画布宿主：可控 getImageData 的 2d 上下文替身 + PNG 尺寸 createImageBitmap。
 *  只封外部 canvas IO，不替代任何产品业务模块。 */
import { vi } from 'vitest'
import { glmNpng } from './png.js'

export interface Fake2dContext {
  canvas: HTMLCanvasElement
  readonly drawImage: ReturnType<typeof vi.fn>
  readonly putImageData: ReturnType<typeof vi.fn>
  readonly getImageData: ReturnType<typeof vi.fn>
  readonly fillRect: ReturnType<typeof vi.fn>
  readonly save: ReturnType<typeof vi.fn>
  readonly restore: ReturnType<typeof vi.fn>
  filter: string
  globalAlpha: number
  globalCompositeOperation: string
  imageSmoothingEnabled: boolean
  fillStyle: string
  createImageData(width: number, height: number): ImageData
}

/** 每像素 (v,v,v,255) 的 ImageData；v 可按测试指定，满足索引图契约校验。 */
function pixels(width: number, height: number, value: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = value
    data[i * 4 + 1] = value
    data[i * 4 + 2] = value
    data[i * 4 + 3] = 255
  }
  return { width, height, data, colorSpace: 'srgb' } as ImageData
}

/** 安装可控 2d 上下文 + createImageBitmap(PNG IHDR 尺寸) + close 追踪。返回 restore。 */
export function installGlmNCanvasHost(readPixelValue = 5) {
  const contexts = new WeakMap<HTMLCanvasElement, Fake2dContext>()
  const bitmaps: { width: number; height: number; close: ReturnType<typeof vi.fn> }[] = []
  const makeContext = (canvas: HTMLCanvasElement): Fake2dContext => {
    return {
      canvas,
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) =>
        pixels(w, h, readPixelValue),
      ),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: false,
      fillStyle: '',
      createImageData: (width, height) => {
        const data = new Uint8ClampedArray(width * height * 4)
        return { width, height, data, colorSpace: 'srgb' } as ImageData
      },
    }
  }
  const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function (
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement['getContext']>
    ) {
      const kind = args[0]
      if (kind !== '2d') return null
      const existing = contexts.get(this)
      if (existing) return existing
      const created = makeContext(this)
      contexts.set(this, created)
      return created as unknown as CanvasRenderingContext2D
    } as HTMLCanvasElement['getContext'])
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async (blob: Blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (
        bytes.length < 24 ||
        bytes[0] !== 0x89 ||
        bytes[1] !== 0x50 ||
        bytes[2] !== 0x4e ||
        bytes[3] !== 0x47
      )
        throw new Error('glm-n canvas host requires real PNG bytes')
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const bitmap = { width: view.getUint32(16), height: view.getUint32(20), close: vi.fn() }
      bitmaps.push(bitmap)
      return bitmap
    }),
  )
  return {
    bitmaps,
    contextOf(canvas: HTMLCanvasElement): Fake2dContext {
      const context = contexts.get(canvas)
      if (!context) throw new Error('canvas context not created yet')
      return context
    },
    png: glmNpng,
    restore() {
      getContextSpy.mockRestore()
      vi.unstubAllGlobals()
    },
  }
}
