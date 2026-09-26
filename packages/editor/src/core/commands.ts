/**
 * Command 接口 + 布置命令集(D-B0 地基 + D-B1 布置模式命令)。
 *
 * 所有编辑 = Command:apply 产新态(不可变)、invert 把「apply 后的态」还原回 apply 前。
 * EditSession 用 apply/invert 驱动 undo/redo。B1 布置模式发本文件的命令集。
 *
 * 不可变铁律:命令不得原地 mutate 传入 state(展开/map 构造新对象);测钉「源不变」。
 * 旧值/旧索引在**首次 apply 时捕获**(apply 时的 state 即初始态),供 invert 还原。
 *
 * 见 docs/phase2/archive/designs/editor-design.md §4。
 */

import type {
  ActorDef,
  AssetId,
  AssetRecordV1,
  AssetRole,
  BattleSpriteDef,
  EntityDef,
  EntryPoint,
  GridPos,
  LevelUpSkill,
  MapAssetDefV1,
  SceneDef,
  SpriteDef,
} from '@type-pal/content'
import {
  battleSpriteDefinitionFrameDemand,
  MAP_INDEX_PATH,
  mapIdStem,
  mapInstanceHeight,
  mapInstanceTilesetId,
  nextMapAssetId,
  spriteDefinitionFrameDemand,
  spriteDefinitionFrameIndices,
  validateActors,
  validateBattleSprites,
  validateMapIndex,
  validateProjectRelativePath,
  validateSprites,
  validateStartWorld,
} from '@type-pal/content'
import type {
  IsometricMapLayer,
  ProjectMap,
  ProjectMapCollisionEdit,
  ProjectMapTileEdit,
  TilesetDef,
} from '@type-pal/reforge'
import {
  insertProjectMapLayer,
  moveProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  removeProjectMapLayer,
  updateProjectMapLayer,
} from '@type-pal/reforge'
import type { Command } from './command-contract.js'
import { findScene, withEntities, withScene } from './command-scene-state.js'
import type { CurrentMapReferenceBatchProvider, EditorState } from './edit-session.js'
import { withEnemy } from './enemy-commands.js'
import {
  applyPreparedProjectMapPatch,
  cloneMapPatchPermission,
  cloneProjectMapPatch,
  type MapPatchPermissionSnapshot,
  ordinaryProjectMapPatchOwnershipIssues,
  type PreparedProjectMapPatch,
  type ProjectMapPatch,
  ProjectMapPatchError,
  preparedProjectMapPatchChanged,
  prepareProjectMapPatch,
} from './map-patch.js'
import { type ProjectReferenceEdge, projectReferenceSourceSceneId } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'
import {
  resolveStampStructureOperation,
  type StampStructureResolutionOptions,
} from './stamp-lifecycle.js'
import { inheritStampPlacementIndex } from './stamp-ownership.js'
import {
  assertTilesetRemovalAllowed,
  assertTilesetReplacementAllowed,
  type TilesetRemovalProof,
  type TilesetReplacementProof,
} from './tileset-references.js'

export { BattleDataInUseError } from './battle-data-command-errors.js'
export type { Command } from './command-contract.js'
export { CompositeCommand } from './composite-command.js'
export {
  AddEntityCommand,
  DeleteEntityCommand,
  type EntityPatch,
  MoveEntityCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
} from './entity-commands.js'
export {
  AddSceneCommand,
  DeleteSceneCommand,
  DeleteSceneEntryCommand,
  DuplicateSceneCommand,
  SceneEntryInUseError,
  SceneInUseError,
  type ScenePatch,
  UpdateSceneCommand,
  UpdateSceneNameCommand,
  UpsertSceneEntryCommand,
} from './scene-commands.js'
export {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from './world-variable-commands.js'

function sameAssetRecord(left: AssetRecordV1, right: AssetRecordV1): boolean {
  return (
    left.kind === right.kind &&
    left.path === right.path &&
    left.mediaType === right.mediaType &&
    left.bytes === right.bytes &&
    left.sha256 === right.sha256 &&
    left.label === right.label &&
    left.origin.kind === right.origin.kind &&
    left.origin.ref === right.origin.ref
  )
}

function assertTilesetRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'tileset') throw new Error('瓦片集资源 kind 必须是 tileset')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('瓦片集资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '瓦片集资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('瓦片集资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('瓦片集资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('瓦片集资源必须是 canonical gzip')
}

function assertSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'sprite') throw new Error('大世界精灵资源 kind 必须是 sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('大世界精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '大世界精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('大世界精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('大世界精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('大世界精灵资源必须是 canonical gzip')
}

function assertBattleSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'battle-sprite') throw new Error('战斗精灵资源 kind 必须是 battle-sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('战斗精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '战斗精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('战斗精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('战斗精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('战斗精灵资源必须是 canonical gzip')
}

// ════════════════════════════════════════════════════════════════════
// B1 布置模式命令集(Add/Delete/Update 实体 · Update 场景)
// 契约签名钉死(见 editor-b1-logic-plan「契约」),Claude 照此搭 UI。
// ════════════════════════════════════════════════════════════════════

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

/**
 * 画瓦片(W7D):载荷使用稳定 layer.id + lattice 行列，不再出现旧 word/mask/h。
 */
export class PaintTilesCommand implements Command {
  readonly label = '画瓦片'
  private prev: ProjectMapTileEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly ProjectMapTileEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const ownershipIssues = ordinaryProjectMapPatchOwnershipIssues(map, {
      visual: this.edits.flatMap((edit) => [
        { channel: 'tileId' as const, ref: edit, value: edit.tileId },
        { channel: 'tilesetId' as const, ref: edit, value: edit.tilesetId },
        { channel: 'height' as const, ref: edit, value: edit.height },
      ]),
      collision: [],
    })
    if (ownershipIssues.length > 0) throw new ProjectMapPatchError(ownershipIssues)
    if (!this.prev) {
      const seen = new Set<string>()
      this.prev = []
      for (const e of this.edits) {
        const key = `${e.layerId},${e.col},${e.row}`
        if (seen.has(key)) continue
        seen.add(key)
        const tileId = map.layers.find((layer) => layer.id === e.layerId)?.tiles[e.row]?.[e.col]
        const layer = map.layers.find((candidate) => candidate.id === e.layerId)
        if (tileId === undefined) continue
        this.prev.push({
          ...e,
          tileId,
          tilesetId: layer ? (mapInstanceTilesetId(map, layer, e.row, e.col) ?? null) : null,
          height: layer ? mapInstanceHeight(layer, e.row, e.col) : 0,
        })
      }
    }
    const next = paintProjectMapTiles(map, this.edits)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    const next = paintProjectMapTiles(map, this.prev)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }
}

/** 独立碰撞层的一笔；非零语义由 schema 保留，当前 UI 写 0/1。 */
export class PaintCollisionCommand implements Command {
  readonly label = '画碰撞'
  private prev: ProjectMapCollisionEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly ProjectMapCollisionEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const ownershipIssues = ordinaryProjectMapPatchOwnershipIssues(map, {
      visual: [],
      collision: this.edits.map((edit) => ({ ref: edit, value: edit.value })),
    })
    if (ownershipIssues.length > 0) throw new ProjectMapPatchError(ownershipIssues)
    if (!this.prev) {
      const seen = new Set<string>()
      this.prev = []
      for (const edit of this.edits) {
        const key = `${edit.col},${edit.row}`
        if (seen.has(key)) continue
        seen.add(key)
        const value = map.collision[edit.row]?.[edit.col]
        if (value !== undefined) this.prev.push({ ...edit, value })
      }
    }
    const next = paintProjectMapCollision(map, this.edits)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    const next = paintProjectMapCollision(map, this.prev)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }
}

/** W8：跨层 tile/height + 独立 collision 的一次原子、可逆 patch。 */
export class ApplyProjectMapPatchCommand implements Command {
  readonly label: string
  private readonly patch: ProjectMapPatch
  private readonly permission: MapPatchPermissionSnapshot
  private prepared: PreparedProjectMapPatch | undefined

