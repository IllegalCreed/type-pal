/**
 * BALL.MKF 物品图标 RLE 解码 → PNG。
 *
 * sdlpal 真值(global.h::fpBALL "item bitmaps" / itemmenu.c:201-205 真值):
 *   BALL.MKF 共 252 chunks。每 chunk = 单帧 RLE bitmap(物品图标,典型 30×26 等小尺寸)。
 *   索引方式:`rgObject[wObject].item.wBitmap`(物品栏 / 装备 / 使用界面 / 商店)。
 *   读取方式:`PAL_MKFReadChunk(bufImage, 2048, wBitmap, fpBALL)`
 *           → `PAL_RLEBlitToSurface(bufImage, gpScreen, ...)`
 *   itemmenu.c / uigame.c / script.c / battle.c 均使用。
 *
 * M5.6 audit 第 1 真漏洞修:之前 raw dump base64 未解 RLE → T10b InventoryMenu 阻塞。
 * 现 decodeRle → IndexedImage → encodeIndexedPng → `images/items/{NNN}.png`。
 *
 * 0 字节 chunk(空槽位)skip。
 */
import { decodeRle } from '../../io/rle.js'
import { encodeIndexedPng } from '../sprite.js'

export interface BallIcon {
  chunkIndex: number
  width: number
  height: number
  pngBytes: Uint8Array
}

export function decodeBallIcon(chunkIdx: number, buf: Uint8Array): BallIcon | null {
  if (buf.byteLength < 4) return null
  // sdlpal palcommon.c:96-100 真值:BALL RLE bitmap 前 4 byte 是 0x02 00 00 00 file header,skip 后才是 width/height/RLE data。
  let rleBuf = buf
  if (buf[0] === 0x02 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00) {
    rleBuf = buf.subarray(4)
  }
  let frame: ReturnType<typeof decodeRle>
  try {
    frame = decodeRle(rleBuf)
  } catch (err) {
    console.warn(`[ball] chunk ${chunkIdx} RLE decode fail, skip:`, err)
    return null
  }
  if (frame.width === 0 || frame.height === 0) return null

  // 将 RleFrame(pixels + opaque) → encodeIndexedPng(width, height, indices, opaque)
  // sprite.ts encodeIndexedPng 真值签名 (w, h, indices, opaque?) — opaque=0 处 alpha=0
  const png = encodeIndexedPng(frame.width, frame.height, frame.pixels, frame.opaque)
  return {
    chunkIndex: chunkIdx,
    width: frame.width,
    height: frame.height,
    pngBytes: png,
  }
}
