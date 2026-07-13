/**
 * RGM.MKF 角色头像 RLE 解码 → PNG。
 *
 * sdlpal 真值锚:
 *   - global.h fpRGM 注释 "character face bitmaps"
 *   - uigame.c:1132-1135 真值用法(PAL_PlayerStatus):
 *       `PAL_MKFReadChunk(bufImage, ..., rgwAvatar[role], fpRGM) > 0`
 *       → `PAL_RLEBlitToSurface(bufImage, gpScreen, ScreenLayout.RoleImage)`
 *   - text.c PAL_DialogAddText 同样按 `rgwAvatar[role]` 索引(dialog box portrait)
 *   - palcommon.c:94-100 真值:RLE frame header skip 4-byte `02 00 00 00` file header
 *
 * RGM.MKF 共 92 chunks。chunk 0 通常 0 字节(空槽位 — skip),后续 chunk 各是单帧
 * RLE bitmap(典型 78×91 等中型头像)。索引方式 = `PlayerRoles.rgwAvatar[roleId]`
 * (M4 已 dump 进 player-roles.json `roles[i].avatar`)。
 *
 * M5.6 audit 第 2 真漏洞修(2026-05-27):之前 raw dump base64 未解 RLE → T10d PlayerStatus
 * 阻塞。复用 decodeRle + encodeIndexedPng,与 BALL ([`ball.ts`](./ball.ts)) 同模式。
 *
 * 0 字节 chunk(空槽位)skip。
 */
import { decodeRle } from '../../io/rle.js'
import { encodeIndexedPng } from '../sprite.js'

export interface RgmPortrait {
  chunkIndex: number
  width: number
  height: number
  pngBytes: Uint8Array
}

export function decodeRgmPortrait(chunkIdx: number, buf: Uint8Array): RgmPortrait | null {
  if (buf.byteLength < 4) return null
  // sdlpal palcommon.c:94-100 真值:RGM/BALL RLE bitmap 前 4 byte 是 0x02 00 00 00 file
  // header,skip 后才是 width/height/RLE data。
  let rleBuf = buf
  if (buf[0] === 0x02 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00) {
    rleBuf = buf.subarray(4)
  }
  let frame: ReturnType<typeof decodeRle>
  try {
    frame = decodeRle(rleBuf)
  } catch (err) {
    console.warn(`[rgm] chunk ${chunkIdx} RLE decode fail, skip:`, err)
    return null
  }
  if (frame.width === 0 || frame.height === 0) return null

  const png = encodeIndexedPng(frame.width, frame.height, frame.pixels, frame.opaque)
  return {
    chunkIndex: chunkIdx,
    width: frame.width,
    height: frame.height,
    pngBytes: png,
  }
}
