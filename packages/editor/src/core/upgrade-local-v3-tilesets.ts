import {
  type AssetCatalogV1,
  type AssetRecordV1,
  type LegacyManifestV3,
  palTilesetAssetId,
  type TilesetDef,
  validateAssetCatalog,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
  validateTilesets,
} from '@type-pal/content'
import {
  compressGzip,
  decompressGzip,
  type FileSource,
  parseSpriteChunkStrict,
} from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { writeProject } from './project-io.js'

function objectAt(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function joinPath(...parts: string[]): string {
  return parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')
}

function legacySourcePath(
  path: string,
  legacy: NonNullable<LegacyManifestV3['assets']['legacy']>,
): string {
  if (path.startsWith('assets/')) return validateProjectRelativePath(path, '旧 tileset.path')
  const root = legacy.root
  if (typeof root !== 'string') throw new Error('legacy tileset 缺 assets.legacy.root')
  validateProjectRelativePath(root, 'manifest.assets.legacy.root')
  const family = typeof legacy.tilesets === 'string' ? legacy.tilesets : 'tileset'
  validateProjectRelativePath(family, 'manifest.assets.legacy.tilesets')
  const rel = path.startsWith(`${family}/`) ? joinPath(root, path) : joinPath(root, family, path)
  return validateProjectRelativePath(rel, '旧 tileset 源路径')
}

function authoredAssetId(id: string): string {
  const stable = id.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
  return `tileset.authored.${stable || 'imported'}`
}

function palNumber(def: { id: string; path: string }): number | undefined {
  const id = /^tileset-(\d+)$/.exec(def.id)
  const path = /^tileset\/(\d+)\.rle$/.exec(def.path)
  if (!id || !path || Number(id[1]) !== Number(path[1])) return undefined
  return Number(id[1])
}

async function canonicalize(bytes: ArrayBuffer, where: string): Promise<ArrayBuffer> {
  try {
    const view = new Uint8Array(bytes)
    const gzip = view[0] === 0x1f && view[1] === 0x8b
    const raw = gzip ? await decompressGzip(new Blob([bytes])) : view
    parseSpriteChunkStrict(raw)
    if (gzip) return bytes.slice(0)
    const encoded = await compressGzip(raw)
    return Uint8Array.from(encoded).buffer
  } catch (cause) {
    throw new Error(`${where}: ${cause instanceof Error ? cause.message : String(cause)}`)
  }
}

async function validateCanonicalRecord(
  source: FileSource,
  id: string,
  record: AssetRecordV1,
): Promise<void> {
  if (record.kind !== 'tileset') throw new Error(`AssetId ${id} kind 冲突`)
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`AssetId ${id} mediaType 不是 canonical tileset`)
  const bytes = await source.readBytes(record.path)
  if (record.bytes !== bytes.byteLength || record.sha256 !== (await sha256Hex(bytes)))
    throw new Error(`既有 tileset AssetId ${id} 的文件/hash 不符`)
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b)
    throw new Error(`既有 tileset AssetId ${id} 不是 canonical gzip`)
  await canonicalize(bytes, record.path)
}

function recoveryCleanupPaths(
  definitions: readonly TilesetDef[],
  catalog: AssetCatalogV1,
  legacy: NonNullable<LegacyManifestV3['assets']['legacy']>,
): string[] {
  const paths = new Set<string>()
  for (const definition of definitions) {
    const record = catalog.assets[definition.asset]
    const ref = record?.origin.ref
    if (!record || typeof ref !== 'string') continue
    const sourcePath = ref.startsWith('assets/')
      ? validateProjectRelativePath(ref, `AssetId ${definition.asset} origin.ref`)
      : record.origin.kind === 'legacy-migrated'
        ? legacySourcePath(ref, legacy)
        : undefined
    const shared = sourcePath
      ? Object.entries(catalog.assets).some(
          ([asset, candidate]) => asset !== definition.asset && candidate.path === sourcePath,
        )
      : false
    if (sourcePath && sourcePath !== record.path && !shared) paths.add(sourcePath)
  }
  return [...paths]
}

function exitTilesetLegacy(manifest: LegacyManifestV3): LegacyManifestV3 {
  const next = structuredClone(manifest)
  const legacy = next.assets.legacy
  if (!legacy) return next
  const { tilesets: _retired, ...rest } = legacy
  const families = legacy.families.filter((family) => family !== 'tileset')
  next.assets = families.length
    ? { ...next.assets, legacy: { ...rest, families } }
    : { catalog: next.assets.catalog, roles: next.assets.roles }
  return next
}

/**
 * contentVersion 3 tileset family 的唯一兼容边界。全部源和冲突先校验，
 * canonical gzip/定义/catalog 后一次提交，manifest 最后发布；二次打开严格 no-op。
 */
