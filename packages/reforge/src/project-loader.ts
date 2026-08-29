import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  AuthorEnemyDef,
  AuthorItemCoreMap,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptLibrary,
  BattleFieldDef,
  BattleSpriteDef,
  CurrentManifest,
  EnemyDef,
  EnemyTeamDef,
  LevelUpSkill,
  Locale,
  MapIndexV1,
  MigrationDiagnosticsV1,
  PoisonDef,
  ProjectMap,
  RuntimeSceneDef,
  RuntimeScriptLibrary,
  ShopDef,
  SkillDataMap,
  SpriteDef,
  TilesetDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  mapAssetById,
  resolveAuthorDialogueTree,
  validateActorConditionCommandReferences,
  validateActorInitialMagicReferences,
  validateActors,
  validateAssetCatalog,
  validateAuthorDialogueReferences,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateBattleFields,
  validateBattleSprites,
  validateCurrentManifestStartup,
  validateEnemyTeams,
  validateEntryPointStartWorldReferences,
  validateEquipBattleSpriteReferences,
  validateLocale,
  validateManifestAssetConfig,
  validateMapIndex,
  validateMigrationDiagnostics,
  validatePoisons,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateTilesets,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import type { AssetBase } from './assets.js'
import { BattleSpriteAssetCache, loadProjectMap } from './assets.js'
import { type FileSource, httpSource } from './file-source.js'
import { ProjectImageCache } from './project-image-cache.js'

export interface CurrentContentJsons {
  actors: unknown
  sceneIds: unknown
  entryScenes: Record<string, unknown>
  skills: unknown
  items: unknown
  locale: unknown
  sprites: unknown
  battleSprites: unknown
  enemies?: unknown
  enemyTeams?: unknown
  battleFields?: unknown
  poisons?: unknown
  ambiences?: unknown
  shops?: unknown
  tilesets: unknown
  maps: unknown
  sharedScripts: unknown
  migrationDiagnostics?: unknown
  assetCatalog: unknown
  worldVariables: unknown
}

export interface CurrentAuthorContent {
  /** 所有真实入口所引用的作者场景，以 scene id 去重。 */
  entryScenes: Record<string, AuthorSceneDef>
  /** 从 manifest.defaultEntryId 派生的只读缓存；不得序列化为 manifest 顶层字段。 */
  entryScene: AuthorSceneDef
  items: AuthorItemData[]
  enemies: AuthorEnemyDef[]
  sharedScripts: AuthorScriptLibrary
}

export interface LoadedCurrentProjectCore {
  manifest: CurrentManifest
  projectRoot: string
  sceneIds: string[]
  /** 从 manifest.defaultEntryId 派生的运行时缓存；不得回写 manifest。 */
  entryScene: RuntimeSceneDef
  authorContent: CurrentAuthorContent
  mapIndex: MapIndexV1
  actorsById: Record<string, ActorDef>
  skills: SkillDataMap
  levelUp: Record<string, LevelUpSkill[]>
  items: AuthorItemCoreMap
  locale: Locale
  spritesById: Record<string, SpriteDef>
  battleSpritesById: Record<string, BattleSpriteDef>
  enemiesById: Record<string, EnemyDef>
  enemyTeamsById: Record<string, EnemyTeamDef>
  battleFields: BattleFieldDef[]
  poisonsById: Record<number, PoisonDef>
  poisons: PoisonDef[]
  ambiences: AmbienceDef[]
  shops: ShopDef[]
  tilesets: TilesetDef[]
  sharedScripts: RuntimeScriptLibrary
  migrationDiagnostics: MigrationDiagnosticsV1
  assetCatalog: AssetCatalogV1
  worldVariables: WorldVariableRegistryV1
}

export interface LoadedCurrentProject extends LoadedCurrentProjectCore {
  assetBase: AssetBase
  source: FileSource
  assetResolver: AssetResolver
  imageCache: ProjectImageCache
  battleSpriteCache: BattleSpriteAssetCache
}

function indexById<T extends { id: string }>(values: readonly T[]): Record<string, T> {
  return Object.fromEntries(values.map((value) => [value.id, value]))
}

function sceneIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)
  )
    throw new Error('scenes/index.json: 期望 string[]')
  const ids = value as string[]
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  if (duplicate) throw new Error(`scenes/index.json: 场景 id "${duplicate}" 重复`)
  return ids
}

function scenesDir(manifest: CurrentManifest): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

