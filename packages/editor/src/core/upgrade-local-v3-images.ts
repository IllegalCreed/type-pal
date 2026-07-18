import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  collectAssetReferences,
  normalizeScriptLibrary,
  palBattleBackgroundAssetId,
  palFaceAssetId,
  palItemIconAssetId,
  palPortraitAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upgradeLegacyActorImages,
  upgradeLegacyItemImages,
  upgradeLegacyPalBattleFields,
  upgradeLegacyStaticImageCommands,
  validateAssetCatalog,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
} from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { writeProject } from './project-io.js'
import type { UpgradeLocalV2Options } from './upgrade-local-v2.js'

const STATIC_FAMILIES = ['portrait', 'face', 'item-icon', 'battle-background'] as const
type StaticFamily = (typeof STATIC_FAMILIES)[number]

function asObject(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function cleanDirectoryPath(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new Error(`${where}: 期望工程内相对目录`)
  const path = value.replace(/\/$/, '')
  try {
    return validateProjectRelativePath(path, where)
  } catch {
    throw new Error(
      `${where}="${value}" 不是工程内相对目录，无法原地闭包静态图像；请先把 HTTP 工程完整克隆到可写本地工程`,
    )
  }
}

function pngHeader(bytes: ArrayBuffer, where: string): { width: number; height: number } {
  const view = new Uint8Array(bytes)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (
    view.byteLength < 24 ||
    signature.some((value, index) => view[index] !== value) ||
    String.fromCharCode(...view.subarray(12, 16)) !== 'IHDR'
  )
    throw new Error(`${where}: 不是有效 PNG`)
  const data = new DataView(bytes)
  const width = data.getUint32(16)
  const height = data.getUint32(20)
  if (width <= 0 || height <= 0) throw new Error(`${where}: PNG 尺寸无效`)
  return { width, height }
}

async function validateStaticPng(
  bytes: ArrayBuffer,
  kind: StaticFamily,
  where: string,
): Promise<void> {
  const dimensions = pngHeader(bytes, where)
  if (kind === 'battle-background' && (dimensions.width !== 320 || dimensions.height !== 200))
    throw new Error(
      `${where}: 战场背景必须是 320×200，实际 ${dimensions.width}×${dimensions.height}`,
    )
  if (typeof createImageBitmap !== 'function')
    throw new Error(`${where}: 当前浏览器不支持 PNG 解码，无法安全升级静态图像`)
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  try {
    if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height)
      throw new Error(`${where}: PNG 头与解码尺寸不一致`)
    if (kind !== 'battle-background') return
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error(`${where}: 无法创建 PNG 校验画布`)
    context.drawImage(bitmap, 0, 0)
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      const offset = pixel * 4
      const index = rgba[offset] ?? 0
      if (rgba[offset + 1] !== index || rgba[offset + 2] !== index || rgba[offset + 3] !== 255)
        throw new Error(`${where}: 像素 ${pixel} 不满足战场背景格式`)
    }
  } finally {
    bitmap.close()
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function directoryFiles(
  dir: FileSystemDirectoryHandle,
  root: string,
): Promise<Array<{ name: string; sourcePath: string }>> {
  let handle = dir
  for (const segment of root.split('/')) handle = await handle.getDirectoryHandle(segment)
  const result: Array<{ name: string; sourcePath: string }> = []
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') throw new Error(`${root}: 静态图像目录不能包含子目录 ${entry.name}`)
    result.push({ name: entry.name, sourcePath: `${root}/${entry.name}` })
  }
  return result.sort((left, right) => left.name.localeCompare(right.name, 'en'))
}

interface ImageSource {
  id: AssetId
  kind: StaticFamily
  sourcePath: string
  targetPath: string
  label: string
  originRef: string
}

