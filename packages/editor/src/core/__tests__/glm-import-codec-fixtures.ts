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

/** 最小合法 PNG：8 字节签名 + IHDR（宽高）+ IDAT + IEND（真实结构，非假流）。 */
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
    // CRC 省略为零（解码走替身不核 CRC；签名/结构供产品守卫域）
    return body
  }
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const parts = [
    new Uint8Array(signature),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array([0x78, 0x9c, 0x00, 0x00, 0x00, 0x00, 0x01])),
    chunk('IEND', new Uint8Array(0)),
  ]
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out.buffer
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
