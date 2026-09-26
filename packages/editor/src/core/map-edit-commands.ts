/**
 * 地图编辑命令族：画瓦片/碰撞、选区 patch、图层与改尺寸。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import { mapInstanceHeight, mapInstanceTilesetId } from '@type-pal/content'
import type {
  IsometricMapLayer,
  ProjectMap,
  ProjectMapCollisionEdit,
  ProjectMapTileEdit,
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
import type { EditorState } from './edit-session.js'
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
import {
  resolveStampStructureOperation,
  type StampStructureResolutionOptions,
} from './stamp-lifecycle.js'
import { inheritStampPlacementIndex } from './stamp-ownership.js'

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