async function numericSources(
  dir: FileSystemDirectoryHandle,
  root: string,
  kind: 'portrait' | 'item-icon',
): Promise<ImageSource[]> {
  const seen = new Set<number>()
  const result: ImageSource[] = []
  for (const entry of await directoryFiles(dir, root)) {
    const match = /^(\d+)\.png$/i.exec(entry.name)
    if (!match) throw new Error(`${entry.sourcePath}: 期望 <正整数>.png`)
    const legacyId = Number(match[1])
    if (!Number.isInteger(legacyId) || legacyId <= 0)
      throw new Error(`${entry.sourcePath}: 编号必须是正整数`)
    if (seen.has(legacyId)) throw new Error(`${root}: 重复图片编号 ${legacyId}`)
    seen.add(legacyId)
    const padded = String(legacyId).padStart(3, '0')
    result.push({
      id: kind === 'portrait' ? palPortraitAssetId(legacyId) : palItemIconAssetId(legacyId),
      kind,
      sourcePath: entry.sourcePath,
      targetPath:
        kind === 'portrait'
          ? `assets/migrated/portraits/${padded}.png`
          : `assets/migrated/item-icons/${padded}.png`,
      label: kind === 'portrait' ? `PAL 立绘 ${padded}` : `PAL 物品图标 ${padded}`,
      originRef: entry.sourcePath,
    })
  }
  return result
}

async function faceSources(dir: FileSystemDirectoryHandle, root: string): Promise<ImageSource[]> {
  const result: ImageSource[] = []
  for (const entry of await directoryFiles(dir, root)) {
    const match = /^([a-z0-9][a-z0-9-]*)\.png$/i.exec(entry.name)
    if (!match) throw new Error(`${entry.sourcePath}: 期望 <actor-id>.png`)
    const actorId = match[1]!.toLowerCase()
    result.push({
      id: palFaceAssetId(actorId),
      kind: 'face',
      sourcePath: entry.sourcePath,
      targetPath: `assets/migrated/faces/${actorId}.png`,
      label: `PAL ${actorId} 战斗头像`,
      originRef: entry.sourcePath,
    })
  }
  return result
}

function battleImagesRoot(legacyRoot: unknown): string {
  const root = cleanDirectoryPath(legacyRoot, 'manifest.assets.legacy.root')
  if (root === 'data') return 'images/battle/bg'
  if (!root.endsWith('/data'))
    throw new Error(
      'manifest.assets.legacy.root 无法确定旧战场背景目录；请从迁移器重新生成工程，不能按战场编号猜路径',
    )
  return `${root.slice(0, -'/data'.length)}/images/battle/bg`
}

function staticFamilies(manifest: Record<string, unknown>): StaticFamily[] {
  const assets = asObject(manifest.assets, 'manifest.assets')
  const legacy =
    assets.legacy === undefined ? undefined : asObject(assets.legacy, 'manifest.assets.legacy')
  if (!legacy) return []
  if ('ui' in legacy)
    throw new Error(
      'manifest.assets.legacy.ui: 旧工程 UI 主题没有可安全升级的 slot 契约；请备份工程并移除该自定义后再打开',
    )
  const families = legacy.families
  if (!Array.isArray(families)) throw new Error('manifest.assets.legacy.families: 期望数组')
  return STATIC_FAMILIES.filter((family) => families.includes(family))
}

function exitStaticFamilies(
  manifest: Record<string, unknown>,
  removed: readonly StaticFamily[],
): Record<string, unknown> {
  const assets = asObject(structuredClone(manifest.assets), 'manifest.assets')
  const legacy = asObject(assets.legacy, 'manifest.assets.legacy')
  const removedSet = new Set(removed)
  const families = (legacy.families as unknown[]).filter(
    (family) => typeof family !== 'string' || !removedSet.has(family as StaticFamily),
  )
  delete legacy.portraits
  delete legacy.faces
  delete legacy.itemIcons
  if (families.length) legacy.families = families
  else delete assets.legacy
  return { ...structuredClone(manifest), assets }
}

