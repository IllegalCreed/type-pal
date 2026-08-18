/** W8 跨层、跨通道地图 patch 的预检与纯应用。 */
import type { ProjectMap, ProjectMapCollisionEdit, ProjectMapTileEdit } from '@type-pal/reforge'
import {
  mapInstanceHeight,
  mapInstanceTilesetId,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { buildStampPlacementIndex, inheritStampPlacementIndex } from './stamp-ownership.js'

export type ProjectMapVisualWrite =
  | { channel: 'tileId'; ref: VisualSlotRef; value: number | null }
  | { channel: 'tilesetId'; ref: VisualSlotRef; value: string | null }
  | { channel: 'height'; ref: VisualSlotRef; value: number }

export interface ProjectMapCollisionWrite {
  ref: GridPointRef
  value: number
}

export interface ProjectMapPatch {
  visual: readonly ProjectMapVisualWrite[]
  collision: readonly ProjectMapCollisionWrite[]
}

export interface MapPatchPermissionSnapshot {
  hiddenLayerIds: readonly string[]
  lockedLayerIds: readonly string[]
  /** collision 没有 layerId；调用动作必须声明它受哪些活动/目标层权限约束。 */
  requiredWritableLayerIds: readonly string[]
}

export type MapPatchIssueCode =
  | 'map-missing'
  | 'invalid-coordinate'
  | 'out-of-bounds'
  | 'layer-missing'
  | 'duplicate-channel'
  | 'invalid-value'
  | 'missing-source'
  | 'null-height'
  | 'hidden-layer'
  | 'locked-layer'
  | 'collision-authority-missing'
  | 'visual-owned'
  | 'collision-owned'
  | 'outside-stamp-group'
  | 'stamp-placement-missing'

export interface MapPatchIssue {
  code: MapPatchIssueCode
  message: string
  ref?: VisualSlotRef | GridPointRef
  ownerPlacementId?: string
}

export class ProjectMapPatchError extends Error {
  readonly issues: readonly MapPatchIssue[]

  constructor(issues: readonly MapPatchIssue[]) {
    super(issues.map((issue) => issue.message).join('；'))
    this.name = 'ProjectMapPatchError'
    this.issues = [...issues]
  }
}

export interface FullVisualSlotWrite extends VisualSlotRef {
  tileId: number | null
  tilesetId: string | null
  height: number
}

export interface FullCollisionWrite extends GridPointRef {
  value: number
}

export interface PreparedProjectMapPatch {
  nextVisual: FullVisualSlotWrite[]
  prevVisual: FullVisualSlotWrite[]
  nextCollision: FullCollisionWrite[]
  prevCollision: FullCollisionWrite[]
}

function validCoordinate(ref: GridPointRef): boolean {
  return Number.isInteger(ref.row) && Number.isInteger(ref.col)
}

function inside(map: ProjectMap, ref: GridPointRef): boolean {
  return ref.row >= 0 && ref.row < map.height * 2 && ref.col >= 0 && ref.col < map.width
}

function validNonNegative(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

function pushRefIssue(
  issues: MapPatchIssue[],
  code: MapPatchIssueCode,
  message: string,
  ref: VisualSlotRef | GridPointRef,
): void {
  issues.push({ code, message, ref: { ...ref } })
}

type MapPatchOwnershipScope =
  | { kind: 'ordinary' }
  | { kind: 'stamp-group-members'; placementId: string }
  | { kind: 'stamp-group-transform'; placementIds: ReadonlySet<string> }

function inspectProjectMapPatchOwnership(
  map: ProjectMap,
  patch: ProjectMapPatch,
  scope: MapPatchOwnershipScope,
): MapPatchIssue[] {
  const index = buildStampPlacementIndex(map)
  if (scope.kind === 'stamp-group-members' && !index.byId.has(scope.placementId))
    return [
      {
        code: 'stamp-placement-missing',
        message: `图章放置组 "${scope.placementId}" 不存在或已被移除`,
        ownerPlacementId: scope.placementId,
      },
    ]

  const issues: MapPatchIssue[] = []
  const checkedVisual = new Set<string>()
  for (const write of patch.visual) {
    const key = visualSlotKey(write.ref)
    if (checkedVisual.has(key)) continue
    checkedVisual.add(key)
    const ownerPlacementId = index.visualOwnerByKey.get(key)
    if (scope.kind === 'ordinary') {
      if (ownerPlacementId)
        issues.push({
          code: 'visual-owned',
          message: `视觉槽 ${key} 属于图章放置组 "${ownerPlacementId}"；请进入组内编辑或先解组`,
          ref: { ...write.ref },
          ownerPlacementId,
        })
    } else if (
      scope.kind === 'stamp-group-transform'
        ? ownerPlacementId !== undefined && !scope.placementIds.has(ownerPlacementId)
        : ownerPlacementId !== scope.placementId
    ) {
      const placementId = scope.kind === 'stamp-group-members' ? scope.placementId : '已选组合'
      issues.push({
        code: scope.kind === 'stamp-group-transform' ? 'visual-owned' : 'outside-stamp-group',
        message: ownerPlacementId
          ? `视觉槽 ${key} 属于另一放置组 "${ownerPlacementId}"，不能在组 "${placementId}" 内修改`
          : `视觉槽 ${key} 不属于放置组 "${placementId}"，组内编辑不能扩张到组外`,
        ref: { ...write.ref },
        ...(ownerPlacementId ? { ownerPlacementId } : {}),
      })
    }
  }

  const checkedCollision = new Set<string>()
  for (const write of patch.collision) {
    const key = gridPointKey(write.ref)
    if (checkedCollision.has(key)) continue
    checkedCollision.add(key)
    const ownerPlacementId = index.collisionOwnerByKey.get(key)
    if (scope.kind === 'ordinary') {
      if (ownerPlacementId)
        issues.push({
          code: 'collision-owned',
          message: `碰撞格点 ${key} 属于图章放置组 "${ownerPlacementId}"；请进入组内编辑或先解组`,
          ref: { ...write.ref },
          ownerPlacementId,
        })
    } else if (
      scope.kind === 'stamp-group-transform'
        ? ownerPlacementId !== undefined && !scope.placementIds.has(ownerPlacementId)
        : ownerPlacementId !== scope.placementId
    ) {
      const placementId = scope.kind === 'stamp-group-members' ? scope.placementId : '已选组合'
      issues.push({
        code: scope.kind === 'stamp-group-transform' ? 'collision-owned' : 'outside-stamp-group',
        message: ownerPlacementId
          ? `碰撞格点 ${key} 属于另一放置组 "${ownerPlacementId}"，不能在组 "${placementId}" 内修改`
          : `碰撞格点 ${key} 不属于放置组 "${placementId}"，组内编辑不能扩张到组外`,
        ref: { ...write.ref },
        ...(ownerPlacementId ? { ownerPlacementId } : {}),
      })
    }
  }
  return issues
}

/** W8 规划器的只读前置检查；最终提交仍由 prepareProjectMapPatch 再守一次。 */
export function ordinaryProjectMapPatchOwnershipIssues(
  map: ProjectMap,
  patch: ProjectMapPatch,
): MapPatchIssue[] {
  return inspectProjectMapPatchOwnership(map, patch, { kind: 'ordinary' })
}

/**
 * 完整预检后产出 full prev/next。失败时只抛 issue，不分配到 map、不留下 command prev。
 */
export function prepareProjectMapPatch(
  map: ProjectMap,
  patch: ProjectMapPatch,
  permission: MapPatchPermissionSnapshot,
): PreparedProjectMapPatch {
  return prepareProjectMapPatchWithOwnership(map, patch, permission, { kind: 'ordinary' })
}

/** 组内编辑的窄入口：只能写该组当前已拥有的同通道成员。 */
export function prepareStampGroupMemberPatch(
  map: ProjectMap,
  patch: ProjectMapPatch,
  permission: MapPatchPermissionSnapshot,
  placementId: string,
): PreparedProjectMapPatch {
  return prepareProjectMapPatchWithOwnership(map, patch, permission, {
    kind: 'stamp-group-members',
    placementId,
  })
}

/** 整组 move/delete 的窄入口：选中组或未归组目标可写，其他组永久阻止。 */
export function prepareStampGroupTransformPatch(
  map: ProjectMap,
  patch: ProjectMapPatch,
  permission: MapPatchPermissionSnapshot,
  placementIds: ReadonlySet<string>,
): PreparedProjectMapPatch {
  return prepareProjectMapPatchWithOwnership(map, patch, permission, {
    kind: 'stamp-group-transform',
    placementIds,
  })
}

function prepareProjectMapPatchWithOwnership(
  map: ProjectMap,
  patch: ProjectMapPatch,
  permission: MapPatchPermissionSnapshot,
  ownershipScope: MapPatchOwnershipScope,
): PreparedProjectMapPatch {
  // ownership 必须在 no-op 折叠前检查：普通入口“写回同值”也不能借机触碰组成员。
  const issues: MapPatchIssue[] = inspectProjectMapPatchOwnership(map, patch, ownershipScope)
  const layerById = new Map(map.layers.map((layer) => [layer.id, layer]))
  const hidden = new Set(permission.hiddenLayerIds)
  const locked = new Set(permission.lockedLayerIds)
  const requiredLayers = new Set(permission.requiredWritableLayerIds)
  const visualByRef = new Map<
    string,
    {
      ref: VisualSlotRef
      tileId?: number | null
      hasTileId: boolean
      tilesetId?: string | null
      hasTilesetId: boolean
      height?: number
      hasHeight: boolean
    }
  >()
  const seenChannels = new Set<string>()

  for (const write of patch.visual) {
    const ref = write.ref
    const refKey = visualSlotKey(ref)
    const channelKey = `${refKey}:${write.channel}`
    if (seenChannels.has(channelKey)) {
      pushRefIssue(
        issues,
        'duplicate-channel',
        `视觉槽 ${refKey} 的 ${write.channel} 通道重复写入`,
        ref,
      )
      continue
    }
    seenChannels.add(channelKey)
    requiredLayers.add(ref.layerId)
    if (!validCoordinate(ref))
      pushRefIssue(issues, 'invalid-coordinate', `视觉槽 ${refKey} 坐标必须是整数`, ref)
    else if (!inside(map, ref))
      pushRefIssue(issues, 'out-of-bounds', `视觉槽 ${refKey} 越出地图边界`, ref)
    const layer = layerById.get(ref.layerId)
    if (!layer) pushRefIssue(issues, 'layer-missing', `图层 "${ref.layerId}" 不存在`, ref)
    if (write.channel === 'tileId') {
      if (write.value !== null && !validNonNegative(write.value))
        pushRefIssue(issues, 'invalid-value', `tileId 必须是非负整数或 null`, ref)
    } else if (write.channel === 'tilesetId') {
      if (write.value !== null && (typeof write.value !== 'string' || !write.value))
        pushRefIssue(issues, 'invalid-value', `tilesetId 必须是非空字符串或 null`, ref)
    } else {
      if (!validNonNegative(write.value))
        pushRefIssue(issues, 'invalid-value', `实例高度必须是非负整数`, ref)
    }
    const aggregate = visualByRef.get(refKey) ?? {
      ref: { ...ref },
      hasTileId: false,
      hasTilesetId: false,
      hasHeight: false,
    }
    if (write.channel === 'tileId') {
      aggregate.tileId = write.value
      aggregate.hasTileId = true
    } else if (write.channel === 'tilesetId') {
      aggregate.tilesetId = write.value
      aggregate.hasTilesetId = true
    } else {
      aggregate.height = write.value
      aggregate.hasHeight = true
    }
    visualByRef.set(refKey, aggregate)
  }

  const collisionByRef = new Map<string, ProjectMapCollisionWrite>()
  for (const write of patch.collision) {
    const refKey = gridPointKey(write.ref)
    if (collisionByRef.has(refKey)) {
      pushRefIssue(
        issues,
        'duplicate-channel',
        `格点 ${refKey} 的 collision 通道重复写入`,
        write.ref,
      )
      continue
    }
    collisionByRef.set(refKey, { ref: { ...write.ref }, value: write.value })
    if (!validCoordinate(write.ref))
      pushRefIssue(issues, 'invalid-coordinate', `格点 ${refKey} 坐标必须是整数`, write.ref)
    else if (!inside(map, write.ref))
      pushRefIssue(issues, 'out-of-bounds', `格点 ${refKey} 越出地图边界`, write.ref)
    if (!validNonNegative(write.value))
      pushRefIssue(issues, 'invalid-value', `collision 必须是非负整数`, write.ref)
  }
  if (patch.collision.length > 0 && requiredLayers.size === 0)
    issues.push({
      code: 'collision-authority-missing',
      message: '碰撞修改必须声明活动层或目标层的写入权限',
    })

  for (const layerId of requiredLayers) {
    if (!layerById.has(layerId)) {
      issues.push({ code: 'layer-missing', message: `写入权限图层 "${layerId}" 不存在` })
      continue
    }
    if (hidden.has(layerId))
      issues.push({ code: 'hidden-layer', message: `图层 "${layerId}" 已隐藏，整笔修改已拒绝` })
    if (locked.has(layerId))
      issues.push({ code: 'locked-layer', message: `图层 "${layerId}" 已锁定，整笔修改已拒绝` })
  }

  const nextVisual: FullVisualSlotWrite[] = []
  const prevVisual: FullVisualSlotWrite[] = []
  for (const aggregate of visualByRef.values()) {
    const layer = layerById.get(aggregate.ref.layerId)
    if (!layer || !validCoordinate(aggregate.ref) || !inside(map, aggregate.ref)) continue
    const oldTileId = layer.tiles[aggregate.ref.row]?.[aggregate.ref.col]
    if (oldTileId === undefined) continue
    const oldTilesetId =
      mapInstanceTilesetId(map, layer, aggregate.ref.row, aggregate.ref.col) ?? null
    const oldHeight = mapInstanceHeight(layer, aggregate.ref.row, aggregate.ref.col)
    const tileId = aggregate.hasTileId ? (aggregate.tileId ?? null) : oldTileId
    const tilesetId =
      tileId === null ? null : aggregate.hasTilesetId ? (aggregate.tilesetId ?? null) : oldTilesetId
    const height = aggregate.hasHeight ? (aggregate.height ?? 0) : oldHeight
    if (tileId === null && height !== 0)
      pushRefIssue(
        issues,
        'null-height',
        `空视觉槽 ${visualSlotKey(aggregate.ref)} 的高度必须为 0`,
        aggregate.ref,
      )
    if (tileId !== null && tilesetId === null)
      pushRefIssue(
        issues,
        'missing-source',
        `非空视觉槽 ${visualSlotKey(aggregate.ref)} 必须指定瓦片集来源`,
        aggregate.ref,
      )
    if (tileId === oldTileId && tilesetId === oldTilesetId && height === oldHeight) continue
    prevVisual.push({
      ...aggregate.ref,
      tileId: oldTileId,
      tilesetId: oldTilesetId,
      height: oldHeight,
    })
    nextVisual.push({ ...aggregate.ref, tileId, tilesetId, height })
  }

  const nextCollision: FullCollisionWrite[] = []
  const prevCollision: FullCollisionWrite[] = []
  for (const write of collisionByRef.values()) {
    if (!validCoordinate(write.ref) || !inside(map, write.ref) || !validNonNegative(write.value))
      continue
    const oldValue = map.collision[write.ref.row]?.[write.ref.col]
    if (oldValue === undefined || oldValue === write.value) continue
    prevCollision.push({ ...write.ref, value: oldValue })
    nextCollision.push({ ...write.ref, value: write.value })
  }

  if (issues.length > 0) throw new ProjectMapPatchError(issues)
  return { nextVisual, prevVisual, nextCollision, prevCollision }
}

export function preparedProjectMapPatchChanged(prepared: PreparedProjectMapPatch): boolean {
  return prepared.nextVisual.length > 0 || prepared.nextCollision.length > 0
}

export function applyPreparedProjectMapPatch<T extends ProjectMap>(
  map: T,
  prepared: PreparedProjectMapPatch,
  direction: 'next' | 'prev' = 'next',
): T {
  const visual = direction === 'next' ? prepared.nextVisual : prepared.prevVisual
  const collision = direction === 'next' ? prepared.nextCollision : prepared.prevCollision
  if (visual.length === 0 && collision.length === 0) return map
  const tileEdits: ProjectMapTileEdit[] = visual.map((write) => ({ ...write }))
  const collisionEdits: ProjectMapCollisionEdit[] = collision.map((write) => ({ ...write }))
  const withVisual = tileEdits.length > 0 ? paintProjectMapTiles(map, tileEdits) : map
  const next =
    collisionEdits.length > 0 ? paintProjectMapCollision(withVisual, collisionEdits) : withVisual
  inheritStampPlacementIndex(map, next)
  return next
}

export function cloneProjectMapPatch(patch: ProjectMapPatch): ProjectMapPatch {
  return {
    visual: patch.visual.map((write) => ({ ...write, ref: { ...write.ref } })),
    collision: patch.collision.map((write) => ({ ...write, ref: { ...write.ref } })),
  }
}

export function cloneMapPatchPermission(
  permission: MapPatchPermissionSnapshot,
): MapPatchPermissionSnapshot {
  return {
    hiddenLayerIds: [...permission.hiddenLayerIds],
    lockedLayerIds: [...permission.lockedLayerIds],
    requiredWritableLayerIds: [...permission.requiredWritableLayerIds],
  }
}