  constructor(
    private readonly mapId: string,
    patch: ProjectMapPatch,
    permission: MapPatchPermissionSnapshot,
    label = '修改地图选区',
  ) {
    this.label = label
    this.patch = cloneProjectMapPatch(patch)
    this.permission = cloneMapPatchPermission(permission)
  }

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapId]
    if (!map)
      throw new ProjectMapPatchError([
        { code: 'map-missing', message: `地图 "${this.mapId}" 尚未加载或不存在` },
      ])
    if (!this.prepared) this.prepared = prepareProjectMapPatch(map, this.patch, this.permission)
    if (!preparedProjectMapPatchChanged(this.prepared)) return state
    const next = applyPreparedProjectMapPatch(map, this.prepared, 'next')
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapId]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapId]
    if (!this.prepared || !preparedProjectMapPatchChanged(this.prepared)) return state
    if (!map)
      throw new ProjectMapPatchError([
        { code: 'map-missing', message: `地图 "${this.mapId}" 尚未加载或不存在` },
      ])
    const previous = applyPreparedProjectMapPatch(map, this.prepared, 'prev')
    return previous === map ? state : { ...state, maps: { ...state.maps, [this.mapId]: previous } }
  }
}

export class AddProjectMapLayerCommand implements Command {
  readonly label = '新增地图层'
  private readonly layer: IsometricMapLayer
  private insertedIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    layer: IsometricMapLayer,
    private readonly index?: number,
  ) {
    this.layer = structuredClone(layer)
  }

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (this.insertedIndex === undefined)
      this.insertedIndex = Math.max(0, Math.min(this.index ?? map.layers.length, map.layers.length))
    const next = insertProjectMapLayer(map, this.layer, this.insertedIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = removeProjectMapLayer(map, this.layer.id)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class RemoveProjectMapLayerCommand implements Command {
  readonly label = '删除地图层'
  private prev: ProjectMap | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly stampOptions: StampStructureResolutionOptions = {},
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || map.layers.length <= 1) return state
    const next = resolveStampStructureOperation(
      map,
      { kind: 'remove-layer', layerId: this.layerId },
      this.stampOptions,
    )
    if (next !== map && !this.prev) this.prev = map
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: this.prev } }
  }
}

export class MoveProjectMapLayerCommand implements Command {
  readonly label = '重排地图层'
  private fromIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly toIndex: number,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (this.fromIndex === undefined)
      this.fromIndex = map.layers.findIndex((l) => l.id === this.layerId)
    const next = moveProjectMapLayer(map, this.layerId, this.toIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || this.fromIndex === undefined || this.fromIndex < 0) return state
    const next = moveProjectMapLayer(map, this.layerId, this.fromIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class UpdateProjectMapLayerCommand implements Command {
  readonly label = '修改地图层'
  private oldPatch: Partial<Pick<IsometricMapLayer, 'name'>> | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly patch: Partial<Pick<IsometricMapLayer, 'name'>>,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    const layer = map?.layers.find((candidate) => candidate.id === this.layerId)
    if (!map || !layer) return state
    if (!this.oldPatch) {
      this.oldPatch = {}
      if ('name' in this.patch) this.oldPatch.name = layer.name
    }
    const next = updateProjectMapLayer(map, this.layerId, this.patch)
    inheritStampPlacementIndex(map, next)
    return { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.oldPatch) return state
    const next = updateProjectMapLayer(map, this.layerId, this.oldPatch)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: {
        ...state.maps,
        [this.mapRel]: next,
      },
    }
  }
}

/**
 * 改图尺寸(W7c-4):左上锚定裁剪/扩展。裁剪破坏性 → prev 直接留 apply 前的整图引用
 * (不可变数据,零拷贝),invert 整图还原,被裁内容精确回来。
 */
export class ResizeProjectMapCommand implements Command {
  readonly label = '改图尺寸'
  private prev: ProjectMap | undefined

  constructor(
    private readonly mapRel: string,
    private readonly width: number,
    private readonly height: number,
    private readonly stampOptions: StampStructureResolutionOptions = {},
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = resolveStampStructureOperation(
      map,
      { kind: 'resize', width: this.width, height: this.height },
      this.stampOptions,
    )
    if (next === map) return state
    if (!this.prev) this.prev = map
    return { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: this.prev } }
  }
}

/**
 * 上传 tileset 入库：定义 + catalog record + pending gzip 字节原子加入。
 */
export class AddTilesetCommand implements Command {
  readonly label = '上传瓦片集'
  private readonly def: TilesetDef
  private readonly record: AssetRecordV1
  private readonly blob: ArrayBuffer
  private createdAsset = false