function validateAuthorScene(
  value: unknown,
  actors: readonly ActorDef[],
  poisons: readonly PoisonDef[],
  mapIndex: MapIndexV1,
  path: string,
): AuthorSceneDef {
  const [scene] = validateAuthorScenes([value])
  if (!scene) throw new Error(`${path}: 场景为空`)
  if (!mapAssetById(mapIndex, scene.mapId))
    throw new Error(`${path}: mapId "${scene.mapId}" 不在地图索引`)
  validateAuthorDialogueReferences({
    scenes: [scene],
    items: [],
    sharedScripts: {},
    enemies: [],
    actors,
  })
  const conditionIssue = validateActorConditionCommandReferences(scene, actors, poisons, path)[0]
  if (conditionIssue) throw new Error(`${conditionIssue.where}: ${conditionIssue.message}`)
  return scene
}

export function assembleCurrentProject(
  manifest: CurrentManifest,
  jsons: CurrentContentJsons,
): LoadedCurrentProjectCore {
  if (manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `工程 "${manifest.id}": current loader 只接受 contentVersion ${CONTENT_VERSION}`,
    )
  if (manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `工程 "${manifest.id}": contentVersion ${CONTENT_VERSION} 期望 minimumSaveVersion 8`,
    )
  if (manifest.content.scripts !== undefined)
    throw new Error(`工程 "${manifest.id}": 当前 manifest 禁止 content.scripts`)
  if (!manifest.content.sharedScripts)
    throw new Error(`工程 "${manifest.id}": manifest 缺 sharedScripts 路径`)
  if (!manifest.content.worldVariables)
    throw new Error(`工程 "${manifest.id}": manifest 缺 worldVariables 注册表路径`)
  if (!manifest.content.maps) throw new Error(`工程 "${manifest.id}": manifest 缺地图索引路径`)

  const ids = sceneIds(jsons.sceneIds)
  const { defaultEntry } = validateCurrentManifestStartup(manifest, ids)

  const assetCatalog = validateAssetCatalog(jsons.assetCatalog)
  validateManifestAssetConfig(manifest.assets, assetCatalog)
  const mapIndex = validateMapIndex(jsons.maps)
  const actors = validateActors(jsons.actors)
  const actorsById = indexById(actors)
  const poisonList = validatePoisons(jsons.poisons ?? [])
  const poisonsById = Object.fromEntries(poisonList.map((poison) => [poison.id, poison]))
  const authorItems = validateAuthorItems(jsons.items)
  const authorEnemies = jsons.enemies === undefined ? [] : validateAuthorEnemies(jsons.enemies)
  const authorSharedScripts = validateAuthorSharedScripts(jsons.sharedScripts)
  const authorEntryScenes: Record<string, AuthorSceneDef> = {}
  for (const entry of manifest.entryPoints) {
    if (authorEntryScenes[entry.scene]) continue
    if (!Object.hasOwn(jsons.entryScenes, entry.scene))
      throw new Error(`manifest.entryPoints[${entry.id}].scene: 缺场景文件 "${entry.scene}.json"`)
    const authorScene = validateAuthorScene(
      jsons.entryScenes[entry.scene],
      actors,
      poisonList,
      mapIndex,
      `manifest.entryPoints[${entry.id}].scene(${entry.scene})`,
    )
    if (authorScene.id !== entry.scene)
      throw new Error(
        `manifest.entryPoints[${entry.id}].scene: 场景文件 id 不符(期望 "${entry.scene}",得 "${authorScene.id}")`,
      )
    authorEntryScenes[entry.scene] = authorScene
  }
  validateAuthorDialogueReferences({
    scenes: Object.values(authorEntryScenes),
    items: authorItems,
    sharedScripts: authorSharedScripts,
    enemies: authorEnemies,
    actors,
  })
  for (const [value, where] of [
    [authorItems, 'items'],
    [authorEnemies, 'enemies'],
    [authorSharedScripts, 'sharedScripts'],
  ] as const) {
    const issue = validateActorConditionCommandReferences(value, actors, poisonList, where)[0]
    if (issue) throw new Error(`${issue.where}: ${issue.message}`)
  }

  const items = resolveAuthorDialogueTree(authorItems, actorsById, 'items')
  const enemies = resolveAuthorDialogueTree(authorEnemies, actorsById, 'enemies')
  const sharedScripts = resolveAuthorDialogueTree(authorSharedScripts, actorsById, 'sharedScripts')
  const { skills, levelUp } = validateSkills(jsons.skills)
  const startupIssue = validateEntryPointStartWorldReferences(
    manifest.entryPoints,
    actors,
    authorItems,
    poisonList,
  )[0]
  if (startupIssue) throw new Error(`${startupIssue.where}: ${startupIssue.message}`)
  const initialMagicIssue = validateActorInitialMagicReferences(actors, skills)[0]
  if (initialMagicIssue) throw new Error(`${initialMagicIssue.where}: ${initialMagicIssue.message}`)
  const authorEntryScene = authorEntryScenes[defaultEntry.scene]
  if (!authorEntryScene)
    throw new Error(
      `manifest.defaultEntryId: 默认入口 "${defaultEntry.id}" 的场景 "${defaultEntry.scene}" 未加载`,
    )
  const entryScene = resolveAuthorDialogueTree(
    authorEntryScene,
    actorsById,
    `entryPoints[${defaultEntry.id}].scene`,
  )
  const locale = validateLocale(jsons.locale, { allowSoftWrap: true })
  const sprites = validateSprites(jsons.sprites, assetCatalog)
  const battleSprites = validateBattleSprites(jsons.battleSprites, assetCatalog)
  const equipIssue = validateEquipBattleSpriteReferences(items, actors, battleSprites)[0]
  if (equipIssue) throw new Error(`${equipIssue.where}: ${equipIssue.message}`)
  const enemyTeams =
    jsons.enemyTeams === undefined
      ? []
      : validateEnemyTeams(jsons.enemyTeams, new Set(enemies.map((enemy) => enemy.id)))
  const battleFields =
    jsons.battleFields === undefined ? [] : validateBattleFields(jsons.battleFields)
  const tilesets = validateTilesets(jsons.tilesets, assetCatalog)
  const ambiences = Array.isArray(jsons.ambiences) ? (jsons.ambiences as AmbienceDef[]) : []
  const shops = Array.isArray(jsons.shops) ? (jsons.shops as ShopDef[]) : []
  const migrationDiagnostics =
    jsons.migrationDiagnostics === undefined
      ? { version: 1 as const, diagnostics: [] }
      : validateMigrationDiagnostics(jsons.migrationDiagnostics)
  const worldVariables = validateWorldVariableRegistryV1(jsons.worldVariables)

  return {
    manifest,
    projectRoot: `projects/${manifest.id}`,
    sceneIds: ids,
    entryScene,
    authorContent: {
      entryScenes: authorEntryScenes,
      entryScene: authorEntryScene,
      items: authorItems,
      enemies: authorEnemies,
      sharedScripts: authorSharedScripts,
    },
    mapIndex,
    actorsById,
    skills: indexById(skills),
    levelUp: levelUp as Record<string, LevelUpSkill[]>,
    items: indexById(items),
    locale,
    spritesById: indexById(sprites),
    battleSpritesById: indexById(battleSprites),
    enemiesById: indexById(enemies),
    enemyTeamsById: indexById(enemyTeams),
    battleFields,
    poisonsById,
    poisons: poisonList,
    ambiences,
    shops,
    tilesets,
    sharedScripts,
    migrationDiagnostics,
    assetCatalog,
    worldVariables,
  }
}

