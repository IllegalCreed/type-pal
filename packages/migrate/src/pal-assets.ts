import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { deflateSync, gunzipSync } from 'node:zlib'
import {
  type AssetCatalogV1,
  type AssetRecordV1,
  encodeFrameSequenceSync,
  FRAME_SEQUENCE_MEDIA_TYPE,
  type ManifestAssetConfigV3,
  palFrameAnimationAssetId,
  palMusicAssetId,
  palSoundAssetId,
  palVideoAssetId,
  validateAssetCatalog,
} from '@type-pal/content'
import { decodeRngFrames, type Palette, RNG_HEIGHT, RNG_WIDTH } from '@type-pal/shared'
import { sha256 } from './migration-baseline.js'

interface PalBinaryAssetBase {
  id: string
  record: AssetRecordV1
}

export type PalBinaryAssetSource = PalBinaryAssetBase &
  (
    | {
        /** 仅读取提取/运行时来源；不属于工程路径或 MG2 baseline。 */
        sourcePath: string
        bytes?: never
      }
    | {
        /** 由迁移器确定性生成的单文件资源。 */
        bytes: Uint8Array
        sourcePath?: never
      }
  )

export interface PalAssetMigrationReport {
  videos: number
  frameAnimations: number
  frames: number
  sounds: number
  emptySounds: number
  soundBytes: number
  /** 迁移边界审计字段；项目内容、运行时和编辑器不得消费这些旧编号。 */
  legacyPaletteByFrameAnimation: Record<string, number>
}

export const PAL_AUDIO_ROLES = {
  'audio.midiSoundfont': 'soundfont.default',
  'audio.defaultBattleMusic': palMusicAssetId(37),
  // SDL PAL_BattleWon 在不可逃战胜利结算时选择 002；升级屏随后沿用当前播放曲，
  // 没有独立的 levelUp 音乐 role，故保留现有稳定 role 名。
  'audio.bossVictoryMusic': palMusicAssetId(2),
  'audio.normalVictoryMusic': palMusicAssetId(3),
  'audio.openingMenuMusic': palMusicAssetId(4),
} as const satisfies ManifestAssetConfigV3['roles']

export const PAL_SOUND_ROLES = {
  'audio.battleItemUseSound': palSoundAssetId(28),
  'audio.battleCoopCastSound': palSoundAssetId(29),
  'audio.battleEscapeSound': palSoundAssetId(45),
  'audio.battleEnemyTransformSound': palSoundAssetId(47),
} as const satisfies ManifestAssetConfigV3['roles']

export const PAL_ASSET_ROLES = {
  ...PAL_AUDIO_ROLES,
  ...PAL_SOUND_ROLES,
  'video.startupTrademark': palVideoAssetId(1),
  'video.startupSplash': palVideoAssetId(2),
  'visual.standardColorTable': 'color.project-standard',
} as const satisfies ManifestAssetConfigV3['roles']

export const PAL_RNG_LEGACY_PALETTE: Readonly<Record<number, number>> = { 3: 2, 6: 3, 7: 6 }

function fileSource(
  id: string,
  sourcePath: string,
  record: Omit<AssetRecordV1, 'bytes' | 'sha256'>,
): PalBinaryAssetSource {
  const bytes = readFileSync(sourcePath)
  return {
    id,
    sourcePath,
    record: { ...record, bytes: bytes.byteLength, sha256: sha256(bytes) },
  }
}

function generatedSource(
  id: string,
  bytes: Uint8Array,
  record: Omit<AssetRecordV1, 'bytes' | 'sha256'>,
): PalBinaryAssetSource {
  return {
    id,
    bytes,
    record: { ...record, bytes: bytes.byteLength, sha256: sha256(bytes) },
  }
}

function sourceBytes(source: PalBinaryAssetSource): Uint8Array {
  return source.sourcePath === undefined ? source.bytes : readFileSync(source.sourcePath)
}

function readPalette(path: string): Palette {
  const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<Palette>
  if (!Array.isArray(value.colors) || value.colors.length !== 256)
    throw new Error(`PAL 颜色表必须含 256 色: ${path}`)
  for (const [index, color] of value.colors.entries()) {
    if (
      !Array.isArray(color) ||
      color.length !== 3 ||
      color.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
    )
      throw new Error(`PAL 颜色表 ${path} 第 ${index} 色非法`)
  }
  return value as Palette
}

