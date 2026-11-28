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

function readBox(bytes: Uint8Array, offset: number, limit: number) {
  let size = readU32Be(bytes, offset)
  const type = fourCc(bytes, offset + 4)
  let header = 8
  if (size === 1) {
    if (offset + 16 > limit) return undefined
    const high = readU32Be(bytes, offset + 8)
    const low = readU32Be(bytes, offset + 12)
    size = high * 0x1_0000_0000 + low
    if (!Number.isSafeInteger(size)) return undefined
    header = 16
  } else if (size === 0) {
    size = limit - offset
  }
  if (size < header || size > limit - offset) return undefined
  return { type, content: offset + header, end: offset + size }
}

function scanMp4Boxes(bytes: Uint8Array): boolean {
  const ranges = [{ start: 0, end: bytes.byteLength }]
  for (let range = ranges.pop(); range; range = ranges.pop()) {
    for (let offset = range.start; offset + 8 <= range.end; ) {
      const box = readBox(bytes, offset, range.end)
      if (!box) break
      if (
        box.type === 'hdlr' &&
        box.content + 12 <= box.end &&
        fourCc(bytes, box.content + 8) === 'soun'
      )
        return true
      const children = box.type === 'meta' ? box.content + 4 : box.content
      if ((box.type === 'meta' || CONTAINER_BOXES.has(box.type)) && children + 8 <= box.end) {
        // An invalid child abandons only its own range. Resume the sibling range afterwards.
        if (box.end + 8 <= range.end) ranges.push({ start: box.end, end: range.end })
        ranges.push({ start: children, end: box.end })
        break
      }
      offset = box.end
    }
  }
  return false
}

/** 只解析 ISO BMFF box 层级，不解码媒体；undefined 表示不是可识别 MP4。 */
export function mp4HasAudioTrack(bytes: Uint8Array): boolean | undefined {
  if (bytes.byteLength < 12 || fourCc(bytes, 4) !== 'ftyp') return undefined
  return scanMp4Boxes(bytes)
}
