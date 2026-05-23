/**
 * RLE 精灵解码 —— 仙剑原版精灵格式。
 * 参考 reference/sdlpal/palcommon.c::PAL_RLEBlitToSurfaceWithShadow。
 */

export interface RleFrame {
  width: number
  height: number
  pixels: Uint8Array // 长度 = width * height,值 = 调色板下标,0 = 透明
}

/**
 * 解码一帧 RLE 精灵数据。
 * 帧头 = 宽 u16 LE + 高 u16 LE;后接指令流。
 * 指令字节 b:
 *   b >= 0x80 → 跳 b-0x80 个像素(留透明,填 0)
 *   else      → 接下来 b 个字节是像素值
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  let offset = 0

  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const width = buf[offset]! | (buf[offset + 1]! << 8)
  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const height = buf[offset + 2]! | (buf[offset + 3]! << 8)
  offset += 4

  const total = width * height
  const pixels = new Uint8Array(total) // zero-filled → 透明像素默认 0

  let dst = 0
  while (dst < total) {
    // biome-ignore lint/style/noNonNullAssertion: within-frame read
    const b = buf[offset++]!
    if (b >= 0x80) {
      // 跳过 b-0x80 个像素(保持 0)
      dst += b - 0x80
    } else {
      // 接下来 b 个字节是直接像素值
      for (let k = 0; k < b; k++) {
        // biome-ignore lint/style/noNonNullAssertion: within-frame pixel read
        pixels[dst++] = buf[offset++]!
      }
    }
  }

  return { width, height, pixels }
}
