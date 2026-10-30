/** Resource writers borrow explicit roots; CLI owns preflight, cleanup and invocation order. */
import { resolve } from 'node:path'
import { chunkCount, openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import { writeBinary, writeJson } from '../io/write.js'
import { dumpSoundsMetadata } from './parsers/sounds.js'

/** WIN95 sound chunks are complete WAV files; retain empty slots in metadata only. */
export function writeSoundAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  console.log('[pal-extract] SOUNDS.MKF (full WAV dump) …')
  const soundsMkf = openMkf(loadFile('SOUNDS.MKF'))
  const soundsN = chunkCount(soundsMkf)
  const soundsBufs: Uint8Array[] = []
  let wavWritten = 0
  for (let i = 0; i < soundsN; i++) {
    const buf = readChunk(soundsMkf, i)
    soundsBufs.push(buf)
    if (buf.byteLength === 0) continue
    writeBinary(resolve(outputRoot, 'sounds', `${i}.wav`), buf)
    wavWritten++
  }
  writeJson(resolve(outputRoot, 'data', 'sounds-metadata.json'), dumpSoundsMetadata(soundsBufs))
  console.log(`[pal-extract] SOUNDS.MKF: ${wavWritten} WAV written + metadata (${soundsN} chunks)`)
}
