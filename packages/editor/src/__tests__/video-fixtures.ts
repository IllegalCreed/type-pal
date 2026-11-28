function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function u32be(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

function fourCc(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

/** ISO BMFF 盒：size(4, 大端含头) + type(4) + content。 */
function mp4Box(type: string, content: Uint8Array): Uint8Array {
  return joinBytes([u32be(8 + content.byteLength), fourCc(type), content])
}

/** 仅用于盒级元数据的 ftyp fixture，无音视频 sample。 */
export function mp4SilentBytes(): Uint8Array {
  return mp4Box(
    'ftyp',
    joinBytes([fourCc('isom'), u32be(0), fourCc('isom'), fourCc('iso2'), fourCc('mp41')]),
  )
}

/** Legal box lengths for catalog size tests, with no encoded samples. */
export function paddedMp4Bytes(total: number): Uint8Array {
  const header = mp4Box(
    'ftyp',
    joinBytes([fourCc('isom'), u32be(0), fourCc('isom'), fourCc('iso2')]),
  )
  const freeSize = total - header.byteLength - 8
  if (!Number.isSafeInteger(freeSize) || freeSize < 0)
    throw new Error('MP4 fixture needs room for its ftyp and free boxes')
  return joinBytes([header, mp4Box('free', new Uint8Array(freeSize))])
}

/** ftyp + moov/trak/mdia/hdlr(soun)：产品 mp4HasAudioTrack 真实解析结果为 true。 */
export function mp4AudioBytes(): Uint8Array {
  const hdlr = mp4Box('hdlr', joinBytes([u32be(0), u32be(0), fourCc('soun')]))
  const ftyp = mp4Box('ftyp', joinBytes([fourCc('isom'), u32be(0), fourCc('isom')]))
  return joinBytes([ftyp, mp4Box('moov', mp4Box('trak', mp4Box('mdia', hdlr)))])
}

/** A 32-byte EBML header naming the WebM document type. No media segments follow it. */
export function webmHeaderBytes(): Uint8Array {
  return new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x9b, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
    0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02,
  ])
}
