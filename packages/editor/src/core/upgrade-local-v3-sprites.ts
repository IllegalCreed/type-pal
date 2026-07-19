import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type LoadedManifest,
  legacyWorldSpriteNumberFromAsset,
  normalizeScriptLibrary,
  palSpriteAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type SpriteDef,
  validateAssetCatalog,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
  validateSprites,
} from '@type-pal/content'
import { compressGzip, decodeWorldSpriteAssetBytes, type FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { writeProject } from './project-io.js'

interface LegacySpriteDef {
  id: string
  spriteNum: number
  label: string
  layout: SpriteDef['layout']
  poses?: SpriteDef['poses']
  path?: string
}

interface PlannedSource {
  sourcePath: string
  sourceRef: string
  legacy: boolean
  spriteNum: number
  asset: AssetId
  record: AssetRecordV1
  bytes?: ArrayBuffer
}

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

function stableId(value: string): string {
  const lower = value.toLowerCase()
  const slug = lower.replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '')
  // `u-` 是转义域；规范 id 只有不占用该前缀时才原样保留，保证任意 UTF-8 输入间单射。
  if (slug && slug === value && !value.startsWith('u-')) return slug
  const escaped = [...new TextEncoder().encode(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `u-${escaped}`
}

function legacySource(
  definition: LegacySpriteDef,
  legacy: NonNullable<LoadedManifest['assets']['legacy']>,
): { path: string; ref: string; legacy: boolean } {
  if (definition.path?.startsWith('assets/')) {
    return {
      path: validateProjectRelativePath(definition.path, `sprite ${definition.id}.path`),
      ref: definition.path,
      legacy: false,
    }
  }
  const root = legacy.root
  if (typeof root !== 'string') throw new Error(`sprite ${definition.id}: legacy root 缺失`)
  validateProjectRelativePath(root, 'manifest.assets.legacy.root')
  const family = typeof legacy.sprites === 'string' ? legacy.sprites : 'sprite'
  validateProjectRelativePath(family, 'manifest.assets.legacy.sprites')
  const ref = definition.path ?? joinPath(family, `${definition.spriteNum}.rle`)
  return {
    path: validateProjectRelativePath(joinPath(root, ref), `sprite ${definition.id} 源路径`),
    ref,
    legacy: true,
  }
}

async function canonicalize(
  sourceBytes: ArrayBuffer,
  origin: 'legacy-migrated' | 'authored',
  where: string,
): Promise<{ bytes: ArrayBuffer; sha256: string }> {
  const source = new Uint8Array(sourceBytes)
  const gzip = source[0] === 0x1f && source[1] === 0x8b
  const bytes = gzip ? sourceBytes.slice(0) : Uint8Array.from(await compressGzip(source)).buffer
  const sha256 = await sha256Hex(bytes)
  await decodeWorldSpriteAssetBytes(
    {
      kind: 'sprite',
      path: where,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      origin: { kind: origin },
    },
    bytes,
    where,
  )
  return { bytes, sha256 }
}

async function validateExistingRecord(
  source: FileSource,
  asset: AssetId,
  record: AssetRecordV1,
): Promise<ArrayBuffer> {
  if (record.kind !== 'sprite') throw new Error(`AssetId ${asset} kind 冲突`)
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`AssetId ${asset} mediaType 不是 canonical sprite`)
  const bytes = await source.readBytes(record.path)
  await decodeWorldSpriteAssetBytes(record, bytes, `既有 sprite AssetId ${asset}`)
  return bytes
}

function exitSpriteLegacy(manifest: LoadedManifest): LoadedManifest {
  const next = structuredClone(manifest)
  const legacy = next.assets.legacy
  if (!legacy) return next
  const { sprites: _retired, ...rest } = legacy
  const families = legacy.families.filter((family) => family !== 'sprite')
  next.assets = families.length
    ? { ...next.assets, legacy: { ...rest, families } }
    : { catalog: next.assets.catalog, roles: next.assets.roles }
  return next
}

function buildFollowerResolver(
  candidates: ReadonlyMap<number, readonly string[]>,
  spriteIds: ReadonlySet<string>,
  legacyCompatibleIds: ReadonlySet<string>,
): (value: unknown, where: string) => string[] {
  return (value, where) => {
    if (!Array.isArray(value)) throw new Error(`${where}: sprites 必须是数组`)
    if (value.length > 2) throw new Error(`${where}: 最多允许 2 个编外跟随者`)
    const hasNumber = value.some((entry) => typeof entry === 'number')
    const hasString = value.some((entry) => typeof entry === 'string')
    if (hasNumber && hasString) throw new Error(`${where}: 不允许数字与 SpriteDef.id 混合`)
    return value.flatMap((entry, index) => {
      const path = `${where}.sprites[${index}]`
      if (typeof entry === 'string') {
        if (!spriteIds.has(entry)) throw new Error(`${path}: SpriteDef.id "${entry}" 不存在`)
        return [entry]
      }
      if (!Number.isInteger(entry) || (entry as number) < 0)
        throw new Error(`${path}: 旧精灵号必须是非负整数`)
      if (entry === 0) return []
      const ids = [...new Set(candidates.get(entry as number) ?? [])]
      if (ids.length === 0) throw new Error(`${path}: 旧精灵号 ${entry} 没有 SpriteDef.id 映射`)
      if (ids.length > 1)
        throw new Error(
          `${path}: 旧精灵号 ${entry} 对应多个 SpriteDef.id(${ids.join(', ')})，拒绝猜测`,
        )
      if (!legacyCompatibleIds.has(ids[0]!))
        throw new Error(
          `${path}: SpriteDef.id "${ids[0]}" 不是 directional/3，无法保持旧跟随者动画语义`,
        )
      return [ids[0]!]
    })
  }
}

function upgradeFollowerCommands(
  value: unknown,
  resolve: (value: unknown, where: string) => string[],
  where: string,
): unknown {
  if (Array.isArray(value))
    return value.map((entry, index) =>
      upgradeFollowerCommands(entry, resolve, `${where}[${index}]`),
    )
  if (!value || typeof value !== 'object') return value
  const input = value as Record<string, unknown>
  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(input))
    output[key] = upgradeFollowerCommands(child, resolve, `${where}.${key}`)
  if (input.kind === 'setFollowers') output.sprites = resolve(input.sprites, where)
  return output
}

