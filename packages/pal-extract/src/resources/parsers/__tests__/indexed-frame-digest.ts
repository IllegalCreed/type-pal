import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'
import { expect } from 'vitest'
import type { SpriteFrameOut } from '../../sprite.js'

/** Test-only actual-output digest. Expected pixels come from unchanged SDLPal C. */
export function createFrameDigest() {
  const hash = createHash('sha256')
  return {
    add(chunkIndex: number, frames: readonly SpriteFrameOut[]): void {
      for (const frame of frames) {
        const png = PNG.sync.read(Buffer.from(frame.pngBytes))
        expect([png.width, png.height]).toEqual([frame.width, frame.height])
        const header = Buffer.alloc(16)
        header.writeUInt32LE(chunkIndex, 0)
        header.writeUInt32LE(frame.index, 4)
        header.writeUInt32LE(frame.width, 8)
        header.writeUInt32LE(frame.height, 12)
        hash.update(header).update(png.data)
      }
    },
    hex(): string {
      return hash.digest('hex')
    },
  }
}
