import { crc32, deflateSync } from 'node:zlib'

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0)
  return Buffer.concat([length, name, data, crc])
}

/** 手写 RGBA PNG。像素值来自调用方，不经过被测解码器。 */
export function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4)
    raw[row] = 0
    for (let x = 0; x < width * 4; x++) raw[row + 1 + x] = rgba[y * width * 4 + x]!
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return new Uint8Array(
    Buffer.concat([
      sig,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}
