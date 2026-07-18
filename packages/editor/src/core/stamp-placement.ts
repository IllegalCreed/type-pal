import type { ProjectMap, StampPlacementGroupV1, StampTemplateV1 } from '@type-pal/content'
import { isLatticeInside, projectMapStampPlacements } from '@type-pal/reforge'
import type {
  MapPatchPermissionSnapshot,
  PreparedProjectMapPatch,
  ProjectMapPatch,
} from './map-patch.js'
import { ProjectMapPatchError, prepareProjectMapPatch } from './map-patch.js'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { resolveRelativeLatticeOffset } from './map-transform.js'

export interface StampLayerMapping {
  layerSlotId: string
  targetLayerId: string
}

export type StampPlacementConflictPolicy = 'reject' | 'overwrite'

export type StampPlacementIssueCode =
  | 'tileset-mismatch'
  | 'anchor-out-of-bounds'
  | 'mapping-missing'
  | 'mapping-unknown-slot'
  | 'mapping-duplicate-slot'
  | 'target-layer-missing'
  | 'depth-mode-mismatch'
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
  height: number
}

export interface ResolvedStampCollision {
  ref: GridPointRef
  value: number
}

export interface StampPlacementIndex {
  byId: ReadonlyMap<string, StampPlacementGroupV1>
  visualOwnerByKey: ReadonlyMap<string, string>
  collisionOwnerByKey: ReadonlyMap<string, string>
}

export interface StampPlacementPlan {
  mapId: string
  /** 仅供原子 Command 检查 stale；不是持久字段。 */
  baseMap: ProjectMap
  /** EditSession notify revision；UI 必须把 undo/redo 也纳入 ghost 失效键。 */
  mapRevision: number
  template: StampTemplateV1
  anchor: GridPointRef
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
  template: StampTemplateV1
  anchor: GridPointRef
  mappings: readonly StampLayerMapping[]
  permission: Pick<MapPatchPermissionSnapshot, 'hiddenLayerIds' | 'lockedLayerIds'>
  availableTileIds: ReadonlySet<number>
  conflictPolicy: StampPlacementConflictPolicy
  placementId?: string
}

const placementIndexCache = new WeakMap<ProjectMap, StampPlacementIndex>()

/** 派生 ownership 反向索引；按 immutable map 引用缓存，永不进入 JSON。 */
export function buildStampPlacementIndex(map: ProjectMap): StampPlacementIndex {
  const cached = placementIndexCache.get(map)
  if (cached) return cached
  const byId = new Map<string, StampPlacementGroupV1>()
  const visualOwnerByKey = new Map<string, string>()
  const collisionOwnerByKey = new Map<string, string>()
  for (const placement of projectMapStampPlacements(map)) {
    byId.set(placement.id, placement)
    for (const ref of placement.visualSlots) visualOwnerByKey.set(visualSlotKey(ref), placement.id)
    for (const ref of placement.gridPoints) collisionOwnerByKey.set(gridPointKey(ref), placement.id)
  }
  const index = { byId, visualOwnerByKey, collisionOwnerByKey }
  placementIndexCache.set(map, index)
  return index
}

