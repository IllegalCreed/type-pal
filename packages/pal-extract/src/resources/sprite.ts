/**
 * 精灵 chunk 解析与索引位图 PNG 编码。
 * 参考 reference/sdlpal/sprite.c::PAL_LoadSprite。
 */
import { PNG } from 'pngjs'
import { decodeRle, type RleFrame } from '../io/rle.js'

/**
 * 精灵 chunk 头:byte 0..1 = u16 LE imagecount(同时充当 frame[0] 的 word-offset)。
 * 偏移表在 byte 0..2*imagecount-2,每条 u16 word offset(乘 2 得字节偏移)。
 * 参考 sdlpal palcommon.c::PAL_SpriteGetFrame:
 *     imagecount = (lpSprite[0] | (lpSprite[1] << 8));
 *     iFrameNum <<= 1;
 *     offset = ((lpSprite[iFrameNum] | (lpSprite[iFrameNum + 1] << 8)) << 1);
 *   → frame 0 的 offset 同 imagecount * 2(因为 byte 0..1 双重身份)
 *   → frame i 的 offset = u16 at byte 2*i,左移 1
 *
 * offset = 0 表示帧空缺。
 */
export function parseSpriteChunk(buf: Uint8Array): RleFrame[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frameCount = view.getUint16(0, true)
  const frames: RleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const wordOffset = view.getUint16(i * 2, true)
    const offset = wordOffset << 1
    if (offset === 0 || offset >= buf.byteLength) continue
    frames.push(decodeRle(buf.subarray(offset)))
  }
  return frames
}

/**
 * 把索引位图编码为 PNG。M1 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)。
 * 运行时 game 包加载时只取 R 通道(=索引)。
 * 不烤色;运行时查调色板填色。
 * 磁盘代价 ×4 但实现简单;M3 视情况优化。
 */
export function encodeIndexedPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    // biome-ignore lint/style/noNonNullAssertion: pixels length = width * height, index always in bounds
    const v = pixels[i]!
    png.data[i * 4] = v
    png.data[i * 4 + 1] = v
    png.data[i * 4 + 2] = v
    png.data[i * 4 + 3] = 255
  }
  return new Uint8Array(PNG.sync.write(png))
}

export interface SpriteFrameOut {
  index: number
  width: number
  height: number
  pngBytes: Uint8Array
}

export function framesToOut(frames: RleFrame[]): SpriteFrameOut[] {
  return frames.map((f, i) => ({
    index: i,
    width: f.width,
    height: f.height,
    pngBytes: encodeIndexedPng(f.width, f.height, f.pixels),
  }))
}

export interface CharacterSpriteOut {
  spriteId: number
  frames: SpriteFrameOut[]
}

/**
 * 从 MGO.MKF 提取一组指定 sprite id 的全部帧。
 * @param spriteIds —— 切片场景出现的 sprite 号集合(队长 + NPC.spriteNum 去重)
 * @param mgoChunks —— sprite id → 该 chunk 原始字节(调用方负责从 MGO.MKF 读 / 解压)
 */
export function extractCharacterSprites(
  spriteIds: number[],
  mgoChunks: Map<number, Uint8Array>,
): CharacterSpriteOut[] {
  const result: CharacterSpriteOut[] = []
  for (const id of spriteIds) {
    const chunk = mgoChunks.get(id)
    if (!chunk) {
      console.warn(`[pal-extract] sprite ${id}: MGO.MKF chunk 未找到,skip`)
      continue
    }
    const frames = parseSpriteChunk(chunk)
    result.push({ spriteId: id, frames: framesToOut(frames) })
  }
  return result
}
