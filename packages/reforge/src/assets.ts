/**
 * 工程资源加载:ProjectMap / palette / tileset / sprite。
 * 已闭包 tileset / world sprite 只经 AssetResolver。
 * 解码逻辑复用 @type-pal/shared(parseSpriteChunk + 类型);decompressGzip 端口自 game。
 */
import {
  type AssetId,
  type AssetRecordV1,
  type BattleSpriteDef,
  type BattleSpriteProfileKind,
  battleSpriteDefinitionFrameIndices,
  type ProjectMap,
  validateProjectMap,
} from '@type-pal/content'
import {
  type IndexedRleChunkProfile,
  type IndexedRleChunkResult,
  type Palette,
  parseIndexedRleChunk,
  parseSpriteChunk,
  parseSpriteChunkStrict,
  parseWorldSpriteChunk,
  type RleFrame,
  type WorldSpriteChunkProfile,
  type WorldSpriteChunkResult,
} from '@type-pal/shared'
import type { AssetResolver } from './asset-resolver.js'
import type { LegacyAssetAdapter } from './file-source.js'

/** 工程资源根 + 子目录(由 loader 从 manifest.assets 解析,main 注入给 load*)。 */
export interface AssetBase {
  root: string // 如 `projects/<id>/assets`
  palettes: string
  /** 仅供 contentVersion 3 未迁移资源族使用；音乐等 catalog 资源不得经此读取。 */
  io: LegacyAssetAdapter
  /** 已迁移资源的唯一解析器；标准颜色、音乐、音效、视频等不得回落到 legacy 路径。 */
  assetResolver?: AssetResolver
}

/** 资产缺失指路（新 clone 最常见坑：PAL 提取源尚未准备）。 */
const ASSET_HINT =
  '资产缺失?新 clone 需先放入 data/raw 并跑:pnpm extract(见 docs/dev-servers.md「新人前置」)'

async function readAssetBytes(base: AssetBase, path: string, label: string): Promise<ArrayBuffer> {
  try {
    return await base.io.readBytes(path)
  } catch (error) {
    throw new Error(
      `${label}: ${path} —— ${ASSET_HINT}；${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function readAssetJson<T>(base: AssetBase, path: string): Promise<T> {
  return base.io.readJson<T>(path)
}

/** 从工程 content 路径读取唯一作者态地图，并在加载边界完整校验。 */
export async function loadProjectMap(base: AssetBase, mapPath: string): Promise<ProjectMap> {
  return validateProjectMap(await readAssetJson<unknown>(base, mapPath))
}

export async function loadStandardPalette(base: AssetBase): Promise<Palette> {
  if (!base.assetResolver) throw new Error('工程未挂载 AssetResolver，无法读取工程标准色彩')
  const text = await base.assetResolver.readRoleText('visual.standardColorTable')
  let palette: Partial<Palette>
  try {
    palette = JSON.parse(text) as Partial<Palette>
  } catch (error) {
    throw new Error(
      `工程标准色彩 JSON 非法: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!Array.isArray(palette.colors) || palette.colors.length !== 256)
    throw new Error('工程标准色彩必须包含 256 个 RGB 颜色')
  for (const [index, color] of palette.colors.entries()) {
    if (
      !Array.isArray(color) ||
      color.length !== 3 ||
      color.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
    )
      throw new Error(`工程标准色彩第 ${index} 项不是合法 RGB`)
  }
  if (!Array.isArray(palette.cycles)) throw new Error('工程标准色彩缺 cycles 数组')
  return palette as Palette
}

/**
 * tileset(.rle = gzip GOP chunk)→ AssetResolver → 解压 → parseSpriteChunk。
 * AssetId 是唯一输入；物理路径只能由 catalog 解析。
 */
export async function loadTileset(base: AssetBase, asset: AssetId): Promise<Map<number, RleFrame>> {
  if (!base.assetResolver) throw new Error('工程未挂载 AssetResolver，无法读取瓦片集')
  return loadTilesetAsset(base.assetResolver, asset)
}

/** 运行时 AssetResolver 与编辑器 pending-aware reader 共用的唯一 tileset 解码入口。 */
export interface TilesetAssetReader {
  record(asset: AssetId, expectedKind?: 'tileset'): AssetRecordV1
  readBytes(asset: AssetId, expectedKind?: 'tileset'): Promise<ArrayBuffer>
}

async function contentSha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function loadTilesetAsset(
  reader: TilesetAssetReader,
  asset: AssetId,
): Promise<Map<number, RleFrame>> {
  const record = reader.record(asset, 'tileset')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`tileset AssetId "${asset}": mediaType 非法 ${record.mediaType}`)
  const bytes = await reader.readBytes(asset, 'tileset')
  if (bytes.byteLength !== record.bytes)
    throw new Error(
      `tileset AssetId "${asset}": bytes 登记 ${record.bytes}，实际 ${bytes.byteLength}`,
    )
  const hash = await contentSha256(bytes)
  if (hash !== record.sha256) throw new Error(`tileset AssetId "${asset}": sha256 不符`)
  return tilesFromChunkBytes(bytes, {
    label: `tileset AssetId "${asset}"`,
  })
}