  constructor(def: TilesetDef, record: AssetRecordV1, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.record = structuredClone(record)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if ((state.tilesets ?? []).some((t) => t.id === this.def.id))
      throw new Error(`瓦片集定义 id 已存在: ${this.def.id}`)
    assertTilesetRecord(this.record, this.blob)
    if (!this.def.asset) throw new Error('瓦片集定义缺 AssetId')
    const existing = state.assetCatalog.assets[this.def.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`瓦片集 AssetId 已存在且记录不同: ${this.def.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.def.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`瓦片集资源路径已由 ${pathOwner[0]} 登记`)
    this.createdAsset = !existing
    return {
      ...state,
      tilesets: [...(state.tilesets ?? []), this.def],
      assetCatalog: existing
        ? state.assetCatalog
        : {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.def.asset]: this.record },
          },
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.blob.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.def.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      tilesets: (state.tilesets ?? []).filter((t) => t.id !== this.def.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

/**
 * 移除定义；只有零其它定义引用时才连带移除 catalog record/pending bytes。
 */
export class RemoveTilesetCommand implements Command {
  readonly label = '移除瓦片集'
  private removed: TilesetDef | undefined
  private removedIndex: number | undefined
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly tilesetId: string,
    private readonly proof: TilesetRemovalProof,
    private readonly currentBatch: CurrentMapReferenceBatchProvider,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const list = state.tilesets ?? []
    const index = list.findIndex((t) => t.id === this.tilesetId)
    if (index < 0) return state
    assertTilesetRemovalAllowed(
      state,
      this.tilesetId,
      this.proof,
      this.currentBatch,
      this.persistedBytes,
    )
    if (!this.removed) {
      this.removed = structuredClone(list[index])
      this.removedIndex = index
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const removed = list[index]!
    const nextTilesets = list.filter((t) => t.id !== this.tilesetId)
    if (nextTilesets.some((candidate) => candidate.asset === removed.asset))
      return { ...state, tilesets: nextTilesets }
    const assets = { ...state.assetCatalog.assets }
    const record = assets[removed.asset]
    delete assets[removed.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (record && !Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      tilesets: nextTilesets,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const list = [...(state.tilesets ?? [])]
    list.splice(this.removedIndex, 0, this.removed)
    return {
      ...state,
      tilesets: list,
      assetCatalog: this.oldCatalog ?? state.assetCatalog,
      assetBlobs: (() => {
        const blobs = { ...(this.oldBlobs ?? state.assetBlobs) }
        const record = this.oldCatalog?.assets[this.removed.asset]
        if (record && this.persistedBytes) blobs[record.path] = this.persistedBytes.slice(0)
        return blobs
      })(),
    }
  }
}

/** 改名/分类只改领域定义，不触碰资源诊断 label。 */
export class UpdateTilesetMetadataCommand implements Command {
  readonly label = '修改瓦片集信息'
  private previous: Pick<TilesetDef, 'name' | 'category'> | undefined

  constructor(
    private readonly id: string,
    private readonly patch: Partial<Pick<TilesetDef, 'name' | 'category'>>,
  ) {}

  apply(state: EditorState): EditorState {
    const current = (state.tilesets ?? []).find((entry) => entry.id === this.id)
    if (!current) return state
    if (this.patch.name !== undefined && !this.patch.name.trim())
      throw new Error('瓦片集名称不能为空')
    if (this.patch.category !== undefined && !this.patch.category.trim())
      throw new Error('瓦片集分类不能为空')
    this.previous ??= { name: current.name, category: current.category }
    return {
      ...state,
      tilesets: (state.tilesets ?? []).map((entry) =>
        entry.id === this.id ? { ...entry, ...this.patch } : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    return {
      ...state,
      tilesets: (state.tilesets ?? []).map((entry) =>
        entry.id === this.id ? { ...entry, ...this.previous } : entry,
      ),
    }
  }
}

/** 替换保持 TilesetDef.id 与 AssetId，仅更新该共享二进制的 record/bytes。 */
export class ReplaceTilesetAssetCommand implements Command {
  readonly label = '替换瓦片集图像'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly tilesetId: string,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes: ArrayBuffer | undefined,
    private readonly proof: TilesetReplacementProof,
    private readonly currentBatch: CurrentMapReferenceBatchProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous) return state
    assertTilesetRecord(this.record, this.bytes)
    if (previous.kind !== 'tileset') throw new Error('瓦片集替换只能更新 kind=tileset 的资源')
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`瓦片集替换路径已由 ${pathOwner[0]} 登记`)
    const target = (state.tilesets ?? []).find((entry) => entry.id === this.tilesetId)
    if (!target || target.asset !== this.asset) throw new Error('瓦片集定义与待替换 AssetId 不一致')
    assertTilesetReplacementAllowed(
      state,
      this.tilesetId,
      this.asset,
      this.proof,
      this.currentBatch,
    )
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const blobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.previousBytes) blobs[record.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs: blobs }
  }
}

// ════════════════════════════════════════════════════════════════════
// C1 数据模式/角色模式命令集(改精灵布局·姿势 / 角色属性)
// ════════════════════════════════════════════════════════════════════

/** 不可变:替换 spriteId 精灵;旁精灵同引用。 */
function withSprite(state: EditorState, spriteId: string, newSprite: SpriteDef): EditorState {
  let hit = false
  const sprites = state.sprites.map((s) => {
    if (s.id !== spriteId) return s
    hit = true
    return newSprite
  })
  return hit ? { ...state, sprites } : state
}

/** UpdateSprite 的 patch 范围(布局 / 命名姿势 / 标签)。 */
export type SpritePatch = Partial<Pick<SpriteDef, 'layout' | 'poses' | 'label'>>

/** 布局/姿势编辑在预览时解码出的资源事实；SHA 防止预览后资源已被替换。 */
export interface SpriteLayoutEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

export class SpriteInUseError extends Error {
  constructor(
    readonly targetLabel: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `${targetLabel} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'SpriteInUseError'
  }
}

function assertSpriteEditShape(sprite: Pick<SpriteDef, 'id' | 'layout' | 'poses'>): void {
  if (
    sprite.layout.kind === 'loop' ||
    (sprite.layout.kind === 'directional' &&
      (!Number.isInteger(sprite.layout.framesPerDir) || sprite.layout.framesPerDir <= 0))
  )
    throw new Error(`精灵 ${sprite.id} 的布局非法；自动循环请创建预制动作`)
  for (const [actionId, action] of Object.entries(sprite.poses ?? {})) {
    if (
      !actionId ||
      !action.label.trim() ||
      action.steps.length === 0 ||
      action.steps.some(
        (step) =>
          !Number.isInteger(step.frame) ||
          step.frame < 0 ||
          !Number.isInteger(step.durationMs) ||
          step.durationMs <= 0 ||
          step.cues?.some((cue) => cue.kind !== 'sound' || !cue.asset),
      ) ||
      (action.order !== undefined && (!Number.isInteger(action.order) || action.order < 0)) ||
      (action.loopFrom !== undefined &&
        (!Number.isInteger(action.loopFrom) ||
          action.loopFrom < 0 ||
          action.loopFrom >= action.steps.length))
    )
      throw new Error(`精灵 ${sprite.id} 的预制动作 ${actionId} 非法`)
  }
}

/**
 * 改精灵字段(layout/poses/label)。语义同 UpdateEntityCommand:首次 apply 捕获旧值,invert 还原。
 * layout/poses 是对象 → 深拷贝入参 + 捕获时深拷贝旧值(防回写)。
 */
export class UpdateSpriteCommand implements Command {
  readonly label = '修改精灵'
  private readonly spriteId: string
  private readonly patch: SpritePatch
  private oldPatch: SpritePatch | undefined

  constructor(
    spriteId: string,
    patch: SpritePatch,
    private readonly proof?: SpriteLayoutEditProof,
    private readonly currentReferences?: CurrentProjectReferenceIndexProvider,
  ) {
    this.spriteId = spriteId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    if ('layout' in this.patch || 'poses' in this.patch) {
      const proof = this.proof
      const record = state.assetCatalog.assets[sp.asset]
      if (
        record?.kind !== 'sprite' ||
        !proof ||
        proof.asset !== sp.asset ||
        proof.sha256 !== record.sha256
      )
        throw new Error('精灵布局证明缺失或已过期，请等待帧资源重新载入')
      if (!Number.isInteger(proof.actualFrameCount) || proof.actualFrameCount <= 0)
        throw new Error('精灵布局证明的实际帧数非法')
      const next = { ...sp, ...this.patch }
      assertSpriteEditShape(next)
      if ('poses' in this.patch) {
        const removedActionIds = Object.keys(sp.poses ?? {}).filter(
          (actionId) => !next.poses?.[actionId],
        )
        if (removedActionIds.length) {
          if (!this.currentReferences)
            throw new Error('删除预制动作前无法读取 current-author 引用索引')
          const referenceIndex = this.currentReferences(state)
          const blocking = removedActionIds.flatMap(
            (actionId) =>
              referenceIndex.deletionImpact({
                kind: 'world-sprite-action',
                spriteId: sp.id,
                actionId,
              }).blockers,
          )
          if (blocking.length)
            throw new SpriteInUseError(
              `精灵 ${sp.id} 的动作 ${removedActionIds.join('、')}`,
              blocking,
            )
        }
      }
      const previousMissing = new Set(
        [...spriteDefinitionFrameIndices(sp)].filter((frame) => frame >= proof.actualFrameCount),
      )
      const nextMissing = [...spriteDefinitionFrameIndices(next)].filter(
        (frame) => frame >= proof.actualFrameCount,
      )
      const addedMissing = nextMissing.filter((frame) => !previousMissing.has(frame))
      if (addedMissing.length)
        throw new Error(
          `布局会新增越界帧 ${addedMissing.join(', ')}，资源实际只有 ${proof.actualFrameCount} 帧`,
        )
    }
    if (!this.oldPatch) this.oldPatch = this.captureOld(sp)
    return withSprite(state, this.spriteId, { ...sp, ...this.patch })
  }

