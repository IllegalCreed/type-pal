import type { Palette } from '@type-pal/shared'

export const SCREEN_W = 320
export const SCREEN_H = 200

export interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly indices: Uint8Array
  writePixel(x: number, y: number, index: number): void
  clear(): void
  toImageData(palette: Palette): ImageData
}

export function createFramebuffer(): Framebuffer {
  const indices = new Uint8Array(SCREEN_W * SCREEN_H)
  return {
    width: SCREEN_W,
    height: SCREEN_H,
    indices,

    writePixel(x, y, index) {
      if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) return
      indices[y * SCREEN_W + x] = index
    },

    clear() {
      indices.fill(0)
    },

    toImageData(palette) {
      const data = new Uint8ClampedArray(SCREEN_W * SCREEN_H * 4)
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]!
        const c = palette.colors[idx] ?? [0, 0, 0]
        data[i * 4] = c[0]
        data[i * 4 + 1] = c[1]
        data[i * 4 + 2] = c[2]
        data[i * 4 + 3] = 255
      }
      return new ImageData(data, SCREEN_W, SCREEN_H)
    },
  }
}
