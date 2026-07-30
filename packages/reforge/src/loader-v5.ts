import type {
  CurrentManifest,
  ItemDataMapV5,
  ProjectMap,
  SceneDefV5,
  SharedScriptLibraryV5,
} from '@type-pal/content'
import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  checkSharedScriptLibraryV5,
  mapAssetById,
  validateActors,
  validateAssetCatalog,
  validateBattleFields,
  validateBattleSprites,
  validateEnemies,
  validateEquipBattleSpriteReferences,
  validateItemsV5,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateMigrationDiagnostics,
  validateScenesV5,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateStartWorldResources,
  validateTilesets,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import { BattleSpriteAssetCache, loadProjectMap } from './assets.js'
import { type FileSource, httpSource, projectRelativeLegacyAdapter } from './file-source.js'
import type { ContentJsons, LoadedProjectCore } from './loader.js'
import { ProjectImageCache } from './project-image-cache.js'
import {
  loadProjectMigrationRegistryV5,
  type ValidatedProjectMigrationRegistryV1,
} from './save/migration.js'

export interface ContentJsonsV5 extends Omit<ContentJsons, 'entryScene' | 'items' | 'scripts'> {
  entryScene: unknown
  items: unknown
  sharedScripts?: unknown
}

export interface LoadedProjectV5Core
  extends Omit<LoadedProjectCore, 'manifest' | 'entryScene' | 'items' | 'scriptIndex'> {
  manifest: CurrentManifest
  entryScene: SceneDefV5
  items: ItemDataMapV5
  sharedScripts: SharedScriptLibraryV5
  /** registry 指向的原始字节与已验证 sidecar；普通保存必须逐字节 copy-through。 */
  migrationRegistry: ValidatedProjectMigrationRegistryV1
}

export interface LoadedProjectV5 extends LoadedProjectV5Core {
  source: FileSource
  assetResolver: AssetResolver
  imageCache: ProjectImageCache
  battleSpriteCache: BattleSpriteAssetCache
}

function indexById<T extends { id: string }>(values: T[]): Record<string, T> {
  return Object.fromEntries(values.map((value) => [value.id, value]))
}

function sceneIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    throw new Error('scenes/index.json: 期望 string[]')
  return value as string[]
}

function scenesDir(manifest: CurrentManifest): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

function normalizeScene(
  manifest: CurrentManifest,
  value: unknown,
  mapIndex: LoadedProjectV5Core['mapIndex'],
): SceneDefV5 {
  const [scene] = validateScenesV5([value])
  if (!scene) throw new Error(`工程 "${manifest.id}": 场景为空`)
  if (!mapAssetById(mapIndex, scene.mapId))
    throw new Error(
      `场景 "${scene.id}": mapId "${scene.mapId}" 不在 ${manifest.content.maps ?? 'map index'}`,
    )
  return scene
}

function assertRegistryClosure(
  manifest: CurrentManifest,
  registry: ValidatedProjectMigrationRegistryV1,
): void {
  const declared = Object.keys(manifest.migrations ?? {}).sort()
  const loaded = Object.keys(registry).sort()
  if (declared.length !== loaded.length || declared.some((id, index) => id !== loaded[index]))
    throw new Error('v5 migration registry 未完整验签')
}

