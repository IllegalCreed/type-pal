/**
 * W9 canonical content13 loader boundary.
 *
 * This module is deliberately separate from loader-v5.ts: the v12 loader must keep accepting only
 * the published v12 shape, while v13 scenes/scripts use the strict lifecycle vocabulary. The old
 * script-v4-v5 migration blob remains a historical registry entry and is still byte-verified here;
 * the W9 append-only seal is validated by the migration builder before this loader is invoked.
 */
import type {
  MapIndexV1,
  ManifestV13,
  ProjectMap,
  SceneDefV13,
  SharedScriptLibraryV13,
} from '@type-pal/content'
import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  checkSharedScriptLibraryV13,
  mapAssetById,
  validateActors,
  validateAssetCatalog,
  validateBattleFields,
  validateBattleSprites,
  validateEnemies,
  validateEnemyTeamsV12,
  validateEquipBattleSpriteReferences,
  validateItemsV5,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateMigrationDiagnostics,
  validateScenesV13,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateStartWorldResources,
  validateTilesets,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import { BattleSpriteAssetCache, loadProjectMap } from './assets.js'
import { type FileSource, httpSource, projectRelativeLegacyAdapter } from './file-source.js'
import type { ContentJsonsV5, LoadedProjectV5Core } from './loader-v5.js'
import { ProjectImageCache } from './project-image-cache.js'
import {
  loadProjectMigrationRegistryV5,
  type ValidatedProjectMigrationRegistryV1,
} from './save/migration.js'

export interface ContentJsonsV13 extends Omit<ContentJsonsV5, 'entryScene' | 'sharedScripts'> {
  entryScene: unknown
  sharedScripts?: unknown
}

export interface LoadedProjectV13Core
  extends Omit<LoadedProjectV5Core, 'manifest' | 'entryScene' | 'sharedScripts'> {
  manifest: ManifestV13
  entryScene: SceneDefV13
  sharedScripts: SharedScriptLibraryV13
}

