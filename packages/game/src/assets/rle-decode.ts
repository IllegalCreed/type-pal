/**
 * 运行时 RLE 精灵解码(M5 Sync.2)。
 *
 * 搬到 game 包供运行时解「整 chunk = 单帧 RLE」的 raw dump(RGM 头像、DATA.MKF
 * chunk 12 dialog icons 等)用 —— 这类首部带 `0x02000000` file-header 前缀,本文件
 * `decodeRle` 会跳过它(见下方注释)。
 *
 * ⚠️ **与 `@type-pal/shared` 的 `decodeRle` 是两份、语义不同**:shared 那份**不跳**
 * 前缀(给 sprite-group chunk 用:tileset / npc / battle / magic 经 parseSpriteChunk
 * 取真 offset 后才喂)。两者**不可互换**;别图省事合并,否则一边解码错位。
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
 *
 * sdlpal palcommon.c:722-728 真值:若头 4 字节是 `0x02 0x00 0x00 0x00` 则跳过(file header
 * 前缀,标记"单帧 RLE bitmap" — RGM 头像 / 标题屏等);之后才是真 RLE 头:
 *   width u16 LE + height u16 LE
 *   指令字节:
 *     b >= 0x80 → 跳 b-0x80 像素(opaque=0)
 *     else      → 接 b 字节直接像素(opaque=1)
 *
 * 注:pal-extract `io/rle.ts` 没 skip 此前缀,因 sprite-group chunks(战斗/UI sprite)
 *    用 `parseSpriteChunk` 取真 offset 后才喂 decodeRle,首字节就是真 width。
 *    单帧 RLE(RGM)直接喂整 chunk,必须自己 skip。M5 Sync.2 fix3 加。
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  let offset = 0

  // sdlpal palcommon.c:722-728:skip 0x00000002 file header prefix(单帧 RLE bitmap 用)
  if (
    buf.length >= 4
    && buf[0] === 0x02 && buf[1] === 0x00
    && buf[2] === 0x00 && buf[3] === 0x00
  ) {
    offset = 4
  }

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
