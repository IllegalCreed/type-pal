import type { ProjectMap, StampPlacementGroupV1 } from '@type-pal/content'
import { mapInstanceHeight } from '@type-pal/reforge'
import {
  type MapPatchPermissionSnapshot,
  type PreparedProjectMapPatch,
  type ProjectMapPatch,
  ProjectMapPatchError,
  prepareProjectMapPatch,
  prepareStampGroupTransformPatch,
} from './map-patch.js'
import type { GridPointRef, MapSelection, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import {
  latticeU,
  type MapTransformConflict,
  type MapTransformConflictPolicy,
  type MapTransformIssue,
  type MapTransformPlan,
  type RelativeLatticeOffset,
  relativeLatticeOffset,
  resolveRelativeLatticeOffset,
} from './map-transform.js'
import { buildStampPlacementIndex } from './stamp-ownership.js'

export interface StampGroupClipboardVisual {
  sourceRef: VisualSlotRef
  offset: RelativeLatticeOffset
  tileId: number
  height: number
}

export interface StampGroupClipboardCollision {
  sourceRef: GridPointRef
  offset: RelativeLatticeOffset
  value: number
}

export interface StampGroupClipboardPlacement {
  sourceId: string
  sourceStampId?: string
  sourceStampName?: string
  anchorOffset: RelativeLatticeOffset
  visual: StampGroupClipboardVisual[]
  collision: StampGroupClipboardCollision[]
}

export interface StampGroupClipboard {
  kind: 'stamp-placements'
  sourceMapId: string
  sourceTilesetId: string
  sourceAnchor: GridPointRef
  /** cut 粘贴保留 id；copy/repeat 必须产生新的 map-local id。 */
  identity: 'copy' | 'preserve'
  placements: StampGroupClipboardPlacement[]
}

export type StampGroupTransformKind = 'move' | 'paste' | 'delete'

export interface StampGroupTransformPlan extends MapTransformPlan {
  kind: StampGroupTransformKind
  mapId: string
  mapRevision: number
  baseMap: ProjectMap
  preparedPatch?: PreparedProjectMapPatch
  removePlacementIds: string[]
  upsertPlacements: StampPlacementGroupV1[]
  changed: boolean
  placementSelection: Extract<MapSelection, { kind: 'stamp-placements' }> | { kind: 'none' }
}

export interface StampGroupTransformPermission {
  hiddenLayerIds: readonly string[]
  lockedLayerIds: readonly string[]
}

function inside(map: ProjectMap, ref: GridPointRef): boolean {
  return (
    Number.isInteger(ref.row) &&
    Number.isInteger(ref.col) &&
    ref.row >= 0 &&
    ref.row < map.height * 2 &&
    ref.col >= 0 &&
    ref.col < map.width
  )
}

function firstAnchor(points: readonly GridPointRef[]): GridPointRef | undefined {
  return [...points].sort((a, b) => a.row - b.row || latticeU(a) - latticeU(b))[0]
}

export function captureStampGroupClipboard(
  mapId: string,
  map: ProjectMap,
  placementIds: readonly string[],
  identity: StampGroupClipboard['identity'] = 'copy',
): StampGroupClipboard | undefined {
  const ids = [...new Set(placementIds)]
  if (ids.length === 0) return undefined
  const index = buildStampPlacementIndex(map)
  const placements = ids.map((id) => index.byId.get(id))
  if (placements.some((placement) => !placement)) return undefined
  const sourceAnchor = firstAnchor(
    placements.flatMap((placement) => [
      placement!.anchor,
      ...placement!.visualSlots,
      ...placement!.gridPoints,
    ]),
  )
  if (!sourceAnchor) return undefined
  return {
    kind: 'stamp-placements',
    sourceMapId: mapId,
    sourceTilesetId: map.tilesetId,
    sourceAnchor: { ...sourceAnchor },
    identity,
    placements: placements.map((placement) => ({
      sourceId: placement!.id,
      ...(placement!.sourceStampId ? { sourceStampId: placement!.sourceStampId } : {}),
      ...(placement!.sourceStampName ? { sourceStampName: placement!.sourceStampName } : {}),
      anchorOffset: relativeLatticeOffset(placement!.anchor, sourceAnchor),
      visual: placement!.visualSlots.map((ref) => {
        const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
        const tileId = layer?.tiles[ref.row]?.[ref.col]
        if (!layer || tileId === null || tileId === undefined)
          throw new Error(
            `放置组“${placement!.id}”的视觉成员 ${visualSlotKey(ref)} 没有普通瓦片值。`,
          )
        return {
          sourceRef: { ...ref },
          offset: relativeLatticeOffset(ref, sourceAnchor),
          tileId,
          height: mapInstanceHeight(layer, ref.row, ref.col),
        }
      }),
      collision: placement!.gridPoints.map((ref) => ({
        sourceRef: { ...ref },
        offset: relativeLatticeOffset(ref, sourceAnchor),
        value: map.collision[ref.row]?.[ref.col] ?? 0,
      })),
    })),
  }
}

function nextCopyId(
  sourceId: string,
  existingIds: ReadonlyMap<string, unknown>,
  reservedIds: Set<string>,
): string {
  const isTaken = (id: string) => existingIds.has(id) || reservedIds.has(id)
  const base = `${sourceId}-copy`
  if (!isTaken(base)) {
    reservedIds.add(base)
    return base
  }
  let suffix = 2
  while (isTaken(`${base}-${suffix}`)) suffix += 1
  const id = `${base}-${suffix}`
  reservedIds.add(id)
  return id
}

function selectionForClipboard(
  clipboard: StampGroupClipboard,
  anchor: GridPointRef,
): Extract<MapSelection, { kind: 'cells' }> {
  return {
    kind: 'cells',
    hitScope: 'visible-unlocked-layers',
    visualSlots: clipboard.placements.flatMap((placement) =>
      placement.visual.map((member) => ({
        ...resolveRelativeLatticeOffset(anchor, member.offset),
        layerId: member.sourceRef.layerId,
      })),
    ),
    gridPoints: clipboard.placements.flatMap((placement) =>
      placement.collision.map((member) => resolveRelativeLatticeOffset(anchor, member.offset)),
    ),
  }
}

function commonPlan(input: {
  kind: StampGroupTransformKind
  mapId: string
  map: ProjectMap
  mapRevision: number
  clipboard: StampGroupClipboard
  anchor?: GridPointRef
  sourcePlacementIds: readonly string[]
  permission: StampGroupTransformPermission
  conflictPolicy: MapTransformConflictPolicy
  expectedMap?: ProjectMap
}): StampGroupTransformPlan {
  const issues: MapTransformIssue[] = []
  const conflicts: MapTransformConflict[] = []
  const selectedIds = new Set(input.sourcePlacementIds)
  const targetAnchor = input.anchor ?? input.clipboard.sourceAnchor
  if (input.expectedMap && input.expectedMap !== input.map)
    issues.push({
      code: 'stamp-selection-unsupported',
      message: '组合移动预览已过期；地图内容变化后必须重新开始移动。',
    })
  if (input.clipboard.sourceMapId !== input.mapId)
    issues.push({
      code: 'stamp-selection-unsupported',
      message: '组合首版不支持跨地图粘贴；请在来源地图内完成变换。',
    })
  if (input.clipboard.sourceTilesetId !== input.map.tilesetId)
    issues.push({
      code: 'stamp-selection-unsupported',
      message: '组合所属瓦片集与当前地图不一致，不做自动重映射。',
    })
  const index = buildStampPlacementIndex(input.map)
  if (input.kind !== 'paste') {
    const missing = input.sourcePlacementIds.find((id) => !index.byId.has(id))
    if (missing)
      issues.push({
        code: 'stamp-selection-unsupported',
        message: `放置组“${missing}”不存在或已被移除。`,
      })
    const clipboardIds = new Set(input.clipboard.placements.map((placement) => placement.sourceId))
    if (
      clipboardIds.size !== selectedIds.size ||
      [...selectedIds].some((id) => !clipboardIds.has(id))
    )
      issues.push({
        code: 'stamp-selection-unsupported',
        message: '组合移动快照与当前组选区不一致；请重新开始移动。',
      })
  }
  if (
    input.kind === 'paste' &&
    input.clipboard.identity === 'preserve' &&
    input.clipboard.placements.some((placement) => index.byId.has(placement.sourceId))
  )
    issues.push({
      code: 'stamp-selection-unsupported',
      message: '剪切粘贴的原放置组 ID 已存在；请先删除原组，或重新执行复制。',
    })

  const requiredLayers = new Set(
    input.clipboard.placements.flatMap((placement) =>
      placement.visual.map((member) => member.sourceRef.layerId),
    ),
  )
  const sourceVisualKeys = new Set(
    input.clipboard.placements.flatMap((placement) =>
      placement.visual.map((member) => visualSlotKey(member.sourceRef)),
    ),
  )
  const sourceCollisionKeys = new Set(
    input.clipboard.placements.flatMap((placement) =>
      placement.collision.map((member) => gridPointKey(member.sourceRef)),
    ),
  )
  const tileWrites = new Map<string, ProjectMapPatch['visual'][number]>()
  const heightWrites = new Map<string, ProjectMapPatch['visual'][number]>()
  const collisionWrites = new Map<string, ProjectMapPatch['collision'][number]>()

  if (input.kind !== 'paste') {
    for (const placement of input.clipboard.placements) {
      for (const member of placement.visual) {
        const key = visualSlotKey(member.sourceRef)
        tileWrites.set(key, { channel: 'tileId', ref: member.sourceRef, value: null })
        if (
          input.map.layers.find((layer) => layer.id === member.sourceRef.layerId)?.depthMode ===
          'height'
        )
          heightWrites.set(key, { channel: 'height', ref: member.sourceRef, value: 0 })
      }
      for (const member of placement.collision)
        collisionWrites.set(gridPointKey(member.sourceRef), { ref: member.sourceRef, value: 0 })
    }
  }

  const resolvedPlacements: StampPlacementGroupV1[] = []
  if (input.kind !== 'delete') {
    // placement 反向索引按 immutable map 缓存；copy 只查询 id，不在 pointer preview 中遍历全表。
    const reservedCopyIds = new Set<string>()
    for (const placement of input.clipboard.placements) {
      const visualSlots: VisualSlotRef[] = []
      const gridPoints: GridPointRef[] = []
      const resolvedAnchor = resolveRelativeLatticeOffset(targetAnchor, placement.anchorOffset)
      if (!inside(input.map, resolvedAnchor))
        issues.push({
          code: 'out-of-bounds',
          message: `组合“${placement.sourceId}”的目标锚点越出地图边界。`,
          ref: resolvedAnchor,
        })
      for (const member of placement.visual) {
        const point = resolveRelativeLatticeOffset(targetAnchor, member.offset)
        const ref = { ...point, layerId: member.sourceRef.layerId }
        visualSlots.push(ref)
        if (!inside(input.map, ref)) {
          issues.push({ code: 'out-of-bounds', message: '组合目标视觉槽越出地图边界。', ref })
          continue
        }
        const layer = input.map.layers.find((candidate) => candidate.id === ref.layerId)
        if (!layer) {
          issues.push({ code: 'layer-missing', message: `目标图层“${ref.layerId}”不存在。`, ref })
          continue
        }
        if (layer.depthMode === 'flat' && member.height !== 0) {
          issues.push({
            code: 'flat-height',
            message: `非零高度成员不能放入平面图层“${layer.name}”。`,
            ref,
          })
          continue
        }
        const key = visualSlotKey(ref)
        const isMoveSource = input.kind === 'move' && sourceVisualKeys.has(key)
        const current = layer.tiles[ref.row]?.[ref.col]
        if (!isMoveSource && current !== null && current !== undefined)
          conflicts.push({
            channel: 'visual',
            ref,
            currentValue: current,
            incomingValue: member.tileId,
          })
        tileWrites.set(key, { channel: 'tileId', ref, value: member.tileId })
        if (layer.depthMode === 'height')
          heightWrites.set(key, { channel: 'height', ref, value: member.height })
      }
      for (const member of placement.collision) {
        const ref = resolveRelativeLatticeOffset(targetAnchor, member.offset)
        gridPoints.push(ref)
        if (!inside(input.map, ref)) {
          issues.push({ code: 'out-of-bounds', message: '组合目标碰撞格点越出地图边界。', ref })
          continue
        }
        const key = gridPointKey(ref)
        const isMoveSource = input.kind === 'move' && sourceCollisionKeys.has(key)
        const current = input.map.collision[ref.row]?.[ref.col] ?? 0
        if (!isMoveSource && current !== 0)
          conflicts.push({
            channel: 'collision',
            ref,
            currentValue: current,
            incomingValue: member.value,
          })
        collisionWrites.set(key, { ref, value: member.value })
      }
      const id =
        input.kind === 'move' || input.clipboard.identity === 'preserve'
          ? placement.sourceId
          : nextCopyId(placement.sourceId, index.byId, reservedCopyIds)
      resolvedPlacements.push({
        id,
        ...(placement.sourceStampId ? { sourceStampId: placement.sourceStampId } : {}),
        ...(placement.sourceStampName ? { sourceStampName: placement.sourceStampName } : {}),
        anchor: resolvedAnchor,
        visualSlots,
        gridPoints,
      })
    }
  }

  const patch: ProjectMapPatch = {
    visual: [...tileWrites.values(), ...heightWrites.values()],
    collision: [...collisionWrites.values()],
  }
  const permission: MapPatchPermissionSnapshot = {
    hiddenLayerIds: [...input.permission.hiddenLayerIds],
    lockedLayerIds: [...input.permission.lockedLayerIds],
    requiredWritableLayerIds: [...requiredLayers],
  }
  let preparedPatch: PreparedProjectMapPatch | undefined
  if (issues.length === 0) {
    try {
      preparedPatch =
        input.kind === 'paste'
          ? prepareProjectMapPatch(input.map, patch, permission)
          : prepareStampGroupTransformPatch(input.map, patch, permission, selectedIds)
    } catch (cause) {
      if (cause instanceof ProjectMapPatchError)
        issues.push(
          ...cause.issues.map((issue) => ({
            code:
              issue.code === 'visual-owned' || issue.code === 'collision-owned'
                ? issue.code
                : ('stamp-selection-unsupported' as const),
            message: issue.message,
            ...(issue.ref ? { ref: issue.ref } : {}),
            ...(issue.ownerPlacementId ? { ownerPlacementId: issue.ownerPlacementId } : {}),
          })),
        )
      else
        issues.push({
          code: 'stamp-selection-unsupported',
          message: cause instanceof Error ? cause.message : String(cause),
        })
    }
  }
  const noOp =
    input.kind === 'move' &&
    targetAnchor.row === input.clipboard.sourceAnchor.row &&
    targetAnchor.col === input.clipboard.sourceAnchor.col
  if (noOp && issues.length === 0)
    issues.push({ code: 'empty-selection', message: '组合目标与当前位置相同，没有可提交的变化。' })
  const canApply =
    issues.length === 0 &&
    preparedPatch !== undefined &&
    !noOp &&
    (input.conflictPolicy === 'overwrite' || conflicts.length === 0)
  return {
    kind: input.kind,
    mapId: input.mapId,
    mapRevision: input.mapRevision,
    baseMap: input.map,
    ...(preparedPatch ? { preparedPatch } : {}),
    removePlacementIds: input.kind === 'paste' ? [] : [...selectedIds],
    upsertPlacements: resolvedPlacements,
    changed: canApply,
    patch: canApply ? patch : { visual: [], collision: [] },
    requiredWritableLayerIds: [...requiredLayers],
    nextSelection:
      input.kind === 'delete'
        ? { kind: 'none' }
        : selectionForClipboard(input.clipboard, targetAnchor),
    placementSelection:
      input.kind === 'delete'
        ? { kind: 'none' }
        : { kind: 'stamp-placements', placementIds: resolvedPlacements.map(({ id }) => id) },
    conflicts,
    issues,
    canApply,
  }
}

export function planStampGroupMove(input: {
  mapId: string
  map: ProjectMap
  mapRevision: number
  placementIds: readonly string[]
  targetAnchor: GridPointRef
  permission: StampGroupTransformPermission
  conflictPolicy?: MapTransformConflictPolicy
  /** UI pointer preview 复用 beginMove 时的一次快照，避免每次 hover 重抓整组矩阵。 */
  clipboard?: StampGroupClipboard
  /** move 不是 copy；源地图变更后旧快照必须 fail-loud。 */
  expectedMap?: ProjectMap
}): StampGroupTransformPlan {
  const clipboard =
    input.clipboard ??
    captureStampGroupClipboard(input.mapId, input.map, input.placementIds, 'preserve')
  if (!clipboard)
    return commonPlan({
      kind: 'move',
      ...input,
      clipboard: {
        kind: 'stamp-placements',
        sourceMapId: input.mapId,
        sourceTilesetId: input.map.tilesetId,
        sourceAnchor: input.targetAnchor,
        identity: 'preserve',
        placements: [],
      },
      anchor: input.targetAnchor,
      sourcePlacementIds: input.placementIds,
      conflictPolicy: input.conflictPolicy ?? 'reject',
      expectedMap: input.expectedMap,
    })
  return commonPlan({
    kind: 'move',
    mapId: input.mapId,
    map: input.map,
    mapRevision: input.mapRevision,
    clipboard,
    anchor: input.targetAnchor,
    sourcePlacementIds: input.placementIds,
    permission: input.permission,
    conflictPolicy: input.conflictPolicy ?? 'reject',
    expectedMap: input.expectedMap,
  })
}

export function planStampGroupPaste(input: {
  mapId: string
  map: ProjectMap
  mapRevision: number
  clipboard: StampGroupClipboard
  targetAnchor: GridPointRef
  permission: StampGroupTransformPermission
  conflictPolicy?: MapTransformConflictPolicy
}): StampGroupTransformPlan {
  return commonPlan({
    kind: 'paste',
    mapId: input.mapId,
    map: input.map,
    mapRevision: input.mapRevision,
    clipboard: input.clipboard,
    anchor: input.targetAnchor,
    sourcePlacementIds: [],
    permission: input.permission,
    conflictPolicy: input.conflictPolicy ?? 'reject',
  })
}

export function planStampGroupDelete(input: {
  mapId: string
  map: ProjectMap
  mapRevision: number
  placementIds: readonly string[]
  permission: StampGroupTransformPermission
}): StampGroupTransformPlan {
  const clipboard = captureStampGroupClipboard(
    input.mapId,
    input.map,
    input.placementIds,
    'preserve',
  )
  if (!clipboard) throw new Error('请先选择至少一个完整放置组。')
  return commonPlan({
    kind: 'delete',
    mapId: input.mapId,
    map: input.map,
    mapRevision: input.mapRevision,
    clipboard,
    sourcePlacementIds: input.placementIds,
    permission: input.permission,
    conflictPolicy: 'overwrite',
  })
}