async function collectFollowerFiles(
  source: FileSource,
  manifest: LoadedManifest,
  resolve: (value: unknown, where: string) => string[],
): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {}
  const content = manifest.content
  for (const key of ['actors', 'enemies', 'skills', 'items'] as const) {
    const path = content[key]
    if (typeof path === 'string')
      files[path] = upgradeFollowerCommands(await source.readJson<unknown>(path), resolve, path)
  }
  const sceneDir = (content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  const sceneIds = await source.readJson<string[]>(`${sceneDir}index.json`)
  for (const id of sceneIds) {
    const path = `${sceneDir}${id}.json`
    files[path] = upgradeFollowerCommands(await source.readJson<unknown>(path), resolve, path)
  }
  const scriptDir = content.scripts?.replace(/\/?$/, '/')
  if (scriptDir) {
    const indexPath = `${scriptDir}index.json`
    const index = await source.readJson<ScriptIndexV1>(indexPath)
    const chunks: Record<string, ScriptChunkV1> = {}
    for (const [id, meta] of Object.entries(index.chunks)) {
      const path = `${scriptDir}${meta.path}`
      chunks[id] = upgradeFollowerCommands(
        await source.readJson<unknown>(path),
        resolve,
        path,
      ) as ScriptChunkV1
    }
    const normalized = normalizeScriptLibrary(index, chunks)
    files[indexPath] = normalized.index
    for (const [id, chunk] of Object.entries(normalized.chunks)) {
      const meta = normalized.index.chunks[id]
      if (!meta) throw new Error(`脚本分片 ${id} 缺失重算元数据`)
      files[`${scriptDir}${meta.path}`] = chunk
    }
  }
  return files
}

function cleanupPaths(plans: readonly PlannedSource[], catalog: AssetCatalogV1): string[] {
  const paths = new Set<string>()
  for (const plan of plans) {
    if (plan.sourcePath === plan.record.path) continue
    const retained = Object.entries(catalog.assets).some(
      ([asset, record]) => asset !== plan.asset && record.path === plan.sourcePath,
    )
    if (!retained) paths.add(plan.sourcePath)
  }
  return [...paths]
}

