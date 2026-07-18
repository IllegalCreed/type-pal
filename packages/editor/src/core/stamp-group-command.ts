import type { ProjectMap, StampPlacementGroupV1 } from '@type-pal/content'
import { projectMapStampPlacements, withProjectMapStampPlacements } from '@type-pal/reforge'
import type { Command } from './commands.js'
import type { EditorState } from './edit-session.js'
import {
  applyPreparedProjectMapPatch,
  cloneProjectMapPatch,
  type MapPatchPermissionSnapshot,
  type ProjectMapPatch,
  preparedProjectMapPatchChanged,
  prepareProjectMapPatch,
  prepareStampGroupMemberPatch,
} from './map-patch.js'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import type { StampGroupTransformPlan } from './stamp-group-transform.js'
import { buildStampPlacementIndex } from './stamp-ownership.js'

export class StampGroupCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StampGroupCommandError'
  }
}

export interface EditStampPlacementCommandInput {
  mapId: string
  map: ProjectMap
  placementId: string
  activeLayerId: string
  patch: ProjectMapPatch
  permission: Pick<MapPatchPermissionSnapshot, 'hiddenLayerIds' | 'lockedLayerIds'>
  /** 擦除视觉成员：清空普通值并同步缩减 identity。 */
  removeVisualSlots?: readonly VisualSlotRef[]
  /** 显式移出碰撞 membership；保留碰撞矩阵当前值。 */
  removeGridPoints?: readonly GridPointRef[]
  label?: string
}

function clonePlacement(placement: StampPlacementGroupV1): StampPlacementGroupV1 {
  return {
    ...placement,
    anchor: { ...placement.anchor },
    visualSlots: placement.visualSlots.map((ref) => ({ ...ref })),
    gridPoints: placement.gridPoints.map((ref) => ({ ...ref })),
  }
}

function withPlacementsPreservingMatrices(
  map: ProjectMap,
  placements: readonly StampPlacementGroupV1[],
): ProjectMap {
  const validated = withProjectMapStampPlacements(map, placements)
  return validated.version === 3
    ? { ...validated, layers: map.layers, collision: map.collision }
    : validated
}

/** 当前 placement + 当前显式活动层的窄编辑原子。 */
export class EditStampPlacementCommand implements Command {
  readonly label: string
  private readonly mapId: string
  private readonly beforeMap: ProjectMap
  private readonly afterMap: ProjectMap

