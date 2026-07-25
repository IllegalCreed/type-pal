import {
  checkSharedScriptLibraryV5,
  formatProjectMap,
  formatStampTemplates,
  type ProjectManifest,
  type ProjectMap,
  type SceneDefV5,
  type StampTemplateV1,
  validateAssetCatalog,
  validateItemsV5,
  validateMapIndex,
  validateScenesV5,
} from '@type-pal/content'
import type { FileSource, LoadedProjectV5Core } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorStateV5 } from './script-v5-editor.js'

export interface EditorStateV5
  extends Omit<EditorState, 'manifest' | 'scenes' | 'items' | 'scriptIndex' | 'scriptChunks'>,
    ScriptEditorStateV5 {
  manifest: ProjectManifest<5>
  /** 已验签迁移原始字节；普通保存必须逐字节 copy-through。 */
  migrationRegistry: LoadedProjectV5Core['migrationRegistry']
}

function cloneMigrationRegistry(
  registry: LoadedProjectV5Core['migrationRegistry'],
): LoadedProjectV5Core['migrationRegistry'] {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(registry).map(([id, blob]) => [
        id,
        {
          ...blob,
          descriptor: Object.freeze(structuredClone(blob.descriptor)),
          bytes: Uint8Array.from(blob.bytes),
          sidecar: Object.freeze(structuredClone(blob.sidecar)),
        },
      ]),
    ),
  )
}

export function toEditorStateV5(
  project: LoadedProjectV5Core,
  scenes: SceneDefV5[],
  projectMaps: Record<string, ProjectMap> = {},
  stamps?: StampTemplateV1[],
): EditorStateV5 {
  if (project.manifest.content.stamps && stamps === undefined)
    throw new Error('toEditorStateV5: manifest.content.stamps 已登记但未加载图章模板表')
  const migrationRegistry = cloneMigrationRegistry(project.migrationRegistry)
  return {
    scenes: structuredClone(scenes),
    items: structuredClone(Object.values(project.items)),
    sharedScripts: structuredClone(project.sharedScripts),
    migrationRegistry,
    migrationSidecars: Object.values(migrationRegistry).map((blob) =>
      structuredClone(blob.sidecar),
    ),
    assetCatalog: structuredClone(project.assetCatalog),
    assetBlobs: {},
    maps: projectMaps,
    mapIndex: structuredClone(project.mapIndex),
    tilesets: structuredClone(project.tilesets ?? []),
    stamps: structuredClone(stamps ?? []),
    tilesetBlobs: {},
    migrationDiagnostics: structuredClone(project.migrationDiagnostics),
    actors: structuredClone(Object.values(project.actorsById)),
    skills: structuredClone(Object.values(project.skills)),
    sprites: structuredClone(Object.values(project.spritesById)),
    battleSprites: structuredClone(Object.values(project.battleSpritesById)),
    enemies: structuredClone(Object.values(project.enemiesById ?? {})),
    enemyTeams: structuredClone(Object.values(project.enemyTeamsById ?? {})),
    battleFields: structuredClone(project.battleFields ?? []),
    poisons: structuredClone(project.poisons ?? []),
    ambiences: structuredClone(project.ambiences ?? []),
    shops: structuredClone(project.shops ?? []),
    levelUp: structuredClone(project.levelUp),
    locale: structuredClone(project.locale),
    manifest: structuredClone(project.manifest),
    startWorld: structuredClone(project.manifest.startWorld),
  }
}

type ContentKeyV5 =
  | 'actors'
  | 'tilesets'
  | 'stamps'
  | 'skills'
  | 'items'
  | 'locale'
  | 'sprites'
  | 'battleSprites'
  | 'enemies'
  | 'enemyTeams'
  | 'battleFields'
  | 'poisons'
  | 'ambiences'
  | 'shops'
  | 'migrationDiagnostics'
  | 'sharedScripts'

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function bytesBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

function validateEditorStateV5(state: EditorStateV5): void {
  if (state.manifest.contentVersion !== 5)
    throw new Error('serializeProjectV5: manifest 必须是 contentVersion 5')
  if (state.manifest.content.scripts !== undefined)
    throw new Error('serializeProjectV5: 禁止 legacy content.scripts')
  if (!state.manifest.content.sharedScripts)
    throw new Error('serializeProjectV5: manifest 缺 canonical sharedScripts 路径')
  const scenes = validateScenesV5(state.scenes)
  validateItemsV5(state.items)
  checkSharedScriptLibraryV5(state.sharedScripts)
  const ids = new Set(scenes.map((scene) => scene.id))
  if (!ids.has(state.manifest.entryScene))
    throw new Error(`serializeProjectV5: 入口场景 "${state.manifest.entryScene}" 不在场景表`)
  const mapIds = new Set(state.mapIndex.maps.map((map) => map.id))
  for (const scene of scenes)
    if (!mapIds.has(scene.mapId))
      throw new Error(
        `serializeProjectV5: 场景 "${scene.id}" 的 mapId "${scene.mapId}" 不在 map index`,
      )
}

