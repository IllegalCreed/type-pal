/** Pure image/sprite inputs and explicit framebuffer probes; the two coordinate guards retain their original input domains. */
import type { IndexedImage } from '../../assets/png.js'
import type { SpriteImage } from '../draw-sprite.js'
import { createFramebuffer, type Framebuffer } from '../framebuffer.js'

/** 预填背景。与菜单色、数字色都不同，用来认出没被画到的像素。 */
export const SENTINEL = 0x5a

export function sparseImage(
  width: number,
  height: number,
  pixels: readonly { x: number; y: number; index: number }[],
): IndexedImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  for (const pixel of pixels) {
    const off = pixel.y * width + pixel.x
    indices[off] = pixel.index
    opaque[off] = 1
  }
  return { width, height, indices, opaque }
}

export function iconImage(index: number): IndexedImage {
  return sparseImage(1, 1, [{ x: 0, y: 0, index }])
}

export function fillSentinel(fb: Framebuffer, index = SENTINEL): void {
  fb.indices.fill(index)
}

/** 保留菜单探针的越界错误合同；at 另有非整数拒绝，二者不混同。 */
export function pixel(fb: Framebuffer, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) {
    throw new Error(`pixel out of range (${x},${y}) in ${fb.width}x${fb.height}`)
  }
  return fb.indices[y * fb.width + x]!
}

export function at(fb: Framebuffer, x: number, y: number): number {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= fb.width ||
    y < 0 ||
    y >= fb.height
  ) {
    throw new Error(`pixel outside framebuffer: (${x}, ${y})`)
  }
  return fb.indices[y * fb.width + x]!
}

export function sprite(
  width: number,
  height: number,
  pixels: readonly { x: number; y: number; index: number }[],
  anchor?: { x: number; y: number },
): SpriteImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  for (const pixel of pixels) {
    const off = pixel.y * width + pixel.x
    indices[off] = pixel.index
    opaque[off] = 1
  }
  return {
    width,
    height,
    indices,
    opaque,
    anchorX: anchor?.x ?? Math.floor(width / 2),
    anchorY: anchor?.y ?? height,
  }
}

export function solidSprite(
  width: number,
  height: number,
  index: number,
  anchor?: { x: number; y: number },
): SpriteImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(index),
    opaque: new Uint8Array(width * height).fill(1),
    anchorX: anchor?.x ?? Math.floor(width / 2),
    anchorY: anchor?.y ?? height,
  }
}

export function hiddenSprite(width: number, height: number): SpriteImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height),
    anchorX: Math.floor(width / 2),
    anchorY: height,
  }
}

export function solidIndexedImage(
  width: number,
  height: number,
  index: number,
  opaque = 1,
): IndexedImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(index),
    opaque: new Uint8Array(width * height).fill(opaque),
  }
}

/** 默认帧缓冲填入哨兵底色，用于识别未绘制区域。 */
export function sentinelFramebuffer(): Framebuffer {
  const fb = createFramebuffer()
  fb.indices.fill(SENTINEL)
  return fb
}
