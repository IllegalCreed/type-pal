/** Resource writers borrow explicit roots; CLI owns preflight, cleanup and invocation order. */
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { decodeRngFrames } from '@type-pal/shared'
import { chunkCount, openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import { writeBinary, writeJson } from '../io/write.js'
import { decompressYj2 } from '../io/yj2.js'
import { parseSpriteChunk } from './sprite.js'

/** Store original RNG chunks as gzip blobs; decoding supplies frame metadata only. */
export function writeRngAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  const rngMkf = openMkf(loadFile('RNG.MKF'))
  const n = chunkCount(rngMkf)
  const manifest: Array<{
    chunkIndex: number
    frameCount: number
    frames: Array<{ index: number }>
  }> = []
  let totalRngFrames = 0
  for (let i = 0; i < n; i++) {
    const chunk = readChunk(rngMkf, i)
    let frames: ReturnType<typeof decodeRngFrames>
    try {
      frames = decodeRngFrames(chunk)
    } catch (err) {
      console.warn(`[pal-extract] RNG chunk ${i} decode fail, skip:`, err)
      continue
    }
    writeBinary(
      resolve(outputRoot, 'data', 'animation', `rng-${i.toString().padStart(2, '0')}.rle`),
      gzipSync(chunk),
    )
    manifest.push({
      chunkIndex: i,
      frameCount: frames.length,
      frames: frames.map((f) => ({ index: f.index })),
    })
    totalRngFrames += frames.length
  }
  writeJson(resolve(outputRoot, 'data', 'rng-frames.json'), { chunks: manifest })
  console.log(`[pal-extract] RNG.MKF blobs written (${n} chunks, ${totalRngFrames} frames total)`)
}

/** FIRE permits raw chunks when YJ2 fails; keep that policy separate from RNG rejection. */
export function writeFireAssets(rawRoot: string, outputRoot: string): void {
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))
  function magicFireBlobPath(chunkIdx: number): string {
    return resolve(outputRoot, 'data', 'magic', `fire-${chunkIdx.toString().padStart(2, '0')}.rle`)
  }

  const fireMkf = openMkf(loadFile('FIRE.MKF'))
  const n = chunkCount(fireMkf)
  let totalFireFrames = 0
  const fireManifest: Array<{
    chunkIndex: number
    frameCount: number
    frames: Array<{ index: number; width: number; height: number }>
  }> = []
  for (let i = 0; i < n; i++) {
    const buf = readChunk(fireMkf, i)
    let decompressed: Uint8Array
    try {
      decompressed = decompressYj2(buf)
    } catch {
      decompressed = buf
    }
    const frames = decompressed.byteLength < 2 ? [] : parseSpriteChunk(decompressed)
    if (frames.length > 0) writeBinary(magicFireBlobPath(i), gzipSync(decompressed))
    fireManifest.push({
      chunkIndex: i,
      frameCount: frames.length,
      frames: frames.map((f, idx) => ({ index: idx, width: f.width, height: f.height })),
    })
    totalFireFrames += frames.length
  }
  writeJson(resolve(outputRoot, 'data', 'fire-sprites.json'), {
    chunkCount: n,
    chunks: fireManifest,
  })
  console.log(`[pal-extract] FIRE.MKF blobs written (${n} chunks, ${totalFireFrames} frames total)`)
}