function normalizedIdStem(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** map-local placement id；相邻同款每次规划都从实时地图生成不同 id。 */
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

function cloneMappings(mappings: readonly StampLayerMapping[]): StampLayerMapping[] {
  return mappings.map((mapping) => ({ ...mapping }))
}

/**
 * 从模板、显式 mapping 和目标 anchor 生成 ghost/冲突/patch/group 的唯一解析结果。
 * 本函数只读；失败计划不改 state/history/dirty。
 */
export function planStampPlacement(input: PlanStampPlacementInput): StampPlacementPlan {
  const { map, template, anchor } = input
  const issues: StampPlacementIssue[] = []
  const conflicts: StampPlacementConflict[] = []
  const mappings = cloneMappings(input.mappings)
  const placementId = input.placementId ?? nextStampPlacementId(map, `${template.id}-placement`)
  const placementIndex = buildStampPlacementIndex(map)

  if (map.tilesetId !== template.tilesetId)
    issue(
      issues,
      'tileset-mismatch',
      `图章使用 tileset "${template.tilesetId}"，当前地图使用 "${map.tilesetId}"。`,
    )
  if (
    !Number.isInteger(anchor.row) ||
    !Number.isInteger(anchor.col) ||
    !isLatticeInside(map, anchor)
  )
    issue(issues, 'anchor-out-of-bounds', '图章锚点必须是地图内的整数格点。', {
      ref: { ...anchor },
    })
  if (placementIndex.byId.has(placementId))
    issue(issues, 'placement-id-duplicate', `放置组 ID "${placementId}" 已存在。`)

  const slotById = new Map(template.layerSlots.map((slot) => [slot.id, slot] as const))
  const mappingsBySlot = new Map<string, StampLayerMapping[]>()
  for (const mapping of mappings) {
    if (!slotById.has(mapping.layerSlotId)) {
      issue(issues, 'mapping-unknown-slot', `映射引用未知局部槽 "${mapping.layerSlotId}"。`, {
        layerSlotId: mapping.layerSlotId,
      })
      continue
    }
    const bucket = mappingsBySlot.get(mapping.layerSlotId)
    if (bucket) bucket.push(mapping)
    else mappingsBySlot.set(mapping.layerSlotId, [mapping])
  }

  const targetLayerBySlot = new Map<string, ProjectMap['layers'][number]>()
  const targetLayerIndexById = new Map(map.layers.map((layer, index) => [layer.id, index]))
  const hidden = new Set(input.permission.hiddenLayerIds)
  const locked = new Set(input.permission.lockedLayerIds)
  for (const slot of template.layerSlots) {
    const matches = mappingsBySlot.get(slot.id) ?? []
    if (matches.length === 0) {
      issue(issues, 'mapping-missing', `局部槽 "${slot.name}" 尚未映射目标图层。`, {
        layerSlotId: slot.id,
      })
      continue
    }
    if (matches.length > 1) {
      issue(issues, 'mapping-duplicate-slot', `局部槽 "${slot.name}" 被重复映射。`, {
        layerSlotId: slot.id,
      })
      continue
    }
    const targetLayerId = matches[0]!.targetLayerId
    const target = map.layers.find((layer) => layer.id === targetLayerId)
    if (!target) {
      issue(
        issues,
        'target-layer-missing',
        `局部槽 "${slot.name}" 的目标图层 "${targetLayerId}" 不存在。`,
        { layerSlotId: slot.id },
      )
      continue
    }
    targetLayerBySlot.set(slot.id, target)
    if (target.depthMode !== slot.depthMode)
      issue(
        issues,
        'depth-mode-mismatch',
        `局部槽 "${slot.name}" 是 ${slot.depthMode}，目标图层 "${target.name}" 是 ${target.depthMode}。`,
        { layerSlotId: slot.id },
      )
    if (hidden.has(target.id))
      issue(issues, 'hidden-layer', `目标图层 "${target.name}" 已隐藏，整枚图章不能放置。`, {
        layerSlotId: slot.id,
      })
    if (locked.has(target.id))
      issue(issues, 'locked-layer', `目标图层 "${target.name}" 已锁定，整枚图章不能放置。`, {
        layerSlotId: slot.id,
      })
  }

  const resolvedVisual: ResolvedStampVisual[] = []
  const visualDestinations = new Set<string>()
  for (const member of template.visual) {
    const target = targetLayerBySlot.get(member.layerSlotId)
    if (!target) continue
    if (!input.availableTileIds.has(member.tileId))
      issue(issues, 'missing-tile', `图章引用的瓦片 #${member.tileId} 不在当前 tileset 中。`, {
        layerSlotId: member.layerSlotId,
      })
    const point = resolveRelativeLatticeOffset(anchor, member.offset)
    const ref = { layerId: target.id, ...point }
    if (!Number.isInteger(point.row) || !Number.isInteger(point.col)) {
      issue(issues, 'invalid-coordinate', `图章视觉成员解析到非整数格点。`, {
        layerSlotId: member.layerSlotId,
        ref,
      })
      continue
    }
    if (!isLatticeInside(map, point)) {
      issue(issues, 'out-of-bounds', `图章视觉成员越出地图边界。`, {
        layerSlotId: member.layerSlotId,
        ref,
      })
      continue
    }
    const key = visualSlotKey(ref)
    if (visualDestinations.has(key)) {
      issue(issues, 'ambiguous-destination', `多个图章成员映射到同一视觉槽 ${key}。`, {
        layerSlotId: member.layerSlotId,
        ref,
      })
      continue
    }
    visualDestinations.add(key)
    const owner = placementIndex.visualOwnerByKey.get(key)
    if (owner)
      issue(issues, 'visual-owned', `视觉槽 ${key} 已属于放置组 "${owner}"，不能覆盖。`, {
        layerSlotId: member.layerSlotId,
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
          incomingValue: member.tileId,
        })
    }
    resolvedVisual.push({
      layerSlotId: member.layerSlotId,
      targetLayerId: target.id,
      targetLayerIndex: targetLayerIndexById.get(target.id) ?? -1,
      ref,
      tileId: member.tileId,
      height: member.height,
    })
  }

  const resolvedCollision: ResolvedStampCollision[] = []
  const collisionDestinations = new Set<string>()
  for (const member of template.collision) {
    const point = resolveRelativeLatticeOffset(anchor, member.offset)
    if (!Number.isInteger(point.row) || !Number.isInteger(point.col)) {
      issue(issues, 'invalid-coordinate', '图章碰撞成员解析到非整数格点。', { ref: point })
      continue
    }
    if (!isLatticeInside(map, point)) {
      issue(issues, 'out-of-bounds', '图章碰撞成员越出地图边界。', { ref: point })
      continue
    }
    const key = gridPointKey(point)
    if (collisionDestinations.has(key)) {
      issue(issues, 'ambiguous-destination', `多个碰撞成员映射到同一格点 ${key}。`, {
        ref: point,
      })
      continue
    }
    collisionDestinations.add(key)
    const owner = placementIndex.collisionOwnerByKey.get(key)
    if (owner)
      issue(issues, 'collision-owned', `碰撞格点 ${key} 已属于放置组 "${owner}"，不能覆盖。`, {
        ref: point,
        ownerPlacementId: owner,
      })
    else {
      const currentValue = map.collision[point.row]?.[point.col]
      // 非零普通碰撞即为已有内容；即使值相同，纳入 placement ownership 也必须显式确认。
      if (currentValue !== undefined && currentValue !== 0)
        conflicts.push({
          channel: 'collision',
          ref: point,
          currentValue,
          incomingValue: member.value,
        })
    }
    resolvedCollision.push({ ref: point, value: member.value })
  }

  const patch: ProjectMapPatch = {
    visual: resolvedVisual.flatMap((member) => {
      const layer = map.layers[member.targetLayerIndex]
      return [
        { channel: 'tileId' as const, ref: member.ref, value: member.tileId },
        ...(layer?.depthMode === 'height'
          ? [{ channel: 'height' as const, ref: member.ref, value: member.height }]
          : []),
      ]
    }),
    collision: resolvedCollision.map((member) => ({ ref: member.ref, value: member.value })),
  }
  const requiredWritableLayerIds = [
    ...new Set(resolvedVisual.map((member) => member.targetLayerId)),
  ]
  const permission: MapPatchPermissionSnapshot = {
    hiddenLayerIds: [...input.permission.hiddenLayerIds],
    lockedLayerIds: [...input.permission.lockedLayerIds],
    requiredWritableLayerIds,
  }

  let preparedPatch: PreparedProjectMapPatch | undefined
  if (issues.length === 0) {
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
  }

  const placement: StampPlacementGroupV1 = {
    id: placementId,
    sourceStampId: template.id,
    sourceStampName: template.name,
    anchor: { ...anchor },
    visualSlots: resolvedVisual.map((member) => ({ ...member.ref })),
    gridPoints: resolvedCollision.map((member) => ({ ...member.ref })),
  }
  return {
    mapId: input.mapId,
    baseMap: map,
    mapRevision: input.mapRevision,
    template: structuredClone(template),
    anchor: { ...anchor },
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

/** 测试/诊断用直接扫描；用于证明缓存反向索引没有语义漂移。 */
export function directStampPlacementOwners(map: ProjectMap): {
  visual: Map<string, string>
  collision: Map<string, string>
} {
  const visual = new Map<string, string>()
  const collision = new Map<string, string>()
  for (const placement of projectMapStampPlacements(map)) {
    for (const ref of placement.visualSlots) visual.set(visualSlotKey(ref), placement.id)
    for (const ref of placement.gridPoints) collision.set(gridPointKey(ref), placement.id)
  }
  return { visual, collision }
}
