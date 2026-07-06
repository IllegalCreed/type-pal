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
  /** BGM 目录完整前缀(<NNN>.mid,3 位零填充;同上规则)。 */
  music: string
  /** 对话/状态立绘目录(<chunk>.png;内容资产,随库/工程)。 */
  portraits: string
  /** 战斗小头像目录(<actorId>.png)。 */
  faces: string
  /** 物品图标目录(<icon>.png)。 */
  itemIcons: string
  /** UI chrome 覆盖目录(可选:工程自带皮肤;缺省 = 引擎默认皮 /ui)。 */
  uiOverride?: string
}

/** 资产缺失指路(新 clone 最常见坑:data/extracted 与 data/baked 是可再生产物,不进 git)。 */
const ASSET_HINT =
  '资产缺失?新 clone 需先放入 data/raw 并跑:pnpm extract && pnpm --filter @type-pal/migrate run bake(见 docs/dev-servers.md「新人前置」)'

/** fetch 二进制资产:404 或返回 HTML(SPA fallback)都按缺失报,附指路。 */
async function fetchAsset(url: string, label: string): Promise<Response> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label}: ${res.status} ${url} —— ${ASSET_HINT}`)
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('text/html'))
    throw new Error(`${label}: ${url} 返回 HTML(路径落空)—— ${ASSET_HINT}`)
  return res
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
  const res = await fetchAsset(`${base.root}/${base.tilesets}/${mapNum}.rle`, `tileset ${mapNum}`)
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
  const res = await fetchAsset(
    `${base.root}/${base.sprites}/${spriteNum}.rle`,
    `sprite ${spriteNum}`,
  )
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
  const res = await fetchAsset(
    `${base.root}/battle-sprite/${kind}/${id}.rle`,
    `battle sprite ${kind}/${id}`,
  )
  const frames = parseSpriteChunk(await decompressGzip(await res.blob()))
  const first = frames[0]
  return {
    frames,
    anchorX: first ? Math.floor(first.width / 2) : 0,
    anchorY: first ? first.height : 0,
  }
}

/** 物理命中特效精灵(chunk 10 = {root}/magic/effect.rle,gzip RLE;M4d-2)。 */
export async function loadEffectSprite(base: AssetBase): Promise<LoadedSprite> {
  const res = await fetchAsset(`${base.root}/magic/effect.rle`, 'effect sprite')
  const frames = parseSpriteChunk(await decompressGzip(await res.blob()))
  return { frames, anchorX: 0, anchorY: 0 }
}

/** 法术特效精灵(FIRE.MKF chunk = {root}/magic/fire-NN.rle;M4d-2b)。 */
export async function loadFireSprite(base: AssetBase, chunk: number): Promise<LoadedSprite> {
  const res = await fetchAsset(
    `${base.root}/magic/fire-${String(chunk).padStart(2, '0')}.rle`,
    `fire sprite ${chunk}`,
  )
  const frames = parseSpriteChunk(await decompressGzip(await res.blob()))
  return { frames, anchorX: 0, anchorY: 0 }
}

/** 战场条目(battle-fields.json):常驻波幅 + 五灵加成(fight.c:244 双向乘入法术伤害)。 */
export interface BattleFieldEntry {
  screenWave: number
  magicEffect?: { wind: number; thunder: number; water: number; fire: number; earth: number }
  /** 背景图显式引用(相对 images 根;缺省 = battle/bg/<id 三位>.png 惯例路径)。 */
  bg?: string
}

/** 战场表(id → BattleFieldEntry)。缺文件由调用方 catch 空表兜底。 */
export async function loadBattleFields(base: AssetBase): Promise<Map<number, BattleFieldEntry>> {
  const res = await fetch(`${base.root}/battle-fields.json`)
  if (!res.ok) throw new Error(`battle-fields: ${res.status}`)
  const arr = (await res.json()) as Array<{
    id: number
    screenWave?: number
    magicEffect?: BattleFieldEntry['magicEffect']
  }>
  return new Map(
    arr.map((f) => [
      f.id,
      { screenWave: f.screenWave ?? 0, ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}) },
    ]),
  )
}

/**
 * 战斗背景(M4b):{root}/../images/battle/bg/{NNN}.png —— FBP 8-bit 索引位图,提取器把索引
 * 直接写成灰度 PNG(R=G=B=索引,未着色)。故此处读 R 通道当索引,经 palette 着色成真彩 canvas
 * (同 bakeFrame 精灵着色)。palette = 触发战斗的场景调色板。
 */
export interface BattleBgAsset {
  canvas: HTMLCanvasElement
  /** FBP 原始索引(R 通道;召唤背景染色的调色板级 nibble 运算用,battle.c:62-80)。 */
  indices: Uint8Array
  w: number
  h: number
}

/** 战斗背景全量(canvas + 索引源)。染色/重着色场景用。bgPath = BattleFieldDef.bg 显式引用。 */
export async function loadBattleBgFull(
  base: AssetBase,
  id: number,
  palette: Palette,
  bgPath?: string,
): Promise<BattleBgAsset> {
  const imagesRoot = base.root.replace(/\/data$/, '/images')
  const res = await fetch(`${imagesRoot}/${bgPath ?? `battle/bg/${String(id).padStart(3, '0')}.png`}`)
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
  const n = cvs.width * cvs.height
  const indices = new Uint8Array(n)
  for (let i = 0; i < n; i++) indices[i] = src.data[i * 4] ?? 0 // R 通道 = FBP 索引
  ctx.putImageData(bakeBgImageData(ctx, indices, cvs.width, cvs.height, palette, 0), 0, 0)
  return { canvas: cvs, indices, w: cvs.width, h: cvs.height }
}

/**
 * 索引 → 着色 ImageData,可带背景染色量(原版 PAL_BattleDrawBackground,battle.c:62-80:
 * 低 nibble + shift,下溢(0x80)→0、上溢(0x70)→0x0F,高 nibble 不动 —— 调色板级精确,
 * 召唤 sBackgroundColorShift = wEffectTimes,fight.c:3145)。
 */
export function bakeBgImageData(
  ctx: CanvasRenderingContext2D,
  indices: Uint8Array,
  w: number,
  h: number,
  palette: Palette,
  shift: number,
): ImageData {
  const out = ctx.createImageData(w, h)
  const colors = palette.colors
  const n = w * h
  for (let i = 0; i < n; i++) {
    let idx = indices[i] ?? 0
    if (shift !== 0) {
      let b = (idx & 0x0f) + shift
      if (b & 0x80) b = 0
      else if (b & 0x70) b = 0x0f
      idx = (idx & 0xf0) | b
    }
    const c = colors[idx] ?? [0, 0, 0]
    const o = i * 4
    out.data[o] = c[0] ?? 0
    out.data[o + 1] = c[1] ?? 0
    out.data[o + 2] = c[2] ?? 0
    out.data[o + 3] = 255
  }
  return out
}

/** 战斗背景(兼容薄壳:只要 canvas)。 */
export async function loadBattleBg(
  base: AssetBase,
  id: number,
  palette: Palette,
): Promise<HTMLCanvasElement> {
  return (await loadBattleBgFull(base, id, palette)).canvas
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