export interface LoadedSprite {
  frames: RleFrame[]
  /** 脚下锚点(首帧 floor(w/2) / h),同 game framesToCharacterSprite。 */
  anchorX: number
  anchorY: number
}

export interface LoadedWorldSprite extends LoadedSprite {
  profile: WorldSpriteChunkProfile
  decode: Omit<WorldSpriteChunkResult, 'frames'>
}

/** 运行时 AssetResolver 与编辑器 pending-aware reader 共用的唯一 world-sprite 读取契约。 */
export interface SpriteAssetReader {
  record(asset: AssetId, expectedKind?: 'sprite'): AssetRecordV1
  readBytes(asset: AssetId, expectedKind?: 'sprite'): Promise<ArrayBuffer>
}

/**
 * 已读取字节的公共校验/解码核。profile 只能由 record.origin 决定；调用方不得按 AssetId
 * 或文件名选择 legacy 容错。
 */
export async function decodeWorldSpriteAssetBytes(
  record: AssetRecordV1,
  bytes: ArrayBuffer,
  label = `sprite asset ${record.path}`,
): Promise<LoadedWorldSprite> {
  // record 可能来自编辑器实时 catalog；异步 hash/解压期间不得混读一次替换前后的字段。
  const snapshot = {
    kind: record.kind,
    mediaType: record.mediaType,
    bytes: record.bytes,
    sha256: record.sha256,
    path: record.path,
    originKind: record.origin.kind,
  }
  if (snapshot.kind !== 'sprite')
    throw new Error(`${label}: 期望 kind=sprite，实际 ${snapshot.kind}`)
  if (snapshot.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`${label}: mediaType 非法 ${snapshot.mediaType}`)
  if (bytes.byteLength !== snapshot.bytes)
    throw new Error(`${label}: bytes 登记 ${snapshot.bytes}，实际 ${bytes.byteLength}`)
  const hash = await contentSha256(bytes)
  if (hash !== snapshot.sha256) throw new Error(`${label}: sha256 不符`)
  const compressed = new Uint8Array(bytes)
  if (compressed.byteLength < 2 || compressed[0] !== 0x1f || compressed[1] !== 0x8b)
    throw new Error(`${label}: canonical .rle 必须带 gzip 头`)
  const profile: WorldSpriteChunkProfile =
    snapshot.originKind === 'legacy-migrated' ? 'legacy-migrated' : 'canonical'
  const parsed = parseWorldSpriteChunk(await decompressGzip(new Blob([bytes])), profile)
  const first = parsed.frames[0]
  return {
    frames: parsed.frames,
    anchorX: first ? Math.floor(first.width / 2) : 0,
    anchorY: first ? first.height : 0,
    profile,
    decode: {
      declaredSlots: parsed.declaredSlots,
      trailingSentinel: parsed.trailingSentinel,
      skippedLegacyTailSlots: parsed.skippedLegacyTailSlots,
    },
  }
}

export async function loadSpriteAsset(
  reader: SpriteAssetReader,
  asset: AssetId,
): Promise<LoadedWorldSprite> {
  const record = structuredClone(reader.record(asset, 'sprite'))
  const bytes = await reader.readBytes(asset, 'sprite')
  return decodeWorldSpriteAssetBytes(record, bytes, `sprite AssetId "${asset}"`)
}

interface SpriteAssetCacheEntry {
  signature: string
  promise: Promise<LoadedWorldSprite>
  value?: LoadedWorldSprite
}

function spriteRecordSignature(record: AssetRecordV1): string {
  return [
    record.kind,
    record.mediaType,
    record.bytes,
    record.sha256,
    record.origin.kind,
    record.path,
  ].join('\0')
}

/** 每个工程持有一个实例；同 AssetId 共享解码，record 变化失效，失败 promise 自动驱逐。 */
export class SpriteAssetCache {
  private readonly entries = new Map<AssetId, SpriteAssetCacheEntry>()

  constructor(private readonly capacity = 96) {}

