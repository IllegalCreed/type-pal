/**
 * 精灵 chunk 解析与索引位图 PNG 编码。
 * 容器帧索引参考 reference/sdlpal/palcommon.c::PAL_SpriteGetFrame；
 * 解码复用 shared，PNG 的 R/A 传输合同由 game/assets/png.ts 消费。
 */

import { parsePalSpriteChunk as parseSpriteChunk, type RleFrame } from '@type-pal/shared'
import { PNG } from 'pngjs'

// 原盘extractor/runtime共用PAL来源规则；保留extractor内部出口名。
export { parseSpriteChunk }

/**
 * 把索引位图编码为 RGBA PNG(R=G=B=调色板下标,A=opaque mask)。
 * 运行时 game 包加载时:R 通道 = palette index,A 通道 = opaque(>0 即 opaque)。
 * 不烤色;运行时查调色板填色。
 *
 * **alpha 通道载 opaque mask**(M3.5 fix):之前 alpha 永远 = 255,RLE-skip 透明
 * 与 opaque palette-0 都丢失区分;运行时 blit `idx === 0 continue` 把所有 palette-0
 * 像素当透明 → scene 16 通道 dense tile + 角色 sprite 头发暗部都半透明。
 *
 * `opaque` 不传时全 opaque；CLI 的 320×200 FBP raw 背景没有 RLE mask。
 *
 * 四通道像素由 pngjs 压缩；PNG 字节大小不等于原始下标平面的四倍。
 */
export function encodeIndexedPng(
  width: number,
  height: number,
  pixels: Uint8Array,
  opaque?: Uint8Array,
): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`encodeIndexedPng: invalid dimensions ${width}x${height}`)
  }
  const total = width * height
  if (pixels.byteLength < total) {
    throw new Error(`encodeIndexedPng: pixels length ${pixels.byteLength} < ${total}`)
  }
  if (opaque && opaque.byteLength < total) {
    throw new Error(`encodeIndexedPng: opaque length ${opaque.byteLength} < ${total}`)
  }
  const png = new PNG({ width, height })
  for (let i = 0; i < total; i++) {
    const v = pixels[i]!
    png.data[i * 4] = v
    png.data[i * 4 + 1] = v
    png.data[i * 4 + 2] = v
    png.data[i * 4 + 3] = opaque ? (opaque[i]! ? 255 : 0) : 255
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
    pngBytes: encodeIndexedPng(f.width, f.height, f.pixels, f.opaque),
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