export async function loadCurrentProjectFrom(source: FileSource): Promise<LoadedCurrentProject> {
  const rawManifest = await source.readJson<unknown>('manifest.json')
  const { manifest } = validateCurrentManifestStartup(rawManifest)
  if (manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `工程 "${manifest.id}": current loader 只接受 contentVersion ${CONTENT_VERSION}`,
    )
  const content = manifest.content
  for (const key of [
    'actors',
    'skills',
    'items',
    'locale',
    'sprites',
    'battleSprites',
    'tilesets',
    'maps',
    'sharedScripts',
    'worldVariables',
  ] as const)
    if (!content[key]) throw new Error(`工程 "${manifest.id}": manifest 缺 ${key} 路径`)

  const actorsPath = content.actors!
  const skillsPath = content.skills!
  const itemsPath = content.items!
  const localePath = content.locale!
  const spritesPath = content.sprites!
  const battleSpritesPath = content.battleSprites!
  const tilesetsPath = content.tilesets!
  const mapsPath = content.maps!
  const sharedScriptsPath = content.sharedScripts!
  const worldVariablesPath = content.worldVariables!

  const dir = scenesDir(manifest)
  const rawSceneIds = await source.readJson<unknown>(`${dir}index.json`)
  const ids = sceneIds(rawSceneIds)
  validateCurrentManifestStartup(manifest, ids)

  const entryScenes = Object.fromEntries(
    await Promise.all(
      [...new Set(manifest.entryPoints.map((entry) => entry.scene))].map(async (sceneId) => {
        const owner = manifest.entryPoints.find((entry) => entry.scene === sceneId)!
        try {
          return [sceneId, await source.readJson(`${dir}${sceneId}.json`)] as const
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error)
          throw new Error(
            `manifest.entryPoints[${owner.id}].scene: 无法读取 "${sceneId}.json": ${detail}`,
          )
        }
      }),
    ),
  )
  const [
    actors,
    skills,
    items,
    locale,
    sprites,
    battleSprites,
    enemies,
    enemyTeams,
    battleFields,
    poisons,
    ambiences,
    shops,
    tilesets,
    maps,
    sharedScripts,
    migrationDiagnostics,
    assetCatalog,
    worldVariables,
  ] = await Promise.all([
    source.readJson(actorsPath),
    source.readJson(skillsPath),
    source.readJson(itemsPath),
    source.readJson(localePath),
    source.readJson(spritesPath),
    source.readJson(battleSpritesPath),
    content.enemies ? source.readJson(content.enemies) : Promise.resolve(undefined),
    content.enemyTeams ? source.readJson(content.enemyTeams) : Promise.resolve(undefined),
    content.battleFields ? source.readJson(content.battleFields) : Promise.resolve(undefined),
    content.poisons ? source.readJson(content.poisons) : Promise.resolve(undefined),
    content.ambiences ? source.readJson(content.ambiences) : Promise.resolve(undefined),
    content.shops ? source.readJson(content.shops) : Promise.resolve(undefined),
    source.readJson(tilesetsPath),
    source.readJson(mapsPath),
    source.readJson(sharedScriptsPath),
    content.migrationDiagnostics
      ? source.readJson(content.migrationDiagnostics)
      : Promise.resolve(undefined),
    source.readJson(manifest.assets.catalog),
    source.readJson(worldVariablesPath),
  ])
  const core = assembleCurrentProject(manifest, {
    actors,
    sceneIds: ids,
    entryScenes,
    skills,
    items,
    locale,
    sprites,
    battleSprites,
    enemies,
    enemyTeams,
    battleFields,
    poisons,
    ambiences,
    shops,
    tilesets,
    maps,
    sharedScripts,
    migrationDiagnostics,
    assetCatalog,
    worldVariables,
  })
  const assetResolver = new AssetResolver(
    manifest.id,
    core.assetCatalog,
    manifest.assets.roles,
    source,
  )
  return {
    ...core,
    assetBase: { source, assetResolver },
    source,
    assetResolver,
    imageCache: new ProjectImageCache(assetResolver),
    battleSpriteCache: new BattleSpriteAssetCache(),
  }
}

