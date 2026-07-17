import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
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

export const PAL_ASSET_ROLES = {
  ...PAL_AUDIO_ROLES,
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

function loadPalFrameAnimations(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: PalAssetMigrationReport
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
    report: frameAnimations.report,
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
    const sourceControlled = ['kind', 'path', 'mediaType', 'bytes', 'sha256'] as const
    for (const key of sourceControlled) {
      if (target[key] !== source.record[key])
        throw new Error(`迁移资源 ${source.id}.${key} 被非 authored 记录改写`)
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
    renameSync(temporary, destination)
    written++
  }

  let bytes = 0
  for (const [id, record] of Object.entries(catalog.assets)) {
    const file = assertBytes(resolve(repo, 'projects/pal', record.path), record)
    bytes += file.byteLength
    if (
      !sourceById.has(id) &&
      record.origin.kind !== 'authored' &&
      record.origin.kind !== 'generated'
    )
      throw new Error(`未知迁移所有权资源 ${id}`)
  }
  return {
    written,
    unchanged,
    authored,
    files: Object.keys(catalog.assets).length,
    bytes,
  }
}
