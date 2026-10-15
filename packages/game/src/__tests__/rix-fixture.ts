/** Original music is not committed to tests. This is an authored single-note RIX. */
export function rixFixture(): ArrayBuffer {
  const song = new Uint8Array(92)
  const view = new DataView(song.buffer)
  view.setUint16(0, 0x55aa, true)
  view.setUint16(8, 20, true)
  view.setUint16(12, 84, true)
  const operator = [0, 1, 0, 15, 0, 1, 0, 10, 0, 0, 0, 0, 0]
  for (let i = 0; i < 26; i++) view.setUint16(20 + i * 2, operator[i % 13] ?? 0, true)
  song.set([0, 0x90, 60, 0xc0, 0xe8, 0x03, 0, 0x80], 84)
  const result = new Uint8Array(89 * 4 + song.length * 3)
  const offsets = new DataView(result.buffer)
  let position = 89 * 4
  for (let track = 0; track < 88; track++) {
    offsets.setUint32(track * 4, position, true)
    if ([1, 3, 87].includes(track)) {
      const variation = song.slice()
      if (track === 87) variation[86] = 72
      result.set(variation, position)
      position += song.length
    }
  }
  offsets.setUint32(88 * 4, position, true)
  return result.buffer
}
