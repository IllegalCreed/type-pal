import { describe, expect, it } from 'vitest'
import { inspectRixArchive } from '../rix.js'

function archive(chunk: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(89 * 4 + chunk.byteLength * 2)
  const view = new DataView(bytes.buffer)
  let position = 89 * 4
  for (let track = 0; track < 88; track++) {
    view.setUint32(track * 4, position, true)
    if (track === 1 || track === 87) {
      bytes.set(chunk, position)
      position += chunk.byteLength
    }
  }
  view.setUint32(88 * 4, position, true)
  return bytes
}

describe('RIX archive publication', () => {
  it('preserves script IDs across empty slots rather than compacting the track list', () => {
    const song = new Uint8Array(92)
    song.set([0xaa, 0x55])
    const view = new DataView(song.buffer)
    view.setUint16(8, 20, true)
    view.setUint16(12, 84, true)
    song.set([0, 0x90, 60, 0xc0, 0xe8, 0x03, 0, 0x80], 84)
    const input = archive(song)
    const before = input.slice()
    expect(inspectRixArchive(input)).toEqual([1, 87])
    expect(input).toEqual(before)
  })

  it.each([
    { reason: 'truncated header', song: new Uint8Array([0xaa, 0x55]) },
    {
      reason: 'wrong first signature byte',
      song: new Uint8Array([0xab, 0x55, ...new Uint8Array(14)]),
    },
    {
      reason: 'wrong second signature byte',
      song: new Uint8Array([0xaa, 0x54, ...new Uint8Array(14)]),
    },
  ])('rejects $reason before copying to the published library', ({ song }) => {
    expect(() => inspectRixArchive(archive(song))).toThrow('RIX: invalid music header in track 1')
  })
})
