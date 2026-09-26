/**
 * 地图资产命令族：新建/复制/改名/删除地图，以及场景绑定。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { GridPos, MapAssetDefV1, SceneDef } from '@type-pal/content'
import { MAP_INDEX_PATH, mapIdStem, nextMapAssetId, validateMapIndex } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import type { Command } from './command-contract.js'
import { findScene, withScene } from './command-scene-state.js'
import type { EditorState } from './edit-session.js'
import { type ProjectReferenceEdge, projectReferenceSourceSceneId } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

function withMapCatalogManifest(state: EditorState): EditorState['manifest'] {
  if (state.manifest.content.maps) return state.manifest
  return {
    ...state.manifest,
    content: { ...state.manifest.content, maps: MAP_INDEX_PATH },
  }
}

function addMapAsset(state: EditorState, def: MapAssetDefV1, map: ProjectMap): EditorState {
  const mapIndex = state.mapIndex ?? { version: 1 as const, maps: [] }
  if (mapIndex.maps.some((asset) => asset.id === def.id) || state.maps[def.id])
    throw new Error(`地图 id "${def.id}" 已存在`)
  const nextIndex = validateMapIndex({ version: 1, maps: [...mapIndex.maps, def] })
  return {
    ...state,
    manifest: withMapCatalogManifest(state),
    mapIndex: nextIndex,
    maps: { ...state.maps, [def.id]: structuredClone(map) },
  }
}

function removeMapAsset(state: EditorState, id: string): EditorState {
  const { [id]: _drop, ...maps } = state.maps
  return {
    ...state,
    mapIndex: {
      version: 1,
      maps: state.mapIndex.maps.filter((asset) => asset.id !== id),
    },
    maps,
  }
}

export class MapAssetInUseError extends Error {
  constructor(
    readonly mapId: string,
    readonly sceneIds: string[],
    readonly references: readonly ProjectReferenceEdge[] = [],
  ) {
    const sources = references.length
      ? [...new Set(references.map((reference) => reference.source.label))]
      : sceneIds
    super(`地图 "${mapId}" 正被引用: ${sources.join(', ')}`)
    this.name = 'MapAssetInUseError'
  }
}

/** 独立创建地图资产，不依赖任何场景引用。 */
export class CreateMapAssetCommand implements Command {
  readonly label = '新建地图'
  private readonly def: MapAssetDefV1
  private readonly map: ProjectMap
  private previousManifest: EditorState['manifest'] | undefined
  private added = false

  constructor(def: MapAssetDefV1, map: ProjectMap) {
    this.def = structuredClone(def)
    this.map = structuredClone(map)
  }

  apply(state: EditorState): EditorState {
    if (this.previousManifest === undefined) this.previousManifest = state.manifest
    const next = addMapAsset(state, this.def, this.map)
    this.added = true
    return next
  }

  invert(state: EditorState): EditorState {
    if (!this.added || !this.previousManifest) return state
    return { ...removeMapAsset(state, this.def.id), manifest: this.previousManifest }
  }
}

/** 深复制已有地图为新资产；后续编辑互不影响。 */
export class DuplicateMapAssetCommand implements Command {
  readonly label = '复制地图'
  private readonly def: MapAssetDefV1
  private copiedMap: ProjectMap | undefined
  private previousManifest: EditorState['manifest'] | undefined

  constructor(
    private readonly sourceId: string,
    def: MapAssetDefV1,
  ) {
    this.def = structuredClone(def)
  }

  apply(state: EditorState): EditorState {
    const source = state.maps[this.sourceId]
    if (!source) return state
    if (!this.copiedMap) this.copiedMap = structuredClone(source)
    if (!this.previousManifest) this.previousManifest = state.manifest
    return addMapAsset(state, this.def, this.copiedMap)
  }

  invert(state: EditorState): EditorState {
    if (!this.copiedMap || !this.previousManifest) return state
    return { ...removeMapAsset(state, this.def.id), manifest: this.previousManifest }
  }
}

/** 只改显示名；稳定 id/path 永不随改名变化。 */
export class RenameMapAssetCommand implements Command {
  readonly label = '重命名地图'
  private previousName: string | undefined

  constructor(
    private readonly mapId: string,
    private readonly name: string,
  ) {}

