import type {
  AmbienceDef,
  AuthorSceneDef,
  CurrentManifest,
  EnemyTeamDef,
  MigrationDiagnosticsV1,
  PoisonDef,
  ProjectMap,
  RuntimeSceneDef,
  ShopDef,
  TilesetDef,
} from '@type-pal/content'
import {
  collectAssetReferences,
  mapAssetById,
  palTilesetAssetId,
  resolveAuthorDialogueTree,
  validateActors,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateBattleFields,
  validateBattleSprites,
  validateAuthorDialogueReferences,
  validateAuthorEnemies,
  validateEnemyTeams,
  validateEquipBattleSpriteReferences,
  validateAuthorItems,
  validateLocale,
  validateManifestAssetConfig,
  validateMapIndex,
  validateMigrationDiagnostics,
  validateProjectMap,
  validateReferences,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateStartWorldResources,
  validateTilesets,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { TransactionPrecondition } from './migration-transaction.js'
import type { MigrationJson, PalMigrationSources } from './pal-migration.js'
import { auditAndConvertSourceMaps, type ProjectMapAuditReport } from './project-map-audit.js'
import { mapIdFromSourceNumber, tilesetIdFromSourceNumber } from './project-map-converter.js'

export interface PalCurrentPublication {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
  mapReport: ProjectMapAuditReport
}

export interface PalCurrentPublicationValidation {
  scenes: number
  maps: number
  assets: number
  managedFiles: number
  referenceWarnings: number
  assetWarnings: number
}

const FORBIDDEN_CURRENT_PATH = /^(?:_transitions\/|content\/migrations\/|content\/scripts\/)/
const PAL_CURRENT_KNOWN_REFERENCE_ERRORS = new Set([
  'scenes[23](s023).entities[10].behaviors.trigger.default.flow.machine.states.initial.next.cond.actorId\0角色 "37" 不在 actors',
  'scenes[202](s202).entities[10].behaviors.trigger.default.flow.stages[0].body[0].cond.actorId\0角色 "39" 不在 actors',
  'scenes[202](s202).entities[10].behaviors.trigger.default.flow.stages[1].body[0].cond.actorId\0角色 "39" 不在 actors',
  'scenes[213](s213).entities[26].behaviors.trigger.default.flow.stages[0].body[3].cond.actorId\0角色 "37" 不在 actors',
])

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function required(files: ReadonlyMap<string, MigrationJson>, path: string): unknown {
  if (!files.has(path)) throw new Error(`PAL current publication 缺文件 ${path}`)
  return files.get(path)
}

function requiredPath(path: string | undefined, label: string): string {
  if (!path) throw new Error(`PAL current manifest 缺 ${label} 路径`)
  return path
}

/**
 * 唯一发布模型：作者内容以 current baseline 为三方合并 base；可重建的 catalog、地图和瓦片集
 * 每次直接从 PAL 原始提取源生成，不保留任何中间发布链。
 */
export function buildPalCurrentPublication(
  baseline: MigrationSnapshot,
  sources: PalMigrationSources,
): PalCurrentPublication {
  const forbidden = [...baseline.managedFiles].filter((path) => FORBIDDEN_CURRENT_PATH.test(path))
  if (forbidden.length)
    throw new Error(`current baseline 含历史发布路径: ${forbidden.slice(0, 10).join(', ')}`)

  const files = new Map(baseline.files)
  const managedFiles = new Set(baseline.managedFiles)
  const converted = auditAndConvertSourceMaps(sources.tilemaps)
  const previousMapPaths = [...managedFiles].filter(
    (path) => /^content\/maps\/(?!index\.json$)[^/]+\.json$/.test(path),
  )
  for (const path of previousMapPaths) {
    managedFiles.delete(path)
    files.delete(path)
  }

  const mapIndex = {
    version: 1 as const,
    maps: sources.tilemaps.map(({ mapNum }) => ({
      id: mapIdFromSourceNumber(mapNum),
      name: `PAL 地图 ${mapNum}`,
      path: `content/maps/${mapIdFromSourceNumber(mapNum)}.json`,
    })),
  }
  const tilesets: TilesetDef[] = sources.tilemaps.map(({ mapNum, source }) => {
    const expectedPath = `tileset/${mapNum}.rle`
    if (source.tileset !== expectedPath)
      throw new Error(`map ${mapNum}: tileset 路径期望 ${expectedPath}，收到 ${source.tileset}`)
    return {
      id: tilesetIdFromSourceNumber(mapNum),
      name: `PAL 瓦片集 ${mapNum}`,
      category: 'builtin',
      asset: palTilesetAssetId(mapNum),
    }
  })
  const put = (path: string, value: unknown): void => {
    files.set(path, asJson(value))
    managedFiles.add(path)
  }
  put('assets/index.json', sources.assetCatalog)
  put('content/maps/index.json', mapIndex)
  put('content/tilesets.json', tilesets)
  for (const { mapNum } of sources.tilemaps) {
    const map = converted.maps.get(mapNum)
    if (!map) throw new Error(`地图转换结果缺 map ${mapNum}`)
    put(`content/maps/${mapIdFromSourceNumber(mapNum)}.json`, map)
  }
  return { files, managedFiles, mapReport: converted.report }
}

/** current content16 的内存发布门；在资源写入和事务 journal 创建之前执行。 */
export function validatePalCurrentPublication(args: {
  publication: PalCurrentPublication
  manifest: CurrentManifest
  sources: PalMigrationSources
}): PalCurrentPublicationValidation {
  const { files, managedFiles } = args.publication
  const { manifest } = args
  if (manifest.contentVersion !== 16 || manifest.minimumSaveVersion !== 8)
    throw new Error('PAL current publication 只接受 content16 / SAVE8')
  if ('migrations' in manifest || manifest.content.scripts !== undefined)
    throw new Error('PAL current manifest 禁止 migrations/content.scripts')
  const forbidden = [...managedFiles].filter((path) => FORBIDDEN_CURRENT_PATH.test(path))
  if (forbidden.length) throw new Error(`PAL current publication 含历史路径 ${forbidden.join(', ')}`)

  const catalog = validateAssetCatalog(required(files, manifest.assets.catalog))
  validateManifestAssetConfig(manifest.assets, catalog)
  validateStartWorldResources(manifest.startWorld)
  manifest.entryPoints?.forEach((entry, index) => {
    if (entry.startWorld) validateStartWorldResources(entry.startWorld, `entryPoints[${index}]`)
  })
  const actors = validateActors(
    required(files, requiredPath(manifest.content.actors, 'actors')),
  )
  const actorsById = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
  const skills = validateSkills(
    required(files, requiredPath(manifest.content.skills, 'skills')),
  )
  const authorItems = validateAuthorItems(
    required(files, requiredPath(manifest.content.items, 'items')),
  )
  const authorEnemies = validateAuthorEnemies(
    required(files, requiredPath(manifest.content.enemies, 'enemies')),
  )
  const locale = validateLocale(
    required(files, requiredPath(manifest.content.locale, 'locale')),
    { allowSoftWrap: true },
  )
  const sprites = validateSprites(
    required(files, requiredPath(manifest.content.sprites, 'sprites')),
    catalog,
  )
  const battleSprites = validateBattleSprites(
    required(files, requiredPath(manifest.content.battleSprites, 'battleSprites')),
    catalog,
  )
  const battleFields = validateBattleFields(
    required(files, requiredPath(manifest.content.battleFields, 'battleFields')),
  )
  const enemyTeams = validateEnemyTeams(
    required(files, requiredPath(manifest.content.enemyTeams, 'enemyTeams')),
    new Set(authorEnemies.map((enemy) => enemy.id)),
  )
  const tilesets = validateTilesets(
    required(files, requiredPath(manifest.content.tilesets, 'tilesets')),
    catalog,
  )
  const tilesetIds = new Set(tilesets.map((tileset) => tileset.id))
  const stamps = validateStampTemplates(
    required(files, requiredPath(manifest.content.stamps, 'stamps')),
  )
  for (const stamp of stamps)
    for (const tileset of stamp.tilesetRefs)
      if (!tilesetIds.has(tileset)) throw new Error(`组合 ${stamp.id} 引用未知瓦片集 ${tileset}`)
  const mapIndex = validateMapIndex(required(files, requiredPath(manifest.content.maps, 'maps')))
  if (mapIndex.maps.length !== args.sources.tilemaps.length)
    throw new Error(`PAL current 地图数量 ${mapIndex.maps.length} != 源 ${args.sources.tilemaps.length}`)
  for (const entry of mapIndex.maps) {
    const map = validateProjectMap(required(files, entry.path))
    for (const tileset of map.tilesetRefs)
      if (!tilesetIds.has(tileset)) throw new Error(`${entry.path} 引用未知瓦片集 ${tileset}`)
  }

  const sceneIds = required(files, 'content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('content/scenes/index.json: 期望 string[]')
  const authorScenes = validateAuthorScenes(
    (sceneIds as string[]).map((id) => required(files, `content/scenes/${id}.json`)),
  )
  authorScenes.forEach((scene, index) => {
    if (scene.id !== sceneIds[index]) throw new Error(`场景 index/id 不符 ${String(sceneIds[index])}`)
    if (!mapAssetById(mapIndex, scene.mapId)) throw new Error(`场景 ${scene.id} 引用未知地图 ${scene.mapId}`)
  })
  const sharedScripts = validateAuthorSharedScripts(
    required(files, requiredPath(manifest.content.sharedScripts, 'sharedScripts')),
  )
  validateAuthorDialogueReferences({
    scenes: authorScenes,
    items: authorItems,
    sharedScripts,
    enemies: authorEnemies,
    actors,
  })
  const scenes = resolveAuthorDialogueTree(authorScenes, actorsById, 'scenes') as RuntimeSceneDef[]
  const items = resolveAuthorDialogueTree(authorItems, actorsById, 'items')
  const enemies = resolveAuthorDialogueTree(authorEnemies, actorsById, 'enemies')
  const runtimeSharedScripts = resolveAuthorDialogueTree(sharedScripts, actorsById, 'sharedScripts')
  const equipIssues = validateEquipBattleSpriteReferences(items, actors, battleSprites)
  if (equipIssues.length) throw new Error(`${equipIssues[0]!.where}: ${equipIssues[0]!.message}`)
  const poisons = required(files, requiredPath(manifest.content.poisons, 'poisons')) as PoisonDef[]
  const shops = required(files, requiredPath(manifest.content.shops, 'shops')) as ShopDef[]
  const ambiences = required(
    files,
    requiredPath(manifest.content.ambiences, 'ambiences'),
  ) as AmbienceDef[]
  const migrationDiagnostics = validateMigrationDiagnostics(
    required(files, requiredPath(manifest.content.migrationDiagnostics, 'migrationDiagnostics')),
  ) as MigrationDiagnosticsV1
  validateWorldVariableRegistryV1(
    required(files, requiredPath(manifest.content.worldVariables, 'worldVariables')),
  )
  const referenceIssues = validateReferences({
    scenes: scenes as never,
    actors,
    skills: skills.skills,
    levelUp: skills.levelUp as never,
    items: items as never,
    locale,
    sprites,
    battleSprites,
    startWorld: manifest.startWorld,
    enemies: enemies as never,
    enemyTeams: enemyTeams as EnemyTeamDef[],
    battleFields,
    poisons,
    ambiences,
    shops,
    tilesets,
    stamps,
    mapIndex,
    sharedScripts: runtimeSharedScripts as never,
    migrationDiagnostics,
  })
  // 这四条是 current PAL 已公开在编辑器诊断栏的源内容缺口；ARCH 只保持行为，不在架构
  // 收口中伪造角色。精确钉住路径和消息，任何新增 reference error 仍会阻断发布。
  const referenceErrors = referenceIssues.filter(
    (issue) =>
      issue.severity === 'error' &&
      !PAL_CURRENT_KNOWN_REFERENCE_ERRORS.has(`${issue.where}\0${issue.message}`),
  )
  if (referenceErrors.length)
    throw new Error(
      `PAL current 跨引用失败:\n${referenceErrors.slice(0, 50).map((issue) => `${issue.where}: ${issue.message}`).join('\n')}`,
    )
  const assetIssues = validateAssetReferenceClosure(
    catalog,
    collectAssetReferences({
      assets: manifest.assets,
      entryPoints: manifest.entryPoints,
      scenes: scenes as never,
      sharedScripts: runtimeSharedScripts,
      actors,
      enemies: enemies as never,
      items: items as never,
      skills: skills.skills,
      battleFields,
      tilesets,
      sprites,
      battleSprites,
    }),
  )
  const assetErrors = assetIssues.filter((issue) => issue.severity === 'error')
  if (assetErrors.length)
    throw new Error(
      `PAL current 资源闭包失败:\n${assetErrors.slice(0, 50).map((issue) => `${issue.where}: ${issue.message}`).join('\n')}`,
    )
  return {
    scenes: authorScenes.length,
    maps: mapIndex.maps.length,
    assets: Object.keys(catalog.assets).length,
    managedFiles: managedFiles.size,
    referenceWarnings: referenceIssues.length,
    assetWarnings: assetIssues.length,
  }
}

/** manifest 是事务最后一项；每个 catalog 二进制必须先按目标 hash 物化。 */
export function palAssetPreconditions(
  publication: PalCurrentPublication,
): TransactionPrecondition[] {
  const catalog = validateAssetCatalog(required(publication.files, 'assets/index.json'))
  return Object.values(catalog.assets)
    .map((record) => ({ target: `projects/pal/${record.path}`, hash: record.sha256 }))
    .sort((left, right) => left.target.localeCompare(right.target))
}
