/**
 * RNG.MKF chunk raw dump(M4 P2 T4)。
 *
 * sdlpal 真值(rngplay.c::PAL_RNGReadFrame):
 *   RNG.MKF 每个 chunk 本身是一个子 MKF,其内每条子 chunk 是一帧动画增量数据
 *   (RLE 差分,`PAL_RNGBlitToSurface` 叠加到 320×200 8-bit surface)。
 *   共 12 个动画(0-11),每个动画含若干帧。
 *
 * M4 只 raw dump;M5/M6 再按 rngplay.c 格式解帧。
 */
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

export function dumpRngAnim(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(
    chunkIdx,
    buf,
    `RNG.MKF chunk ${chunkIdx} — sub-MKF containing RLE delta animation frames (sdlpal rngplay.c PAL_RNGReadFrame)`,
    'TODO M5/M6: decode sub-MKF frame table + PAL_RNGBlitToSurface delta RLE, produce frame PNGs',
  )
}