  private captureOld(sp: SpriteDef): SpritePatch {
    const old: SpritePatch = {}
    if ('layout' in this.patch) old.layout = structuredClone(sp.layout)
    if ('poses' in this.patch) old.poses = sp.poses ? structuredClone(sp.poses) : undefined
    if ('label' in this.patch) old.label = sp.label
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    return withSprite(state, this.spriteId, { ...sp, ...this.oldPatch })
  }
}

/** 不可变:替换 actorId 角色;旁角色同引用。 */
function withActor(state: EditorState, actorId: string, newActor: ActorDef): EditorState {
  let hit = false
  const actors = state.actors.map((a) => {
    if (a.id !== actorId) return a
    hit = true
    return newActor
  })
  return hit ? { ...state, actors } : state
}

function assertActorCanBeAdded(state: EditorState, actor: ActorDef): void {
  validateActors([actor])
  for (const [field, value] of [
    ['id', actor.id],
    ['name', actor.name],
    ['spriteId', actor.spriteId],
  ] as const)
    if (!value.trim() || value !== value.trim())
      throw new Error(`人物 ${field} 必须是无首尾空格的非空字符串`)
  if (state.actors.some((candidate) => candidate.id === actor.id))
    throw new Error(`人物 id 已存在：${actor.id}`)
  if (!state.sprites.some((sprite) => sprite.id === actor.spriteId))
    throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
  if (!(actor.name in state.locale) || !state.locale[actor.name]?.trim())
    throw new Error(`人物 ${actor.id} 的名称文本不存在或为空：${actor.name}`)
  const assertAsset = (id: AssetId | undefined, kind: 'portrait' | 'face', field: string): void => {
    if (!id) return
    const record = state.assetCatalog.assets[id]
    if (!record || record.kind !== kind)
      throw new Error(`人物 ${actor.id} 的${field}资源不存在或类型错误：${id}`)
  }
  assertAsset(actor.portraits?.default, 'portrait', '默认立绘')
  for (const [expression, id] of Object.entries(actor.portraits?.expressions ?? {}))
    assertAsset(id, 'portrait', `立绘“${expression}”`)
  assertAsset(actor.face, 'face', '小头像')
  if (
    actor.battler &&
    !state.battleSprites.some((battleSprite) => battleSprite.id === actor.battler!.battleSprite)
  )
    throw new Error(`人物 ${actor.id} 的战斗精灵不存在：${actor.battler.battleSprite}`)
  if (
    actor.battler?.coveredBy &&
    !state.actors.some((candidate) => candidate.id === actor.battler!.coveredBy)
  )
    throw new Error(`人物 ${actor.id} 的援护者不存在：${actor.battler.coveredBy}`)
}

function assertActorPatchCanBeApplied(
  state: EditorState,
  previous: ActorDef,
  actor: ActorDef,
  patch: ActorPatch,
): void {
  if (
    'spriteId' in patch &&
    actor.spriteId !== previous.spriteId &&
    !state.sprites.some((sprite) => sprite.id === actor.spriteId)
  )
    throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
  const assertAsset = (id: AssetId | undefined, kind: 'portrait' | 'face', field: string): void => {
    if (!id) return
    const record = state.assetCatalog.assets[id]
    if (!record || record.kind !== kind)
      throw new Error(`人物 ${actor.id} 的${field}资源不存在或类型错误：${id}`)
  }
  if ('portraits' in patch) {
    const previousPortraits = new Set([
      ...(previous.portraits?.default ? [previous.portraits.default] : []),
      ...Object.values(previous.portraits?.expressions ?? {}),
    ])
    if (!previousPortraits.has(actor.portraits?.default ?? ''))
      assertAsset(actor.portraits?.default, 'portrait', '默认立绘')
    for (const [expression, id] of Object.entries(actor.portraits?.expressions ?? {}))
      if (!previousPortraits.has(id)) assertAsset(id, 'portrait', `立绘“${expression}”`)
  }
  if ('face' in patch && actor.face !== previous.face) assertAsset(actor.face, 'face', '小头像')
  if ('battler' in patch && actor.battler) {
    if (
      actor.battler.battleSprite !== previous.battler?.battleSprite &&
      !state.battleSprites.some((battleSprite) => battleSprite.id === actor.battler!.battleSprite)
    )
      throw new Error(`人物 ${actor.id} 的战斗精灵不存在：${actor.battler.battleSprite}`)
    if (
      actor.battler.coveredBy &&
      actor.battler.coveredBy !== previous.battler?.coveredBy &&
      !state.actors.some((candidate) => candidate.id === actor.battler!.coveredBy)
    )
      throw new Error(`人物 ${actor.id} 的援护者不存在：${actor.battler.coveredBy}`)
  }
}

/** 新建人物定义；locale 文本应由同一 CompositeCommand 在本命令前写入。 */
export class AddActorCommand implements Command {
  readonly label = '新增人物'
  private readonly actor: ActorDef
  private readonly requestedIndex: number | undefined

  constructor(actor: ActorDef, index?: number) {
    this.actor = structuredClone(actor)
    this.requestedIndex = index
  }

  apply(state: EditorState): EditorState {
    assertActorCanBeAdded(state, this.actor)
    const actors = [...state.actors]
    const index = Math.min(Math.max(0, this.requestedIndex ?? actors.length), actors.length)
    actors.splice(index, 0, structuredClone(this.actor))
    return { ...state, actors }
  }

  invert(state: EditorState): EditorState {
    const index = state.actors.findIndex((actor) => actor.id === this.actor.id)
    if (index < 0) return state
    return { ...state, actors: state.actors.filter((actor) => actor.id !== this.actor.id) }
  }
}

/** 复制人物定义及其 levelUp 伴随表；共享资源仍按 id 引用，不复制资产。 */
export class CopyActorCommand implements Command {
  readonly label = '复制人物'
  private copied = false
  private copiedActor: ActorDef | undefined
  private copiedLevelUp: LevelUpSkill[] | undefined

  constructor(
    private readonly sourceActorId: string,
    private readonly nextActorId: string,
    private readonly nextNameId: string,
  ) {}

