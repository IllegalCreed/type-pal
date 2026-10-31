/** RNG input records and resolved data ports; callers own player/cache/clock cleanup. */
import type { Palette } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'

export function rngFrame(fill: number): IndexedImage {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(fill),
    opaque: new Uint8Array(320 * 200).fill(1),
  }
}

export function rngManifest(frameCount: number, chunkIndex = 6) {
  return {
    chunks: [
      {
        chunkIndex,
        frameCount,
        frames: Array.from({ length: frameCount }, (_, index) => ({ index })),
      },
    ],
  }
}

const THREE_FRAME_MANIFEST = {
  chunks: [{ chunkIndex: 6, frameCount: 3, frames: [{ index: 0 }, { index: 1 }, { index: 2 }] }],
}

export async function fetchThreeFrameManifest(): Promise<typeof THREE_FRAME_MANIFEST> {
  return THREE_FRAME_MANIFEST
}

export async function fetchSequentialFrame(
  _chunkIdx: number,
  frameIdx: number,
): Promise<IndexedImage> {
  return rngFrame(frameIdx + 1)
}

export const blackPalette: Palette = {
  colors: Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0]),
  cycles: [],
}
