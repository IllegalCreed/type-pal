/** Test-only MKF container: N chunks, N+1 little-endian offsets, independent byte payloads. */
export function mkMkf(chunks: ReadonlyArray<Uint8Array>): Uint8Array {
  const headerBytes = (chunks.length + 1) * 4
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(headerBytes + total)
  const view = new DataView(out.buffer)
  let cursor = headerBytes
  chunks.forEach((chunk, i) => {
    view.setUint32(i * 4, cursor, true)
    out.set(chunk, cursor)
    cursor += chunk.byteLength
  })
  view.setUint32(chunks.length * 4, cursor, true)
  return out
}