  constructor(input: EditStampPlacementCommandInput) {
    this.label = input.label ?? '编辑图章放置组成员'
    this.mapId = input.mapId
    this.beforeMap = input.map

    const index = buildStampPlacementIndex(input.map)
    const placement = index.byId.get(input.placementId)
    if (!placement)
      throw new StampGroupCommandError(`图章放置组 "${input.placementId}" 不存在或已被移除。`)
    const activeLayer = input.map.layers.find((layer) => layer.id === input.activeLayerId)
    if (!activeLayer)
      throw new StampGroupCommandError(`活动图层 "${input.activeLayerId}" 不存在，不能组内编辑。`)

    const patch = cloneProjectMapPatch(input.patch)
    const memberVisualKeys = new Set(placement.visualSlots.map(visualSlotKey))
    const memberGridKeys = new Set(placement.gridPoints.map(gridPointKey))
    const removeVisualKeys = new Set<string>()
    const removeGridKeys = new Set<string>()

    for (const ref of input.removeVisualSlots ?? []) {
      const key = visualSlotKey(ref)
      if (!memberVisualKeys.has(key))
        throw new StampGroupCommandError(`视觉槽 ${key} 不属于放置组 "${placement.id}"。`)
      if (ref.layerId !== input.activeLayerId)
        throw new StampGroupCommandError('组内视觉编辑只能作用于当前活动层成员。')
      removeVisualKeys.add(key)
    }
    for (const write of patch.visual) {
      if (write.ref.layerId !== input.activeLayerId)
        throw new StampGroupCommandError('组内视觉编辑只能作用于当前活动层成员。')
      if (write.channel === 'tileId' && write.value === null) {
        const key = visualSlotKey(write.ref)
        if (!memberVisualKeys.has(key))
          throw new StampGroupCommandError(`视觉槽 ${key} 不属于放置组 "${placement.id}"。`)
        removeVisualKeys.add(key)
      }
    }
    for (const ref of input.removeGridPoints ?? []) {
      const key = gridPointKey(ref)
      if (!memberGridKeys.has(key))
        throw new StampGroupCommandError(`碰撞格点 ${key} 不属于放置组 "${placement.id}"。`)
      removeGridKeys.add(key)
    }
    const collisionWriteRemovedFromGroup = patch.collision.find((write) =>
      removeGridKeys.has(gridPointKey(write.ref)),
    )
    if (collisionWriteRemovedFromGroup)
      throw new StampGroupCommandError(
        `碰撞格点 ${gridPointKey(collisionWriteRemovedFromGroup.ref)} 不能同时修改并移出放置组；移出 membership 必须保留当前矩阵值。`,
      )

    const visual = patch.visual.filter((write) => {
      const key = visualSlotKey(write.ref)
      return !removeVisualKeys.has(key)
    })
    for (const key of removeVisualKeys) {
      const ref = placement.visualSlots.find((candidate) => visualSlotKey(candidate) === key)!
      visual.push({ channel: 'tileId', ref: { ...ref }, value: null })
      if (activeLayer.depthMode === 'height')
        visual.push({ channel: 'height', ref: { ...ref }, value: 0 })
    }
    const normalizedPatch: ProjectMapPatch = { visual, collision: patch.collision }
    const nextVisualSlots = placement.visualSlots.filter(
      (ref) => !removeVisualKeys.has(visualSlotKey(ref)),
    )
    if (nextVisualSlots.length === 0)
      throw new StampGroupCommandError('不能擦除放置组最后一个视觉成员；请删除整组或先解组。')
    const nextGridPoints = placement.gridPoints.filter(
      (ref) => !removeGridKeys.has(gridPointKey(ref)),
    )
    const touchesCollision = normalizedPatch.collision.length > 0 || removeGridKeys.size > 0
    const requiredWritableLayerIds = touchesCollision
      ? [...new Set(placement.visualSlots.map((ref) => ref.layerId))]
      : [input.activeLayerId]
    const permission: MapPatchPermissionSnapshot = {
      hiddenLayerIds: [...input.permission.hiddenLayerIds],
      lockedLayerIds: [...input.permission.lockedLayerIds],
      requiredWritableLayerIds,
    }
    const prepared = prepareStampGroupMemberPatch(
      input.map,
      normalizedPatch,
      permission,
      placement.id,
    )
    const structuralChange = removeVisualKeys.size > 0 || removeGridKeys.size > 0
    if (!preparedProjectMapPatchChanged(prepared) && !structuralChange) {
      this.afterMap = this.beforeMap
      return
    }

    const withValues = applyPreparedProjectMapPatch(input.map, prepared, 'next')
    const nextPlacement: StampPlacementGroupV1 = {
      ...clonePlacement(placement),
      visualSlots: nextVisualSlots.map((ref) => ({ ...ref })),
      gridPoints: nextGridPoints.map((ref) => ({ ...ref })),
    }
    this.afterMap = withPlacementsPreservingMatrices(
      withValues,
      projectMapStampPlacements(input.map).map((candidate) =>
        candidate.id === placement.id ? nextPlacement : clonePlacement(candidate),
      ),
    )
  }

  apply(state: EditorState): EditorState {
    const current = state.maps[this.mapId]
    if (!current) throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    if (current !== this.beforeMap)
      throw new StampGroupCommandError('图章放置组编辑计划已过期；请按当前地图重新操作。')
    if (this.afterMap === this.beforeMap) return state
    return { ...state, maps: { ...state.maps, [this.mapId]: this.afterMap } }
  }

  invert(state: EditorState): EditorState {
    if (this.afterMap === this.beforeMap) return state
    if (!state.maps[this.mapId])
      throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    return { ...state, maps: { ...state.maps, [this.mapId]: this.beforeMap } }
  }
}

export interface UngroupStampPlacementsCommandInput {
  mapId: string
  map: ProjectMap
  placementIds: readonly string[]
  permission: Pick<MapPatchPermissionSnapshot, 'hiddenLayerIds' | 'lockedLayerIds'>
}