export function loadCurrentProject(projectId: string): Promise<LoadedCurrentProject> {
  return loadCurrentProjectFrom(httpSource(`projects/${projectId}`))
}

export async function loadAuthorScene(
  project: LoadedCurrentProject,
  sceneId: string,
): Promise<AuthorSceneDef> {
  const raw = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const scene = validateAuthorScene(
    raw,
    Object.values(project.actorsById),
    project.poisons,
    project.mapIndex,
    `scene ${sceneId}`,
  )
  if (scene.id !== sceneId)
    throw new Error(`loadAuthorScene: 场景文件 id 不符(期望 "${sceneId}",得 "${scene.id}")`)
  return scene
}

export async function loadScene(
  project: LoadedCurrentProject,
  sceneId: string,
): Promise<RuntimeSceneDef> {
  return resolveAuthorDialogueTree(
    await loadAuthorScene(project, sceneId),
    project.actorsById,
    `scene ${sceneId}`,
  )
}

export async function loadAllAuthorScenes(
  project: LoadedCurrentProject,
): Promise<AuthorSceneDef[]> {
  const scenes: AuthorSceneDef[] = []
  for (const id of project.sceneIds) scenes.push(await loadAuthorScene(project, id))
  return scenes
}

export async function loadAllScenes(project: LoadedCurrentProject): Promise<RuntimeSceneDef[]> {
  const scenes: RuntimeSceneDef[] = []
  for (const id of project.sceneIds) scenes.push(await loadScene(project, id))
  return scenes
}

export async function loadStampTemplates(project: LoadedCurrentProject) {
  const path = project.manifest.content.stamps
  return path ? validateStampTemplates(await project.source.readJson<unknown>(path)) : []
}

export async function loadAllProjectMaps(
  project: LoadedCurrentProject,
): Promise<Record<string, ProjectMap>> {
  const maps: Record<string, ProjectMap> = {}
  await Promise.all(
    project.mapIndex.maps.map(async (asset) => {
      maps[asset.id] = await loadProjectMap(project.assetBase, asset.path)
    }),
  )
  return maps
}

export async function loadProjectMapById(
  project: Pick<LoadedCurrentProject, 'mapIndex' | 'assetBase'>,
  mapId: string,
): Promise<ProjectMap> {
  const asset = project.mapIndex.maps.find((entry) => entry.id === mapId)
  if (!asset) throw new Error(`loadProjectMapById: mapId "${mapId}" 不在 map index`)
  return loadProjectMap(project.assetBase, asset.path)
}
