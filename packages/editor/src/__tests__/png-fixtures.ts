function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function pngCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** RFC1951 stored 块 + RFC1950 zlib 头尾（Adler-32），可独立解压。 */
function zlibWrapStored(raw: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = []
  for (let at = 0; at < raw.byteLength || at === 0; at += 65535) {
    const slice = raw.subarray(at, Math.min(at + 65535, raw.byteLength))
    const isFinal = at + 65535 >= raw.byteLength
    const block = new Uint8Array(5 + slice.byteLength)
    block[0] = isFinal ? 1 : 0
    block[1] = slice.byteLength & 0xff
    block[2] = slice.byteLength >> 8
    block[3] = ~slice.byteLength & 0xff
    block[4] = (~slice.byteLength >> 8) & 0xff
    block.set(slice, 5)
    blocks.push(block)
    if (isFinal) break
  }
  const body = concatBytes(blocks)
  const head = new Uint8Array([0x78, 0x01])
  let a = 1
  let b = 0
  for (const byte of raw) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  const adler = ((b << 16) | a) >>> 0
  const tail = new Uint8Array(4)
  const view = new DataView(tail.buffer)
  view.setUint32(0, adler)
  return concatBytes([head, body, tail])
}

/** 真实 PNG 编码：filter-0 RGBA8 扫描线，像素逐字节取自调用方交付的 rgba。 */
export function pngRgba(width: number, height: number, rgba: Uint8Array): Uint8Array<ArrayBuffer> {
  if (rgba.byteLength !== width * height * 4)
    throw new Error(`pngRgba 像素长度 ${rgba.byteLength} 与 ${width}×${height}×4 不符`)
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const encoder = new TextEncoder()
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const typeBytes = encoder.encode(type)
    const body = new Uint8Array(4 + 4 + data.byteLength + 4)
    const view = new DataView(body.buffer)
    view.setUint32(0, data.byteLength)
    body.set(typeBytes, 4)
    body.set(data, 8)
    view.setUint32(8 + data.byteLength, pngCrc32(concatBytes([typeBytes, data])))
    return body
  }
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = 6
  const scanline = new Uint8Array(height * (1 + width * 4))
  for (let row = 0; row < height; row += 1) {
    const at = row * (1 + width * 4)
    scanline[at] = 0
    scanline.set(rgba.subarray(row * width * 4, (row + 1) * width * 4), at + 1)
  }
  return concatBytes([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibWrapStored(scanline)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

export interface AtlasPng {
  bytes: Uint8Array
  width: number
  height: number
  frameW: number
  frameH: number
  frameCount: number
}

/** 实心 RGBA 像素块（量化期望值的独立计算输入）。 */
export function solidRgba(
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let at = 0; at < rgba.byteLength; at += 4) {
    rgba[at] = color[0]
    rgba[at + 1] = color[1]
    rgba[at + 2] = color[2]
    rgba[at + 3] = color[3]
  }
  return rgba
}

/** 横排图集 PNG：每帧一个实心色块，帧间颜色互异（量化后仍是可区分真实像素）。 */
export function solidAtlasPng(
  frameW: number,
  frameH: number,
  colors: readonly (readonly [number, number, number, number])[],
): AtlasPng {
  return gridAtlasPng(colors.length, 1, frameW, frameH, colors)
}

/** PNG atlas whose solid cells follow the given row-major color order. */
export function gridAtlasPng(
  cols: number,
  rows: number,
  frameW: number,
  frameH: number,
  colors: readonly (readonly [number, number, number, number])[],
): AtlasPng {
  if (colors.length !== cols * rows)
    throw new Error(`gridAtlasPng 需要 ${cols * rows} 色，实际 ${colors.length}`)
  const width = cols * frameW
  const height = rows * frameH
  const rgba = new Uint8Array(width * height * 4)
  for (const [index, color] of colors.entries()) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const cell = solidRgba(frameW, frameH, color)
    for (let y = 0; y < frameH; y++)
      rgba.set(
        cell.subarray(y * frameW * 4, (y + 1) * frameW * 4),
        ((row * frameH + y) * width + col * frameW) * 4,
      )
  }
  return {
    bytes: pngRgba(width, height, rgba),
    width,
    height,
    frameW,
    frameH,
    frameCount: colors.length,
  }
}

/** 用于生成实心图集的不透明颜色。量化后的颜色能否区分由使用处核验。 */
export function atlasColors(count: number): [number, number, number, number][] {
  const base: [number, number, number][] = [
    [216, 32, 32],
    [32, 200, 64],
    [32, 64, 216],
    [224, 208, 32],
    [192, 32, 192],
    [32, 200, 200],
    [128, 128, 128],
    [255, 128, 0],
    [96, 48, 160],
    [0, 96, 48],
    [240, 144, 160],
    [48, 144, 240],
    [160, 160, 96],
    [96, 240, 144],
    [144, 96, 240],
    [64, 64, 64],
  ]
  if (count > base.length) throw new Error(`atlasColors 最多 ${base.length} 色`)
  return base.slice(0, count).map(([r, g, b]) => [r, g, b, 255])
}

/** File 实例（真实字节，name/type 齐备），供文件输入驱动。 */
export function pngFileOf(name: string, bytes: Uint8Array): File {
  return new File([Uint8Array.from(bytes).buffer], name, { type: 'image/png' })
}

/** Uncompressed transparent RGBA input used when only a legal PNG payload is needed. */
export function transparentPng(width: number, height: number): ArrayBuffer {
  return pngRgba(width, height, new Uint8Array(width * height * 4)).buffer
}

export function transparentPngFile(name: string, width: number, height: number): File {
  return new File([transparentPng(width, height)], name, { type: 'image/png' })
}

export function atlasFile(name: string, atlas: AtlasPng): File {
  return pngFileOf(name, atlas.bytes)
}