export function serializeProjectV5(
  state: EditorStateV5,
  opts?: { mapCopies?: Readonly<Record<string, string>> },
): Record<string, unknown> {
  validateEditorStateV5(state)
  const files: Record<string, unknown> = {}
  const fileOwners = new Map<string, string>()
  const addFile = (path: string, value: unknown, owner: string): void => {
    const previous = fileOwners.get(path)
    if (previous)
      throw new Error(`serializeProjectV5: 输出路径冲突 "${path}"（${previous} / ${owner}）`)
    fileOwners.set(path, owner)
    files[path] = value
  }
  const content = state.manifest.content
  if (!content.stamps && state.stamps.length > 0)
    throw new Error('serializeProjectV5: 工程有图章模板但 manifest.content.stamps 未登记')

  const sceneDir = (content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  addFile(
    `${sceneDir}index.json`,
    state.scenes.map((scene) => scene.id),
    '场景索引',
  )
  for (const scene of state.scenes)
    addFile(`${sceneDir}${scene.id}.json`, scene, `场景 ${scene.id}`)

  const mapIndex = validateMapIndex(state.mapIndex)
  const mapIndexPath = content.maps
  if (!mapIndexPath) throw new Error('serializeProjectV5: 工程缺 manifest.content.maps')
  addFile(mapIndexPath, mapIndex, '地图索引')
  const indexedMapIds = new Set<string>()
  for (const asset of mapIndex.maps) {
    if (asset.path === mapIndexPath)
      throw new Error(`serializeProjectV5: 地图资产 "${asset.id}" 覆盖 map index`)
    indexedMapIds.add(asset.id)
    const map = state.maps[asset.id]
    if (map) addFile(asset.path, formatProjectMap(map), `地图 ${asset.id}`)
    else {
      const copy = opts?.mapCopies?.[asset.path]
      if (copy !== undefined) addFile(asset.path, copy, `地图 ${asset.id} copy-through`)
    }
  }
  const orphanMapIds = Object.keys(state.maps).filter((id) => !indexedMapIds.has(id))
  if (orphanMapIds.length)
    throw new Error(`serializeProjectV5: maps 存在未登记资产: ${orphanMapIds.join(', ')}`)

  for (const [path, buffer] of Object.entries(state.tilesetBlobs))
    addFile(path, buffer, `瓦片集上传 ${path}`)

  const byKey: Record<ContentKeyV5, unknown> = {
    actors: state.actors,
    skills: { skills: state.skills, levelUp: state.levelUp },
    items: state.items,
    locale: state.locale,
    sprites: state.sprites,
    battleSprites: state.battleSprites,
    enemies: state.enemies ?? [],
    enemyTeams: state.enemyTeams ?? [],
    battleFields: state.battleFields ?? [],
    tilesets: state.tilesets ?? [],
    stamps: formatStampTemplates(state.stamps),
    poisons: state.poisons ?? [],
    ambiences: state.ambiences ?? [],
    shops: state.shops ?? [],
    migrationDiagnostics: {
      version: 1,
      diagnostics: (state.migrationDiagnostics?.diagnostics ?? []).filter((diagnostic) => {
        const item = state.items.find((candidate) => candidate.id === diagnostic.target.objectId)
        return !item?.[diagnostic.target.capability]
      }),
    },
    sharedScripts: state.sharedScripts,
  }
  for (const key of Object.keys(byKey) as ContentKeyV5[]) {
    const path = content[key]
    if (path !== undefined) addFile(path, byKey[key], `内容表 ${key}`)
  }

  for (const [path, bytes] of Object.entries(state.assetBlobs)) {
    if (!Object.values(state.assetCatalog.assets).some((record) => record.path === path))
      throw new Error(`serializeProjectV5: pending 资源未登记 catalog: ${path}`)
    addFile(path, bytes, `资源二进制 ${path}`)
  }
  addFile(state.manifest.assets.catalog, validateAssetCatalog(state.assetCatalog), '资源注册表')

  const declaredMigrations = Object.entries(state.manifest.migrations ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  )
  const registryIds = Object.keys(state.migrationRegistry).sort()
  if (
    declaredMigrations.length !== registryIds.length ||
    declaredMigrations.some(([id], index) => id !== registryIds[index])
  )
    throw new Error('serializeProjectV5: manifest migration registry 与已验签字节不闭合')
  const sidecars = [...state.migrationSidecars]
  for (const [index, [id, descriptor]] of declaredMigrations.entries()) {
    const blob = state.migrationRegistry[id as keyof typeof state.migrationRegistry]
    if (!blob) throw new Error(`serializeProjectV5: migration blob 缺失 ${id}`)
    if (!sameJson(descriptor, blob.descriptor))
      throw new Error(`serializeProjectV5: manifest descriptor 已偏离验签值 ${id}`)
    if (!sameJson(sidecars[index], blob.sidecar))
      throw new Error(`serializeProjectV5: migration sidecar 只读投影已被修改 ${id}`)
    addFile(blob.descriptor.path, bytesBuffer(blob.bytes), `迁移兼容 sidecar ${id}`)
  }
  addFile('manifest.json', state.manifest, '工程清单')
  return files
}

export async function serializeProjectV5WithCopies(
  state: EditorStateV5,
  source: Pick<FileSource, 'readText' | 'readBytes'>,
  opts?: { includeAssetCopies?: boolean },
): Promise<Record<string, unknown>> {
  const mapCopies: Record<string, string> = {}
  await Promise.all(
    state.mapIndex.maps.map(async (asset) => {
      if (!state.maps[asset.id]) mapCopies[asset.path] = await source.readText(asset.path)
    }),
  )
  const files = serializeProjectV5(state, { mapCopies })
  if (!opts?.includeAssetCopies) return files
  for (const record of Object.values(state.assetCatalog.assets)) {
    if (files[record.path] instanceof ArrayBuffer) continue
    files[record.path] = await source.readBytes(record.path)
  }
  return Object.fromEntries([
    ...Object.entries(files).filter(([, value]) => value instanceof ArrayBuffer),
    ...Object.entries(files).filter(
      ([path, value]) =>
        !(value instanceof ArrayBuffer) &&
        path !== state.manifest.assets.catalog &&
        path !== 'manifest.json',
    ),
    [state.manifest.assets.catalog, files[state.manifest.assets.catalog]],
    ['manifest.json', files['manifest.json']],
  ])
}