  apply(state: EditorState): EditorState {
    if (!this.copiedActor) {
      const source = state.actors.find((actor) => actor.id === this.sourceActorId)
      if (!source) throw new Error(`复制来源人物不存在：${this.sourceActorId}`)
      this.copiedActor = structuredClone(source)
      this.copiedActor.id = this.nextActorId
      this.copiedActor.name = this.nextNameId
      this.copiedLevelUp = state.levelUp[this.sourceActorId]
        ? structuredClone(state.levelUp[this.sourceActorId])
        : undefined
    }
    const actor = structuredClone(this.copiedActor)
    assertActorCanBeAdded(state, actor)
    this.copied = true
    return {
      ...state,
      actors: [...state.actors, actor],
      levelUp: this.copiedLevelUp
        ? { ...state.levelUp, [this.nextActorId]: structuredClone(this.copiedLevelUp) }
        : state.levelUp,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.copied) return state
    const levelUp = { ...state.levelUp }
    delete levelUp[this.nextActorId]
    return {
      ...state,
      actors: state.actors.filter((actor) => actor.id !== this.nextActorId),
      levelUp,
    }
  }
}

/** 删除前重算 Actor 全引用闭包；levelUp 是伴随数据，随人物同事务清理与恢复。 */
export class ActorInUseError extends Error {
  constructor(
    readonly actorId: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `人物 ${actorId} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'ActorInUseError'
  }
}

export class DeleteActorCommand implements Command {
  readonly label = '删除人物'
  private removed: ActorDef | undefined
  private removedLevelUp: LevelUpSkill[] | undefined
  private hadLevelUp = false
  private index = -1

  constructor(
    private readonly actorId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.actors.findIndex((actor) => actor.id === this.actorId)
    if (index < 0) return state
    const blockers = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'actor',
      id: this.actorId,
    }).blockers
    if (blockers.length) throw new ActorInUseError(this.actorId, blockers)
    if (!this.removed) {
      this.removed = structuredClone(state.actors[index]!)
      this.index = index
      this.hadLevelUp = Object.hasOwn(state.levelUp, this.actorId)
      this.removedLevelUp = state.levelUp[this.actorId]
        ? structuredClone(state.levelUp[this.actorId])
        : undefined
    }
    const levelUp = { ...state.levelUp }
    delete levelUp[this.actorId]
    return {
      ...state,
      actors: state.actors.filter((actor) => actor.id !== this.actorId),
      levelUp,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.actors.some((actor) => actor.id === this.actorId))
      throw new Error(`无法撤销删除：人物 id 已被占用 ${this.actorId}`)
    const actors = [...state.actors]
    actors.splice(
      Math.min(Math.max(0, this.index), actors.length),
      0,
      structuredClone(this.removed),
    )
    const levelUp = { ...state.levelUp }
    if (this.hadLevelUp && this.removedLevelUp)
      levelUp[this.actorId] = structuredClone(this.removedLevelUp)
    else delete levelUp[this.actorId]
    return { ...state, actors, levelUp }
  }
}

/** actor 实例解除关联为当前默认 sprite；除判别字段外逐字段原样保留。 */
export class DetachActorEntityCommand implements Command {
  readonly label = '解除人物关联'
  private original: EntityDef | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entityId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    const entity = scene?.entities.find((candidate) => candidate.id === this.entityId)
    if (!scene || !entity || !('actor' in entity)) return state
    const actor = state.actors.find((candidate) => candidate.id === entity.actor)
    if (!actor)
      throw new Error(`实体 ${this.sceneId}/${this.entityId} 的人物不存在：${entity.actor}`)
    if (!state.sprites.some((sprite) => sprite.id === actor.spriteId))
      throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
    if (!this.original) this.original = structuredClone(entity)
    const { actor: _actor, ...instance } = entity
    const detached: EntityDef = { ...instance, sprite: actor.spriteId }
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((candidate) => (candidate.id === this.entityId ? detached : candidate)),
    )
  }

  invert(state: EditorState): EditorState {
    if (!this.original) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((candidate) =>
        candidate.id === this.entityId ? structuredClone(this.original!) : candidate,
      ),
    )
  }
}

/** UpdateActor 的 patch 范围(名字 / 头像组 / 小头像 / 战斗数据 / 精灵引用)。 */
export type ActorPatch = Partial<
  Pick<ActorDef, 'name' | 'portraits' | 'face' | 'battler' | 'spriteId'>
>

/** 改角色字段。语义同上:首次 apply 捕获旧值,invert 还原;portraits/battler 深拷贝。 */
export class UpdateActorCommand implements Command {
  readonly label = '修改角色'
  private readonly actorId: string
  private readonly patch: ActorPatch
  private oldPatch: ActorPatch | undefined

  constructor(actorId: string, patch: ActorPatch) {
    this.actorId = actorId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const a = state.actors.find((x) => x.id === this.actorId)
    if (!a) return state
    if (!this.oldPatch) this.oldPatch = this.captureOld(a)
    const next = { ...a, ...this.patch }
    assertActorPatchCanBeApplied(state, a, next, this.patch)
    return withActor(state, this.actorId, next)
  }

  private captureOld(a: ActorDef): ActorPatch {
    const old: ActorPatch = {}
    if ('name' in this.patch) old.name = a.name
    if ('spriteId' in this.patch) old.spriteId = a.spriteId
    if ('face' in this.patch) old.face = a.face
    if ('portraits' in this.patch)
      old.portraits = a.portraits ? structuredClone(a.portraits) : undefined
    if ('battler' in this.patch) old.battler = a.battler ? structuredClone(a.battler) : undefined
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const a = state.actors.find((x) => x.id === this.actorId)
    if (!a) return state
    return withActor(state, this.actorId, { ...a, ...this.oldPatch })
  }
}

// ════════════════════════════════════════════════════════════════════
// M4c-3 敌人工作台命令(敌人库 增/删/改 + 敌队整表)
// ════════════════════════════════════════════════════════════════════

export type { AmbiencePatch } from './ambience-commands.js'
export {
  AddAmbienceCommand,
  AmbienceInUseError,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from './ambience-commands.js'
export { UpdateAssetLabelCommand } from './asset-label-command.js'
export type { BattleFieldPatch } from './battle-field-commands.js'
// 战场命令族(四命令 + 表快照/id 分配 helper + BattleFieldInUseError)已整体拆分至
// battle-field-commands.ts(ARCH-F2 模块归属治理,行为不变)。公开出口维持本文件路径不变;
// 本文件对它为运行期 re-export,它对 Command 仅 type import —— 运行期无环。
export {
  AddBattleFieldCommand,
  BATTLE_FIELDS_PATH,
  BattleFieldInUseError,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from './battle-field-commands.js'
export type { EnemyPatch } from './enemy-commands.js'
export { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'
export {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
  UpdateEnemyTeamsCommand,
} from './enemy-team-commands.js'
export {
  AddItemCommand,
  DeleteItemCommand,
  ItemInUseError,
  UpdateItemCommand,
} from './item-commands.js'
export { UpdateLevelUpCommand } from './level-up-commands.js'
export { UpdateLocaleCommand } from './locale-commands.js'
export type { PoisonPatch } from './poison-commands.js'
export {
  AddPoisonCommand,
  DeletePoisonCommand,
  UpdatePoisonCommand,
} from './poison-commands.js'
export { RenameProjectCommand } from './project-name-command.js'
export {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  nextShopId,
  ShopInUseError,
  UpdateShopCommand,
} from './shop-commands.js'
export type { SkillPatch } from './skill-commands.js'
export { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './skill-commands.js'

// ════════════════════════════════════════════════════════════════════
// A7 资源注册表命令(音乐首切片)
// ════════════════════════════════════════════════════════════════════

/** 新增或替换资源；替换保持 AssetId，二进制按新 record.path 暂存在会话。 */
export class UpsertAssetCommand implements Command {
  readonly label = '导入资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly assetId: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    /** 旧资源可能只在磁盘上；保留字节使保存后撤销仍可物化旧 record。 */
    private readonly previousBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const previous = state.assetCatalog.assets[this.assetId]
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous &&
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, asset]) => id !== this.assetId && asset.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: {
          ...state.assetCatalog.assets,
          [this.assetId]: structuredClone(this.record),
        },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const previous = this.oldCatalog.assets[this.assetId]
    if (previous && this.previousBytes) assetBlobs[previous.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

export class AssetInUseError extends Error {
  constructor(
    readonly assetId: AssetId,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(`资源 ${assetId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'AssetInUseError'
  }
}

/** 删除未被内容引用的资源；每次 apply/redo 都用 current-author 统一索引复核。 */
export class DeleteAssetCommand implements Command {
  readonly label = '删除资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly assetId: AssetId,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
    /** 删除前预读磁盘字节，避免保存删文件后撤销只恢复空 record。 */
    private readonly previousBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (!state.assetCatalog.assets[this.assetId]) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'asset',
      id: this.assetId,
    }).blockers
    if (references.length) throw new AssetInUseError(this.assetId, references)
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const assets = { ...state.assetCatalog.assets }
    const path = assets[this.assetId]!.path
    delete assets[this.assetId]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((asset) => asset.path === path)) delete assetBlobs[path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const previous = this.oldCatalog.assets[this.assetId]
    if (previous && this.previousBytes) assetBlobs[previous.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

/** 更新 manifest.assets.roles 的一个或多个稳定 AssetId；undefined 表示清除角色绑定。 */
export class UpdateManifestAssetRolesCommand implements Command {
  readonly label = '改项目资源角色'
  private readonly patch: Partial<Record<AssetRole, AssetId | undefined>>
  private old: Partial<Record<AssetRole, AssetId | undefined>> | undefined

  constructor(patch: Partial<Record<AssetRole, AssetId | undefined>>) {
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    if (!this.old) {
      this.old = {}
      for (const role of Object.keys(this.patch) as AssetRole[])
        this.old[role] = state.manifest.assets.roles[role]
    }
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.patch) as [
      AssetRole,
      AssetId | undefined,
    ][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    const assets = { ...state.manifest.assets, roles }
    return { ...state, manifest: { ...state.manifest, assets } }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.old) as [AssetRole, AssetId | undefined][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    return {
      ...state,
      manifest: { ...state.manifest, assets: { ...state.manifest.assets, roles } },
    }
  }
}

export interface StartupEntryConfig {
  defaultEntryId: string
  entryPoints: EntryPoint[]
}

function cloneStartupEntryConfig(config: StartupEntryConfig): StartupEntryConfig {
  const defaultEntryId = config.defaultEntryId.trim()
  if (!defaultEntryId || defaultEntryId !== config.defaultEntryId)
    throw new Error('直接启动入口 id 必须是无首尾空格的非空字符串')
  if (config.entryPoints.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  const ids = new Set<string>()
  const entryPoints = config.entryPoints.map((entry, index) => {
    const id = entry.id.trim()
    if (!id) throw new Error('入口点 id 不能为空')
    if (id !== entry.id) throw new Error(`入口点 id "${entry.id}" 不得包含首尾空格`)
    if (ids.has(id)) throw new Error(`入口点 id "${id}" 重复`)
    ids.add(id)
    if (!entry.label.trim()) throw new Error(`入口点 "${id}" 的名称不能为空`)
    if (!entry.scene.trim()) throw new Error(`入口点 "${id}" 的场景不能为空`)
    const copy = structuredClone(entry)
    copy.startWorld = validateStartWorld(copy.startWorld, `entryPoints[${index}].startWorld`)
    if (copy.introVideo === undefined) delete copy.introVideo
    return copy
  })
  if (!ids.has(defaultEntryId)) throw new Error(`直接启动入口 "${defaultEntryId}" 不存在`)
  return { defaultEntryId, entryPoints }
}

function cloneNonEmptyEntryPoints(entries: readonly EntryPoint[]): [EntryPoint, ...EntryPoint[]] {
  if (entries.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  return structuredClone(entries) as [EntryPoint, ...EntryPoint[]]
}

/**
 * 原子替换直接启动入口选择器与全部真实入口。next 必须满足当前 schema；old 则按
 * 原样快照，以便编辑器可以用同一条可撤销命令修复已载入的悬空/旧引用。
 */
export class SetStartupEntriesCommand implements Command {
  readonly label = '编辑启动入口'
  private readonly next: StartupEntryConfig
  private old: StartupEntryConfig | undefined
  private captured = false

  constructor(next: StartupEntryConfig) {
    this.next = cloneStartupEntryConfig(next)
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.old = {
        defaultEntryId: state.manifest.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(state.manifest.entryPoints),
      }
      this.captured = true
    }
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.next.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.next.entryPoints),
      },
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.old.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.old.entryPoints),
      },
    }
  }
}

