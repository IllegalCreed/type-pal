/**
 * 运行时 RLE 精灵解码(M5 Sync.2)。
 *
 * 同 `packages/pal-extract/src/io/rle.ts` 算法,搬到 game 包供运行时解 raw dump
 * (rgm-raw.json 头像、DATA.MKF chunk 12 dialog icons 等)用。
 *
 * 参考 sdlpal `palcommon.c::PAL_RLEBlitToSurfaceWithShadow`。
 */

export interface RleFrame {
  width: number
  height: number
  /** 长度 = width * height,palette 下标。opaque[i] === 0 时该值无效。 */
  pixels: Uint8Array
  /** 长度 = width * height。1 = opaque,0 = RLE-skip transparent。 */
  opaque: Uint8Array
}

/**
 * 解码单帧 RLE。
 * 头:width u16 LE + height u16 LE;之后是指令字节:
 *   b >= 0x80 → 跳 b-0x80 像素(opaque=0)
 *   else      → 接 b 字节直接像素(opaque=1)
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  let offset = 0
  const width = buf[offset]! | (buf[offset + 1]! << 8)
  const height = buf[offset + 2]! | (buf[offset + 3]! << 8)
  offset += 4

  const total = width * height
  const pixels = new Uint8Array(total)
  const opaque = new Uint8Array(total)

  let dst = 0
  while (dst < total) {
    const b = buf[offset++]!
    if (b >= 0x80) {
      dst += b - 0x80
    }
    else {
      for (let k = 0; k < b; k++) {
        pixels[dst] = buf[offset++]!
        opaque[dst] = 1
        dst++
      }
    }
  }

  return { width, height, pixels, opaque }
}

/**
 * 解一个 sprite chunk(DATA.MKF chunk 12 dialog icons 等)成多帧。
 * 同 pal-extract `parseSpriteChunk` 算法。
 *
 * Chunk 头:byte 0..1 = u16 LE imagecount(同时为 frame[0] 的 word-offset)。
 * frame i 的字节偏移 = u16 at byte 2*i,左移 1。
 * offset = 0 表示帧空缺;width/height > 400 视为坏帧跳过(sdlpal "Bloody-Mouth Bug" hack)。
 */
const SPRITE_DIM_MAX = 400
export function parseSpriteChunk(buf: Uint8Array): RleFrame[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frameCount = view.getUint16(0, true)
  const frames: RleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const wordOffset = view.getUint16(i * 2, true)
    const offset = wordOffset << 1
    if (offset === 0 || offset >= buf.byteLength) continue
    if (offset + 4 > buf.byteLength) continue
    const w = view.getUint16(offset, true)
    const h = view.getUint16(offset + 2, true)
    if (w === 0 || h === 0 || w > SPRITE_DIM_MAX || h > SPRITE_DIM_MAX) continue
    frames.push(decodeRle(buf.subarray(offset)))
  }
  return frames
}

/** base64 string → Uint8Array(浏览器内 atob 模式,与 font.ts loadGlyphs 同型) */
export function base64ToBytes(b64: string): Uint8Array {
  if (b64.length === 0) return new Uint8Array(0)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
