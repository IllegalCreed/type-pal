import type { Palette } from '@type-pal/shared'

export const SCREEN_W = 320
export const SCREEN_H = 200

export interface Framebuffer {
  readonly width: number
  readonly height: number
  /** 调试/测试用只读视图;写入只走 writePixel(以保证边界检查)。 */
  readonly indices: Uint8Array
  writePixel(x: number, y: number, index: number): void
  clear(): void
  toImageData(palette: Palette): ImageData
}

/**
 * 默认 320×200(游戏屏幕)。可传 `width`/`height` 造任意尺寸离屏缓冲 —— dev panel 场景缩略图
 * 把整张 map(~2048×2048)渲染到一张大缓冲再降采样,需要超出屏幕尺寸的 framebuffer。
 */
export function createFramebuffer(width = SCREEN_W, height = SCREEN_H): Framebuffer {
  const indices = new Uint8Array(width * height)
  return {
    width,
    height,
    indices,

    writePixel(x, y, index) {
      if (x < 0 || x >= width || y < 0 || y >= height) return
      indices[y * width + x] = index
    },

    clear() {
      indices.fill(0)
    },

    toImageData(palette) {
      const data = new Uint8ClampedArray(width * height * 4)
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]!
        const c = palette.colors[idx] ?? [0, 0, 0]
        data[i * 4] = c[0]
        data[i * 4 + 1] = c[1]
        data[i * 4 + 2] = c[2]
        data[i * 4 + 3] = 255
      }
      return new ImageData(data, width, height)
    },
  }
}
