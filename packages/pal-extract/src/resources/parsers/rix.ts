import { chunkCount, openMkf, readChunk } from '../../io/mkf.js'

/** Check MKF structure and minimum RIX headers; keep sparse IDs, without validating the audio stream. */
export function inspectRixArchive(bytes: Uint8Array): number[] {
  const mkf = openMkf(bytes)
  const tracks: number[] = []
  for (let track = 0; track < chunkCount(mkf); track++) {
    const chunk = readChunk(mkf, track)
    if (chunk.byteLength === 0) continue
    if (chunk.byteLength < 16 || chunk[0] !== 0xaa || chunk[1] !== 0x55) {
      throw new Error(`RIX: invalid music header in track ${track}`)
    }
    tracks.push(track)
  }
  return tracks
}
