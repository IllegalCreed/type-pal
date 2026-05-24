/**
 * BALL.MKF chunk raw dump(M4 P2 T4)。
 *
 * sdlpal 真值(global.h::fpBALL 注释 "item bitmaps"):
 *   BALL.MKF 共 252 chunks。每个 chunk 是一个单帧 RLE bitmap(物品图标)。
 *   索引方式:rgObject[wObject].item.wBitmap(物品栏、装备选择、使用界面)。
 *   读取方式:PAL_MKFReadChunk(bufImage, 2048, wBitmap, fpBALL)
 *             → PAL_RLEBlitToSurface(bufImage, gpScreen, ...)。
 *   itemmenu.c、uigame.c、script.c 均使用。
 *
 * M4 只 raw dump;M5 走 decodeRle → PNG 图标导出。
 */
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

export function dumpBallChunk(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(
    chunkIdx,
    buf,
    `BALL.MKF chunk ${chunkIdx} — single-frame RLE bitmap, item icon (sdlpal global.h fpBALL, itemmenu.c/uigame.c wBitmap)`,
    'TODO M5: decodeRle → encodeIndexedPng, dump to images/items/ball-NNN.png',
  )
}