export function assembleProjectV5(
  manifest: CurrentManifest,
  jsons: ContentJsonsV5,
  migrationRegistry: ValidatedProjectMigrationRegistryV1 = Object.freeze({}),
  legacyIo = projectRelativeLegacyAdapter({
    readText: async (path) => {
      throw new Error(`assembleProjectV5 纯核无 legacy IO: ${path}`)
    },
    readJson: async (path) => {
      throw new Error(`assembleProjectV5 纯核无 legacy IO: ${path}`)
    },
    readBytes: async (path) => {
      throw new Error(`assembleProjectV5 纯核无 legacy IO: ${path}`)
    },
    urlFor: async (path) => {
      throw new Error(`assembleProjectV5 纯核无 legacy IO: ${path}`)
    },
  }),
): LoadedProjectV5Core {
  if (manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `工程 "${manifest.id}": canonical loader 只接受 contentVersion ${CONTENT_VERSION}`,
    )
  if (manifest.content.scripts !== undefined)
    throw new Error(`工程 "${manifest.id}": v5 禁止 legacy content.scripts`)
  if (!manifest.content.sharedScripts)
    throw new Error(`工程 "${manifest.id}": manifest 缺 canonical sharedScripts 路径`)
  assertRegistryClosure(manifest, migrationRegistry)
  const ids = sceneIds(jsons.sceneIds)
  validateStartWorldResources(manifest.startWorld)
  for (const [index, entry] of (manifest.entryPoints ?? []).entries()) {
    if (entry.startWorld)
      validateStartWorldResources(entry.startWorld, `entryPoints[${index}].startWorld`)
  }
  const assetCatalog = validateAssetCatalog(jsons.assetCatalog)
  validateManifestAssetConfigV3(manifest.assets, assetCatalog)
  if (!manifest.content.maps) throw new Error(`工程 "${manifest.id}": manifest 缺地图索引路径`)
  const mapIndex = validateMapIndex(jsons.maps)
  const entryScene = normalizeScene(manifest, jsons.entryScene, mapIndex)
  const actors = validateActors(jsons.actors)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItemsV5(jsons.items)
  const locale = validateLocale(jsons.locale, { allowLegacySoftWrap: true })
  const sprites = validateSprites(jsons.sprites, assetCatalog)
  const battleSprites = validateBattleSprites(jsons.battleSprites, assetCatalog)
  const equipBattleSpriteIssue = validateEquipBattleSpriteReferences(
    items,
    actors,
    battleSprites,
  )[0]
  if (equipBattleSpriteIssue)
    throw new Error(`${equipBattleSpriteIssue.where}: ${equipBattleSpriteIssue.message}`)
  const enemies = jsons.enemies === undefined ? [] : validateEnemies(jsons.enemies)
  const enemyTeams = Array.isArray(jsons.enemyTeams) ? jsons.enemyTeams : []
  const battleFields =
    jsons.battleFields === undefined ? [] : validateBattleFields(jsons.battleFields)
  if (!jsons.tilesets) throw new Error(`工程 "${manifest.id}": manifest 缺 tilesets 注册表`)
  const tilesets = validateTilesets(jsons.tilesets, assetCatalog)
  const poisonList = Array.isArray(jsons.poisons) ? jsons.poisons : []
  const poisonsById = Object.fromEntries(
    poisonList.map((poison: { id: number }) => [poison.id, poison]),
  )
  const ambiences = Array.isArray(jsons.ambiences) ? jsons.ambiences : []
  const shops = Array.isArray(jsons.shops) ? jsons.shops : []
  const sharedScripts = jsons.sharedScripts ?? {}
  checkSharedScriptLibraryV5(sharedScripts)
  const migrationDiagnostics =
    jsons.migrationDiagnostics === undefined
      ? { version: 1 as const, diagnostics: [] }
      : validateMigrationDiagnostics(jsons.migrationDiagnostics)
  if (entryScene.id !== manifest.entryScene)
    throw new Error(
      `工程 "${manifest.id}": 入口场景不符(期望 "${manifest.entryScene}",得 "${entryScene.id}")`,
    )
  if (!ids.includes(manifest.entryScene))
    throw new Error(
      `工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`,
    )

  const legacy = manifest.assets.legacy
  return {
    manifest,
    projectRoot: `projects/${manifest.id}`,
    sceneIds: ids,
    entryScene,
    mapIndex,
    actorsById: indexById(actors),
    skills: indexById(skills),
    levelUp: levelUp as LoadedProjectV5Core['levelUp'],
    items: indexById(items),
    locale,
    spritesById: indexById(sprites),
    battleSpritesById: indexById(battleSprites),
    enemiesById: indexById(enemies),
    enemyTeamsById: indexById(enemyTeams as Array<LoadedProjectV5Core['enemyTeamsById'][string]>),
    battleFields,
    poisonsById: poisonsById as LoadedProjectV5Core['poisonsById'],
    poisons: poisonList as LoadedProjectV5Core['poisons'],
    ambiences: ambiences as LoadedProjectV5Core['ambiences'],
    shops: shops as LoadedProjectV5Core['shops'],
    tilesets,
    sharedScripts,
    migrationRegistry,
    migrationDiagnostics,
    assetCatalog,
    assetBase: {
      root: legacy?.root ?? 'assets',
      palettes: legacy?.palettes ?? 'palettes',
      io: legacyIo,
    },
  }
}