// ── A7-3W 大世界精灵 catalog 生命周期 ──────────────────────────────

/** 上传精灵入库：SpriteDef + catalog record + gzip 字节一次可撤销提交。 */
export class AddSpriteCommand implements Command {
  readonly label = '上传精灵'
  private readonly def: SpriteDef
  private readonly record: AssetRecordV1
  private readonly blob: ArrayBuffer
  private createdAsset = false

  constructor(def: SpriteDef, record: AssetRecordV1, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.record = structuredClone(record)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((s) => s.id === this.def.id))
      throw new Error(`精灵定义 id 已存在: ${this.def.id}`)
    if (!this.def.asset) throw new Error('精灵定义缺 AssetId')
    assertSpriteRecord(this.record, this.blob)
    const existing = state.assetCatalog.assets[this.def.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`精灵 AssetId 已存在且记录不同: ${this.def.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.def.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`精灵资源路径已由 ${pathOwner[0]} 登记`)
    this.createdAsset = !existing
    return {
      ...state,
      sprites: [...state.sprites, structuredClone(this.def)],
      assetCatalog: existing
        ? state.assetCatalog
        : {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.def.asset]: this.record },
          },
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.blob.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.def.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.def.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

export interface SpriteReplacementProof {
  asset: AssetId
  previousSha256: string
  previousFrameCount: number
  nextFrameCount: number
  consumerIds: string[]
  /** 缩帧时必须显式给出每个共享消费者的新布局/姿势；与资源替换同一撤销事务提交。 */
  repairs?: Record<string, Pick<SpriteDef, 'layout' | 'poses'>>
  /** 预览时的消费者元数据；缩帧 await 期间若变化，命令 fail-loud 而非覆盖新编辑。 */
  consumerSnapshots?: Record<string, Pick<SpriteDef, 'layout' | 'poses'>>
}

/**
 * 保持 AssetId，只替换该共享资源的 record 与 gzip 字节。
 *
 * `spriteId` 只用于在存在语义消费者时锁定一个已确认的入口；未配置资源没有
 * SpriteDef，允许显式传 `undefined`，但此时消费者必须仍为空，避免绕过共享影响确认。
 */
export class ReplaceSpriteAssetCommand implements Command {
  readonly label: string
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined
  private oldSprites: EditorState['sprites'] | undefined

  constructor(
    private readonly spriteId: string | undefined,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes: ArrayBuffer,
    private readonly proof: SpriteReplacementProof,
    label = '替换精灵资源',
  ) {
    this.label = label
  }

  apply(state: EditorState): EditorState {
    const target = this.spriteId
      ? state.sprites.find((sprite) => sprite.id === this.spriteId)
      : undefined
    if (this.spriteId && (!target || target.asset !== this.asset))
      throw new Error('精灵定义与待替换 AssetId 不一致')
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous || previous.kind !== 'sprite') throw new Error('待替换精灵资源不在 catalog')
    assertSpriteRecord(this.record, this.bytes)
    if (this.proof.asset !== this.asset || this.proof.previousSha256 !== previous.sha256)
      throw new Error('精灵替换证明已过期，请重新载入资源')
    if (
      !Number.isInteger(this.proof.previousFrameCount) ||
      this.proof.previousFrameCount <= 0 ||
      !Number.isInteger(this.proof.nextFrameCount) ||
      this.proof.nextFrameCount <= 0
    )
      throw new Error('精灵替换证明的帧数非法')
    const consumers = state.sprites
      .filter((sprite) => sprite.asset === this.asset)
      .map((sprite) => sprite.id)
      .sort()
    if (!this.spriteId && consumers.length)
      throw new Error('待替换精灵资源已有语义消费者，请重新确认影响范围')
    if (consumers.join('\0') !== [...this.proof.consumerIds].sort().join('\0'))
      throw new Error('共享精灵消费者已变化，请重新确认影响范围')
    let nextSprites = state.sprites
    if (this.proof.nextFrameCount < this.proof.previousFrameCount) {
      const repairs = this.proof.repairs
      const snapshots = this.proof.consumerSnapshots
      if (!repairs || !snapshots)
        throw new Error('精灵替换不得减少有效帧；缩帧需使用显式布局修复事务')
      const repairedIds = Object.keys(repairs).sort()
      const snapshotIds = Object.keys(snapshots).sort()
      if (
        repairedIds.join('\0') !== consumers.join('\0') ||
        snapshotIds.join('\0') !== consumers.join('\0')
      )
        throw new Error('缩帧事务必须显式修复全部共享精灵消费者')
      nextSprites = state.sprites.map((sprite) => {
        if (sprite.asset !== this.asset) return sprite
        const snapshot = snapshots[sprite.id]
        if (
          !snapshot ||
          JSON.stringify({ layout: sprite.layout, poses: sprite.poses }) !==
            JSON.stringify({ layout: snapshot.layout, poses: snapshot.poses })
        )
          throw new Error(`缩帧消费者 ${sprite.id} 的布局或姿势已变化，请重新确认`)
        const repair = repairs[sprite.id]
        if (!repair) throw new Error(`缩帧事务缺少消费者 ${sprite.id} 的布局修复`)
        const next = {
          ...sprite,
          layout: structuredClone(repair.layout),
          poses: repair.poses ? structuredClone(repair.poses) : undefined,
        }
        assertSpriteEditShape(next)
        if (spriteDefinitionFrameDemand(next) > this.proof.nextFrameCount)
          throw new Error(
            `缩帧后 ${sprite.id} 的布局/姿势仍需 ${spriteDefinitionFrameDemand(next)} 帧，资源只有 ${this.proof.nextFrameCount} 帧`,
          )
        return next
      })
    }
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`精灵替换路径已由 ${pathOwner[0]} 登记`)
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
      this.oldSprites = state.sprites
    }
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      sprites: nextSprites,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const oldRecord = this.oldCatalog.assets[this.asset]
    const assetBlobs = { ...this.oldBlobs }
    if (oldRecord) assetBlobs[oldRecord.path] = this.previousBytes.slice(0)
    return {
      ...state,
      sprites: this.oldSprites ?? state.sprites,
      assetCatalog: this.oldCatalog,
      assetBlobs,
    }
  }
}

/**
 * 给已经入库的帧资源增加一种语义用途。
 *
 * 与 AddSpriteCommand 不同，这里不创建或重写 catalog/blob；实际帧数证明把新用途
 * 约束在已经成功解码的资源事实内，避免给项目新增越界布局债。
 */
export class AddSpriteDefinitionCommand implements Command {
  readonly label = '新增精灵用途'
  private readonly definition: SpriteDef
  private added = false

  constructor(
    definition: SpriteDef,
    private readonly proof: SpriteLayoutEditProof,
  ) {
    this.definition = structuredClone(definition)
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((sprite) => sprite.id === this.definition.id))
      throw new Error(`精灵定义 id 已存在: ${this.definition.id}`)
    const record = state.assetCatalog.assets[this.definition.asset]
    if (
      record?.kind !== 'sprite' ||
      this.proof.asset !== this.definition.asset ||
      this.proof.sha256 !== record.sha256
    )
      throw new Error('精灵布局证明缺失或已过期，请等待帧资源重新载入')
    if (!Number.isInteger(this.proof.actualFrameCount) || this.proof.actualFrameCount <= 0)
      throw new Error('精灵布局证明的实际帧数非法')
    validateSprites([this.definition], state.assetCatalog)
    const demand = spriteDefinitionFrameDemand(this.definition)
    if (demand > this.proof.actualFrameCount)
      throw new Error(
        `精灵用途 ${this.definition.id} 需要 ${demand} 帧，资源实际只有 ${this.proof.actualFrameCount} 帧`,
      )
    this.added = true
    return { ...state, sprites: [...state.sprites, structuredClone(this.definition)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      sprites: state.sprites.filter((sprite) => sprite.id !== this.definition.id),
    }
  }
}

/** 删除语义定义；资产是独立对象，绝不随定义静默级联。 */
export class RemoveSpriteDefinitionCommand implements Command {
  readonly label = '删除精灵定义'
  private removed: SpriteDef | undefined
  private removedIndex: number | undefined

  constructor(
    private readonly spriteId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.sprites.findIndex((s) => s.id === this.spriteId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'world-sprite',
      id: this.spriteId,
    }).blockers
    if (references.length) throw new SpriteInUseError(`精灵定义 ${this.spriteId}`, references)
    if (!this.removed) {
      this.removed = structuredClone(state.sprites[index]!)
      this.removedIndex = index
    }
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.spriteId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const sprites = [...state.sprites]
    sprites.splice(this.removedIndex, 0, this.removed)
    return { ...state, sprites }
  }
}

/** 显式删除已无 SpriteDef 消费者的 sprite 资产；与定义删除是两个 UI 动作。 */
export class DeleteUnusedSpriteAssetCommand implements Command {
  readonly label = '删除未使用的精灵资产'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly asset: AssetId,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const record = state.assetCatalog.assets[this.asset]
    if (!record) return state
    if (state.sprites.some((sprite) => sprite.asset === this.asset))
      throw new Error(`精灵资产 ${this.asset} 仍被定义引用`)
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'asset',
      id: this.asset,
    }).blockers
    if (references.length) throw new AssetInUseError(this.asset, references)
    if (record.kind !== 'sprite') throw new Error(`AssetId ${this.asset} 不是 sprite`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    const assets = { ...state.assetCatalog.assets }
    delete assets[this.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.persistedBytes) assetBlobs[record.path] = this.persistedBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

// ── A7-3B 战斗精灵 catalog 生命周期 ──────────────────────────────

function assertBattleSpriteDefinition(
  definition: BattleSpriteDef,
  catalog: EditorState['assetCatalog'],
  actualFrameCount: number,
): void {
  validateBattleSprites([definition], catalog)
  if (!Number.isInteger(actualFrameCount) || actualFrameCount <= 0)
    throw new Error('战斗精灵实际帧数必须是正整数')
  const demand = battleSpriteDefinitionFrameDemand(definition, actualFrameCount)
  if (demand > actualFrameCount)
    throw new Error(
      `战斗精灵定义 ${definition.id} 需要 ${demand} 帧，资源实际只有 ${actualFrameCount} 帧`,
    )
}

/** 上传入库：BattleSpriteDef + catalog record + gzip 字节一次可撤销提交。 */
export class AddBattleSpriteCommand implements Command {
  readonly label = '上传战斗精灵'
  private createdAsset = false

  constructor(
    private readonly definition: BattleSpriteDef,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly actualFrameCount: number,
  ) {}

  apply(state: EditorState): EditorState {
    if (state.battleSprites.some((entry) => entry.id === this.definition.id))
      throw new Error(`战斗精灵定义 id 已存在: ${this.definition.id}`)
    assertBattleSpriteRecord(this.record, this.bytes)
    if (this.definition.asset.trim().length === 0) throw new Error('战斗精灵定义缺 AssetId')
    const existing = state.assetCatalog.assets[this.definition.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`战斗精灵 AssetId 已存在且记录不同: ${this.definition.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.definition.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`战斗精灵资源路径已由 ${pathOwner[0]} 登记`)
    const catalog = existing
      ? state.assetCatalog
      : {
          ...state.assetCatalog,
          assets: { ...state.assetCatalog.assets, [this.definition.asset]: this.record },
        }
    assertBattleSpriteDefinition(this.definition, catalog, this.actualFrameCount)
    this.createdAsset = !existing
    return {
      ...state,
      battleSprites: [...state.battleSprites, structuredClone(this.definition)],
      assetCatalog: catalog,
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.bytes.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.definition.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      battleSprites: state.battleSprites.filter((entry) => entry.id !== this.definition.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

export type BattleSpritePatch = Partial<Pick<BattleSpriteDef, 'label' | 'asset' | 'profile'>>

export interface BattleSpriteEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

/** 改定义标签/资源/profile；ABI 编辑必须绑定一次实际解码证明。 */
export class UpdateBattleSpriteDefinitionCommand implements Command {
  readonly label = '修改战斗精灵定义'
  private oldDefinition: BattleSpriteDef | undefined

  constructor(
    private readonly definitionId: string,
    private readonly patch: BattleSpritePatch,
    private readonly proof?: BattleSpriteEditProof,
    private readonly currentReferences?: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const current = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!current) return state
    const next = { ...current, ...structuredClone(this.patch) }
    const record = state.assetCatalog.assets[next.asset]
    if (!record || record.kind !== 'battle-sprite')
      throw new Error(`战斗精灵 AssetId ${next.asset} 不在 catalog`)
    if ('asset' in this.patch || 'profile' in this.patch) {
      if (!this.proof || this.proof.asset !== next.asset || this.proof.sha256 !== record.sha256)
        throw new Error('战斗精灵 ABI 证明缺失或已过期，请等待资源重新载入')
      assertBattleSpriteDefinition(next, state.assetCatalog, this.proof.actualFrameCount)
    } else validateBattleSprites([next], state.assetCatalog)
    const profileKindChanged = next.profile.kind !== current.profile.kind
    if (profileKindChanged && !this.currentReferences)
      throw new Error('修改战斗精灵 profile 类型前无法读取 current-author 引用索引')
    const wrongReference = profileKindChanged
      ? this.currentReferences!(state)
          .referencesTo({ kind: 'battle-sprite', id: this.definitionId })
          .find(
            (reference) =>
              reference.relation.kind === 'battle-sprite-use' &&
              reference.relation.expectedProfile !== next.profile.kind,
          )
      : undefined
    if (wrongReference)
      throw new Error(
        `战斗精灵定义 ${this.definitionId} 的 profile 与引用 ${wrongReference.where} 不兼容`,
      )
    this.oldDefinition ??= structuredClone(current)
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? next : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldDefinition) return state
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? this.oldDefinition! : entry,
      ),
    }
  }
}

