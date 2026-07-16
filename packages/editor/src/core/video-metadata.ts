function fourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  )
}

function readU32Be(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  )
}

const CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'udta'])

function scanMp4Boxes(bytes: Uint8Array, start: number, end: number): boolean {
  for (let offset = start; offset + 8 <= end; ) {
    let size = readU32Be(bytes, offset)
    const type = fourCc(bytes, offset + 4)
    let header = 8
    if (size === 1) {
      if (offset + 16 > end) return false
      const high = readU32Be(bytes, offset + 8)
      const low = readU32Be(bytes, offset + 12)
      const extended = high * 0x1_0000_0000 + low
      if (!Number.isSafeInteger(extended)) return false
      size = extended
      header = 16
    } else if (size === 0) size = end - offset
    if (size < header || offset + size > end) return false
    const content = offset + header
    const boxEnd = offset + size
    if (type === 'hdlr' && content + 12 <= boxEnd && fourCc(bytes, content + 8) === 'soun')
      return true
    if (CONTAINER_BOXES.has(type) && scanMp4Boxes(bytes, content, boxEnd)) return true
    if (type === 'meta' && content + 4 <= boxEnd && scanMp4Boxes(bytes, content + 4, boxEnd))
      return true
    offset = boxEnd
  }
  return false
}

/** 只解析 ISO BMFF box 层级，不解码媒体；undefined 表示不是可识别 MP4。 */
export function mp4HasAudioTrack(bytes: Uint8Array): boolean | undefined {
  if (bytes.byteLength < 12 || fourCc(bytes, 4) !== 'ftyp') return undefined
  return scanMp4Boxes(bytes, 0, bytes.byteLength)
}