  async load(reader: SpriteAssetReader, asset: AssetId): Promise<LoadedWorldSprite> {
    const record = structuredClone(reader.record(asset, 'sprite'))
    const signature = spriteRecordSignature(record)
    const existing = this.entries.get(asset)
    if (existing?.signature === signature) {
      this.entries.delete(asset)
      this.entries.set(asset, existing)
      return existing.promise
    }
    if (existing) this.entries.delete(asset)
    let entry: SpriteAssetCacheEntry
    const promise = reader
      .readBytes(asset, 'sprite')
      .then((bytes) => decodeWorldSpriteAssetBytes(record, bytes, `sprite AssetId "${asset}"`))
      .then((value) => {
        if (this.entries.get(asset) === entry) entry.value = value
        return value
      })
      .catch((error: unknown) => {
        if (this.entries.get(asset) === entry) this.entries.delete(asset)
        throw error
      })
    entry = { signature, promise }
    this.entries.set(asset, entry)
    return entry.promise
  }

  get(reader: SpriteAssetReader, asset: AssetId): LoadedWorldSprite | undefined {
    const entry = this.entries.get(asset)
    if (!entry) return undefined
    const signature = spriteRecordSignature(reader.record(asset, 'sprite'))
    if (entry.signature !== signature) {
      this.entries.delete(asset)
      return undefined
    }
    return entry.value
  }

