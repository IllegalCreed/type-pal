import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type {
  AssetCatalogV1,
  AssetRecordV1,
  AssetRole,
  ManifestAssetConfigV3,
} from '@type-pal/content'
import { palMusicAssetId, validateAssetCatalog } from '@type-pal/content'
import { sha256 } from './migration-baseline.js'

export interface PalBinaryAssetSource {
  id: string
  /** 仅读取提取/运行时来源；不属于工程路径或 MG2 baseline。 */
  sourcePath: string
  record: AssetRecordV1
}

export const PAL_AUDIO_ROLES: ManifestAssetConfigV3['roles'] = {
  'audio.midiSoundfont': 'soundfont.default',
  'audio.defaultBattleMusic': palMusicAssetId(37),
  'audio.bossVictoryMusic': palMusicAssetId(2),
  'audio.normalVictoryMusic': palMusicAssetId(3),
  'audio.openingMenuMusic': palMusicAssetId(4),
}

function binarySource(
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

/** PAL 音乐首切片的唯一生成入口；所有 hash 均取自提取源/已选定运行时音色库。 */
export function loadPalAudioAssets(
  repo: string,
  midiIds: readonly number[],
): {
  catalog: AssetCatalogV1
  binaries: PalBinaryAssetSource[]
  roles: ManifestAssetConfigV3['roles']
} {
  const binaries = [...midiIds]
    .sort((left, right) => left - right)
    .map((track) => {
      const padded = String(track).padStart(3, '0')
      return binarySource(
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
    binarySource('soundfont.default', resolve(repo, 'packages/reforge/public/soundfont.sf3'), {
      kind: 'soundfont',
      path: 'assets/runtime/soundfont.sf3',
      mediaType: 'audio/sf3',
      label: 'TimGM6mb',
      origin: { kind: 'licensed', ref: 'packages/reforge/public/soundfont.sf3' },
    }),
  )
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(binaries.map((asset) => [asset.id, asset.record])),
  }
  validateAssetCatalog(catalog)
  for (const role of Object.keys(PAL_AUDIO_ROLES) as AssetRole[]) {
    const id = PAL_AUDIO_ROLES[role]
    if (!id || !catalog.assets[id]) throw new Error(`PAL 资源角色 ${role} 引用缺失: ${String(id)}`)
  }
  return { catalog, binaries, roles: { ...PAL_AUDIO_ROLES } }
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

/**
 * 二进制不进入 MG2 JSON 事务。此函数按 catalog 所有权确定性物化，并在返回前逐文件重读闭包。
 * 作者接管同 AssetId 后只验证 authored 文件，绝不再复制 migrated 来源。
 */
export function materializePalAudioAssets(args: {
  repo: string
  catalog: AssetCatalogV1
  binaries: readonly PalBinaryAssetSource[]
}): PalAssetMaterializationReport {
  const { repo, binaries } = args
  const catalog = validateAssetCatalog(args.catalog)
  const sourceById = new Map(binaries.map((asset) => [asset.id, asset]))
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
    assertBytes(source.sourcePath, source.record)
    const destination = resolve(repo, 'projects/pal', target.path)
    if (existsSync(destination)) {
      const bytes = readFileSync(destination)
      if (bytes.byteLength === target.bytes && sha256(bytes) === target.sha256) {
        unchanged++
        continue
      }
    }
    mkdirSync(dirname(destination), { recursive: true })
    const temporary = `${destination}.tmp-${process.pid}`
    rmSync(temporary, { force: true })
    writeFileSync(temporary, readFileSync(source.sourcePath))
    renameSync(temporary, destination)
    written++
  }

  let bytes = 0
  for (const [id, record] of Object.entries(catalog.assets)) {
    if (record.kind !== 'music' && record.kind !== 'soundfont') continue
    const file = assertBytes(resolve(repo, 'projects/pal', record.path), record)
    bytes += file.byteLength
    if (!sourceById.has(id) && record.origin.kind === 'legacy-migrated')
      throw new Error(`未知迁移所有权资源 ${id}`)
  }
  return {
    written,
    unchanged,
    authored,
    files: Object.values(catalog.assets).filter(
      (record) => record.kind === 'music' || record.kind === 'soundfont',
    ).length,
    bytes,
  }
}