export interface BattleSpriteReplacementProof {
  asset: AssetId
  previousSha256: string
  previousFrameCount: number
  nextFrameCount: number
  consumerIds: string[]
  repairs?: Record<string, Pick<BattleSpriteDef, 'profile'>>
  consumerSnapshots?: Record<string, Pick<BattleSpriteDef, 'profile'>>
}

/**
 * 保持 AssetId，只替换共享物理字节；缩帧必须显式修复全部消费者。
 * 未配置的原始帧源可以传 `undefined` definitionId，但命令会确保消费者仍为空。
 */
export class ReplaceBattleSpriteAssetCommand implements Command {
  readonly label = '替换战斗精灵资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined
  private oldDefinitions: EditorState['battleSprites'] | undefined

  constructor(
    private readonly definitionId: string | undefined,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes: ArrayBuffer,
    private readonly proof: BattleSpriteReplacementProof,
  ) {}

  apply(state: EditorState): EditorState {
    const target = this.definitionId
      ? state.battleSprites.find((entry) => entry.id === this.definitionId)
      : undefined
    if (this.definitionId && (!target || target.asset !== this.asset))
      throw new Error('战斗精灵定义与待替换 AssetId 不一致')
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous || previous.kind !== 'battle-sprite')
      throw new Error('待替换战斗精灵资源不在 catalog')
    assertBattleSpriteRecord(this.record, this.bytes)
    if (this.proof.asset !== this.asset || this.proof.previousSha256 !== previous.sha256)
      throw new Error('战斗精灵替换证明已过期，请重新载入资源')
    if (
      !Number.isInteger(this.proof.previousFrameCount) ||
      this.proof.previousFrameCount <= 0 ||
      !Number.isInteger(this.proof.nextFrameCount) ||
      this.proof.nextFrameCount <= 0
    )
      throw new Error('战斗精灵替换证明的帧数非法')
    const consumers = state.battleSprites
      .filter((entry) => entry.asset === this.asset)
      .map((entry) => entry.id)
      .sort()
    if (!this.definitionId && consumers.length)
      throw new Error('待替换战斗精灵资源已有语义消费者，请重新确认影响范围')
    if (consumers.join('\0') !== [...this.proof.consumerIds].sort().join('\0'))
      throw new Error('共享战斗精灵消费者已变化，请重新确认影响范围')
    let definitions = state.battleSprites
    if (this.proof.nextFrameCount < this.proof.previousFrameCount) {
      const repairs = this.proof.repairs
      const snapshots = this.proof.consumerSnapshots
      if (!repairs || !snapshots)
        throw new Error('战斗精灵替换不得减少有效帧；缩帧需使用显式 ABI 修复事务')
      if (
        Object.keys(repairs).sort().join('\0') !== consumers.join('\0') ||
        Object.keys(snapshots).sort().join('\0') !== consumers.join('\0')
      )
        throw new Error('缩帧事务必须显式修复全部共享战斗精灵消费者')
      definitions = state.battleSprites.map((entry) => {
        if (entry.asset !== this.asset) return entry
        const snapshot = snapshots[entry.id]
        if (!snapshot || JSON.stringify(entry.profile) !== JSON.stringify(snapshot.profile))
          throw new Error(`缩帧消费者 ${entry.id} 的 profile 已变化，请重新确认`)
        const repair = repairs[entry.id]
        if (!repair) throw new Error(`缩帧事务缺少消费者 ${entry.id} 的 ABI 修复`)
        if (repair.profile.kind !== entry.profile.kind)
          throw new Error(`缩帧修复不得改变消费者 ${entry.id} 的 profile 类型`)
        const next = { ...entry, profile: structuredClone(repair.profile) }
        assertBattleSpriteDefinition(
          next,
          {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.asset]: this.record },
          },
          this.proof.nextFrameCount,
        )
        return next
      })
    } else {
      for (const entry of definitions.filter((candidate) => candidate.asset === this.asset))
        assertBattleSpriteDefinition(
          entry,
          {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.asset]: this.record },
          },
          this.proof.nextFrameCount,
        )
    }
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`战斗精灵替换路径已由 ${pathOwner[0]} 登记`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    this.oldDefinitions ??= state.battleSprites
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      battleSprites: definitions,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const oldRecord = this.oldCatalog.assets[this.asset]
    const assetBlobs = { ...this.oldBlobs }
    if (oldRecord) assetBlobs[oldRecord.path] = this.previousBytes.slice(0)
    return {
      ...state,
      battleSprites: this.oldDefinitions ?? state.battleSprites,
      assetCatalog: this.oldCatalog,
      assetBlobs,
    }
  }
}