export async function loadProjectV5From(source: FileSource): Promise<LoadedProjectV5> {
  const manifest = await source.readJson<CurrentManifest>('manifest.json')
  if (manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `工程 "${manifest.id}": canonical loader 只接受 contentVersion ${CONTENT_VERSION}`,
    )
  if (manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `工程 "${manifest.id}": contentVersion ${CONTENT_VERSION} 期望 minimumSaveVersion ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  validateManifestAssetConfigV3(manifest.assets)
  const migrationRegistry = await loadProjectMigrationRegistryV5({ manifest, source })
  const content = manifest.content
  if (!content.sprites) throw new Error(`工程 "${manifest.id}": manifest 缺 sprites 注册表`)
  if (!content.battleSprites)
    throw new Error(`工程 "${manifest.id}": manifest 缺 battleSprites 注册表`)
  const dir = scenesDir(manifest)
  const [
    actors,
    ids,
    entryScene,
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
  ] = await Promise.all([
    source.readJson(content.actors as string),
    source.readJson(`${dir}index.json`),
    source.readJson(`${dir}${manifest.entryScene}.json`),
    source.readJson(content.skills as string),
    source.readJson(content.items as string),
    source.readJson(content.locale as string),
    source.readJson(content.sprites),
    source.readJson(content.battleSprites),
    content.enemies ? source.readJson(content.enemies) : Promise.resolve(undefined),
    content.enemyTeams ? source.readJson(content.enemyTeams) : Promise.resolve(undefined),
    content.battleFields ? source.readJson(content.battleFields) : Promise.resolve(undefined),
    content.poisons ? source.readJson(content.poisons) : Promise.resolve(undefined),
    content.ambiences ? source.readJson(content.ambiences) : Promise.resolve(undefined),
    content.shops ? source.readJson(content.shops) : Promise.resolve(undefined),
    content.tilesets ? source.readJson(content.tilesets) : Promise.resolve(undefined),
    content.maps ? source.readJson(content.maps) : Promise.resolve(undefined),
    content.sharedScripts ? source.readJson(content.sharedScripts) : Promise.resolve(undefined),
    content.migrationDiagnostics
      ? source.readJson(content.migrationDiagnostics)
      : Promise.resolve(undefined),
    source.readJson(manifest.assets.catalog),
  ])
  const core = assembleProjectV5(
    manifest,
    {
      actors,
      sceneIds: ids,
      entryScene,
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
    },
    migrationRegistry,
    source.legacy ?? projectRelativeLegacyAdapter(source),
  )
  const assetResolver = new AssetResolver(
    manifest.id,
    core.assetCatalog,
    manifest.assets.roles,
    source,
  )
  return {
    ...core,
    assetBase: { ...core.assetBase, assetResolver },
    source,
    assetResolver,
    imageCache: new ProjectImageCache(assetResolver),
    battleSpriteCache: new BattleSpriteAssetCache(),
  }
}

export async function loadProjectV5(projectId: string): Promise<LoadedProjectV5> {
  return loadProjectV5From(httpSource(`projects/${projectId}`))
}

export async function loadSceneDefV5(
  project: LoadedProjectV5,
  sceneId: string,
): Promise<SceneDefV5> {
  const value = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const scene = normalizeScene(project.manifest, value, project.mapIndex)
  if (scene.id !== sceneId)
    throw new Error(`loadSceneDefV5: 场景文件 id 不符(期望 "${sceneId}",得 "${scene.id}")`)
  return scene
}

export async function loadAllScenesV5(project: LoadedProjectV5): Promise<SceneDefV5[]> {
  const scenes: SceneDefV5[] = []
  for (const id of project.sceneIds) scenes.push(await loadSceneDefV5(project, id))
  return scenes
}

export async function loadStampTemplatesV5(project: LoadedProjectV5) {
  const path = project.manifest.content.stamps
  if (!path) return []
  return validateStampTemplates(await project.source.readJson<unknown>(path))
}

export async function loadAllProjectMapsV5(
  project: LoadedProjectV5,
): Promise<Record<string, ProjectMap>> {
  const maps: Record<string, ProjectMap> = {}
  await Promise.all(
    project.mapIndex.maps.map(async (asset) => {
      maps[asset.id] = await loadProjectMap(project.assetBase, asset.path)
    }),
  )
  return maps
}
