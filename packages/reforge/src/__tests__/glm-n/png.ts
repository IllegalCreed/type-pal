/** Wave-N 专属：最小合法 PNG 编码器（IHDR + stored-deflate IDAT + IEND），只服务本波 fixture。 */

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i] ?? 0
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

/** zlib 流（RFC1950）包裹的 stored（未压缩）deflate 块（RFC1951 type 00）。 */
function storedZlib(raw: Uint8Array): Uint8Array {
  const blocks = Math.ceil(raw.length / 65535) || 1
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4)
  const view = new DataView(out.buffer)
  out[0] = 0x78
  out[1] = 0x01
  let at = 2
  for (let i = 0; i < blocks; i++) {
    const start = i * 65535
    const len = Math.min(65535, raw.length - start)
    out[at] = i === blocks - 1 ? 1 : 0 // 末块 BFINAL
    view.setUint16(at + 1, len, true)
    view.setUint16(at + 3, ~len & 0xffff, true)
    out.set(raw.subarray(start, start + len), at + 5)
    at += 5 + len
  }
  view.setUint32(at, adler32(raw))
  return out
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/**
 * RGBA PNG，每像素 (gray, gray, gray, alpha)。只承诺真实 PNG 字节与 IHDR 尺寸，
 * 不承诺像素级视觉正确性 —— 消费方按各自合同校验。
 */
export function glmNpng(width: number, height: number, gray = 5, alpha = 255): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 4))
  for (let row = 0; row < height; row++) {
    raw[row * (1 + width * 4)] = 0
    for (let col = 0; col < width; col++) {
      const offset = row * (1 + width * 4) + 1 + col * 4
      raw[offset] = gray
      raw[offset + 1] = gray
      raw[offset + 2] = gray
      raw[offset + 3] = alpha
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const parts = [
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', storedZlib(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
