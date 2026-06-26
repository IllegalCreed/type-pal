/**
 * 精灵 chunk 解析与索引位图 PNG 编码。
 * 参考 reference/sdlpal/sprite.c::PAL_LoadSprite。
 */
import { PNG } from 'pngjs'
import { parseSpriteChunk, type RleFrame } from '@type-pal/shared'

// `parseSpriteChunk` 已搬到 @type-pal/shared(extractor 与 runtime 共用,见
// tileset 资源管线优化 S1)。本文件 re-export,保持 extractor 内部调用点不变。
export { parseSpriteChunk }

/**
 * 把索引位图编码为 PNG。M1 用 RGBA 三通道复制法(R=G=B=调色板下标,A=opaque mask)。
 * 运行时 game 包加载时:R 通道 = palette index,A 通道 = opaque(>0 即 opaque)。
 * 不烤色;运行时查调色板填色。
 *
 * **alpha 通道载 opaque mask**(M3.5 fix):之前 alpha 永远 = 255,RLE-skip 透明
 * 与 opaque palette-0 都丢失区分;运行时 blit `idx === 0 continue` 把所有 palette-0
 * 像素当透明 → scene 16 通道 dense tile + 角色 sprite 头发暗部都半透明。
 *
 * `opaque` 不传时全 opaque(向后兼容 — 比如战斗背景 320×200 raw bitmap 无 RLE)。
 *
 * 磁盘代价 ×4 但实现简单;M3 视情况优化。
 */
export function encodeIndexedPng(
  width: number,
  height: number,
  pixels: Uint8Array,
  opaque?: Uint8Array,
): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    // biome-ignore lint/style/noNonNullAssertion: pixels length = width * height, index always in bounds
    const v = pixels[i]!
    png.data[i * 4] = v
    png.data[i * 4 + 1] = v
    png.data[i * 4 + 2] = v
    // biome-ignore lint/style/noNonNullAssertion: opaque length matches pixels when provided
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