function bakeRgbaFrames(bytes: Uint8Array, palette: Palette, label: string): Uint8Array[] {
  const decoded = decodeRngFrames(bytes)
  return decoded.map((frame, frameIndex) => {
    if (frame.index !== frameIndex)
      throw new Error(`${label}: RNG 帧索引不连续，期望 ${frameIndex}，实际 ${frame.index}`)
    const rgba = new Uint8Array(RNG_WIDTH * RNG_HEIGHT * 4)
    for (let pixel = 0; pixel < frame.pixels.length; pixel++) {
      const color = palette.colors[frame.pixels[pixel] ?? 0]
      if (!color) throw new Error(`${label}: 帧 ${frameIndex} 引用了非法颜色`)
      const offset = pixel * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = 255
    }
    return rgba
  })
}

interface ExtractedRngManifest {
  chunks: Array<{ chunkIndex: number; frameCount: number; frames: Array<{ index: number }> }>
}

interface ExtractedSoundChunk {
  index: number
  size: number
  isEmpty: boolean
}

interface ExtractedSoundsMetadata {
  chunkCount: number
  chunks: ExtractedSoundChunk[]
}

interface ExtractedAssetManifest {
  files: Array<{ path: string; size: number }>
}

function assertWave(bytes: Uint8Array, label: string): void {
  const tag = (offset: number): string => String.fromCharCode(...bytes.subarray(offset, offset + 4))
  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error(`${label}: 不是 RIFF/WAVE 文件`)
}

/** PAL SOUNDS.MKF 提取物的三向闭包：metadata、asset-manifest 与实际 WAV 必须完全一致。 */
export function loadPalSoundAssets(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<PalAssetMigrationReport, 'sounds' | 'emptySounds' | 'soundBytes'>
} {
  const metadata = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/data/sounds-metadata.json'), 'utf8'),
  ) as Partial<ExtractedSoundsMetadata>
  if (!Number.isInteger(metadata.chunkCount) || !Array.isArray(metadata.chunks))
    throw new Error('PAL sounds metadata 期望 {chunkCount,chunks} 对象')
  if (metadata.chunkCount !== metadata.chunks.length)
    throw new Error(
      `PAL sounds metadata chunkCount=${String(metadata.chunkCount)}，chunks=${metadata.chunks.length}`,
    )
  if (metadata.chunkCount !== 505)
    throw new Error(`PAL sounds metadata 期望 505 段，收到 ${String(metadata.chunkCount)}`)

  const nonempty: ExtractedSoundChunk[] = []
  let emptySounds = 0
  for (const [index, raw] of metadata.chunks.entries()) {
    const chunk = raw as Partial<ExtractedSoundChunk>
    if (chunk.index !== index)
      throw new Error(`PAL sound 段号不连续，期望 ${index}，实际 ${chunk.index}`)
    if (!Number.isInteger(chunk.size) || (chunk.size ?? -1) < 0)
      throw new Error(`PAL sound ${index}: size 非法`)
    if (typeof chunk.isEmpty !== 'boolean' || chunk.isEmpty !== (chunk.size === 0))
      throw new Error(`PAL sound ${index}: isEmpty 与 size 不一致`)
    if (chunk.isEmpty) emptySounds++
    else nonempty.push(chunk as ExtractedSoundChunk)
  }

  const extractedManifest = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/asset-manifest.json'), 'utf8'),
  ) as Partial<ExtractedAssetManifest>
  if (!Array.isArray(extractedManifest.files)) throw new Error('PAL asset-manifest.files 期望数组')
  const manifestSounds = new Map<number, number>()
  for (const file of extractedManifest.files) {
    const match = /^sounds\/(\d+)\.wav$/.exec(file.path)
    if (!match) continue
    const index = Number(match[1])
    if (manifestSounds.has(index)) throw new Error(`PAL asset-manifest 重复 sound ${index}`)
    manifestSounds.set(index, file.size)
  }
  const actualSounds = new Set<number>()
  for (const file of readdirSync(resolve(repo, 'data/extracted/sounds'))) {
    const match = /^(\d+)\.wav$/.exec(file)
    if (!match) throw new Error(`PAL sounds 目录出现非规范文件 ${file}`)
    const index = Number(match[1])
    if (actualSounds.has(index)) throw new Error(`PAL sounds 目录重复 sound ${index}`)
    actualSounds.add(index)
  }
  const expected = new Set(nonempty.map((chunk) => chunk.index))
  const exactSet = (label: string, actual: ReadonlySet<number>): void => {
    const missing = [...expected].filter((index) => !actual.has(index))
    const extra = [...actual].filter((index) => !expected.has(index))
    if (missing.length || extra.length)
      throw new Error(
        `${label} 与 metadata 不闭包：missing=${missing.join(',')} extra=${extra.join(',')}`,
      )
  }
  exactSet('PAL asset-manifest sounds', new Set(manifestSounds.keys()))
  exactSet('PAL sounds 目录', actualSounds)

  let soundBytes = 0
  const binaries = nonempty.map((chunk) => {
    const sourcePath = resolve(repo, `data/extracted/sounds/${chunk.index}.wav`)
    const bytes = readFileSync(sourcePath)
    if (bytes.byteLength !== chunk.size || manifestSounds.get(chunk.index) !== chunk.size)
      throw new Error(`PAL sound ${chunk.index}: metadata/manifest/文件 size 不一致`)
    assertWave(bytes, `PAL sound ${chunk.index}`)
    soundBytes += bytes.byteLength
    const padded = String(chunk.index).padStart(3, '0')
    return fileSource(palSoundAssetId(chunk.index), sourcePath, {
      kind: 'sound',
      path: `assets/migrated/sounds/${padded}.wav`,
      mediaType: 'audio/wav',
      label: `PAL 音效 ${padded}`,
      origin: { kind: 'legacy-migrated', ref: `sounds/${chunk.index}.wav` },
    })
  })
  return { binaries, report: { sounds: binaries.length, emptySounds, soundBytes } }
}