/** 只移除 identity；普通矩阵的引用和值均保持不变。 */
export class UngroupStampPlacementsCommand implements Command {
  readonly label: string
  private readonly mapId: string
  private readonly beforeMap: ProjectMap
  private readonly afterMap: ProjectMap

  constructor(input: UngroupStampPlacementsCommandInput) {
    this.mapId = input.mapId
    this.beforeMap = input.map
    const ids = [...new Set(input.placementIds)]
    if (ids.length === 0) throw new StampGroupCommandError('请先选择至少一个图章放置组。')
    const index = buildStampPlacementIndex(input.map)
    const missing = ids.find((id) => !index.byId.has(id))
    if (missing) throw new StampGroupCommandError(`图章放置组 "${missing}" 不存在或已被移除。`)
    const selected = ids.map((id) => index.byId.get(id)!)
    const requiredWritableLayerIds = [
      ...new Set(selected.flatMap((placement) => placement.visualSlots.map((ref) => ref.layerId))),
    ]
    prepareProjectMapPatch(
      input.map,
      { visual: [], collision: [] },
      {
        hiddenLayerIds: [...input.permission.hiddenLayerIds],
        lockedLayerIds: [...input.permission.lockedLayerIds],
        requiredWritableLayerIds,
      },
    )
    const removed = new Set(ids)
    this.afterMap = withPlacementsPreservingMatrices(
      input.map,
      projectMapStampPlacements(input.map)
        .filter((placement) => !removed.has(placement.id))
        .map(clonePlacement),
    )
    this.label = ids.length === 1 ? `解组“${ids[0]}”` : `解组 ${ids.length} 个图章放置组`
  }

  apply(state: EditorState): EditorState {
    const current = state.maps[this.mapId]
    if (!current) throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    if (current !== this.beforeMap)
      throw new StampGroupCommandError('解组计划已过期；请按当前地图重新操作。')
    return { ...state, maps: { ...state.maps, [this.mapId]: this.afterMap } }
  }

  invert(state: EditorState): EditorState {
    if (!state.maps[this.mapId])
      throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    return { ...state, maps: { ...state.maps, [this.mapId]: this.beforeMap } }
  }
}

/** 整组矩阵 + placement metadata 的单一可逆命令。 */
export class TransformStampPlacementsCommand implements Command {
  readonly label: string
  private readonly mapId: string
  private readonly beforeMap: ProjectMap
  private readonly afterMap: ProjectMap

  constructor(plan: StampGroupTransformPlan) {
    if (!plan.canApply || !plan.changed || !plan.preparedPatch)
      throw new StampGroupCommandError(
        plan.issues[0]?.message ??
          (plan.conflicts.length > 0
            ? `组合目标有 ${plan.conflicts.length} 处普通内容冲突。`
            : '组合变换计划不可提交。'),
      )
    this.mapId = plan.mapId
    this.beforeMap = plan.baseMap
    this.label =
      plan.kind === 'move'
        ? '移动放置组合'
        : plan.kind === 'paste'
          ? '复制放置组合'
          : '删除放置组合'
    const withValues = applyPreparedProjectMapPatch(
      plan.baseMap,
      structuredClone(plan.preparedPatch),
      'next',
    )
    const removed = new Set(plan.removePlacementIds)
    this.afterMap = withProjectMapStampPlacements(withValues, [
      ...projectMapStampPlacements(plan.baseMap)
        .filter((placement) => !removed.has(placement.id))
        .map(clonePlacement),
      ...plan.upsertPlacements.map(clonePlacement),
    ])
  }

  apply(state: EditorState): EditorState {
    const current = state.maps[this.mapId]
    if (!current) throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    if (current !== this.beforeMap)
      throw new StampGroupCommandError('组合变换计划已过期；请按当前地图重新预览后提交。')
    return { ...state, maps: { ...state.maps, [this.mapId]: this.afterMap } }
  }

  invert(state: EditorState): EditorState {
    if (!state.maps[this.mapId])
      throw new StampGroupCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    return { ...state, maps: { ...state.maps, [this.mapId]: this.beforeMap } }
  }
}