/** 删除语义定义；仍有任意持久引用时 fail-loud，资产不静默级联。 */
export class RemoveBattleSpriteDefinitionCommand implements Command {
  readonly label = '删除战斗精灵定义'
  private removed: BattleSpriteDef | undefined
  private removedIndex: number | undefined

  constructor(
    private readonly definitionId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.battleSprites.findIndex((entry) => entry.id === this.definitionId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'battle-sprite',
      id: this.definitionId,
    }).blockers
    if (references.length)
      throw new SpriteInUseError(`战斗精灵定义 ${this.definitionId}`, references)
    this.removed ??= structuredClone(state.battleSprites[index]!)
    this.removedIndex ??= index
    return {
      ...state,
      battleSprites: state.battleSprites.filter((entry) => entry.id !== this.definitionId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const definitions = [...state.battleSprites]
    definitions.splice(this.removedIndex, 0, this.removed)
    return { ...state, battleSprites: definitions }
  }
}

/** 显式删除已无 BattleSpriteDef 消费者的物理资产。 */
export class DeleteUnusedBattleSpriteAssetCommand implements Command {
  readonly label = '删除未使用的战斗精灵资产'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly asset: AssetId,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const record = state.assetCatalog.assets[this.asset]
    if (!record) return state
    if (state.battleSprites.some((entry) => entry.asset === this.asset))
      throw new Error(`战斗精灵资产 ${this.asset} 仍被定义引用`)
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'asset',
      id: this.asset,
    }).blockers
    if (references.length) throw new AssetInUseError(this.asset, references)
    if (record.kind !== 'battle-sprite') throw new Error(`AssetId ${this.asset} 不是 battle-sprite`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    const assets = { ...state.assetCatalog.assets }
    delete assets[this.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.persistedBytes) assetBlobs[record.path] = this.persistedBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

/** 只切换敌人语义定义；上传新资产时由 CompositeCommand 与 AddBattleSpriteCommand 原子组合。 */
export class SetEnemyBattleSpriteCommand implements Command {
  readonly label = '设置敌人战斗精灵'
  private previous: string | undefined

  constructor(
    private readonly enemyId: string,
    private readonly definitionId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    if (!enemy) return state
    const definition = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!definition || definition.profile.kind !== 'enemy')
      throw new Error(`敌人只能引用 enemy profile：${this.definitionId}`)
    this.previous ??= enemy.battleSprite
    return withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.definitionId })
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    return enemy ? withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.previous }) : state
  }
}

/** 只切换角色语义定义；无 battler 的角色保持 no-op。 */
export class SetActorBattleSpriteCommand implements Command {
  readonly label = '设置角色战斗精灵'
  private previous: string | undefined

  constructor(
    private readonly actorId: string,
    private readonly definitionId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const actor = state.actors.find((entry) => entry.id === this.actorId)
    if (!actor?.battler) return state
    const definition = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!definition || definition.profile.kind !== 'player-fighter')
      throw new Error(`角色只能引用 player-fighter profile：${this.definitionId}`)
    this.previous ??= actor.battler.battleSprite
    return {
      ...state,
      actors: state.actors.map((entry) =>
        entry.id === this.actorId && entry.battler
          ? {
              ...entry,
              battler: { ...entry.battler, battleSprite: this.definitionId },
            }
          : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    return {
      ...state,
      actors: state.actors.map((entry) =>
        entry.id === this.actorId && entry.battler
          ? { ...entry, battler: { ...entry.battler, battleSprite: this.previous! } }
          : entry,
      ),
    }
  }
}
