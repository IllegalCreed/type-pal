import type { ProjectMap } from '@type-pal/content'
import {
  projectMapStampPlacements,
  removeProjectMapLayer,
  resizeProjectMap,
} from '@type-pal/reforge'
import {
  applyPreparedProjectMapPatch,
  type MapPatchPermissionSnapshot,
  type ProjectMapPatch,
  prepareProjectMapPatch,
} from './map-patch.js'
import { inheritStampPlacementIndex } from './stamp-ownership.js'
import { applyStampPlacementMutation } from './stamp-placement-mutation.js'

export type StampStructureOperation =
  | { kind: 'remove-layer'; layerId: string }
  | { kind: 'resize'; width: number; height: number }
  | { kind: 'set-tileset'; tilesetId: string }

export type StampStructureResolution = 'reject' | 'ungroup' | 'delete-groups'

type StampStructurePermission = Pick<
  MapPatchPermissionSnapshot,
  'hiddenLayerIds' | 'lockedLayerIds'
>

export type StampStructureResolutionOptions =
  | {
      resolution?: 'reject'
      permission?: never
      /** 对话打开时的地图引用；和 map revision 一起封住过期确认。 */
      expectedMap?: ProjectMap
    }
  | {
      resolution: Exclude<StampStructureResolution, 'reject'>
      permission: StampStructurePermission
      /** 对话打开时的地图引用；和 map revision 一起封住过期确认。 */
      expectedMap?: ProjectMap
    }

export interface StampStructureImpact {
  placementIds: string[]
}

export class StampStructureLifecycleError extends Error {
  readonly placementIds: readonly string[]

  constructor(message: string, placementIds: readonly string[] = []) {
    super(message)
    this.name = 'StampStructureLifecycleError'
    this.placementIds = [...placementIds]
  }
}

function insideSize(width: number, height: number, ref: { row: number; col: number }): boolean {
  return ref.row >= 0 && ref.row < height * 2 && ref.col >= 0 && ref.col < width
}

/** 只报告会破坏 placement 完整性的结构操作；扩图、改名、重排均不受影响。 */
export function inspectStampStructureImpact(
  map: ProjectMap,
  operation: StampStructureOperation,
): StampStructureImpact {
  if (
    (operation.kind === 'resize' &&
      operation.width === map.width &&
      operation.height === map.height) ||
    (operation.kind === 'set-tileset' && operation.tilesetId === map.tilesetId) ||
    (operation.kind === 'remove-layer' &&
      (map.layers.length <= 1 || !map.layers.some((layer) => layer.id === operation.layerId)))
  )
    return { placementIds: [] }

  const placementIds = projectMapStampPlacements(map).flatMap((placement) => {
    const affected =
      operation.kind === 'remove-layer'
        ? placement.visualSlots.some((ref) => ref.layerId === operation.layerId)
        : operation.kind === 'set-tileset'
          ? true
          : !insideSize(operation.width, operation.height, placement.anchor) ||
            placement.visualSlots.some(
              (ref) => !insideSize(operation.width, operation.height, ref),
            ) ||
            placement.gridPoints.some((ref) => !insideSize(operation.width, operation.height, ref))
    return affected ? [placement.id] : []
  })
  return { placementIds }
}

function deletePlacementContentPatch(map: ProjectMap, placementIds: ReadonlySet<string>) {
  const placements = projectMapStampPlacements(map).filter((placement) =>
    placementIds.has(placement.id),
  )
  const visual: ProjectMapPatch['visual'][number][] = []
  for (const placement of placements) {
    for (const ref of placement.visualSlots) {
      visual.push({ channel: 'tileId', ref: { ...ref }, value: null })
      if (map.layers.find((layer) => layer.id === ref.layerId)?.depthMode === 'height')
        visual.push({ channel: 'height', ref: { ...ref }, value: 0 })
    }
  }
  return {
    visual,
    collision: placements.flatMap((placement) =>
      placement.gridPoints.map((ref) => ({ ref: { ...ref }, value: 0 })),
    ),
  } satisfies ProjectMapPatch
}

function applyStructureOperation(map: ProjectMap, operation: StampStructureOperation): ProjectMap {
  switch (operation.kind) {
    case 'remove-layer':
      return removeProjectMapLayer(map, operation.layerId)
    case 'resize':
      return resizeProjectMap(map, operation.width, operation.height)
    case 'set-tileset':
      return map.tilesetId === operation.tilesetId
        ? map
        : { ...map, tilesetId: operation.tilesetId }
  }
}

/**
 * S13 唯一结构入口：默认 fail-loud；显式解组/删除受影响整组与结构变化在同一 map 原子中完成。
 */
export function resolveStampStructureOperation(
  map: ProjectMap,
  operation: StampStructureOperation,
  options: StampStructureResolutionOptions = {},
): ProjectMap {
  if (options.expectedMap && options.expectedMap !== map)
    throw new StampStructureLifecycleError('结构操作确认已过期；请按当前地图重新确认。')

  const impact = inspectStampStructureImpact(map, operation)
  if (impact.placementIds.length === 0) {
    const next = applyStructureOperation(map, operation)
    inheritStampPlacementIndex(map, next)
    return next
  }

  const resolution = options.resolution ?? 'reject'
  if (resolution === 'reject')
    throw new StampStructureLifecycleError(
      `此结构操作会破坏 ${impact.placementIds.length} 个组合；请取消，或显式选择“先解组”/“删除整组后继续”。`,
      impact.placementIds,
    )

  if (!options.permission)
    throw new StampStructureLifecycleError('解组或删除整组前必须显式声明图层可写权限。')

  const removed = new Set(impact.placementIds)
  const affected = projectMapStampPlacements(map).filter((placement) => removed.has(placement.id))
  const requiredWritableLayerIds = [
    ...new Set(affected.flatMap((placement) => placement.visualSlots.map((ref) => ref.layerId))),
  ]
  const withoutAffected = applyStampPlacementMutation(map, map, {
    removedPlacementIds: impact.placementIds,
  })
  const permission: MapPatchPermissionSnapshot = {
    hiddenLayerIds: [...options.permission.hiddenLayerIds],
    lockedLayerIds: [...options.permission.lockedLayerIds],
    requiredWritableLayerIds,
  }
  const patch =
    resolution === 'delete-groups'
      ? deletePlacementContentPatch(map, removed)
      : ({ visual: [], collision: [] } satisfies ProjectMapPatch)
  const prepared = prepareProjectMapPatch(withoutAffected, patch, permission)
  const resolved = applyPreparedProjectMapPatch(withoutAffected, prepared, 'next')
  const next = applyStructureOperation(resolved, operation)
  inheritStampPlacementIndex(resolved, next)
  return next
}
