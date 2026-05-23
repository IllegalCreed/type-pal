/**
 * 精灵 chunk 解析与索引位图 PNG 编码。
 * 参考 reference/sdlpal/sprite.c::PAL_LoadSprite。
 */
import { PNG } from 'pngjs'
import { decodeRle, type RleFrame } from '../io/rle.js'

/**
 * 精灵 chunk 头:u16 LE 帧数 + (帧数 个 u16 LE offset to RLE data)。
 * 偏移从 chunk 开头算;offset = 0 表示帧空缺。
 * 参考 sdlpal sprite.c::PAL_LoadSprite。
 */
export function parseSpriteChunk(buf: Uint8Array): RleFrame[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frameCount = view.getUint16(0, true)
  const frames: RleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const offset = view.getUint16(2 + i * 2, true)
    if (offset === 0) continue
    frames.push(decodeRle(buf.subarray(offset)))
  }
  return frames
}

/**
 * 把索引位图编码为 PNG。M1 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)。
 * 运行时 game 包加载时只取 R 通道(=索引)。
 * 不烤色;运行时查调色板填色。
 * 磁盘代价 ×4 但实现简单;M3 视情况优化。
 */
export function encodeIndexedPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    // biome-ignore lint/style/noNonNullAssertion: pixels length = width * height, index always in bounds
    const v = pixels[i]!
    png.data[i * 4] = v
    png.data[i * 4 + 1] = v
    png.data[i * 4 + 2] = v
    png.data[i * 4 + 3] = 255
  }
  return new Uint8Array(PNG.sync.write(png))
}

export interface SpriteFrameOut {
  index: number
  width: number
  height: number
  pngBytes: Uint8Array
}

export function framesToOut(frames: RleFrame[]): SpriteFrameOut[] {
  return frames.map((f, i) => ({
    index: i,
    width: f.width,
    height: f.height,
    pngBytes: encodeIndexedPng(f.width, f.height, f.pixels),
  }))
}