  private write(state: EditorState, name: string): EditorState {
    const index = state.mapIndex.maps.findIndex((asset) => asset.id === this.mapId)
    if (index < 0) return state
    const maps = [...state.mapIndex.maps]
    maps[index] = { ...maps[index]!, name }
    return { ...state, mapIndex: { version: 1, maps } }
  }

  apply(state: EditorState): EditorState {
    const asset = state.mapIndex.maps.find((candidate) => candidate.id === this.mapId)
    const name = this.name.trim()
    if (!asset || !name || asset.name === name) return state
    if (this.previousName === undefined) this.previousName = asset.name
    return this.write(state, name)
  }

  invert(state: EditorState): EditorState {
    return this.previousName === undefined ? state : this.write(state, this.previousName)
  }
}

/** 场景换绑到已登记地图；不复制地图内容。 */
export class BindSceneMapCommand implements Command {
  readonly label = '绑定场景地图'
  private previousMapId: string | undefined

  constructor(
    private readonly sceneId: string,
    private readonly mapId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || !state.mapIndex.maps.some((asset) => asset.id === this.mapId)) return state
    if (scene.mapId === this.mapId) return state
    if (this.previousMapId === undefined) this.previousMapId = scene.mapId
    return withScene(state, this.sceneId, { ...scene, mapId: this.mapId })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || this.previousMapId === undefined) return state
    return withScene(state, this.sceneId, { ...scene, mapId: this.previousMapId })
  }
}

/** 删除未被场景引用的地图资产；index/maps 同一命令原子更新。 */
export class DeleteMapAssetCommand implements Command {
  readonly label = '删除地图'
  private removed: { def: MapAssetDefV1; map: ProjectMap; index: number } | undefined

  constructor(
    private readonly mapId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.mapIndex.maps.findIndex((asset) => asset.id === this.mapId)
    const map = state.maps[this.mapId]
    if (index < 0 || !map) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'map',
      id: this.mapId,
    }).blockers
    if (references.length)
      throw new MapAssetInUseError(
        this.mapId,
        [
          ...new Set(
            references.flatMap((reference) => {
              const sceneId = projectReferenceSourceSceneId(reference.source.owner)
              return sceneId ? [sceneId] : []
            }),
          ),
        ],
        references,
      )
    if (!this.removed)
      this.removed = {
        def: structuredClone(state.mapIndex.maps[index]!),
        map: structuredClone(map),
        index,
      }
    return removeMapAsset(state, this.mapId)
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const defs = [...state.mapIndex.maps]
    defs.splice(this.removed.index, 0, this.removed.def)
    return {
      ...state,
      mapIndex: { version: 1, maps: defs },
      maps: { ...state.maps, [this.mapId]: this.removed.map },
    }
  }
}

/**
 * 便捷包装：创建资产、绑定场景、重置进场点一次完成。
 * 新 UI 分别使用 CreateMapAssetCommand / BindSceneMapCommand。
 */
export class CreateProjectMapCommand implements Command {
  readonly label = '新建并绑定地图'
  private prevMapId: string | undefined
  private prevEntry: SceneDef['entry'] | undefined
  private previousManifest: EditorState['manifest'] | undefined
  private mapId: string | undefined

  constructor(
    private readonly sceneId: string,
    private readonly projectMapRel: string,
    private readonly tilemap: ProjectMap,
    private readonly entryPos: GridPos,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.prevMapId === undefined) {
      this.prevMapId = scene.mapId
      this.prevEntry = structuredClone(scene.entry)
      this.previousManifest = state.manifest
      this.mapId = nextMapAssetId(state.mapIndex, mapIdStem(this.projectMapRel))
    }
    if (!this.mapId) return state
    const withAsset = addMapAsset(
      state,
      { id: this.mapId, name: this.mapId, path: this.projectMapRel },
      this.tilemap,
    )
    const next = withScene(state, this.sceneId, {
      ...scene,
      mapId: this.mapId,
      entry: { ...scene.entry, pos: { ...this.entryPos } },
    })
    return { ...withAsset, scenes: next.scenes }
  }

  invert(state: EditorState): EditorState {
    if (this.prevMapId === undefined) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const next = withScene(state, this.sceneId, {
      ...scene,
      mapId: this.prevMapId,
      entry: this.prevEntry ?? scene.entry,
    })
    if (!this.mapId) return next
    return {
      ...removeMapAsset(next, this.mapId),
      manifest: this.previousManifest ?? next.manifest,
    }
  }
}
