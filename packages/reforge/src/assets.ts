/**
 * 工程资源加载:tilemap / palette / tileset / sprite。
 * base 由调用方注入(来自 manifest.assets.root,如 `projects/<id>/assets`);
 * 子目录用 manifest.assets 的 maps/tilesets/sprites/palettes(见 AssetBase)。
 * 解码逻辑复用 @type-pal/shared(parseSpriteChunk + 类型);decompressGzip 端口自 game。
 */
import { type Palette, parseSpriteChunk, type RleFrame, type Tilemap } from '@type-pal/shared'

/** 工程资源根 + 子目录(由 loader 从 manifest.assets 解析,main 注入给 load*)。 */
export interface AssetBase {
  root: string // 如 `projects/<id>/assets`
  maps: string // tilemap 子目录(默认 'maps')
  tilesets: string
  sprites: string
  palettes: string
  /** 音效目录完整前缀(<id>.wav;loader 已按绝对/相对规则解析)。 */
  sounds: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`)
  return (await r.json()) as T
}

export function loadTilemap(base: AssetBase, mapNum: number): Promise<Tilemap> {
  return fetchJson<Tilemap>(`${base.root}/${base.maps}/${mapNum}.json`)
}

export function loadPalette(base: AssetBase, palId: number): Promise<Palette> {
  return fetchJson<Palette>(`${base.root}/${base.palettes}/${palId}.json`)
}

/** 原版 .rle tileset blob:gzip 解压 → parseSpriteChunk → 按 tile 下标索引的帧。 */
export async function loadTileset(base: AssetBase, mapNum: number): Promise<Map<number, RleFrame>> {
  const res = await fetch(`${base.root}/${base.tilesets}/${mapNum}.rle`)
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
  /** 脚下锚点(首帧 floor(w/2) / h),同 game framesToCharacterSprite。 */
  anchorX: number
  anchorY: number
}

/** 原版大世界精灵:{root}/{sprites}/{spriteNum}.rle(gzip RLE 帧组)。 */
export async function loadSprite(base: AssetBase, spriteNum: number): Promise<LoadedSprite> {
  const res = await fetch(`${base.root}/${base.sprites}/${spriteNum}.rle`)
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
 * 战斗精灵(M4b):{root}/battle-sprite/{kind}/{id}.rle(gzip RLE 帧组;kind=enemy/player)。
 * 帧格式同大世界精灵(parseSpriteChunk),故复用 LoadedSprite。
 */
export async function loadBattleSprite(
  base: AssetBase,
  kind: 'enemy' | 'player',
  id: number,
): Promise<LoadedSprite> {
  const res = await fetch(`${base.root}/battle-sprite/${kind}/${id}.rle`)
  if (!res.ok) throw new Error(`battle sprite ${kind}/${id}: ${res.status}`)
  const frames = parseSpriteChunk(await decompressGzip(await res.blob()))
  const first = frames[0]
  return {
    frames,
    anchorX: first ? Math.floor(first.width / 2) : 0,
    anchorY: first ? first.height : 0,
  }
}

/**
 * 战斗背景(M4b):{root}/../images/battle/bg/{NNN}.png —— FBP 8-bit 索引位图,提取器把索引
 * 直接写成灰度 PNG(R=G=B=索引,未着色)。故此处读 R 通道当索引,经 palette 着色成真彩 canvas
 * (同 bakeFrame 精灵着色)。palette = 触发战斗的场景调色板。
 */
export async function loadBattleBg(base: AssetBase, id: number, palette: Palette): Promise<HTMLCanvasElement> {
  const imagesRoot = base.root.replace(/\/data$/, '/images')
  const res = await fetch(`${imagesRoot}/battle/bg/${String(id).padStart(3, '0')}.png`)
  if (!res.ok) throw new Error(`battle bg ${id}: ${res.status}`)
  const bitmap = await createImageBitmap(await res.blob())
  const cvs = document.createElement('canvas')
  cvs.width = bitmap.width
  cvs.height = bitmap.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: 2d context 不可用')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const src = ctx.getImageData(0, 0, cvs.width, cvs.height)
  const out = ctx.createImageData(cvs.width, cvs.height)
  const colors = palette.colors
  const n = cvs.width * cvs.height
  for (let i = 0; i < n; i++) {
    const idx = src.data[i * 4] ?? 0 // R 通道 = FBP 索引
    const c = colors[idx] ?? [0, 0, 0]
    const o = i * 4
    out.data[o] = c[0] ?? 0
    out.data[o + 1] = c[1] ?? 0
    out.data[o + 2] = c[2] ?? 0
    out.data[o + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return cvs
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