async function materializeSource(
  source: FileSource,
  image: ImageSource,
  catalog: AssetCatalogV1,
  files: Record<string, unknown>,
  validate: NonNullable<UpgradeLocalV2Options['validateStaticImage']>,
): Promise<void> {
  const legacyBytes = await source.readBytes(image.sourcePath)
  pngHeader(legacyBytes, image.sourcePath)
  await validate(legacyBytes, image.kind, image.sourcePath)
  const legacyHash = await sha256Hex(legacyBytes)
  const existing = catalog.assets[image.id]
  if (existing) {
    if (existing.kind !== image.kind)
      throw new Error(`${image.id}: 已存在但 kind=${existing.kind}，期望 ${image.kind}`)
    const bytes = await source.readBytes(existing.path)
    await validate(bytes, image.kind, existing.path)
    const hash = await sha256Hex(bytes)
    if (existing.bytes !== bytes.byteLength || existing.sha256 !== hash)
      throw new Error(`${image.id}: catalog bytes/hash 与工程文件不符`)
    if (existing.origin.kind !== 'authored' && hash !== legacyHash)
      throw new Error(`${image.id}: 非 authored 记录与 legacy 源不一致`)
    return
  }
  const record: AssetRecordV1 = {
    kind: image.kind,
    path: image.targetPath,
    mediaType: 'image/png',
    bytes: legacyBytes.byteLength,
    sha256: legacyHash,
    label: image.label,
    origin: { kind: 'legacy-migrated', ref: image.originRef },
  }
  catalog.assets[image.id] = record
  files[record.path] = legacyBytes
}

function addActorFaces(input: unknown, catalog: AssetCatalogV1): unknown {
  if (!Array.isArray(input)) throw new Error('actors: 期望数组')
  return input.map((raw, index) => {
    const actor = asObject(structuredClone(raw), `actors[${index}]`)
    if (typeof actor.id !== 'string' || actor.id.length === 0)
      throw new Error(`actors[${index}].id: 期望非空字符串`)
    if (actor.face === undefined) {
      const candidate = palFaceAssetId(actor.id)
      if (catalog.assets[candidate]?.kind === 'face') actor.face = candidate
    }
    return actor
  })
}

/**
 * contentVersion 3 四个旧静态图像 family 的本地一次性闭包。所有源、catalog、内容与脚本先读完
 * 并校验，写入顺序以 manifest 为最后发布点；HTTP 工程必须先完整克隆，不能半另存。
 */