async function listLegacyFamilySources(
  dir: FileSystemDirectoryHandle,
  legacy: NonNullable<LoadedManifest['assets']['legacy']>,
): Promise<{ sourcePath: string; sourceRef: string; spriteNum: number }[]> {
  const root = legacy.root
  if (typeof root !== 'string') throw new Error('legacy sprite 缺 assets.legacy.root')
  const family = typeof legacy.sprites === 'string' ? legacy.sprites : 'sprite'
  validateProjectRelativePath(root, 'manifest.assets.legacy.root')
  validateProjectRelativePath(family, 'manifest.assets.legacy.sprites')
  const directoryPath = validateProjectRelativePath(
    joinPath(root, family),
    'legacy sprite family 路径',
  )
  let directory = dir
  try {
    for (const segment of directoryPath.split('/'))
      directory = await directory.getDirectoryHandle(segment)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'NotFoundError') return []
    throw cause
  }
  const values = (
    directory as unknown as {
      values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>
    }
  ).values()
  const byNumber = new Map<number, string>()
  for await (const handle of values) {
    if (handle.kind !== 'file') continue
    if (!handle.name.toLowerCase().endsWith('.rle')) continue
    const match = /^(\d+)\.rle$/i.exec(handle.name)
    if (!match) throw new Error(`legacy sprite family 含非规范 RLE 文件: ${handle.name}`)
    const spriteNum = Number(match[1])
    if (!Number.isInteger(spriteNum) || spriteNum <= 0)
      throw new Error(`legacy sprite 文件号非法: ${handle.name}`)
    const previous = byNumber.get(spriteNum)
    if (previous) throw new Error(`legacy sprite 号 ${spriteNum} 重复: ${previous}, ${handle.name}`)
    byNumber.set(spriteNum, handle.name)
  }
  return [...byNumber.entries()]
    .sort(([left], [right]) => left - right)
    .map(([spriteNum, name]) => ({
      spriteNum,
      sourceRef: joinPath(family, name),
      sourcePath: joinPath(root, family, name),
    }))
}

function recoveryPlans(
  catalog: AssetCatalogV1,
  legacy: NonNullable<LoadedManifest['assets']['legacy']>,
): PlannedSource[] {
  const plans: PlannedSource[] = []
  for (const [asset, record] of Object.entries(catalog.assets)) {
    if (record.kind !== 'sprite' || record.origin.kind !== 'legacy-migrated') continue
    const ref = record?.origin.ref
    if (!record || typeof ref !== 'string') continue
    const root = legacy.root
    if (typeof root !== 'string') throw new Error(`恢复 sprite ${asset}: legacy root 缺失`)
    const sourcePath = validateProjectRelativePath(joinPath(root, ref), `sprite ${asset} 旧源`)
    plans.push({
      sourcePath,
      sourceRef: ref,
      legacy: true,
      spriteNum: legacyWorldSpriteNumberFromAsset(asset) ?? 0,
      asset,
      record,
    })
  }
  return plans
}

/**
 * 本地 contentVersion 3 world-sprite 的唯一兼容边界。旧 number/path 与数字 followers
 * 全部在写前规划并校验；binary → union catalog → 脚本/场景 → sprites → manifest，
 * 旧源只在 manifest 发布成功后删除。二次打开必须是 no-op。
 */
