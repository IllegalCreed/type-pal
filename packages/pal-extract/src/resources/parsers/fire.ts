/**
 * FIRE.MKF sprite 抽出(M4 P2 T4)。
 *
 * sdlpal 真值(global.h::fpFIRE 注释 "fire effect sprites"):
 *   FIRE.MKF 共 55 chunks。每个 chunk 是 YJ2 压缩的 sprite group。
 *   索引方式:lprgMagic[iMagicNum].wEffect = iEffectNum → FIRE.MKF chunk index。
 *   读取方式:PAL_MKFDecompressChunk(lpSpriteEffect, l, iEffectNum, fpFIRE)
 *             → PAL_SpriteGetNumFrames(lpSpriteEffect)
 *             → PAL_SpriteGetFrame(lpSpriteEffect, i)。
 *   fight.c 三处调用(PAL_BattlePlayerMagic / PAL_BattleEnemyMagic / PAL_BattlePlayerSpecialAction)。
 *
 * 策略:YJ2 decompress → parseSpriteChunk → framesToOut → PNG
 * 产出目录:images/magic/fire-{NN}/frame-{NN}.png
 */
import { decompressYj2 } from '../../io/yj2.js'
import { encodeIndexedPng, framesToOut, parseSpriteChunk } from '../sprite.js'

export interface FireSpriteOut {
  chunkIndex: number
  frameCount: number
  frames: Array<{
    index: number
    width: number
    height: number
    pngBytes: Uint8Array
  }>
}

/**
 * 解析 FIRE.MKF 单 chunk → sprite group frames。
 * 若 YJ2 解压失败,回退 raw(少数可能未压缩)。
 * 若 chunk 为空或解出 0 帧,返回 frameCount=0 且 frames=[]。
 */
export function parseFirSprite(chunkIdx: number, buf: Uint8Array): FireSpriteOut {
  if (buf.byteLength === 0) {
    return { chunkIndex: chunkIdx, frameCount: 0, frames: [] }
  }
  let decompressed: Uint8Array
  try {
    decompressed = decompressYj2(buf)
  } catch {
    decompressed = buf
  }
  // sprite group header requires at least 2 bytes(u16 frameCount)
  if (decompressed.byteLength < 2) {
    return { chunkIndex: chunkIdx, frameCount: 0, frames: [] }
  }
  const rleFrames = parseSpriteChunk(decompressed)
  const out = framesToOut(rleFrames)
  return {
    chunkIndex: chunkIdx,
    frameCount: out.length,
    frames: out.map((f) => ({
      index: f.index,
      width: f.width,
      height: f.height,
      pngBytes: f.pngBytes,
    })),
  }
}

export { encodeIndexedPng }