  prune(protectedAssets: ReadonlySet<AssetId> = new Set()): void {
    for (const asset of [...this.entries.keys()]) {
      if (this.entries.size <= this.capacity) break
      if (!protectedAssets.has(asset)) this.entries.delete(asset)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

/** AssetResolver 与编辑器 pending-aware reader 共用的 battle-sprite 读取契约。 */
export interface BattleSpriteAssetReader {
  record(asset: AssetId, expectedKind?: 'battle-sprite'): AssetRecordV1
  readBytes(asset: AssetId, expectedKind?: 'battle-sprite'): Promise<ArrayBuffer>
}

export interface LoadedBattleSprite extends LoadedSprite {
  profile: IndexedRleChunkProfile
  decode: Omit<IndexedRleChunkResult, 'frames'>
}

/** record + bytes 的唯一 battle-sprite 校验/解码核；兼容只由 origin 决定。 */
export async function decodeBattleSpriteAssetBytes(
  record: AssetRecordV1,
  bytes: ArrayBuffer,
  label = `battle-sprite asset ${record.path}`,
): Promise<LoadedBattleSprite> {
  const snapshot = structuredClone(record)
  if (snapshot.kind !== 'battle-sprite')
    throw new Error(`${label}: 期望 kind=battle-sprite，实际 ${snapshot.kind}`)
  if (snapshot.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`${label}: mediaType 非法 ${snapshot.mediaType}`)
  if (bytes.byteLength !== snapshot.bytes)
    throw new Error(`${label}: bytes 登记 ${snapshot.bytes}，实际 ${bytes.byteLength}`)
  const hash = await contentSha256(bytes)
  if (hash !== snapshot.sha256) throw new Error(`${label}: sha256 不符`)
  const compressed = new Uint8Array(bytes)
  if (compressed.byteLength < 2 || compressed[0] !== 0x1f || compressed[1] !== 0x8b)
    throw new Error(`${label}: .rle 必须带 gzip 头`)
  const profile: IndexedRleChunkProfile =
    snapshot.origin.kind === 'legacy-migrated' ? 'legacy-migrated' : 'canonical'
  const parsed = parseIndexedRleChunk(await decompressGzip(new Blob([bytes])), profile)
  const first = parsed.frames[0]
  if (!first) throw new Error(`${label}: 至少需要 1 个有效帧`)
  return {
    frames: parsed.frames,
    anchorX: Math.floor(first.width / 2),
    anchorY: first.height,
    profile,
    decode: {
      declaredSlots: parsed.declaredSlots,
      trailingSentinel: parsed.trailingSentinel,
      skippedLegacyTailSlots: parsed.skippedLegacyTailSlots,
    },
  }
}

export async function loadBattleSpriteAsset(
  reader: BattleSpriteAssetReader,
  asset: AssetId,
): Promise<LoadedBattleSprite> {
  const record = structuredClone(reader.record(asset, 'battle-sprite'))
  const bytes = await reader.readBytes(asset, 'battle-sprite')
  return decodeBattleSpriteAssetBytes(record, bytes, `battle-sprite AssetId "${asset}"`)
}

function completeRecordSignature(record: AssetRecordV1): string {
  return JSON.stringify({
    kind: record.kind,
    path: record.path,
    mediaType: record.mediaType,
    bytes: record.bytes,
    sha256: record.sha256,
    label: record.label ?? null,
    origin: { kind: record.origin.kind, ref: record.origin.ref ?? null },
  })
}

interface BattleSpriteAssetCacheEntry {
  signature: string
  promise: Promise<LoadedBattleSprite>
  value?: LoadedBattleSprite
}

/** 每工程实例缓存；共享并发 Promise、失败驱逐、完整 record 变化自动失效。 */
export class BattleSpriteAssetCache {
  private readonly entries = new Map<AssetId, BattleSpriteAssetCacheEntry>()

  constructor(private readonly capacity = 192) {}

  async load(reader: BattleSpriteAssetReader, asset: AssetId): Promise<LoadedBattleSprite> {
    const record = structuredClone(reader.record(asset, 'battle-sprite'))
    const signature = completeRecordSignature(record)
    const existing = this.entries.get(asset)
    if (existing?.signature === signature) {
      this.entries.delete(asset)
      this.entries.set(asset, existing)
      return existing.promise
    }
    if (existing) this.entries.delete(asset)
    let entry: BattleSpriteAssetCacheEntry
    const promise = reader
      .readBytes(asset, 'battle-sprite')
      .then((bytes) =>
        decodeBattleSpriteAssetBytes(record, bytes, `battle-sprite AssetId "${asset}"`),
      )
      .then((value) => {
        if (this.entries.get(asset) === entry) entry.value = value
        return value
      })
      .catch((error: unknown) => {
        if (this.entries.get(asset) === entry) this.entries.delete(asset)
        throw error
      })
    entry = { signature, promise }
    this.entries.set(asset, entry)
    return entry.promise
  }

  get(reader: BattleSpriteAssetReader, asset: AssetId): LoadedBattleSprite | undefined {
    const entry = this.entries.get(asset)
    if (!entry) return undefined
    if (entry.signature !== completeRecordSignature(reader.record(asset, 'battle-sprite'))) {
      this.entries.delete(asset)
      return undefined
    }
    return entry.value
  }

  prune(protectedAssets: ReadonlySet<AssetId> = new Set()): void {
    for (const asset of [...this.entries.keys()]) {
      if (this.entries.size <= this.capacity) break
      if (!protectedAssets.has(asset)) this.entries.delete(asset)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

export interface LoadedBattleSpriteDefinition {
  definition: BattleSpriteDef
  sprite: LoadedBattleSprite
}

/** profile 与实际帧 ABI 的 readiness 门；缺资源/错 profile/越界都 fail-loud。 */
export async function loadBattleSpriteDefinition(
  cache: BattleSpriteAssetCache,
  reader: BattleSpriteAssetReader,
  definition: BattleSpriteDef,
  expected: BattleSpriteProfileKind,
): Promise<LoadedBattleSpriteDefinition> {
  if (definition.profile.kind !== expected)
    throw new Error(
      `BattleSpriteDef "${definition.id}" (AssetId "${definition.asset}") profile 期望 ${expected}，实际 ${definition.profile.kind}`,
    )
  const sprite = await cache.load(reader, definition.asset)
  const indices = battleSpriteDefinitionFrameIndices(definition, sprite.frames.length)
  for (const frame of indices)
    if (!sprite.frames[frame])
      throw new Error(
        `BattleSpriteDef "${definition.id}" 引用帧 ${frame}，AssetId "${definition.asset}" 只有 ${sprite.frames.length} 帧`,
      )
  return { definition, sprite }
}

/** 物理命中特效精灵(chunk 10 = {root}/magic/effect.rle,gzip RLE;M4d-2)。 */
export async function loadEffectSprite(base: AssetBase): Promise<LoadedSprite> {
  const raw = await readAssetBytes(base, `${base.root}/magic/effect.rle`, 'effect sprite')
  const frames = parseSpriteChunk(await decompressGzip(new Blob([raw])))
  return { frames, anchorX: 0, anchorY: 0 }
}

/** 法术特效精灵(FIRE.MKF chunk = {root}/magic/fire-NN.rle;M4d-2b)。 */
export async function loadFireSprite(base: AssetBase, chunk: number): Promise<LoadedSprite> {
  const raw = await readAssetBytes(
    base,
    `${base.root}/magic/fire-${String(chunk).padStart(2, '0')}.rle`,
    `fire sprite ${chunk}`,
  )
  const frames = parseSpriteChunk(await decompressGzip(new Blob([raw])))
  return { frames, anchorX: 0, anchorY: 0 }
}

/** 战场条目(battle-fields.json):常驻波幅 + 五灵加成(fight.c:244 双向乘入法术伤害)。 */
export interface BattleFieldEntry {
  screenWave: number
  magicEffect?: { wind: number; thunder: number; water: number; fire: number; earth: number }
  /** 背景图稳定引用；缺席明确表示黑底。 */
  background?: AssetId
}

/** 战场表(id → BattleFieldEntry)。缺文件由调用方 catch 空表兜底。 */
export async function loadBattleFields(base: AssetBase): Promise<Map<number, BattleFieldEntry>> {
  const arr = await readAssetJson<
    Array<{ id: number; screenWave?: number; magicEffect?: BattleFieldEntry['magicEffect'] }>
  >(base, `${base.root}/battle-fields.json`)
  return new Map(
    arr.map((f) => [
      f.id,
      { screenWave: f.screenWave ?? 0, ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}) },
    ]),
  )
}

/**
 * 战斗背景是工程 catalog 中的 320×200 索引 PNG。AssetResolver 负责 id/kind/path/file，
 * 本函数校验 R=G=B=index 且 alpha=255，再用触发战斗场景的 palette 着色。
 */
export interface BattleBgAsset {
  canvas: HTMLCanvasElement
  /** FBP 原始索引(R 通道;召唤背景染色的调色板级 nibble 运算用,battle.c:62-80)。 */
  indices: Uint8Array
  w: number
  h: number
}

/** 战斗背景全量(canvas + 索引源)。染色/重着色场景用。 */
export async function loadBattleBgFull(
  base: AssetBase,
  asset: AssetId,
  palette: Palette,
): Promise<BattleBgAsset> {
  if (!base.assetResolver) throw new Error('工程未挂载 AssetResolver，无法读取战场背景')
  const record = base.assetResolver.record(asset, 'battle-background')
  const bytes = await base.assetResolver.readBytes(asset, 'battle-background')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
  } catch (error) {
    throw new Error(
      `战场背景 AssetId "${asset}" 解码失败:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (bitmap.width !== 320 || bitmap.height !== 200) {
    bitmap.close()
    throw new Error(
      `战场背景 AssetId "${asset}" 尺寸必须为 320×200，实际 ${bitmap.width}×${bitmap.height}`,
    )
  }
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
  for (let i = 0; i < n; i++) {
    const offset = i * 4
    const r = src.data[offset] ?? 0
    const g = src.data[offset + 1] ?? 0
    const b = src.data[offset + 2] ?? 0
    const a = src.data[offset + 3] ?? 0
    if (r !== g || r !== b || a !== 255)
      throw new Error(`战场背景 AssetId "${asset}" 像素 ${i} 不满足索引图契约(R=G=B, alpha=255)`)
    indices[i] = r
  }
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
  asset: AssetId,
  palette: Palette,
): Promise<HTMLCanvasElement> {
  return (await loadBattleBgFull(base, asset, palette)).canvas
}

/**
 * 浏览器原生 gzip 解压（端口自 game/assets/tileset-blob.ts）。
 * 含 Content-Encoding 双解压防御：无 gzip 魔数(1f 8b) = 上游已解，直接返回。
 */
/** canonical gzip sprite chunk 字节 → 瓦片帧表；裸 RLE 只允许一次性升级器处理。 */
export async function tilesFromChunkBytes(
  gz: ArrayBuffer,
  options: { label?: string } = {},
): Promise<Map<number, RleFrame>> {
  const compressed = new Uint8Array(gz)
  if (compressed.byteLength < 2 || compressed[0] !== 0x1f || compressed[1] !== 0x8b)
    throw new Error(`${options.label ?? 'tileset'}: canonical .rle 必须带 gzip 头`)
  const frames = parseSpriteChunkStrict(await decompressGzip(new Blob([gz])))
  if (frames.length === 0) throw new Error(`${options.label ?? 'tileset'}: 瓦片帧组不能为空`)
  const map = new Map<number, RleFrame>()
  frames.forEach((f, i) => {
    map.set(i, f)
  })
  return map
}

/** 浏览器原生 gzip 压缩(W7B 上传 tileset 落盘;与 decompressGzip 对称)。 */
export async function compressGzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') throw new Error('reforge: CompressionStream 不可用')
  const cs = new CompressionStream('gzip')
  const body = new Response(
    new Blob([
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    ]),
  ).body
  if (!body) throw new Error('reforge: response body 为空')
  const out = await new Response(body.pipeThrough(cs)).arrayBuffer()
  return new Uint8Array(out)
}

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
