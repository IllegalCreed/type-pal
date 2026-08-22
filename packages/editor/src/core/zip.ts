/**
 * 浏览器 ZIP 打包器(A5 项目导出;零依赖)。
 * DEFLATE 走原生 CompressionStream('deflate-raw')(方法 8);文件名 UTF-8(通用位 0x0800,
 * 中文项目名/路径不乱码)。尺寸已知 → 不用 data descriptor。无 zip64:项目 ≤4GB /
 * 条目 ≤65535,超限报清晰错(项目量级远够)。
 */

/** CRC-32(IEEE,查表)。 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = (CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)) >>> 0
  return (c ^ 0xffffffff) >>> 0
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export interface ZipEntry {
  /** zip 内路径(正斜杠,不以 / 开头)。 */
  path: string
  data: Uint8Array
}

/** DOS 时间戳恒零(1980-01-01):导出可复现(同内容同字节),不掺当前时间。 */
const DOS_TIME = 0
const DOS_DATE = 0x21 // 1980-01-01

export async function buildZip(entries: ZipEntry[]): Promise<Uint8Array> {
  if (entries.length > 0xffff) throw new Error(`zip: 条目 ${entries.length} 超 65535(无 zip64)`)
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const e of entries) {
    const name = enc.encode(e.path)
    const crc = crc32(e.data)
    const comp = await deflateRaw(e.data)
    // 极小文件 deflate 可能反涨 → 择优 STORE(方法 0)
    const useStore = comp.length >= e.data.length
    const method = useStore ? 0 : 8
    const payload = useStore ? e.data : comp
    if (e.data.length > 0xffffffff || payload.length > 0xffffffff)
      throw new Error(`zip: ${e.path} 超 4GB(无 zip64)`)

    const local = new Uint8Array(30 + name.length + payload.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true) // local file header
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 名
    lv.setUint16(8, method, true)
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, payload.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true) // extra len
    local.set(name, 30)
    local.set(payload, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true) // central dir header
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, method, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, payload.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true) // local header offset
    central.set(name, 46)
    centrals.push(central)

    offset += local.length
  }

  const cdSize = centrals.reduce((a, c) => a + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true) // central dir offset
  const total = offset + cdSize + eocd.length
  if (total > 0xffffffff) throw new Error('zip: 总大小超 4GB(无 zip64)')

  const out = new Uint8Array(total)
  let p = 0
  for (const b of [...locals, ...centrals, eocd]) {
    out.set(b, p)
    p += b.length
  }
  return out
}
