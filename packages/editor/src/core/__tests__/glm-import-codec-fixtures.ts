/**
 * TEST-EDITOR-IMPORT-CODEC-1 test-only fixture（editor 包薄数据/宿主替身构造）。
 * 只放数据、深快照、最小合法 PNG/BMFF 字节构造与 Canvas/ImageBitmap/Worker 双替身；
 * 受测载荷先过对应现行守卫（assertPng/尺寸门/box 三态）再进断言；不被生产导入。
 */

/** 保真深拷贝（不经 JSON 往返）。 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

/** PNG chunk CRC-32（无表位运算，ISO PNG 真值算法；test-only 独立实现）。 */
function pngCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** zlib deflate stored 块包装（RFC1951 stored block + RFC1950 zlib 头尾，独立可解压）。 */
function zlibWrapStored(raw: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = []
  for (let at = 0; at < raw.byteLength || at === 0; at += 65535) {
    const slice = raw.subarray(at, Math.min(at + 65535, raw.byteLength))
    const isFinal = at + 65535 >= raw.byteLength
    const block = new Uint8Array(5 + slice.byteLength)
    block[0] = isFinal ? 1 : 0 // BFINAL + BTYPE=00(stored)
    block[1] = slice.byteLength & 0xff
    block[2] = slice.byteLength >> 8
    block[3] = ~slice.byteLength & 0xff
    block[4] = (~slice.byteLength >> 8) & 0xff
    block.set(slice, 5)
    blocks.push(block)
    if (isFinal) break
  }
  const body = concatFixture(blocks)
  // zlib 头（CM=8 deflate, CINFO=7 32K窗口, FCHECK 使头 %31==0）+ Adler-32（实现见 ISO1950）
  const head = new Uint8Array(2)
  head[0] = 0x78
  head[1] = 0x01
  let a = 1
  let b = 0
  for (const byte of raw) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  const adler = ((b << 16) | a) >>> 0
  const tail = new Uint8Array(4)
  tail[0] = (adler >>> 24) & 0xff
  tail[1] = (adler >>> 16) & 0xff
  tail[2] = (adler >>> 8) & 0xff
  tail[3] = adler & 0xff
  return concatFixture([head, body, tail])
}

function concatFixture(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

/**
 * 完整合法 PNG（可独立通过 PNG 二进制合法性核验，非视觉验收）：
 * 8 字节签名 + 带真 CRC 的 IHDR/IDAT/IEND；IDAT 为可解压的 zlib stored 块
 * （RGBA8 filter-0 扫描线：每行 1 字节过滤位 + width×4 像素，全 0 也合法）。
 */
export function minimalPng(width: number, height: number): ArrayBuffer {
  const encoder = new TextEncoder()
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const typeBytes = encoder.encode(type)
    const body = new Uint8Array(4 + 4 + data.byteLength + 4)
    const view = new DataView(body.buffer)
    view.setUint32(0, data.byteLength)
    body.set(typeBytes, 4)
    body.set(data, 8)
    view.setUint32(8 + data.byteLength, pngCrc32(concatFixture([typeBytes, data])))
    return body
  }
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const scanline = new Uint8Array(height * (1 + width * 4)) // filter byte 0 + RGBA 零像素
  const parts = [
    new Uint8Array(signature),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibWrapStored(scanline)),
    chunk('IEND', new Uint8Array(0)),
  ]
  return concatFixture(parts).buffer as ArrayBuffer
}

/** 最小 File 替身（name/type/arrayBuffer）。 */
export function pngFile(name: string, width: number, height: number): File {
  const bytes = minimalPng(width, height)
  return {
    name,
    type: 'image/png',
    size: bytes.byteLength,
    arrayBuffer: async () => bytes,
  } as unknown as File
}

/** 4 字节 box 构造器（size BE + fourCC）。 */
function box(type: string, content: Uint8Array, size?: number): Uint8Array {
  const header = new Uint8Array(8)
  const view = new DataView(header.buffer)
  view.setUint32(0, size ?? content.byteLength + 8)
  header.set(new TextEncoder().encode(type), 4)
  const out = new Uint8Array(header.byteLength + content.byteLength)
  out.set(header, 0)
  out.set(content, 8)
  return out
}

const fourCc = (value: string): Uint8Array => new TextEncoder().encode(value)
const u32Be = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

/** 纯视频 MP4（ftyp + moov 无 soun）→ false。 */
export function videoOnlyMp4(): Uint8Array {
  const ftypBody = fourCc('isom')
  const moovContent = box(
    'trak',
    box('mdia', box('minf', box('stbl', box('hinf', new Uint8Array(4))))),
  )
  return concat([box('ftyp', ftypBody), box('moov', moovContent)])
}

/** 含音轨 MP4（moov→trak→mdia→minf→stbl→hdlr('soun')）→ true。 */
export function audioMp4(): Uint8Array {
  const hdlrContent = concat([u32Be(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])
  const hdlr = box('hdlr', hdlrContent)
  const moov = box('moov', box('trak', box('mdia', box('minf', hdlr))))
  return concat([box('ftyp', fourCc('isom')), moov])
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

export { box, concat, fourCc, u32Be }