export interface LoadedProjectV13 extends LoadedProjectV13Core {
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

function scenesDir(manifest: ManifestV13): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

function normalizeScene(
  manifest: ManifestV13,
  value: unknown,
  mapIndex: MapIndexV1,
): SceneDefV13 {
  const [scene] = validateScenesV13([value])
  if (!scene) throw new Error(`工程 "${manifest.id}": v13 场景为空`)
  if (!mapAssetById(mapIndex, scene.mapId))
    throw new Error(
      `场景 "${scene.id}": mapId "${scene.mapId}" 不在 ${manifest.content.maps ?? 'map index'}`,
    )
  return scene
}

function assertRegistryClosure(
  manifest: ManifestV13,
  registry: ValidatedProjectMigrationRegistryV1,
): void {
  const declared = Object.keys(manifest.migrations ?? {}).sort()
  const loaded = Object.keys(registry).sort()
  if (declared.length !== loaded.length || declared.some((id, index) => id !== loaded[index]))
    throw new Error('v13 migration registry 未完整验签')
}

/** 纯 v13 组装核；不做 IO，也不产生/修改迁移产物。 */
export function assembleProjectV13(
  manifest: ManifestV13,
  jsons: ContentJsonsV13,
  migrationRegistry: ValidatedProjectMigrationRegistryV1 = Object.freeze({}),
  legacyIo = projectRelativeLegacyAdapter({
    readText: async (path) => {
      throw new Error(`assembleProjectV13 纯核无 legacy IO: ${path}`)
    },
    readJson: async (path) => {
      throw new Error(`assembleProjectV13 纯核无 legacy IO: ${path}`)
    },
    readBytes: async (path) => {
      throw new Error(`assembleProjectV13 纯核无 legacy IO: ${path}`)
    },
    urlFor: async (path) => {
      throw new Error(`assembleProjectV13 纯核无 legacy IO: ${path}`)
    },
  }),
): LoadedProjectV13Core {
  if (manifest.contentVersion !== 13)
    throw new Error(`工程 "${manifest.id}": canonical v13 loader 只接受 contentVersion 13`)
  if (manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `工程 "${manifest.id}": contentVersion 13 期望 minimumSaveVersion ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  if (manifest.content.scripts !== undefined)
    throw new Error(`工程 "${manifest.id}": v13 禁止 legacy content.scripts`)
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
  const equipBattleSpriteIssue = validateEquipBattleSpriteReferences(items, actors, battleSprites)[0]
  if (equipBattleSpriteIssue)
    throw new Error(`${equipBattleSpriteIssue.where}: ${equipBattleSpriteIssue.message}`)
  const enemies = jsons.enemies === undefined ? [] : validateEnemies(jsons.enemies)
  const enemyTeams =
    jsons.enemyTeams === undefined
      ? []
      : validateEnemyTeamsV12(jsons.enemyTeams, new Set(enemies.map((enemy) => enemy.id)))
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
  checkSharedScriptLibraryV13(sharedScripts)
  const migrationDiagnostics =
    jsons.migrationDiagnostics === undefined
      ? { version: 1 as const, diagnostics: [] }
      : validateMigrationDiagnostics(jsons.migrationDiagnostics)
  if (entryScene.id !== manifest.entryScene)
    throw new Error(`工程 "${manifest.id}": 入口场景不符(期望 "${manifest.entryScene}",得 "${entryScene.id}")`)
  if (!ids.includes(manifest.entryScene))
    throw new Error(`工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`)

  const legacy = manifest.assets.legacy
  return {
    manifest,
    projectRoot: `projects/${manifest.id}`,
    sceneIds: ids,
    entryScene,
    mapIndex,
    actorsById: indexById(actors),
    skills: indexById(skills),
    levelUp: levelUp as LoadedProjectV13Core['levelUp'],
    items: indexById(items),
    locale,
    spritesById: indexById(sprites),
    battleSpritesById: indexById(battleSprites),
    enemiesById: indexById(enemies),
    enemyTeamsById: indexById(
      enemyTeams as Array<LoadedProjectV13Core['enemyTeamsById'][string]>,
    ),
    battleFields,
    poisonsById: poisonsById as LoadedProjectV13Core['poisonsById'],
    poisons: poisonList as LoadedProjectV13Core['poisons'],
    ambiences: ambiences as LoadedProjectV13Core['ambiences'],
    shops: shops as LoadedProjectV13Core['shops'],
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

export async function loadProjectV13From(source: FileSource): Promise<LoadedProjectV13> {
  const manifest = await source.readJson<ManifestV13>('manifest.json')
  if (manifest.contentVersion !== 13)
    throw new Error(`工程 "${manifest.id}": v13 loader 只接受 contentVersion 13`)
  if (manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `工程 "${manifest.id}": contentVersion 13 期望 minimumSaveVersion ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`,
    )
  validateManifestAssetConfigV3(manifest.assets)
  // 历史 script-v4-v5 blob 仍按原 registry 规则验签；W9 publish seal 不走这个 sidecar API。
  const migrationRegistry = await loadProjectMigrationRegistryV5({
    manifest,
    source,
  })
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
  const core = assembleProjectV13(
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

export async function loadProjectV13(projectId: string): Promise<LoadedProjectV13> {
  return loadProjectV13From(httpSource(`projects/${projectId}`))
}

export async function loadSceneDefV13(
  project: LoadedProjectV13,
  sceneId: string,
): Promise<SceneDefV13> {
  const value = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const scene = normalizeScene(project.manifest, value, project.mapIndex)
  if (scene.id !== sceneId)
    throw new Error(`loadSceneDefV13: 场景文件 id 不符(期望 "${sceneId}",得 "${scene.id}")`)
  return scene
}

export async function loadAllScenesV13(project: LoadedProjectV13): Promise<SceneDefV13[]> {
  const scenes: SceneDefV13[] = []
  for (const id of project.sceneIds) scenes.push(await loadSceneDefV13(project, id))
  return scenes
}

export async function loadStampTemplatesV13(project: LoadedProjectV13) {
  const path = project.manifest.content.stamps
  if (!path) return []
  return validateStampTemplates(await project.source.readJson<unknown>(path))
}

export async function loadAllProjectMapsV13(
  project: LoadedProjectV13,
): Promise<Record<string, ProjectMap>> {
  const maps: Record<string, ProjectMap> = {}
  await Promise.all(
    project.mapIndex.maps.map(async (asset) => {
      maps[asset.id] = await loadProjectMap(project.assetBase, asset.path)
    }),
  )
  return maps
}
