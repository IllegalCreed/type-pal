/**
 * Author-image RLE encoder consumed by the shared TS frame/container codec.
 * Frames use u16LE width/height and <=127-pixel literal/transparent runs; transparent
 * runs may cross rows. This author contract is not every historical PAL command rule.
 * The chunk count also occupies frame0's WORD offset; payload starts at count*2.
 *
 * Payloads are padded to even length for WORD offsets. Trailing transparent runs fill
 * width*height so decoding reaches a complete frame instead of rejecting a short stream.
 * This encoder caps the whole chunk at131070 bytes; u16 offsets alone constrain frame
 * starts, so that cap is an encoder policy rather than a general final-payload format bound.
 */
import type { RleFrame } from './rle.js'

/** 编码一帧；尾透明也写满，以满足 decoder 的完整帧合同。 */
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

const MAX_CHUNK_BYTES = 0xffff << 1 // 当前编码器的整体大小上限，含表、payload 和对齐。

/** 组装 sprite chunk；帧序保留，奇数 payload 补0对齐，超当前整体大小上限时拒绝。 */
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
