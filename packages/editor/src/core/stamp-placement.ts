import {
  mapInstanceHeight,
  mapInstanceTilesetId,
  type ProjectMap,
  type StampPlacementGroupV1,
  type StampTemplate,
} from '@type-pal/content'
import { isLatticeInside } from '@type-pal/reforge'
import type {
  MapPatchPermissionSnapshot,
  PreparedProjectMapPatch,
  ProjectMapPatch,
} from './map-patch.js'
import { ProjectMapPatchError, prepareProjectMapPatch } from './map-patch.js'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { relativeLatticeOffset, resolveRelativeLatticeOffset } from './map-transform.js'
import { buildStampPlacementIndex } from './stamp-ownership.js'

export {
  buildStampPlacementIndex,
  directStampPlacementOwners,
  type StampPlacementIndex,
} from './stamp-ownership.js'

export interface StampLayerMapping {
  layerSlotId: string
  targetLayerId: string
}

export type StampPlacementConflictPolicy = 'reject' | 'overwrite'

export type StampPlacementIssueCode =
  | 'anchor-out-of-bounds'
  | 'mapping-missing'
  | 'mapping-unknown-slot'
  | 'mapping-duplicate-slot'
  | 'target-layer-missing'
  | 'hidden-layer'
  | 'locked-layer'
  | 'missing-tile'
  | 'invalid-coordinate'
  | 'out-of-bounds'
  | 'ambiguous-destination'
  | 'visual-owned'
  | 'collision-owned'
  | 'placement-id-duplicate'
  | 'patch-invalid'

export interface StampPlacementIssue {
  code: StampPlacementIssueCode
  message: string
  layerSlotId?: string
  ref?: VisualSlotRef | GridPointRef
  ownerPlacementId?: string
}

export interface StampPlacementConflict {
  channel: 'visual' | 'collision'
  ref: VisualSlotRef | GridPointRef
  currentValue: number
  incomingValue: number
}

export interface ResolvedStampVisual {
  layerSlotId: string
  targetLayerId: string
  targetLayerIndex: number
  ref: VisualSlotRef
  tileId: number
  tilesetId: string
  relativeHeight: number
  height: number
}

export interface ResolvedStampCollision {
  ref: GridPointRef
  value: number
}

export interface StampPlacementPlan {
  mapId: string
  baseMap: ProjectMap
  mapRevision: number
  template: StampTemplate
  anchor: GridPointRef
  /** 放置基准高度；template.heights 都是相对此值的增量。 */
  placementBaseHeight: number
  mappings: StampLayerMapping[]
  permission: MapPatchPermissionSnapshot
  resolvedVisual: ResolvedStampVisual[]
  resolvedCollision: ResolvedStampCollision[]
  patch: ProjectMapPatch
  placement: StampPlacementGroupV1
  conflicts: StampPlacementConflict[]
  issues: StampPlacementIssue[]
  preparedPatch?: PreparedProjectMapPatch
  canApply: boolean
}

export interface PlanStampPlacementInput {
  mapId: string
  map: ProjectMap
  mapRevision: number
  template: StampTemplate
  anchor: GridPointRef
  placementBaseHeight: number
  mappings: readonly StampLayerMapping[]
  permission: Pick<MapPatchPermissionSnapshot, 'hiddenLayerIds' | 'lockedLayerIds'>
  availableTileIdsByTileset: ReadonlyMap<string, ReadonlySet<number>>
  conflictPolicy: StampPlacementConflictPolicy
  placementId?: string
}

