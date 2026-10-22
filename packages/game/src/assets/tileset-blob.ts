/**
 * gzip sprite/RLE blob 加载(资源管线优化:去图片容器)。
 *
 * 通用 sprite-chunk codec —— tileset / npc / battle / magic 共用:每个逻辑单元(地图 /
 * sprite id / ...)存一个 `.rle` blob(= gzip 后的「喂给 parseSpriteChunk 的 chunk 字节」:
 * tileset = 原始 GOP chunk;npc/battle/magic = YJ2 解压后的 sprite chunk)。
 * 本模块负责:fetch blob → 浏览器原生 DecompressionStream('gzip') 解压 →
 * parseSpriteChunk 解出 RleFrame[] → IndexedImage[](或 tileset 的 Map<tileIndex>)。
 *
 * 相比旧链路(fetch per-tile PNG → createImageBitmap → canvas getImageData):
 *   - 每个资源单元请求一个 blob，不再逐帧请求 PNG
 *   - 不经 createImageBitmap / canvas
 *   - blob 保留提取器输出的 GOP chunk 字节；runtime 与 extractor 使用同一份 parseSpriteChunk
 *
 * 键一致性铁律:Map 的 key = parseSpriteChunk 返回数组的下标 i,
 * 与旧 `framesToOut` 的 `index` 字段(同一过滤后序列)一致。地图 cells 引用此下标。
 */

import { parseSpriteChunk, type RleFrame } from '@type-pal/shared'
import type { IndexedImage } from './png.js'

/**
 * 把 RleFrame 转成 IndexedImage(纯字段重命名:pixels → indices,形状一致)。
 * 借用 pixels / opaque 两份 Uint8Array(不拷贝)，不取得独占所有权。
 * 当前呈现 caller 只读这些数组；修改任一视图会被共享该数组的对象观察到。
 */
export function rleFrameToIndexedImage(frame: RleFrame): IndexedImage {
  return {
    width: frame.width,
    height: frame.height,
    indices: frame.pixels,
    opaque: frame.opaque,
  }
}

/**
 * 把已解压的 GOP chunk 字节解析成 Map<tileIndex, IndexedImage>。
 *
 * @param gopBytes - 解压后的原始 GOP.MKF chunk 字节(= extractor 写盘前的 readChunk(gopMkf, mapNum))
 * @returns key = parseSpriteChunk 返回数组的下标(= 旧 framesToOut 的 index)
 */
export function decodeTilesetBlob(gopBytes: Uint8Array): Map<number, IndexedImage> {
  const frames = decodeSpriteFrames(gopBytes)
  const map = new Map<number, IndexedImage>()
  for (let i = 0; i < frames.length; i++) {
    map.set(i, frames[i]!)
  }
  return map
}

/**
 * 解压后的 sprite chunk → IndexedImage[](帧序 = parseSpriteChunk 下标,即原 tile-/frame-{index})。
 * npc / battle / magic 共用此核心:它们的 chunk 都是 RLE sprite-group。
 */
export function decodeSpriteFrames(chunkBytes: Uint8Array): IndexedImage[] {
  return parseSpriteChunk(chunkBytes).map(rleFrameToIndexedImage)
}

/** fetch sprite blob → 解压 → IndexedImage[]。 */
export async function loadSpriteFramesBlob(url: string): Promise<IndexedImage[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`sprite-blob: fetch ${url} failed (${res.status})`)
  return decodeSpriteFrames(await decompressGzip(await res.blob()))
}

export interface CharacterSprite {
  frames: IndexedImage[]
  anchorX: number
  anchorY: number
}

/**
 * IndexedImage[] → 大世界角色 sprite(帧 + 锚点)。
 * 锚点 = 首帧 `floor(width/2)` / `height` —— 与旧 loader 逐帧 PNG 路径同源,保持渲染不变。
 */
export function framesToCharacterSprite(frames: IndexedImage[]): CharacterSprite {
  const first = frames[0]
  return {
    frames,
    anchorX: first ? Math.floor(first.width / 2) : 0,
    anchorY: first ? first.height : 0,
  }
}

/** loadAll 使用的角色 blob 装配；bootstrap 按帧派生锚点时直接加载帧数组。 */
export async function loadCharacterSpriteBlob(url: string): Promise<CharacterSprite> {
  return framesToCharacterSprite(await loadSpriteFramesBlob(url))
}

/**
 * 用浏览器原生 DecompressionStream 解压 gzip blob。
 *
 * gzip 输入依赖原生 DecompressionStream；没有该 API 时直接拒绝，不提供解压兜底。
 * 无 gzip 魔数的原始字节直接返回，不依赖该 API；这不是 gzip 内容完整性检查。
 *
 * 实现备注:用 `blob.arrayBuffer()` 取完整字节再包 `new Response(buf).body` 走 stream,
 * 而非 `blob.stream()`——后者在某些环境(如 jsdom)缺失,前者更通用。
 *
 * fetch 可能已按 Content-Encoding 解压响应，因此按当前收到的前两个字节识别 gzip。
 * 这依赖调用方的资源格式前提：原始 chunk 不以 gzip 魔数开头；函数不验证资源种类。
 * raw / gzip 传输判断与 shared codec 的帧解析、容错合同分开，不在这里重写资源规则。
 */
export async function decompressGzip(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  // 上游(Content-Encoding)已解压 → 没有 gzip 魔数 → 直接返回,避免二次解压报 "incorrect header check"
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'tileset-blob: DecompressionStream unsupported in this environment ' +
        '(需要 Chrome 80+/Safari 16.4+/Firefox 113+)。可后续引入 fflate 兜底。',
    )
  }
  const ds = new DecompressionStream('gzip')
  const reader = new Response(buf).body!.pipeThrough(ds).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

/**
 * 完整加载链:fetch tileset blob URL → 解压 → 解析 → Map<tileIndex, IndexedImage>。
 *
 * @param url - tileset blob 的 URL(如 `/extracted/data/tileset/1.rle`)
 */
export async function loadTilesetBlob(url: string): Promise<Map<number, IndexedImage>> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`tileset-blob: fetch ${url} failed (${res.status})`)
  }
  const blob = await res.blob()
  const gopBytes = await decompressGzip(blob)
  return decodeTilesetBlob(gopBytes)
}
