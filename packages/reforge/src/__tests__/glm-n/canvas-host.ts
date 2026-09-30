/** Wave-N 专属画布宿主：真实 jsdom 2D 上下文 + typed spy 控制外部 IO（像素值/假位图拦截）。
 *  不构造替身上下文、不做类型断言；PRISTINE_GET_CONTEXT 在模块求值期捕获，
 *  先于任何测试内 spy（dom-host 等），保证拿到的是 jsdom 原生实现。 */
import { vi } from 'vitest'
import { glmNpng } from './png.js'

const PRISTINE_GET_CONTEXT = HTMLCanvasElement.prototype.getContext

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

const spyOnGetImageData = (o: CanvasRenderingContext2D) => vi.spyOn(o, 'getImageData')
const spyOnDrawImage = (o: CanvasRenderingContext2D) => vi.spyOn(o, 'drawImage')

/** 安装真实 2D 上下文宿主（getContext 返回 jsdom 原生 ctx，仅以 typed spy 控制外部 IO）
 *  + createImageBitmap(PNG IHDR 尺寸) + close 追踪。返回 restore。 */
export function installGlmNCanvasHost(readPixelValue = 5) {
  const bitmaps: { width: number; height: number; close: ReturnType<typeof vi.fn> }[] = []
  const guarded = new WeakSet<CanvasRenderingContext2D>()
  const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof PRISTINE_GET_CONTEXT>
    ) {
      if (args[0] !== '2d') return PRISTINE_GET_CONTEXT.apply(this, args)
      // RenderingContext 联合类型按实参收窄到 2D 成员（单次联合收窄，非 unknown 跳板）。
      const real = PRISTINE_GET_CONTEXT.apply(this, args) as CanvasRenderingContext2D | null
      if (!real || guarded.has(real)) return real
      guarded.add(real)
      // 类型化 spy 只控制外部 IO：像素读取按测试值合成，假位图绘制拦截；其余真执行。
      vi.spyOn(real, 'getImageData').mockImplementation(
        (_x: number, _y: number, w: number, h: number) => pixels(w, h, readPixelValue),
      )
      vi.spyOn(real, 'drawImage').mockImplementation(() => {})
      return real
    })
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
    png: glmNpng,
    restore() {
      getContextSpy.mockRestore()
      vi.unstubAllGlobals()
    },
  }
}

export { spyOnDrawImage, spyOnGetImageData }