export async function upgradeLocalProjectV3Tilesets(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const manifest = objectAt(rawManifest, 'manifest') as unknown as LegacyManifestV3
  const legacy = manifest.assets.legacy
  const hasTilesetLegacy =
    legacy?.families.includes('tileset') || typeof legacy?.tilesets === 'string'
  if (manifest.contentVersion !== 3 || !legacy || !hasTilesetLegacy) return false
  const tablePath = manifest.content.tilesets
  if (typeof tablePath !== 'string') throw new Error('manifest 缺 content.tilesets')
  const rawDefs = await source.readJson<unknown>(tablePath)
  if (!Array.isArray(rawDefs)) throw new Error('tilesets: 期望数组')
  const catalogPath = validateProjectRelativePath(
    manifest.assets.catalog,
    'manifest.assets.catalog',
  )
  const catalog = structuredClone(
    validateAssetCatalog(await source.readJson<unknown>(catalogPath), catalogPath),
  )
  const canonicalInput = rawDefs.every(
    (raw) =>
      raw !== null &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      'asset' in raw &&
      !('path' in raw),
  )
  if (canonicalInput) {
    // manifest-last 写入失败后的确定性滚前：定义/catalog 已是新形态，旧 manifest 仍保留
    // tileset family。只有全量文件复核通过才发布 manifest，坏半批仍 fail-loud。
    const definitions = validateTilesets(rawDefs, catalog)
    for (const asset of new Set(definitions.map((definition) => definition.asset))) {
      const record = catalog.assets[asset]
      if (!record) throw new Error(`恢复 tileset 升级时缺 AssetId ${asset}`)
      await validateCanonicalRecord(source, asset, record)
    }
    const nextManifest = exitTilesetLegacy(manifest)
    validateManifestAssetConfigV3(nextManifest.assets, catalog)
    await writeProject(dir, { 'manifest.json': nextManifest })
    const cleanup = recoveryCleanupPaths(definitions, catalog, legacy)
    if (cleanup.length) await writeProject(dir, {}, { removePaths: cleanup })
    return true
  }
  const definitions: TilesetDef[] = []
  const pending: Record<string, ArrayBuffer> = {}
  const removePaths = new Set<string>()
  const ids = new Set<string>()

  for (const [index, raw] of rawDefs.entries()) {
    const value = objectAt(raw, `tilesets[${index}]`)
    if (typeof value.id !== 'string' || !value.id || value.id.includes('/'))
      throw new Error(`tilesets[${index}].id: 非法稳定 id`)
    if (ids.has(value.id)) throw new Error(`tilesets[${index}].id: 重复 ${value.id}`)
    ids.add(value.id)
    if (typeof value.name !== 'string' || !value.name)
      throw new Error(`tilesets[${index}].name: 期望非空字符串`)
    if (typeof value.category !== 'string' || !value.category)
      throw new Error(`tilesets[${index}].category: 期望非空字符串`)
    if (typeof value.path !== 'string' || !value.path)
      throw new Error(`tilesets[${index}].path: 期望旧路径`)
    if ('asset' in value) throw new Error(`tilesets[${index}]: path + asset 混合态不可升级`)

    const sourcePath = legacySourcePath(value.path, legacy)
    const sourceBytes = await source.readBytes(sourcePath)
    const bytes = await canonicalize(sourceBytes, sourcePath)
    const mapNum = palNumber({ id: value.id, path: value.path })
    const asset = mapNum === undefined ? authoredAssetId(value.id) : palTilesetAssetId(mapNum)
    const hash = await sha256Hex(bytes)
    const targetPath =
      mapNum === undefined
        ? `assets/authored/tilesets/${hash}.rle`
        : `assets/migrated/tilesets/${String(mapNum).padStart(3, '0')}.rle`
    const existing = catalog.assets[asset]
    if (existing) {
      await validateCanonicalRecord(source, asset, existing)
      const pathOwner = Object.entries(catalog.assets).find(
        ([id, record]) => id !== asset && record.path === existing.path,
      )
      if (pathOwner)
        throw new Error(`tileset 既有路径同时由 ${pathOwner[0]} 登记: ${existing.path}`)
      if (existing.origin.kind !== 'authored') {
        const expectedRef = mapNum === undefined ? undefined : `tileset/${mapNum}.rle`
        if (
          existing.origin.kind !== 'legacy-migrated' ||
          expectedRef === undefined ||
          existing.path !== targetPath ||
          existing.bytes !== bytes.byteLength ||
          existing.sha256 !== hash ||
          existing.origin.ref !== expectedRef
        )
          throw new Error(`tileset AssetId ${asset} 已被非 authored/非本次迁移记录占用`)
      }
    } else {
      const owner = Object.entries(catalog.assets).find(([, record]) => record.path === targetPath)
      if (owner) throw new Error(`tileset 目标路径与 ${owner[0]} 冲突: ${targetPath}`)
      const record: AssetRecordV1 = {
        kind: 'tileset',
        path: targetPath,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytes.byteLength,
        sha256: hash,
        label: value.name,
        origin:
          mapNum === undefined
            ? { kind: 'authored', ref: sourcePath }
            : { kind: 'legacy-migrated', ref: `tileset/${mapNum}.rle` },
      }
      catalog.assets[asset] = record
      pending[targetPath] = bytes
    }
    definitions.push({ id: value.id, name: value.name, category: value.category, asset })
    const resolvedPath = catalog.assets[asset]?.path ?? targetPath
    const sourceShared = Object.entries(catalog.assets).some(
      ([id, record]) => id !== asset && record.path === sourcePath,
    )
    if (sourcePath !== resolvedPath && !sourceShared) removePaths.add(sourcePath)
  }

  validateTilesets(definitions, catalog)
  const nextManifest = exitTilesetLegacy(manifest)
  validateManifestAssetConfigV3(nextManifest.assets, catalog)
  const files: Record<string, unknown> = {
    ...pending,
    [tablePath]: definitions,
    [catalogPath]: catalog satisfies AssetCatalogV1,
    'manifest.json': nextManifest,
  }
  // 旧源只能在 canonical 定义/catalog/manifest 全部发布成功后删除。否则 manifest close
  // 失败会留下仍指向旧 path、但旧字节已先被删掉的不可重试坏工程。
  await writeProject(dir, files)
  if (removePaths.size) await writeProject(dir, {}, { removePaths: [...removePaths] })
  return true
}
