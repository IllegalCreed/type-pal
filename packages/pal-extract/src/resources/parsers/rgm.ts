/**
 * RGM.MKF chunk raw dump(M4 P2 T4)。
 *
 * sdlpal 真值(global.h::fpRGM 注释 "character face bitmaps"):
 *   RGM.MKF 共 92 chunks。每个 chunk 是一个单帧 RLE bitmap
 *   (PAL_MKFReadChunk 读原始字节 → PAL_RLEBlitToSurface 直接渲)。
 *   索引方式:PlayerRoles.rgwAvatar[iPlayerRole](对话框角色头像)。
 *   text.c PAL_DialogAddText 中 iNumCharFace = rgwAvatar 值。
 *
 * M4 只 raw dump;M5+ 走 decodeRle → PNG 图标导出。
 */
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

export function dumpRgmChunk(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(
    chunkIdx,
    buf,
    `RGM.MKF chunk ${chunkIdx} — single-frame RLE bitmap, character face/avatar (sdlpal global.h fpRGM, text.c PAL_DialogAddText)`,
    'TODO M5: decodeRle → encodeIndexedPng, dump to images/portraits/rgm-NN.png',
  )
}
