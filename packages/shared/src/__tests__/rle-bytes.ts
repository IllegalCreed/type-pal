/** Test packets only: caller supplies frame bytes, including intentional malformed frames. */
export function frameBytes(width: number, height: number, commands: readonly number[]): Uint8Array {
  return new Uint8Array([width & 255, width >> 8, height & 255, height >> 8, ...commands])
}

/** Nonempty frame table with word-aligned payloads; no production codec is used. */
export function strictChunk(
  frames: readonly [Uint8Array, ...Uint8Array[]],
  sentinel = false,
): Uint8Array {
  const padded = frames.map((frame) => (frame.length % 2 ? new Uint8Array([...frame, 0]) : frame))
  const count = frames.length + (sentinel ? 1 : 0)
  const offsets: number[] = []
  let end = count * 2
  for (const frame of padded) {
    offsets.push(end)
    end += frame.length
  }
  const out = new Uint8Array(end)
  const view = new DataView(out.buffer)
  view.setUint16(0, count, true) // Count and slot0 offset occupy the same WORD.
  padded.forEach((frame, index) => {
    if (index > 0) view.setUint16(index * 2, offsets[index]! / 2, true)
    out.set(frame, offsets[index]!)
  })
  // Optional final offset remains zero; all payloads are independent copies in out.
  return out
}