export async function upgradeLocalProjectV3StaticImages(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
  options: UpgradeLocalV2Options = {},
): Promise<boolean> {
  const manifest = asObject(rawManifest, 'manifest')
  if (manifest.contentVersion !== 3) return false
  const families = staticFamilies(manifest)
  if (!families.length) return false
  const assets = asObject(manifest.assets, 'manifest.assets')
  const legacy = asObject(assets.legacy, 'manifest.assets.legacy')
  const content = asObject(manifest.content, 'manifest.content')
  const catalogPath = validateProjectRelativePath(
    assets.catalog as string,
    'manifest.assets.catalog',
  )
  const catalog = structuredClone(
    validateAssetCatalog(await source.readJson<unknown>(catalogPath), catalogPath),
  )
  const files: Record<string, unknown> = {}
  const validate = options.validateStaticImage ?? validateStaticPng
  const sources: ImageSource[] = []
  if (families.includes('portrait'))
    sources.push(
      ...(await numericSources(
        dir,
        cleanDirectoryPath(legacy.portraits, 'manifest.assets.legacy.portraits'),
        'portrait',
      )),
    )
  if (families.includes('face'))
    sources.push(
      ...(await faceSources(dir, cleanDirectoryPath(legacy.faces, 'manifest.assets.legacy.faces'))),
    )
  if (families.includes('item-icon'))
    sources.push(
      ...(await numericSources(
        dir,
        cleanDirectoryPath(legacy.itemIcons, 'manifest.assets.legacy.itemIcons'),
        'item-icon',
      )),
    )

  let battleFields: unknown
  if (typeof content.battleFields === 'string') {
    battleFields = upgradeLegacyPalBattleFields(
      await source.readJson<unknown>(content.battleFields),
    )
    files[content.battleFields] = battleFields
    if (families.includes('battle-background')) {
      const root = battleImagesRoot(legacy.root)
      for (const raw of battleFields as Array<Record<string, unknown>>) {
        const id = Number(raw.id)
        if (id < 6 || id > 57) continue
        const padded = String(id).padStart(3, '0')
        sources.push({
          id: palBattleBackgroundAssetId(id),
          kind: 'battle-background',
          sourcePath: `${root}/${padded}.png`,
          targetPath: `assets/migrated/battle-backgrounds/${padded}.png`,
          label: `PAL 战场背景 ${padded}`,
          originRef: `${root}/${padded}.png`,
        })
      }
    }
  }

  for (const image of sources) await materializeSource(source, image, catalog, files, validate)

  let actors: unknown
  if (typeof content.actors === 'string') {
    actors = upgradeLegacyActorImages(await source.readJson<unknown>(content.actors))
    actors = addActorFaces(actors, catalog)
    files[content.actors] = actors
  }
  let items: unknown
  if (typeof content.items === 'string') {
    items = upgradeLegacyItemImages(await source.readJson<unknown>(content.items))
    files[content.items] = items
  }
  let enemies: unknown
  if (typeof content.enemies === 'string') {
    enemies = upgradeLegacyStaticImageCommands(await source.readJson<unknown>(content.enemies))
    files[content.enemies] = enemies
  }

  const sceneDir =
    typeof content.scenes === 'string' ? content.scenes.replace(/\/?$/, '/') : 'content/scenes/'
  const sceneIds = await source.readJson<string[]>(`${sceneDir}index.json`)
  const scenes: unknown[] = []
  for (const id of sceneIds) {
    const path = `${sceneDir}${id}.json`
    const scene = upgradeLegacyStaticImageCommands(await source.readJson<unknown>(path))
    scenes.push(scene)
    files[path] = scene
  }

  const scriptChunks: Record<string, ScriptChunkV1> = {}
  if (typeof content.scripts === 'string') {
    const scriptDir = content.scripts.replace(/\/?$/, '/')
    const index = await source.readJson<ScriptIndexV1>(`${scriptDir}index.json`)
    for (const [id, meta] of Object.entries(index.chunks))
      scriptChunks[id] = upgradeLegacyStaticImageCommands(
        await source.readJson<unknown>(`${scriptDir}${meta.path}`),
      ) as ScriptChunkV1
    const normalized = normalizeScriptLibrary(index, scriptChunks)
    files[`${scriptDir}index.json`] = normalized.index
    for (const [id, chunk] of Object.entries(normalized.chunks)) {
      const meta = normalized.index.chunks[id]
      if (!meta) throw new Error(`脚本分片 ${id} 缺失重算元数据`)
      files[`${scriptDir}${meta.path}`] = chunk
      scriptChunks[id] = chunk
    }
  }

  const references = collectAssetReferences({
    ...(actors ? { actors: actors as never } : {}),
    ...(items ? { items: items as never } : {}),
    ...(enemies ? { enemies: enemies as never } : {}),
    ...(battleFields ? { battleFields: battleFields as never } : {}),
    scenes: scenes as never,
    scriptChunks,
  })
  for (const reference of references) {
    if (!STATIC_FAMILIES.includes(reference.expectedKind as StaticFamily)) continue
    const record = catalog.assets[reference.asset]
    if (!record)
      throw new Error(
        `${reference.site}: AssetId "${reference.asset}" 缺文件/记录，无法完成静态图像升级`,
      )
    if (record.kind !== reference.expectedKind)
      throw new Error(
        `${reference.site}: AssetId "${reference.asset}" 期望 ${reference.expectedKind}，实际 ${record.kind}`,
      )
  }

  const nextManifest = exitStaticFamilies(manifest, families)
  validateManifestAssetConfigV3(asObject(nextManifest.assets, 'manifest.assets'), catalog)
  files[catalogPath] = catalog
  files['manifest.json'] = nextManifest
  await writeProject(dir, files)
  return true
}
