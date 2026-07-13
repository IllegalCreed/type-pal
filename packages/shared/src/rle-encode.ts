/**
 * PAL RLE 精灵**编码器**(W7B)—— `rle.ts` 解码器的逆,自有 tileset 上传量化后
 * 编码为与原版同构的 sprite chunk(gzip 前的裸 GOP 容器)。
 *
 * 格式真值 = rle.ts:帧 = u16LE 宽 + u16LE 高 + 指令流(b≥0x80 跳 b-0x80 透明;
 * b<0x80 后跟 b 字节像素);chunk = u16LE frameCount(兼任 frame0 的 word 偏移,
 * 故 frame0 字节偏移恒 = 2*frameCount)+ u16 word 偏移表 + 帧数据。
 *
 * 编码约束(解码器行为反推):
 * - 指令段长 ≤ 0x7F,超长游程分段;
 * - 尾部透明也必须发跳段写满 width*height —— 解码 `while dst<total` 若流提前耗尽会越界;
 * - 帧起始字节偏移必须为偶数(word 偏移 << 1),帧数据奇数长时 pad 1 字节 0x00;
 * - word 偏移是 u16 → chunk ≤ 128KB,超限抛错(上传图集过大须拆分)。
 */
import type { RleFrame } from './rle.js'

/** 编码一帧:帧头 + 游程指令流(尾透明补跳段写满,防解码越界)。 */
export function encodeRleFrame(frame: RleFrame): Uint8Array {
  const { width, height, pixels, opaque } = frame
  const total = width * height
  const out: number[] = [width & 0xff, width >> 8, height & 0xff, height >> 8]
  let i = 0
  while (i < total) {
    if (opaque[i] === 0) {
      let run = 0
      while (i < total && opaque[i] === 0 && run < 0x7f) {
        run++
        i++
      }
      out.push(0x80 + run)
    } else {
      let run = 0
      const start = i
      while (i < total && opaque[i] === 1 && run < 0x7f) {
        run++
        i++
      }
      out.push(run)
      for (let k = start; k < start + run; k++) out.push(pixels[k] ?? 0)
    }
  }
  return Uint8Array.from(out)
}

const MAX_CHUNK_BYTES = 0xffff << 1 // u16 word 偏移上限

/** 组装 sprite chunk(帧序即瓦片索引;偶数对齐 pad 0x00)。超 128KB 抛错。 */
export function encodeSpriteChunk(frames: readonly RleFrame[]): Uint8Array {
  const count = frames.length
  if (count === 0) return new Uint8Array(2) // frameCount=0(parse 至少读 u16 头)
  const header = count * 2 // 偏移表字节长;frame0 恰好从这里开始 → wordOffset(frame0) = count
  const encoded = frames.map(encodeRleFrame)
  const offsets: number[] = []
  let at = header
  for (const bytes of encoded) {
    offsets.push(at >> 1)
    at += bytes.length
    if (at & 1) at++ // 下一帧偶数对齐
  }
  if (at > MAX_CHUNK_BYTES)
    throw new Error(
      `encodeSpriteChunk: chunk ${at}B 超 u16 偏移上限 ${MAX_CHUNK_BYTES}B,请拆分图集`,
    )
  if (count > 0 && offsets[0] !== count)
    throw new Error('encodeSpriteChunk: frame0 偏移与 frameCount 双重身份不符(内部错误)')
  const out = new Uint8Array(at)
  const view = new DataView(out.buffer)
  view.setUint16(0, count, true) // 兼任 frame0 word 偏移
  for (let i = 1; i < count; i++) view.setUint16(i * 2, offsets[i] ?? 0, true)
  let cursor = header
  for (const bytes of encoded) {
    out.set(bytes, cursor)
    cursor += bytes.length
    if (cursor & 1) cursor++ // pad 已是 0
  }
  return out
}
