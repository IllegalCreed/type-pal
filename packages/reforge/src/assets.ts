/**
 * 复用原版提取资产（demo）：从 /extracted 加载 tilemap / palette / tileset。
 * 解码逻辑复用 @type-pal/shared（parseSpriteChunk + 类型）；decompressGzip 端口自
 * game/assets/tileset-blob.ts（小而通用，不依赖 game 内部）。
 */
import { parseSpriteChunk, type Palette, type RleFrame, type Tilemap } from '@type-pal/shared'

const BASE = '/extracted'

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`)
  return (await r.json()) as T
}

export function loadTilemap(mapNum: number): Promise<Tilemap> {
  return fetchJson<Tilemap>(`${BASE}/data/tilemap/${mapNum}.json`)
}

export function loadPalette(palId: number): Promise<Palette> {
  return fetchJson<Palette>(`${BASE}/data/palette/${palId}.json`)
}

/** 复用原版 .rle tileset blob：gzip 解压 → parseSpriteChunk → 按 tile 下标索引的帧。 */
export async function loadTileset(mapNum: number): Promise<Map<number, RleFrame>> {
  const res = await fetch(`${BASE}/data/tileset/${mapNum}.rle`)
  if (!res.ok) throw new Error(`tileset ${mapNum}: ${res.status}`)
  const bytes = await decompressGzip(await res.blob())
  const frames = parseSpriteChunk(bytes)
  const map = new Map<number, RleFrame>()
  frames.forEach((f, i) => map.set(i, f))
  return map
}

/**
 * 浏览器原生 gzip 解压（端口自 game/assets/tileset-blob.ts）。
 * 含 Content-Encoding 双解压防御：无 gzip 魔数(1f 8b) = 上游已解，直接返回。
 */
export async function decompressGzip(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes
  if (typeof DecompressionStream === 'undefined') throw new Error('reforge: DecompressionStream 不可用')
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
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}