function loadPalFrameAnimations(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<
    PalAssetMigrationReport,
    'videos' | 'frameAnimations' | 'frames' | 'legacyPaletteByFrameAnimation'
  >
} {
  const manifestPath = resolve(repo, 'data/extracted/data/rng-frames.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ExtractedRngManifest
  if (manifest.chunks.length !== 12)
    throw new Error(`PAL RNG manifest 期望 12 段，收到 ${manifest.chunks.length}`)
  const paletteCache = new Map<number, Palette>()
  const legacyPaletteByFrameAnimation: Record<string, number> = {}
  let totalFrames = 0
  const binaries = manifest.chunks.map((chunk, index) => {
    if (chunk.chunkIndex !== index)
      throw new Error(`PAL RNG manifest 段号不连续，期望 ${index}，实际 ${chunk.chunkIndex}`)
    if (
      chunk.frames.length !== chunk.frameCount ||
      chunk.frames.some((frame, frameIndex) => frame.index !== frameIndex)
    )
      throw new Error(`PAL RNG ${index}: manifest 帧清单不连续`)
    const legacyPalette = PAL_RNG_LEGACY_PALETTE[index] ?? 0
    let palette = paletteCache.get(legacyPalette)
    if (!palette) {
      palette = readPalette(resolve(repo, `data/extracted/data/palette/${legacyPalette}.json`))
      paletteCache.set(legacyPalette, palette)
    }
    const padded = String(index).padStart(3, '0')
    const compressedSource = readFileSync(
      resolve(repo, `data/extracted/data/animation/rng-${String(index).padStart(2, '0')}.rle`),
    )
    const rgbaFrames = bakeRgbaFrames(gunzipSync(compressedSource), palette, `PAL RNG ${padded}`)
    if (rgbaFrames.length !== chunk.frameCount)
      throw new Error(
        `PAL RNG ${padded}: 解码 ${rgbaFrames.length} 帧，manifest 登记 ${chunk.frameCount}`,
      )
    totalFrames += rgbaFrames.length
    const asset = palFrameAnimationAssetId(index)
    legacyPaletteByFrameAnimation[asset] = legacyPalette
    const tpfs = encodeFrameSequenceSync(
      {
        width: RNG_WIDTH,
        height: RNG_HEIGHT,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: rgbaFrames.map((rgba) => ({ rgba })),
      },
      (raw) => deflateSync(raw, { level: 9 }),
    )
    return generatedSource(asset, tpfs, {
      kind: 'frame-animation',
      path: `assets/migrated/frame-animations/${padded}.tpfs`,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      label: `PAL 帧动画 ${padded}`,
      origin: {
        kind: 'legacy-migrated',
        ref: `animation/rng-${String(index).padStart(2, '0')}.rle`,
      },
    })
  })
  return {
    binaries,
    report: {
      videos: 6,
      frameAnimations: binaries.length,
      frames: totalFrames,
      legacyPaletteByFrameAnimation,
    },
  }
}

/** PAL 工程一等资源的唯一生成入口；所有 hash 均取自提取源或确定性 TPFS 输出。 */
export function loadPalAssets(
  repo: string,
  midiIds: readonly number[],
): {
  catalog: AssetCatalogV1
  binaries: PalBinaryAssetSource[]
  roles: ManifestAssetConfigV3['roles']
  report: PalAssetMigrationReport
} {
  const binaries = [...midiIds]
    .sort((left, right) => left - right)
    .map((track) => {
      const padded = String(track).padStart(3, '0')
      return fileSource(
        palMusicAssetId(track),
        resolve(repo, `data/extracted/music/${padded}.mid`),
        {
          kind: 'music',
          path: `assets/migrated/music/${padded}.mid`,
          mediaType: 'audio/midi',
          label: `PAL 音乐 ${padded}`,
          origin: { kind: 'legacy-migrated', ref: `music/${padded}.mid` },
        },
      )
    })
  binaries.push(
    fileSource('soundfont.default', resolve(repo, 'packages/reforge/public/soundfont.sf3'), {
      kind: 'soundfont',
      path: 'assets/runtime/soundfont.sf3',
      mediaType: 'audio/sf3',
      label: 'TimGM6mb',
      origin: { kind: 'licensed', ref: 'packages/reforge/public/soundfont.sf3' },
    }),
    fileSource('color.project-standard', resolve(repo, 'data/extracted/data/palette/0.json'), {
      kind: 'color-table',
      path: 'assets/migrated/colors/project-standard.json',
      mediaType: 'application/json',
      label: '工程标准色彩',
      origin: { kind: 'legacy-migrated', ref: 'palette/0.json' },
    }),
  )
  for (let video = 1; video <= 6; video++) {
    const padded = String(video).padStart(3, '0')
    binaries.push(
      fileSource(palVideoAssetId(video), resolve(repo, `data/extracted/videos/${video}.mp4`), {
        kind: 'video',
        path: `assets/migrated/videos/${padded}.mp4`,
        mediaType: 'video/mp4',
        label: `PAL 视频 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: `videos/${video}.mp4` },
      }),
    )
  }
  const frameAnimations = loadPalFrameAnimations(repo)
  binaries.push(...frameAnimations.binaries)
  const sounds = loadPalSoundAssets(repo)
  binaries.push(...sounds.binaries)

  const ids = new Set<string>()
  for (const source of binaries) {
    if (ids.has(source.id)) throw new Error(`PAL 资源 AssetId 重复: ${source.id}`)
    ids.add(source.id)
  }
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(binaries.map((asset) => [asset.id, asset.record])),
  }
  validateAssetCatalog(catalog)
  for (const [role, id] of Object.entries(PAL_ASSET_ROLES)) {
    if (!catalog.assets[id]) throw new Error(`PAL 资源角色 ${role} 引用缺失: ${id}`)
  }
  return {
    catalog,
    binaries,
    roles: { ...PAL_ASSET_ROLES },
    report: { ...frameAnimations.report, ...sounds.report },
  }
}

export interface PalAssetMaterializationReport {
  written: number
  unchanged: number
  authored: number
  files: number
  bytes: number
}

function assertBytes(path: string, record: AssetRecordV1): Buffer {
  if (!existsSync(path)) throw new Error(`资源文件不存在: ${path}`)
  const bytes = readFileSync(path)
  if (bytes.byteLength !== record.bytes)
    throw new Error(`资源 bytes 不符: ${path}，登记 ${record.bytes}，实际 ${bytes.byteLength}`)
  const actual = sha256(bytes)
  if (actual !== record.sha256)
    throw new Error(`资源 sha256 不符: ${path}，登记 ${record.sha256}，实际 ${actual}`)
  return bytes
}

function assertSourceBytes(source: PalBinaryAssetSource): Uint8Array {
  const bytes = sourceBytes(source)
  if (bytes.byteLength !== source.record.bytes || sha256(bytes) !== source.record.sha256)
    throw new Error(`迁移源 ${source.id} 的 bytes/hash 与 catalog 记录不符`)
  return bytes
}

function syncPath(path: string): void {
  const fd = openSync(path, 'r')
  try {
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

/**
 * 二进制不进入 MG2 JSON 事务。此函数按 catalog 所有权确定性物化，并在返回前逐文件重读闭包。
 * 作者接管同 AssetId 后只验证 authored 文件，绝不再复制 migrated 来源。
 */
export function materializePalAssets(args: {
  repo: string
  catalog: AssetCatalogV1
  binaries: readonly PalBinaryAssetSource[]
}): PalAssetMaterializationReport {
  const { repo, binaries } = args
  const catalog = validateAssetCatalog(args.catalog)
  const sourceById = new Map(binaries.map((asset) => [asset.id, asset]))
  if (sourceById.size !== binaries.length) throw new Error('PAL 二进制迁移源存在重复 AssetId')
  const ownerByPath = new Map<string, string>()
  for (const [id, record] of Object.entries(catalog.assets)) {
    const owner = ownerByPath.get(record.path)
    if (owner) throw new Error(`PAL catalog 资源路径冲突: ${owner} / ${id} -> ${record.path}`)
    ownerByPath.set(record.path, id)
  }
  // 全量预检必须先于第一个写入，避免后续坏源留下半批目标。
  for (const source of binaries) {
    const target = catalog.assets[source.id]
    if (!target) throw new Error(`PAL catalog 缺迁移资源 ${source.id}`)
    if (target.origin.kind === 'authored') {
      assertBytes(resolve(repo, 'projects/pal', target.path), target)
      continue
    }
    const sourceControlled = ['kind', 'path', 'mediaType', 'bytes', 'sha256'] as const
    for (const key of sourceControlled) {
      if (target[key] !== source.record[key])
        throw new Error(`迁移资源 ${source.id}.${key} 被非 authored 记录改写`)
    }
    assertSourceBytes(source)
  }
  for (const [id, record] of Object.entries(catalog.assets)) {
    if (sourceById.has(id)) continue
    if (record.origin.kind !== 'authored' && record.origin.kind !== 'generated')
      throw new Error(`未知迁移所有权资源 ${id}`)
    assertBytes(resolve(repo, 'projects/pal', record.path), record)
  }

  let written = 0
  let unchanged = 0
  let authored = 0
  for (const source of binaries) {
    const target = catalog.assets[source.id]
    if (!target) throw new Error(`PAL catalog 缺迁移资源 ${source.id}`)
    if (target.origin.kind === 'authored') {
      authored++
      continue
    }
    const bytes = assertSourceBytes(source)
    const destination = resolve(repo, 'projects/pal', target.path)
    if (existsSync(destination)) {
      const current = readFileSync(destination)
      if (current.byteLength === target.bytes && sha256(current) === target.sha256) {
        unchanged++
        continue
      }
    }
    mkdirSync(dirname(destination), { recursive: true })
    const temporary = `${destination}.tmp-${process.pid}`
    rmSync(temporary, { force: true })
    writeFileSync(temporary, bytes)
    syncPath(temporary)
    renameSync(temporary, destination)
    syncPath(destination)
    syncPath(dirname(destination))
    written++
  }

  let bytes = 0
  for (const record of Object.values(catalog.assets)) {
    const file = assertBytes(resolve(repo, 'projects/pal', record.path), record)
    bytes += file.byteLength
  }
  return {
    written,
    unchanged,
    authored,
    files: Object.keys(catalog.assets).length,
    bytes,
  }
}
