/** C1-2 canonical content14 loader: author identity is retained, runtime receives one resolved v13 view. */
import type {
  EnemyDefV14,
  ItemDataV14,
  ManifestV14,
  ProjectMap,
  SceneDefV13,
  SceneDefV14,
  SharedScriptLibraryV14,
} from '@type-pal/content'
import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  resolveDialogueTreeV14ToV13,
  validateActors,
  validateDialogueIdentityReferencesV14,
  validateEnemiesV14,
  validateItemsV14,
  validateScenesV14,
  validateSharedScriptsV14,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import { BattleSpriteAssetCache } from './assets.js'
import { type FileSource, httpSource, projectRelativeLegacyAdapter } from './file-source.js'
import {
  assembleProjectV13,
  type ContentJsonsV13,
  type LoadedProjectV13,
  type LoadedProjectV13Core,
  loadAllProjectMapsV13,
  loadStampTemplatesV13,
} from './loader-v13.js'
import { ProjectImageCache } from './project-image-cache.js'
import {
  loadProjectMigrationRegistryV5,
  type ValidatedProjectMigrationRegistryV1,
} from './save/migration.js'

export interface ContentJsonsV14
  extends Omit<ContentJsonsV13, 'entryScene' | 'items' | 'enemies' | 'sharedScripts'> {
  entryScene: unknown
  items: unknown
  enemies?: unknown
  sharedScripts?: unknown
}

export interface LoadedProjectAuthorContentV14 {
  entryScene: SceneDefV14
  items: ItemDataV14[]
  enemies: EnemyDefV14[]
  sharedScripts: SharedScriptLibraryV14
}

/**
 * Runtime-facing fields are the resolved historical v13 view; authorContent is the lossless v14
 * source used by editor/save. This prevents identity schema from leaking into historical runners.
 */
export interface LoadedProjectV14Core
  extends Omit<LoadedProjectV13Core, 'manifest'> {
  manifest: ManifestV14
  authorContent: LoadedProjectAuthorContentV14
}

export interface LoadedProjectV14 extends LoadedProjectV14Core {
  source: FileSource
  assetResolver: AssetResolver
  imageCache: ProjectImageCache
  battleSpriteCache: BattleSpriteAssetCache
}

function sceneIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    throw new Error('scenes/index.json: 期望 string[]')
  return value as string[]
}

function scenesDir(manifest: ManifestV14): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

function validateAuthorScene(
  value: unknown,
  actors: readonly import('@type-pal/content').ActorDef[],
  path: string,
): SceneDefV14 {
  const [scene] = validateScenesV14([value])
  if (!scene) throw new Error(`${path}: v14 场景为空`)
  validateDialogueIdentityReferencesV14({
    scenes: [scene],
    items: [],
    sharedScripts: {},
    enemies: [],
    actors,
  })
  return scene
}

export function assembleProjectV14(
  manifest: ManifestV14,
  jsons: ContentJsonsV14,
  migrationRegistry: ValidatedProjectMigrationRegistryV1 = Object.freeze({}),
  legacyIo = projectRelativeLegacyAdapter({
    readText: async (path) => {
      throw new Error(`assembleProjectV14 纯核无 legacy IO: ${path}`)
    },
    readJson: async (path) => {
      throw new Error(`assembleProjectV14 纯核无 legacy IO: ${path}`)
    },
    readBytes: async (path) => {
      throw new Error(`assembleProjectV14 纯核无 legacy IO: ${path}`)
    },
    urlFor: async (path) => {
      throw new Error(`assembleProjectV14 纯核无 legacy IO: ${path}`)
    },
  }),
): LoadedProjectV14Core {
  if (manifest.contentVersion !== 14)
    throw new Error(`工程 "${manifest.id}": canonical v14 loader 只接受 contentVersion 14`)
  if (manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `工程 "${manifest.id}": contentVersion 14 期望 minimumSaveVersion ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  const actors = validateActors(jsons.actors)
  const actorsById = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
  const authorEntryScene = validateAuthorScene(jsons.entryScene, actors, 'entryScene')
  const authorItems = validateItemsV14(jsons.items)
  const authorEnemies = jsons.enemies === undefined ? [] : validateEnemiesV14(jsons.enemies)
  const authorSharedScripts = validateSharedScriptsV14(jsons.sharedScripts ?? {})
  validateDialogueIdentityReferencesV14({
    scenes: [authorEntryScene],
    items: authorItems,
    sharedScripts: authorSharedScripts,
    enemies: authorEnemies,
    actors,
  })

  const compatManifest = { ...manifest, contentVersion: 13 as const }
  const core = assembleProjectV13(
    compatManifest,
    {
      ...jsons,
      entryScene: resolveDialogueTreeV14ToV13(authorEntryScene, actorsById, 'entryScene'),
      items: resolveDialogueTreeV14ToV13(authorItems, actorsById, 'items'),
      enemies: resolveDialogueTreeV14ToV13(authorEnemies, actorsById, 'enemies'),
      sharedScripts: resolveDialogueTreeV14ToV13(
        authorSharedScripts,
        actorsById,
        'sharedScripts',
      ),
    },
    migrationRegistry,
    legacyIo,
  )
  return {
    ...core,
    manifest,
    authorContent: {
      entryScene: authorEntryScene,
      items: authorItems,
      enemies: authorEnemies,
      sharedScripts: authorSharedScripts,
    },
  }
}

export async function loadProjectV14From(source: FileSource): Promise<LoadedProjectV14> {
  const manifest = await source.readJson<ManifestV14>('manifest.json')
  if (manifest.contentVersion !== 14)
    throw new Error(`工程 "${manifest.id}": v14 loader 只接受 contentVersion 14`)
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
  sceneIds(ids)
  const core = assembleProjectV14(
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

export function loadProjectV14(projectId: string): Promise<LoadedProjectV14> {
  return loadProjectV14From(httpSource(`projects/${projectId}`))
}

export async function loadAuthorSceneDefV14(
  project: LoadedProjectV14,
  sceneId: string,
): Promise<SceneDefV14> {
  const raw = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const actors = Object.values(project.actorsById)
  const scene = validateAuthorScene(raw, actors, `scene ${sceneId}`)
  if (scene.id !== sceneId)
    throw new Error(`loadAuthorSceneDefV14: 场景文件 id 不符(期望 "${sceneId}",得 "${scene.id}")`)
  return scene
}

export async function loadSceneDefV14(
  project: LoadedProjectV14,
  sceneId: string,
): Promise<SceneDefV13> {
  const scene = await loadAuthorSceneDefV14(project, sceneId)
  return resolveDialogueTreeV14ToV13(scene, project.actorsById, `scene ${sceneId}`)
}

export async function loadAllAuthorScenesV14(project: LoadedProjectV14): Promise<SceneDefV14[]> {
  const scenes: SceneDefV14[] = []
  for (const id of project.sceneIds) scenes.push(await loadAuthorSceneDefV14(project, id))
  return scenes
}

export async function loadAllScenesV14(project: LoadedProjectV14): Promise<SceneDefV13[]> {
  const scenes: SceneDefV13[] = []
  for (const id of project.sceneIds) scenes.push(await loadSceneDefV14(project, id))
  return scenes
}

export function loadStampTemplatesV14(project: LoadedProjectV14) {
  return loadStampTemplatesV13(project as unknown as LoadedProjectV13)
}

export function loadAllProjectMapsV14(project: LoadedProjectV14): Promise<Record<string, ProjectMap>> {
  return loadAllProjectMapsV13(project as unknown as LoadedProjectV13)
}
