/**
 * RLE 精灵解码 —— 原版精灵格式。
 * 参考 reference/sdlpal/palcommon.c::PAL_RLEBlitToSurfaceWithShadow。
 */

export interface RleFrame {
  width: number
  height: number
  /** 长度 = width * height,值 = 调色板下标。
   *  注意:**只有 `opaque[i] === 1` 时该下标才有效**;`opaque[i] === 0` 表示
   *  RLE-skip 透明像素,此位置 pixels 默认 0 仅为占位,不应被渲染。 */
  pixels: Uint8Array
  /** 长度 = width * height。1 = opaque(写入像素),0 = RLE-skip transparent。
   *  之前用「`pixels[i] === 0` 即透明」做语义,把 RLE-skip 与 opaque-palette-0
   *  合并;dense scene 16 通道 tile + 角色 sprite 头发暗部凡 palette 0 全被
   *  误判为透明 → "梯子状"杂乱 tile + 人物半透明。M3.5 修。 */
  opaque: Uint8Array
}

/**
 * 解码一帧 RLE 精灵数据。
 * 帧头 = 宽 u16 LE + 高 u16 LE;后接指令流。
 * 指令字节 b:
 *   b >= 0x80 → 跳 b-0x80 个像素(留透明 opaque=0;pixels 默认 0)
 *   else      → 接下来 b 个字节是像素值(opaque=1,palette index 即使 0 也合法)
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  let offset = 0

  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const width = buf[offset]! | (buf[offset + 1]! << 8)
  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const height = buf[offset + 2]! | (buf[offset + 3]! << 8)
  offset += 4

  const total = width * height
  const pixels = new Uint8Array(total) // zero-filled,RLE-skip 位置维持 0
  const opaque = new Uint8Array(total) // 默认全 0 = transparent

  let dst = 0
  while (dst < total) {
    // biome-ignore lint/style/noNonNullAssertion: within-frame read
    const b = buf[offset++]!
    if (b >= 0x80) {
      // 跳过 b-0x80 个像素(opaque 保持 0,pixels 保持 0)
      dst += b - 0x80
    } else {
      // 接下来 b 个字节是直接像素值(opaque = 1)
      for (let k = 0; k < b; k++) {
        // biome-ignore lint/style/noNonNullAssertion: within-frame pixel read
        pixels[dst] = buf[offset++]!
        opaque[dst] = 1
        dst++
      }
    }
  }

  return { width, height, pixels, opaque }
}