function normalizedIdStem(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function nextStampPlacementId(map: ProjectMap, preferred = 'stamp-placement'): string {
  const used = buildStampPlacementIndex(map).byId
  const stem = normalizedIdStem(preferred) || 'stamp-placement'
  if (!used.has(stem)) return stem
  for (let index = 2; ; index++) {
    const candidate = `${stem}-${index}`
    if (!used.has(candidate)) return candidate
  }
}

function issue(
  issues: StampPlacementIssue[],
  code: StampPlacementIssueCode,
  message: string,
  extra: Omit<StampPlacementIssue, 'code' | 'message'> = {},
): void {
  issues.push({ code, message, ...extra })
}

/** 组合相对高度的唯一落地公式。 */
export function stampPlacementActualHeight(baseHeight: number, relativeHeight: number): number {
  if (!Number.isSafeInteger(baseHeight) || baseHeight < 0)
    throw new Error(`组合放置基准高度必须是非负安全整数，收到 ${baseHeight}`)
  if (!Number.isSafeInteger(relativeHeight) || relativeHeight < 0)
    throw new Error(`组合相对高度必须是非负安全整数，收到 ${relativeHeight}`)
  return baseHeight + relativeHeight
}

export function planStampPlacement(input: PlanStampPlacementInput): StampPlacementPlan {
  const { map, template, anchor } = input
  const issues: StampPlacementIssue[] = []
  const conflicts: StampPlacementConflict[] = []
  const mappings = input.mappings.map((mapping) => ({ ...mapping }))
  const placementId = input.placementId ?? nextStampPlacementId(map, `${template.id}-placement`)
  const placementIndex = buildStampPlacementIndex(map)
  let placementBaseHeight = input.placementBaseHeight
  try {
    placementBaseHeight = stampPlacementActualHeight(input.placementBaseHeight, 0)
  } catch (cause) {
    issue(issues, 'patch-invalid', cause instanceof Error ? cause.message : String(cause))
  }
  if (
    !Number.isInteger(anchor.row) ||
    !Number.isInteger(anchor.col) ||
    !isLatticeInside(map, anchor)
  )
    issue(issues, 'anchor-out-of-bounds', '组合锚点必须是地图内的整数格点。', {
      ref: { ...anchor },
    })
  if (placementIndex.byId.has(placementId))
    issue(issues, 'placement-id-duplicate', `放置组 ID "${placementId}" 已存在。`)

  const layerById = new Map(template.layers.map((layer) => [layer.id, layer] as const))
  const mappingsByLayer = new Map<string, StampLayerMapping[]>()
  for (const mapping of mappings) {
    if (!layerById.has(mapping.layerSlotId)) {
      issue(issues, 'mapping-unknown-slot', `映射引用未知组合图层 "${mapping.layerSlotId}"。`, {
        layerSlotId: mapping.layerSlotId,
      })
      continue
    }
    const bucket = mappingsByLayer.get(mapping.layerSlotId)
    if (bucket) bucket.push(mapping)
    else mappingsByLayer.set(mapping.layerSlotId, [mapping])
  }

  const targetLayerBySource = new Map<string, ProjectMap['layers'][number]>()
  const targetLayerIndexById = new Map(map.layers.map((layer, index) => [layer.id, index]))
  const hidden = new Set(input.permission.hiddenLayerIds)
  const locked = new Set(input.permission.lockedLayerIds)
  for (const sourceLayer of template.layers) {
    const matches = mappingsByLayer.get(sourceLayer.id) ?? []
    if (matches.length === 0) {
      issue(issues, 'mapping-missing', `组合图层 "${sourceLayer.name}" 尚未映射目标图层。`, {
        layerSlotId: sourceLayer.id,
      })
      continue
    }
    if (matches.length > 1) {
      issue(issues, 'mapping-duplicate-slot', `组合图层 "${sourceLayer.name}" 被重复映射。`, {
        layerSlotId: sourceLayer.id,
      })
      continue
    }
    const targetLayerId = matches[0]!.targetLayerId
    const target = map.layers.find(({ id }) => id === targetLayerId)
    if (!target) {
      issue(issues, 'target-layer-missing', `目标图层 "${targetLayerId}" 不存在。`, {
        layerSlotId: sourceLayer.id,
      })
      continue
    }
    targetLayerBySource.set(sourceLayer.id, target)
    if (hidden.has(target.id))
      issue(issues, 'hidden-layer', `目标图层 "${target.name}" 已隐藏，整组不能放置。`, {
        layerSlotId: sourceLayer.id,
      })
    if (locked.has(target.id))
      issue(issues, 'locked-layer', `目标图层 "${target.name}" 已锁定，整组不能放置。`, {
        layerSlotId: sourceLayer.id,
      })
  }

  const resolvedVisual: ResolvedStampVisual[] = []
  const visualDestinations = new Set<string>()
  for (const sourceLayer of template.layers) {
    const target = targetLayerBySource.get(sourceLayer.id)
    if (!target) continue
    for (let row = 0; row < template.height * 2; row++)
      for (let col = 0; col < template.width; col++) {
        const tileId = sourceLayer.tiles[row]?.[col]
        if (tileId === null || tileId === undefined) continue
        const tilesetId = mapInstanceTilesetId(template, sourceLayer, row, col)
        if (!tilesetId) {
          issue(issues, 'patch-invalid', `组合视觉实例 ${sourceLayer.id}:${row}:${col} 缺少来源。`)
          continue
        }
        if (!input.availableTileIdsByTileset.get(tilesetId)?.has(tileId))
          issue(issues, 'missing-tile', `瓦片集 ${tilesetId} 缺少 #${tileId}。`, {
            layerSlotId: sourceLayer.id,
          })
        const point = resolveRelativeLatticeOffset(
          anchor,
          relativeLatticeOffset({ row, col }, template.anchor),
        )
        const ref = { layerId: target.id, ...point }
        if (!Number.isInteger(point.row) || !Number.isInteger(point.col)) {
          issue(issues, 'invalid-coordinate', '组合视觉实例解析到非整数格点。', {
            layerSlotId: sourceLayer.id,
            ref,
          })
          continue
        }
        if (!isLatticeInside(map, point)) {
          issue(issues, 'out-of-bounds', '组合视觉实例越出地图边界。', {
            layerSlotId: sourceLayer.id,
            ref,
          })
          continue
        }
        const key = visualSlotKey(ref)
        if (visualDestinations.has(key)) {
          issue(issues, 'ambiguous-destination', `多个组合实例映射到同一视觉槽 ${key}。`, {
            layerSlotId: sourceLayer.id,
            ref,
          })
          continue
        }
        visualDestinations.add(key)
        const owner = placementIndex.visualOwnerByKey.get(key)
        if (owner)
          issue(issues, 'visual-owned', `视觉槽 ${key} 已属于放置组 "${owner}"，不能覆盖。`, {
            layerSlotId: sourceLayer.id,
            ref,
            ownerPlacementId: owner,
          })
        else {
          const currentTile = target.tiles[point.row]?.[point.col]
          if (currentTile !== null && currentTile !== undefined)
            conflicts.push({
              channel: 'visual',
              ref,
              currentValue: currentTile,
              incomingValue: tileId,
            })
        }
        const relativeHeight = mapInstanceHeight(sourceLayer, row, col)
        resolvedVisual.push({
          layerSlotId: sourceLayer.id,
          targetLayerId: target.id,
          targetLayerIndex: targetLayerIndexById.get(target.id) ?? -1,
          ref,
          tileId,
          tilesetId,
          relativeHeight,
          height: stampPlacementActualHeight(placementBaseHeight, relativeHeight),
        })
      }
  }

  const resolvedCollision: ResolvedStampCollision[] = []
  const collisionDestinations = new Set<string>()
  for (let row = 0; row < template.height * 2; row++)
    for (let col = 0; col < template.width; col++) {
      const value = template.collision[row]?.[col]
      if (value === null || value === undefined) continue
      const point = resolveRelativeLatticeOffset(
        anchor,
        relativeLatticeOffset({ row, col }, template.anchor),
      )
      if (!isLatticeInside(map, point)) {
        issue(issues, 'out-of-bounds', '组合碰撞实例越出地图边界。', { ref: point })
        continue
      }
      const key = gridPointKey(point)
      if (collisionDestinations.has(key)) {
        issue(issues, 'ambiguous-destination', `多个碰撞实例映射到同一格点 ${key}。`, {
          ref: point,
        })
        continue
      }
      collisionDestinations.add(key)
      const owner = placementIndex.collisionOwnerByKey.get(key)
      if (owner)
        issue(issues, 'collision-owned', `碰撞格点 ${key} 已属于放置组 "${owner}"。`, {
          ref: point,
          ownerPlacementId: owner,
        })
      else {
        const currentValue = map.collision[point.row]?.[point.col]
        if (currentValue !== undefined && currentValue !== 0)
          conflicts.push({
            channel: 'collision',
            ref: point,
            currentValue,
            incomingValue: value,
          })
      }
      resolvedCollision.push({ ref: point, value })
    }

  const patch: ProjectMapPatch = {
    visual: resolvedVisual.flatMap((member) => [
      { channel: 'tileId' as const, ref: member.ref, value: member.tileId },
      { channel: 'tilesetId' as const, ref: member.ref, value: member.tilesetId },
      { channel: 'height' as const, ref: member.ref, value: member.height },
    ]),
    collision: resolvedCollision.map((member) => ({ ref: member.ref, value: member.value })),
  }
  const requiredWritableLayerIds = [
    ...new Set(resolvedVisual.map(({ targetLayerId }) => targetLayerId)),
  ]
  const permission: MapPatchPermissionSnapshot = {
    hiddenLayerIds: [...input.permission.hiddenLayerIds],
    lockedLayerIds: [...input.permission.lockedLayerIds],
    requiredWritableLayerIds,
  }
  let preparedPatch: PreparedProjectMapPatch | undefined
  if (!issues.length)
    try {
      preparedPatch = prepareProjectMapPatch(map, patch, permission)
    } catch (cause) {
      if (cause instanceof ProjectMapPatchError)
        for (const patchIssue of cause.issues)
          issue(issues, 'patch-invalid', patchIssue.message, {
            ...(patchIssue.ref ? { ref: patchIssue.ref } : {}),
          })
      else issue(issues, 'patch-invalid', cause instanceof Error ? cause.message : String(cause))
    }

  const placement: StampPlacementGroupV1 = {
    id: placementId,
    sourceStampId: template.id,
    sourceStampName: template.name,
    anchor: { ...anchor },
    visualSlots: resolvedVisual.map(({ ref }) => ({ ...ref })),
    gridPoints: resolvedCollision.map(({ ref }) => ({ ...ref })),
  }
  return {
    mapId: input.mapId,
    baseMap: map,
    mapRevision: input.mapRevision,
    template: structuredClone(template),
    anchor: { ...anchor },
    placementBaseHeight,
    mappings,
    permission,
    resolvedVisual,
    resolvedCollision,
    patch,
    placement,
    conflicts,
    issues,
    preparedPatch,
    canApply:
      issues.length === 0 &&
      preparedPatch !== undefined &&
      (input.conflictPolicy === 'overwrite' || conflicts.length === 0),
  }
}
