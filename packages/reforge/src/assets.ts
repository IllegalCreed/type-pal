/**
 * 复用原版提取资产（demo）：从 /extracted 加载 tilemap / palette / tileset。
 * 解码逻辑复用 @type-pal/shared（parseSpriteChunk + 类型）；decompressGzip 端口自
 * game/assets/tileset-blob.ts（小而通用，不依赖 game 内部）。
 */
import { type Palette, parseSpriteChunk, type RleFrame, type Tilemap } from '@type-pal/shared'

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
  frames.forEach((f, i) => {
    map.set(i, f)
  })
  return map
}

export interface LoadedSprite {
  frames: RleFrame[]
  /** 脚下锚点（首帧 floor(w/2) / h），同 game framesToCharacterSprite。 */
  anchorX: number
  anchorY: number
}

/** 复用原版大世界精灵：/extracted/data/sprite/{spriteNum}.rle（gzip RLE 帧组）。 */
export async function loadSprite(spriteNum: number): Promise<LoadedSprite> {
  const res = await fetch(`${BASE}/data/sprite/${spriteNum}.rle`)
  if (!res.ok) throw new Error(`sprite ${spriteNum}: ${res.status}`)
  const frames = parseSpriteChunk(await decompressGzip(await res.blob()))
  const first = frames[0]
  return {
    frames,
    anchorX: first ? Math.floor(first.width / 2) : 0,
    anchorY: first ? first.height : 0,
  }
}

/**
 * 浏览器原生 gzip 解压（端口自 game/assets/tileset-blob.ts）。
 * 含 Content-Encoding 双解压防御：无 gzip 魔数(1f 8b) = 上游已解，直接返回。
 */
export async function decompressGzip(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes
  if (typeof DecompressionStream === 'undefined')
    throw new Error('reforge: DecompressionStream 不可用')
  const ds = new DecompressionStream('gzip')
  const body = new Response(buf).body
  if (!body) throw new Error('reforge: response body 为空')
  const reader = body.pipeThrough(ds).getReader()
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

export type { Glyph, GlyphTable } from './text/glyph.js'
// 字模加载(② 外观):端口自第一阶段 Unifont glyph。
export { loadGlyphs } from './text/glyph.js'
