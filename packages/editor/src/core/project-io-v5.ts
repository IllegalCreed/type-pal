import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  checkSharedScriptLibraryV5,
  type EntityDefV5,
  formatProjectMap,
  formatStampTemplates,
  type ItemData,
  type ItemDataV5,
  type ProjectMap,
  type SceneDefV5,
  type StampTemplateV1,
  validateActors,
  validateAssetCatalog,
  validateEquipBattleSpriteReferences,
  validateItemsV5,
  validateMapIndex,
  validateScenesV5,
} from '@type-pal/content'
import { type FileSource, isV5RuntimeScriptRef, type LoadedProjectV5Core } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'
import { collectCanonicalItemReferencesV5 } from './item-references.js'
import { collectScriptV5ReferenceIssues, type ScriptEditorStateV5 } from './script-v5-editor.js'

export interface EditorStateV5
  extends Omit<EditorState, 'manifest' | 'scenes' | 'items' | 'scriptIndex' | 'scriptChunks'>,
    ScriptEditorStateV5 {
  manifest: CurrentManifest
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

function mergeEntityShellV5(
  sceneId: string,
  shell: EditorState['scenes'][number]['entities'][number],
  canonical: EntityDefV5 | undefined,
): EntityDefV5 {
  const { pages: legacyPages, hostile: shellHostile, ...shellBase } = structuredClone(shell)
  const pages = canonical?.pages ? structuredClone(canonical.pages) : undefined
  const initialPage = pages?.find((page) => page.id === canonical?.initialPage)
  if (initialPage) {
    const animation = legacyPages?.[0]?.animation
    if (animation) initialPage.animation = structuredClone(animation)
    else delete initialPage.animation
  }
  const hostile = shellHostile
    ? {
        ...shellHostile,
        ...(canonical?.hostile?.onLose !== undefined
          ? { onLose: structuredClone(canonical.hostile.onLose) }
          : {}),
      }
    : undefined
  if (
    !canonical &&
    shellHostile?.onLose !== undefined &&
    shellHostile.onLose !== 'gameOver' &&
    shellHostile.onLose.length > 0
  )
    throw new Error(
      `mergeLegacyEditorShellIntoV5: 新实体 ${sceneId}/${shell.id} 含 legacy hostile.onLose，必须在 v5 脚本面板创建`,
    )
  return {
    ...shellBase,
    ...(canonical?.behaviors ? { behaviors: structuredClone(canonical.behaviors) } : {}),
    ...(pages ? { pages } : {}),
    ...(canonical?.initialPage ? { initialPage: canonical.initialPage } : {}),
    ...(hostile ? { hostile } : {}),
  } as EntityDefV5
}

function mergeSceneShellV5(
  shell: EditorState['scenes'][number],
  canonical: SceneDefV5 | undefined,
): SceneDefV5 {
  const {
    entities: shellEntities,
    onEnter: _legacyOnEnter,
    onTeleport: _legacyOnTeleport,
    ...shellBase
  } = structuredClone(shell)
  const canonicalEntities = new Map(
    (canonical?.entities ?? []).map((entity) => [entity.id, entity]),
  )
  return {
    ...shellBase,
    entities: shellEntities.map((entity) =>
      mergeEntityShellV5(shell.id, entity, canonicalEntities.get(entity.id)),
    ),
    ...(canonical?.hooks ? { hooks: structuredClone(canonical.hooks) } : {}),
  }
}

function mergeItemEffectsV5(
  itemId: string,
  slot: 'use',
  shellEffects: NonNullable<ItemData['use']>['effects'],
  canonical: ItemDataV5 | undefined,
  /** 投影(渲染/扫描)容忍 undo 中间态:shell ref 尚在、正文刚被撤销时丢弃该 ref 而非抛错;
   *  保存链不传此参,缺正文仍 fail-loud。 */
  tolerateMissingPrivateScript = false,
): NonNullable<ItemDataV5['use']>['effects'] {
  const canonicalPrivateScripts = new Map(
    (canonical?.[slot]?.effects ?? []).flatMap((effect) =>
      effect.kind === 'itemPrivateScript' ? [[effect.script.id, effect] as const] : [],
    ),
  )
  return shellEffects.flatMap((effect, index): NonNullable<ItemDataV5['use']>['effects'] => {
    if (effect.kind !== 'runScript') return [structuredClone(effect)]
    if (!isV5RuntimeScriptRef(effect.script))
      throw new Error(
        `mergeLegacyEditorShellIntoV5: ${itemId}.${slot}.effects[${index}] 是 legacy ScriptRef，v5 只接受稳定 shared script id`,
      )
    const privatePrefix = `item:${itemId}:`
    if (!effect.script.id.startsWith(privatePrefix))
      return [{ kind: 'runScript', script: effect.script.id }]
    const privateId = effect.script.id.slice(privatePrefix.length)
    const source = canonicalPrivateScripts.get(privateId as 'use')
    if (!source) {
      if (tolerateMissingPrivateScript) return []
      throw new Error(
        `mergeLegacyEditorShellIntoV5: ${itemId}.${slot}.effects[${index}] 的私有脚本 ${privateId} 不存在`,
      )
    }
    return [structuredClone(source)]
  })
}

function mergeItemShellV5(
  shell: ItemData,
  canonical: ItemDataV5 | undefined,
  tolerateMissingPrivateScript = false,
): ItemDataV5 {
  const use: ItemDataV5['use'] = shell.use
    ? {
        ...structuredClone(shell.use),
        effects: mergeItemEffectsV5(
          shell.id,
          'use',
          shell.use.effects,
          canonical,
          tolerateMissingPrivateScript,
        ),
      }
    : undefined
  const thrown: ItemDataV5['throw'] = shell.throw ? structuredClone(shell.throw) : undefined
  return {
    ...structuredClone(shell),
    use,
    throw: thrown,
  }
}

/**
 * 编辑中的 legacy shell 决定物品效果链的增删与顺序；canonical 只保存私有正文。
 * UI/引用扫描必须消费这个活动投影，否则已从 shell 删除、尚未保存重开的私有正文会
 * 继续形成幽灵引用。
 */
export function projectActiveScriptEditorStateV5(
  canonical: ScriptEditorStateV5,
  shellItems: readonly ItemData[],
): ScriptEditorStateV5 {
  const canonicalItems = new Map(canonical.items.map((item) => [item.id, item]))
  return {
    ...structuredClone(canonical),
    // 渲染/扫描投影容忍 undo 中间态(正文刚撤、ref 尚在);保存链(mergeLegacyEditorShellIntoV5)
    // 不传容忍参数,缺正文仍 fail-loud。
    items: shellItems.map((item) => mergeItemShellV5(item, canonicalItems.get(item.id), true)),
  }
}

/**
 * 当前编辑器的地图/资源/普通数据仍由 legacy EditSession 驱动；v5 脚本只存在于
 * ScriptV5EditSession。保存边界在这里把两份作者态合并，绝不把 runtime shell 的
 * 空 stage、占位 ScriptRef 或平面世界态写回 canonical 工程。
 */
export function mergeLegacyEditorShellIntoV5(
  canonical: EditorStateV5,
  shell: EditorState,
): EditorStateV5 {
  const runtimeManifest = structuredClone(shell.manifest) as unknown as CurrentManifest
  if (runtimeManifest.contentVersion !== CONTENT_VERSION)
    throw new Error(
      `mergeLegacyEditorShellIntoV5: shell 不是 contentVersion ${CONTENT_VERSION} 工程`,
    )
  if (runtimeManifest.content.scripts !== undefined)
    throw new Error('mergeLegacyEditorShellIntoV5: v5 shell 不得重新引入 content.scripts')
  if (!runtimeManifest.content.sharedScripts)
    throw new Error('mergeLegacyEditorShellIntoV5: v5 shell 缺 sharedScripts 路径')
  const canonicalScenes = new Map(canonical.scenes.map((scene) => [scene.id, scene]))
  const canonicalItems = new Map(canonical.items.map((item) => [item.id, item]))
  const {
    manifest: _shellManifest,
    scenes: _shellScenes,
    items: _shellItems,
    scriptIndex: _legacyScriptIndex,
    scriptChunks: _legacyScriptChunks,
    ...ordinaryState
  } = shell
  return {
    ...structuredClone(ordinaryState),
    manifest: runtimeManifest,
    startWorld: structuredClone(runtimeManifest.startWorld),
    scenes: shell.scenes.map((scene) => mergeSceneShellV5(scene, canonicalScenes.get(scene.id))),
    items: shell.items.map((item) => mergeItemShellV5(item, canonicalItems.get(item.id))),
    sharedScripts: structuredClone(canonical.sharedScripts),
    migrationRegistry: cloneMigrationRegistry(canonical.migrationRegistry),
    migrationSidecars: canonical.migrationSidecars.map((sidecar) => structuredClone(sidecar)),
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
  if (state.manifest.contentVersion !== CONTENT_VERSION)
    throw new Error(`serializeProjectV5: manifest 必须是 contentVersion ${CONTENT_VERSION}`)
  if (state.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `serializeProjectV5: manifest.minimumSaveVersion 必须是 ` +
        `${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`,
    )
  if (state.manifest.content.scripts !== undefined)
    throw new Error('serializeProjectV5: 禁止 legacy content.scripts')
  if (!state.manifest.content.sharedScripts)
    throw new Error('serializeProjectV5: manifest 缺 canonical sharedScripts 路径')
  const scenes = validateScenesV5(state.scenes)
  const items = validateItemsV5(state.items)
  const actors = validateActors(state.actors)
  const equipBattleSpriteIssue = validateEquipBattleSpriteReferences(
    items,
    actors,
    state.battleSprites,
  )[0]
  if (equipBattleSpriteIssue)
    throw new Error(`${equipBattleSpriteIssue.where}: ${equipBattleSpriteIssue.message}`)
  checkSharedScriptLibraryV5(state.sharedScripts)
  const scriptIssue = collectScriptV5ReferenceIssues(state)[0]
  if (scriptIssue) throw new Error(`${scriptIssue.path}: ${scriptIssue.message}`)
  const itemIds = new Set(state.items.map((item) => item.id))
  const danglingItem = collectCanonicalItemReferencesV5(state).find(
    (reference) => !itemIds.has(reference.itemId),
  )
  if (danglingItem)
    throw new Error(
      `${danglingItem.where}: 引用的物品 "${danglingItem.itemId}" 不在 canonical v5 物品表`,
    )
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
