/**
 * tileset gzip RLE blob 加载(tileset 资源管线优化 S3)。
 *
 * 每个地图的 tileset 存为一个 `.rle` blob(= gzip 后的原始 GOP.MKF chunk 字节)。
 * 本模块负责:fetch blob → 浏览器原生 DecompressionStream('gzip') 解压 →
 * parseSpriteChunk 解出 RleFrame[] → 转 Map<tileIndex, IndexedImage>。
 *
 * 相比旧链路(fetch per-tile PNG → createImageBitmap → canvas getImageData):
 *   - 请求数 188-452 → 1
 *   - createImageBitmap 调用 188-452 → 0(不经 canvas)
 *   - 字节级忠实:blob 就是原版 GOP chunk,runtime 用与 extractor 同一份 parseSpriteChunk 解
 *
 * 键一致性铁律:Map 的 key = parseSpriteChunk 返回数组的下标 i,
 * 与旧 `framesToOut` 的 `index` 字段(同一过滤后序列)一致。地图 cells 引用此下标。
 */

import { parseSpriteChunk, type RleFrame } from '@type-pal/shared'
import type { IndexedImage } from './png.js'

/**
 * 把 RleFrame 转成 IndexedImage(纯字段重命名:pixels → indices,形状一致)。
 * Uint8Array 直接复用(不拷贝),因为 RleFrame 不会再被修改。
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
  const frames = parseSpriteChunk(gopBytes)
  const map = new Map<number, IndexedImage>()
  for (let i = 0; i < frames.length; i++) {
    map.set(i, rleFrameToIndexedImage(frames[i]!))
  }
  return map
}

/**
 * 用浏览器原生 DecompressionStream 解压 gzip blob。
 *
 * 兼容性:Chrome 80+/Safari 16.4+/Firefox 113+,SW 上下文可用,已全覆盖。
 * 兜底:若环境无 DecompressionStream,抛错(可后续塞 fflate,当前不需要)。
 *
 * 实现备注:用 `blob.arrayBuffer()` 取完整字节再包 `new Response(buf).body` 走 stream,
 * 而非 `blob.stream()`——后者在某些环境(如 jsdom)缺失,前者更通用。
 *
 * **Content-Encoding 双解压防御**:blob 后缀用 `.rle`(非 `.rle.gz`)正是为了避免
 * 静态服务器把它当 gzip-encoded 文件、自动加 `Content-Encoding: gzip` 让浏览器先解一次。
 * 但生产 nginx / 阿里云 CDN 仍可能因 mime 嗅探对它再压一层并设 Content-Encoding ——
 * 那种情况浏览器 fetch 已经把我们的 gzip 层也解掉了,拿到的是裸 chunk 字节。
 * 这里据 gzip 魔数(1f 8b)判断:没魔数 = 上游已解,直接返回(解压后的 sprite/MKF chunk
 * 首字节是小端 count/offset,绝不会是 1f 8b,故无误判)。
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