export async function upgradeLocalProjectV3Sprites(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const manifest = objectAt(rawManifest, 'manifest') as unknown as LoadedManifest
  const legacy = manifest.assets.legacy
  const hasSpriteLegacy = legacy?.families.includes('sprite') || typeof legacy?.sprites === 'string'
  if (manifest.contentVersion !== 3 || !legacy || !hasSpriteLegacy) return false
  const tablePath = manifest.content.sprites
  if (typeof tablePath !== 'string') throw new Error('manifest 缺 content.sprites')
  const rawDefs = await source.readJson<unknown>(tablePath)
  if (!Array.isArray(rawDefs)) throw new Error(`${tablePath}: 期望数组`)
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
      !('spriteNum' in raw) &&
      !('path' in raw),
  )

  if (canonicalInput) {
    const definitions = validateSprites(rawDefs, catalog)
    for (const [asset, record] of Object.entries(catalog.assets))
      if (record.kind === 'sprite') await validateExistingRecord(source, asset, record)
    const byNumber = new Map<number, string[]>()
    for (const definition of definitions) {
      const number = legacyWorldSpriteNumberFromAsset(definition.asset)
      if (number !== undefined)
        byNumber.set(number, [...(byNumber.get(number) ?? []), definition.id])
    }
    const resolve = buildFollowerResolver(
      byNumber,
      new Set(definitions.map(({ id }) => id)),
      new Set(
        definitions
          .filter(({ layout }) => layout.kind === 'directional' && layout.framesPerDir === 3)
          .map(({ id }) => id),
      ),
    )
    const followerFiles = await collectFollowerFiles(source, manifest, resolve)
    const nextManifest = exitSpriteLegacy(manifest)
    validateManifestAssetConfigV3(nextManifest.assets, catalog)
    const plans = recoveryPlans(catalog, legacy)
    await writeProject(
      dir,
      {
        [catalogPath]: catalog,
        ...followerFiles,
        [tablePath]: definitions,
        'manifest.json': nextManifest,
      },
      { removePaths: cleanupPaths(plans, catalog) },
    )
    return true
  }

  const legacyDefs: LegacySpriteDef[] = rawDefs.map((raw, index) => {
    const value = objectAt(raw, `sprites[${index}]`)
    if ('asset' in value) throw new Error(`sprites[${index}]: asset 与旧字段混合，拒绝猜测`)
    if (typeof value.id !== 'string' || !value.id || value.id.includes('/'))
      throw new Error(`sprites[${index}].id: 非法稳定 id`)
    if (!Number.isInteger(value.spriteNum) || (value.spriteNum as number) <= 0)
      throw new Error(`sprites[${index}].spriteNum: 期望正整数`)
    if (typeof value.label !== 'string') throw new Error(`sprites[${index}].label: 期望 string`)
    if (value.path !== undefined && (typeof value.path !== 'string' || !value.path))
      throw new Error(`sprites[${index}].path: 期望非空字符串`)
    return {
      id: value.id,
      spriteNum: value.spriteNum as number,
      label: value.label,
      layout: value.layout as SpriteDef['layout'],
      ...(value.poses === undefined ? {} : { poses: value.poses as SpriteDef['poses'] }),
      ...(value.path === undefined ? {} : { path: value.path as string }),
    }
  })
  if (new Set(legacyDefs.map(({ id }) => id)).size !== legacyDefs.length)
    throw new Error('sprites: 重复 id')

  const definitions: SpriteDef[] = []
  const plansBySource = new Map<string, PlannedSource>()
  const plansByAsset = new Map<AssetId, PlannedSource>()
  const plannedByHash = new Map<string, PlannedSource>()
  const byNumber = new Map<number, string[]>()
  for (const definition of legacyDefs)
    byNumber.set(definition.spriteNum, [
      ...(byNumber.get(definition.spriteNum) ?? []),
      definition.id,
    ])

  const ensurePlan = async (
    sourceInfo: { path: string; ref: string; legacy: boolean },
    spriteNum: number,
    definitionId: string,
  ): Promise<PlannedSource> => {
    const sourceKey = `${sourceInfo.path}\0${spriteNum}`
    const cached = plansBySource.get(sourceKey)
    if (cached) return cached
    const sourceBytes = await source.readBytes(sourceInfo.path)
    const canonical = await canonicalize(
      sourceBytes,
      sourceInfo.legacy ? 'legacy-migrated' : 'authored',
      sourceInfo.path,
    )
    const expectedAsset = sourceInfo.legacy
      ? palSpriteAssetId(spriteNum)
      : `sprite.authored.legacy-${spriteNum}.${stableId(definitionId)}`
    const alreadyPlanned = plansByAsset.get(expectedAsset)
    if (alreadyPlanned) {
      if (alreadyPlanned.record.sha256 !== canonical.sha256)
        throw new Error(`sprite AssetId ${expectedAsset} 对应多个不同源字节，拒绝覆盖`)
      const alias = { ...alreadyPlanned, sourcePath: sourceInfo.path, sourceRef: sourceInfo.ref }
      plansBySource.set(sourceKey, alias)
      return alias
    }

    const existing = catalog.assets[expectedAsset]
    if (existing) {
      await validateExistingRecord(source, expectedAsset, existing)
      const pathOwner = Object.entries(catalog.assets).find(
        ([asset, record]) => asset !== expectedAsset && record.path === existing.path,
      )
      if (pathOwner) throw new Error(`sprite 既有路径同时由 ${pathOwner[0]} 登记: ${existing.path}`)
      if (!sourceInfo.legacy && existing.origin.kind === 'authored') {
        if (existing.bytes !== canonical.bytes.byteLength || existing.sha256 !== canonical.sha256)
          throw new Error(`sprite AssetId ${expectedAsset} 已有 authored 记录但字节不同，拒绝覆盖`)
      } else if (existing.origin.kind !== 'authored') {
        const expectedPath = `assets/migrated/sprites/${String(spriteNum).padStart(3, '0')}.rle`
        if (
          !sourceInfo.legacy ||
          existing.origin.kind !== 'legacy-migrated' ||
          existing.path !== expectedPath ||
          existing.bytes !== canonical.bytes.byteLength ||
          existing.sha256 !== canonical.sha256 ||
          existing.origin.ref !== sourceInfo.ref
        )
          throw new Error(`sprite AssetId ${expectedAsset} 已被非 authored/非本次迁移记录占用`)
      }
      const plan: PlannedSource = {
        sourcePath: sourceInfo.path,
        sourceRef: sourceInfo.ref,
        legacy: sourceInfo.legacy,
        spriteNum,
        asset: expectedAsset,
        record: existing,
      }
      plansBySource.set(sourceKey, plan)
      plansByAsset.set(expectedAsset, plan)
      return plan
    }

    if (!sourceInfo.legacy) {
      const hashKey = `${canonical.sha256}\0${spriteNum}`
      const planned = plannedByHash.get(hashKey)
      if (planned) {
        const alias = { ...planned, sourcePath: sourceInfo.path, sourceRef: sourceInfo.ref }
        plansBySource.set(sourceKey, alias)
        return alias
      }
      const reusable = Object.entries(catalog.assets).find(
        ([asset, record]) =>
          record.kind === 'sprite' &&
          record.origin.kind === 'authored' &&
          record.sha256 === canonical.sha256 &&
          legacyWorldSpriteNumberFromAsset(asset) === spriteNum,
      )
      if (reusable) {
        await validateExistingRecord(source, reusable[0], reusable[1])
        const plan: PlannedSource = {
          sourcePath: sourceInfo.path,
          sourceRef: sourceInfo.ref,
          legacy: false,
          spriteNum,
          asset: reusable[0],
          record: reusable[1],
        }
        plansBySource.set(sourceKey, plan)
        return plan
      }
    }

    const targetPath = sourceInfo.legacy
      ? `assets/migrated/sprites/${String(spriteNum).padStart(3, '0')}.rle`
      : `assets/authored/sprites/legacy-${spriteNum}-${canonical.sha256}.rle`
    const pathOwner = Object.entries(catalog.assets).find(
      ([, record]) => record.path === targetPath,
    )
    if (pathOwner) throw new Error(`sprite 目标路径与 ${pathOwner[0]} 冲突: ${targetPath}`)
    const record: AssetRecordV1 = {
      kind: 'sprite',
      path: targetPath,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: canonical.bytes.byteLength,
      sha256: canonical.sha256,
      label: sourceInfo.legacy
        ? `PAL 大世界精灵 ${String(spriteNum).padStart(3, '0')}`
        : '导入的大世界精灵资源',
      origin: sourceInfo.legacy
        ? { kind: 'legacy-migrated', ref: sourceInfo.ref }
        : { kind: 'authored', ref: sourceInfo.path },
    }
    catalog.assets[expectedAsset] = record
    const plan: PlannedSource = {
      sourcePath: sourceInfo.path,
      sourceRef: sourceInfo.ref,
      legacy: sourceInfo.legacy,
      spriteNum,
      asset: expectedAsset,
      record,
      bytes: canonical.bytes,
    }
    plansBySource.set(sourceKey, plan)
    plansByAsset.set(expectedAsset, plan)
    if (!sourceInfo.legacy) plannedByHash.set(`${canonical.sha256}\0${spriteNum}`, plan)
    return plan
  }

  // legacy family 是一个可浏览资源库，而不只是 SpriteDef 的隐式 backing store。先枚举全部
  // 数字 RLE，保证未被定义引用的 chunk 也进入 catalog；定义稍后只建立语义边。
  for (const familySource of await listLegacyFamilySources(dir, legacy))
    await ensurePlan(
      { path: familySource.sourcePath, ref: familySource.sourceRef, legacy: true },
      familySource.spriteNum,
      `legacy-${familySource.spriteNum}`,
    )

  for (const definition of legacyDefs) {
    const sourceInfo = legacySource(definition, legacy)
    const plan = await ensurePlan(sourceInfo, definition.spriteNum, definition.id)
    definitions.push({
      id: definition.id,
      asset: plan.asset,
      label: definition.label,
      layout: definition.layout,
      ...(definition.poses ? { poses: definition.poses } : {}),
    })
  }

  validateSprites(definitions, catalog)
  const resolve = buildFollowerResolver(
    byNumber,
    new Set(definitions.map(({ id }) => id)),
    new Set(
      definitions
        .filter(({ layout }) => layout.kind === 'directional' && layout.framesPerDir === 3)
        .map(({ id }) => id),
    ),
  )
  const followerFiles = await collectFollowerFiles(source, manifest, resolve)
  const nextManifest = exitSpriteLegacy(manifest)
  validateManifestAssetConfigV3(nextManifest.assets, catalog)
  const plans = [...plansBySource.values()]
  const pending = Object.fromEntries(
    plans.flatMap((plan) => (plan.bytes ? [[plan.record.path, plan.bytes]] : [])),
  )
  await writeProject(
    dir,
    {
      ...pending,
      [catalogPath]: catalog,
      ...followerFiles,
      [tablePath]: definitions,
      'manifest.json': nextManifest,
    },
    { removePaths: cleanupPaths(plans, catalog) },
  )
  return true
}
