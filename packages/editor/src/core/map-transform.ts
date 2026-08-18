/** W8 结构化地图剪贴板与可逆变换规划器（纯函数，不直接 dispatch）。 */
import type { ProjectMap } from '@type-pal/reforge'
import { mapInstanceHeight, mapInstanceTilesetId } from '@type-pal/reforge'
import { ordinaryProjectMapPatchOwnershipIssues, type ProjectMapPatch } from './map-patch.js'
import type { GridPointRef, MapHitScope, MapSelection, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'

export interface RelativeLatticeOffset {
  dRow: number
  /** u = 2*col + rowParity；不能用 raw dCol，否则跨奇偶行会横移 16px。 */
  du: number
}

export interface MapClipboardVisualCell {
  sourceLayerId: string
  sourceRef: VisualSlotRef
  offset: RelativeLatticeOffset
  tileId: number
  tilesetId: string
  height: number
}

export interface MapClipboardCollisionCell {
  sourceRef: GridPointRef
  offset: RelativeLatticeOffset
  value: number
}

export interface MapCellClipboard {
  kind: 'cells'
  sourceMapId: string
  sourceAnchor: GridPointRef
  hitScope: MapHitScope
  visual: MapClipboardVisualCell[]
  collision: { kind: 'excluded' } | { kind: 'included'; cells: MapClipboardCollisionCell[] }
}

export interface MapLayerMapping {
  sourceLayerId: string
  targetLayerId: string
}

export type MapTransformConflictPolicy = 'reject' | 'overwrite'

export interface MapTransformConflict {
  channel: 'visual' | 'collision'
  ref: VisualSlotRef | GridPointRef
  currentValue: number
  incomingValue: number
}

export type MapTransformIssueCode =
  | 'empty-selection'
  | 'out-of-bounds'
  | 'layer-missing'
  | 'collision-authority-missing'
  | 'ambiguous-destination'
  | 'visual-owned'
  | 'collision-owned'
  | 'stamp-selection-unsupported'

export interface MapTransformIssue {
  code: MapTransformIssueCode
  message: string
  ref?: VisualSlotRef | GridPointRef
  ownerPlacementId?: string
}

export interface MapTransformPlan {
  patch: ProjectMapPatch
  requiredWritableLayerIds: string[]
  nextSelection: MapSelection
  conflicts: MapTransformConflict[]
  issues: MapTransformIssue[]
  canApply: boolean
}

function assertNever(value: never): never {
  throw new Error(`尚未支持的地图选区分支：${JSON.stringify(value)}`)
}

export function latticeU(point: GridPointRef): number {
  return point.col * 2 + (point.row & 1)
}

export function relativeLatticeOffset(
  point: GridPointRef,
  anchor: GridPointRef,
): RelativeLatticeOffset {
  return { dRow: point.row - anchor.row, du: latticeU(point) - latticeU(anchor) }
}

export function resolveRelativeLatticeOffset(
  anchor: GridPointRef,
  offset: RelativeLatticeOffset,
): GridPointRef {
  const row = anchor.row + offset.dRow
  const u = latticeU(anchor) + offset.du
  return { row, col: (u - (row & 1)) / 2 }
}

export type IsometricNudgeDirection = 'up' | 'down' | 'left' | 'right'

const ISOMETRIC_NUDGE_OFFSETS: Readonly<Record<IsometricNudgeDirection, RelativeLatticeOffset>> = {
  // PAL 的四向沿菱形边移动：上/下分别是屏幕右上/左下，左/右分别是左上/右下。
  up: { dRow: -1, du: 1 },
  down: { dRow: 1, du: -1 },
  left: { dRow: -1, du: -1 },
  right: { dRow: 1, du: 1 },
}

/** 沿错排菱形 lattice 的一个相邻格微调，不能用朴素 dRow/dCol 造成跨格或奇偶行漂移。 */
export function nudgeIsometricLattice(
  anchor: GridPointRef,
  direction: IsometricNudgeDirection,
): GridPointRef {
  return resolveRelativeLatticeOffset(anchor, ISOMETRIC_NUDGE_OFFSETS[direction])
}

function selectionAnchor(
  selection: Extract<MapSelection, { kind: 'cells' }>,
): GridPointRef | undefined {
  const refs = [
    ...selection.visualSlots.map(({ row, col }) => ({ row, col })),
    ...selection.gridPoints,
  ]
  return refs.sort((a, b) => a.row - b.row || latticeU(a) - latticeU(b))[0]
}

/** null 视觉槽不进内容 payload；includeCollision 时 0 也保留，表达显式通道覆盖。 */
export function captureMapClipboard(
  mapId: string,
  map: ProjectMap,
  selection: MapSelection,
  includeCollision: boolean,
): MapCellClipboard | undefined {
  switch (selection.kind) {
    case 'none':
      return undefined
    case 'stamp-placements':
      return undefined
    case 'cells': {
      const sourceAnchor = selectionAnchor(selection)
      if (!sourceAnchor) return undefined
      const seenVisual = new Set<string>()
      const visual: MapClipboardVisualCell[] = []
      for (const ref of selection.visualSlots) {
        const key = visualSlotKey(ref)
        if (seenVisual.has(key)) continue
        seenVisual.add(key)
        const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
        const tileId = layer?.tiles[ref.row]?.[ref.col]
        if (!layer || tileId === null || tileId === undefined) continue
        const tilesetId = mapInstanceTilesetId(map, layer, ref.row, ref.col)
        if (!tilesetId) continue
        visual.push({
          sourceLayerId: layer.id,
          sourceRef: { ...ref },
          offset: relativeLatticeOffset(ref, sourceAnchor),
          tileId,
          tilesetId,
          height: mapInstanceHeight(layer, ref.row, ref.col),
        })
      }
      const seenPoints = new Set<string>()
      const collisionCells: MapClipboardCollisionCell[] = []
      if (includeCollision) {
        for (const ref of selection.gridPoints) {
          const key = gridPointKey(ref)
          if (seenPoints.has(key)) continue
          seenPoints.add(key)
          const value = map.collision[ref.row]?.[ref.col]
          if (value === undefined) continue
          collisionCells.push({
            sourceRef: { ...ref },
            offset: relativeLatticeOffset(ref, sourceAnchor),
            value,
          })
        }
      }
      if (visual.length === 0 && (!includeCollision || collisionCells.length === 0))
        return undefined
      return {
        kind: 'cells',
        sourceMapId: mapId,
        sourceAnchor,
        hitScope: selection.hitScope,
        visual,
        collision: includeCollision
          ? { kind: 'included', cells: collisionCells }
          : { kind: 'excluded' },
      }
    }
    default:
      return assertNever(selection)
  }
}

function mappedLayerId(sourceLayerId: string, mappings: readonly MapLayerMapping[]): string {
  return (
    mappings.find((mapping) => mapping.sourceLayerId === sourceLayerId)?.targetLayerId ??
    sourceLayerId
  )
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

function buildNextSelection(
  visual: readonly VisualSlotRef[],
  collision: readonly GridPointRef[],
  hitScope: MapHitScope,
): MapSelection {
  const seenVisual = new Set<string>()
  const visualSlots = visual.filter((ref) => {
    const key = visualSlotKey(ref)
    if (seenVisual.has(key)) return false
    seenVisual.add(key)
    return true
  })
  const seenPoints = new Set<string>()
  const gridPoints = [...visual.map(({ row, col }) => ({ row, col })), ...collision].filter(
    (ref) => {
      const key = gridPointKey(ref)
      if (seenPoints.has(key)) return false
      seenPoints.add(key)
      return true
    },
  )
  return visualSlots.length || gridPoints.length
    ? { kind: 'cells', visualSlots, gridPoints, hitScope }
    : { kind: 'none' }
}

function finishPlan(
  map: ProjectMap,
  patch: ProjectMapPatch,
  requiredLayers: ReadonlySet<string>,
  visualRefs: readonly VisualSlotRef[],
  collisionRefs: readonly GridPointRef[],
  hitScope: MapHitScope,
  conflicts: MapTransformConflict[],
  issues: MapTransformIssue[],
  conflictPolicy: MapTransformConflictPolicy,
): MapTransformPlan {
  for (const ownershipIssue of ordinaryProjectMapPatchOwnershipIssues(map, patch)) {
    if (ownershipIssue.code !== 'visual-owned' && ownershipIssue.code !== 'collision-owned')
      continue
    issues.push({
      code: ownershipIssue.code,
      message: ownershipIssue.message,
      ...(ownershipIssue.ref ? { ref: ownershipIssue.ref } : {}),
      ...(ownershipIssue.ownerPlacementId
        ? { ownerPlacementId: ownershipIssue.ownerPlacementId }
        : {}),
    })
  }
  const empty = patch.visual.length === 0 && patch.collision.length === 0
  if (empty && issues.length === 0)
    issues.push({ code: 'empty-selection', message: '选区没有可变换的地图内容' })
  const canApply = issues.length === 0 && (conflictPolicy === 'overwrite' || conflicts.length === 0)
  return {
    // 失败计划只供幽灵/冲突预览；不给调用者一份可能清掉 move 源内容的可提交 patch。
    patch: canApply ? patch : { visual: [], collision: [] },
    requiredWritableLayerIds: [...requiredLayers],
    nextSelection: buildNextSelection(visualRefs, collisionRefs, hitScope),
    conflicts,
    issues,
    canApply,
  }
}

function destinationCells(
  map: ProjectMap,
  clipboard: MapCellClipboard,
  targetAnchor: GridPointRef,
  mappings: readonly MapLayerMapping[],
  issues: MapTransformIssue[],
) {
  const requiredLayers = new Set<string>()
  const visual: {
    source: MapClipboardVisualCell
    ref: VisualSlotRef
  }[] = []
  const seen = new Set<string>()
  for (const source of clipboard.visual) {
    const point = resolveRelativeLatticeOffset(targetAnchor, source.offset)
    const ref = { ...point, layerId: mappedLayerId(source.sourceLayerId, mappings) }
    requiredLayers.add(ref.layerId)
    if (!inside(map, ref)) {
      issues.push({ code: 'out-of-bounds', message: `目标视觉槽越出地图边界`, ref })
      continue
    }
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    if (!layer) {
      issues.push({ code: 'layer-missing', message: `目标图层 "${ref.layerId}" 不存在`, ref })
      continue
    }
    const key = visualSlotKey(ref)
    if (seen.has(key)) {
      issues.push({
        code: 'ambiguous-destination',
        message: `多个源实例映射到同一视觉槽 ${key}`,
        ref,
      })
      continue
    }
    seen.add(key)
    visual.push({ source, ref })
  }
  const collision =
    clipboard.collision.kind === 'included'
      ? clipboard.collision.cells.flatMap((source) => {
          const ref = resolveRelativeLatticeOffset(targetAnchor, source.offset)
          if (!inside(map, ref)) {
            issues.push({ code: 'out-of-bounds', message: `目标碰撞格点越出地图边界`, ref })
            return []
          }
          return [{ source, ref }]
        })
      : []
  return { visual, collision, requiredLayers }
}

export function planMapPaste(
  map: ProjectMap,
  clipboard: MapCellClipboard,
  targetAnchor: GridPointRef,
  options: {
    layerMappings?: readonly MapLayerMapping[]
    conflictPolicy?: MapTransformConflictPolicy
    collisionAuthorityLayerId?: string
  } = {},
): MapTransformPlan {
  const conflictPolicy = options.conflictPolicy ?? 'reject'
  const issues: MapTransformIssue[] = []
  const destination = destinationCells(
    map,
    clipboard,
    targetAnchor,
    options.layerMappings ?? [],
    issues,
  )
  const conflicts: MapTransformConflict[] = []
  if (destination.collision.length > 0) {
    if (options.collisionAuthorityLayerId)
      destination.requiredLayers.add(options.collisionAuthorityLayerId)
    else
      issues.push({
        code: 'collision-authority-missing',
        message: '粘贴碰撞通道时必须指定一个可写活动层作为权限归属',
      })
  }
  for (const { source, ref } of destination.visual) {
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    const current = layer?.tiles[ref.row]?.[ref.col]
    if (current !== null && current !== undefined)
      conflicts.push({
        channel: 'visual',
        ref,
        currentValue: current,
        incomingValue: source.tileId,
      })
  }
  for (const { source, ref } of destination.collision) {
    const current = map.collision[ref.row]?.[ref.col] ?? 0
    if (current !== 0 && current !== source.value)
      conflicts.push({
        channel: 'collision',
        ref,
        currentValue: current,
        incomingValue: source.value,
      })
  }
  const patch: ProjectMapPatch = {
    visual: destination.visual.flatMap(({ source, ref }) => [
      { channel: 'tileId' as const, ref, value: source.tileId },
      { channel: 'tilesetId' as const, ref, value: source.tilesetId },
      { channel: 'height' as const, ref, value: source.height },
    ]),
    collision: destination.collision.map(({ source, ref }) => ({ ref, value: source.value })),
  }
  return finishPlan(
    map,
    patch,
    destination.requiredLayers,
    destination.visual.map(({ ref }) => ref),
    destination.collision.map(({ ref }) => ref),
    clipboard.hitScope,
    conflicts,
    issues,
    conflictPolicy,
  )
}

export function planMapDelete(
  map: ProjectMap,
  selection: MapSelection,
  includeCollision: boolean,
  collisionAuthorityLayerId: string,
): MapTransformPlan {
  if (selection.kind === 'stamp-placements')
    return finishPlan(
      map,
      { visual: [], collision: [] },
      new Set(),
      [],
      [],
      'active-layer',
      [],
      [
        {
          code: 'stamp-selection-unsupported',
          message: '整组删除必须使用图章放置组操作，不能拆成普通 W8 单元格删除',
        },
      ],
      'overwrite',
    )
  if (selection.kind === 'none')
    return finishPlan(
      map,
      { visual: [], collision: [] },
      new Set(),
      [],
      [],
      'active-layer',
      [],
      [],
      'overwrite',
    )
  const requiredLayers = new Set(selection.visualSlots.map((ref) => ref.layerId))
  if (includeCollision) requiredLayers.add(collisionAuthorityLayerId)
  const seenVisual = new Set<string>()
  const visual = selection.visualSlots.filter((ref) => {
    const key = visualSlotKey(ref)
    if (seenVisual.has(key)) return false
    seenVisual.add(key)
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    return (
      layer?.tiles[ref.row]?.[ref.col] !== null && layer?.tiles[ref.row]?.[ref.col] !== undefined
    )
  })
  const seenCollision = new Set<string>()
  const collisionPoints = selection.gridPoints.filter((ref) => {
    const key = gridPointKey(ref)
    if (seenCollision.has(key)) return false
    seenCollision.add(key)
    return true
  })
  return finishPlan(
    map,
    {
      visual: visual.flatMap((ref) => [
        { channel: 'tileId' as const, ref, value: null },
        { channel: 'tilesetId' as const, ref, value: null },
        { channel: 'height' as const, ref, value: 0 },
      ]),
      collision: includeCollision ? collisionPoints.map((ref) => ({ ref, value: 0 })) : [],
    },
    requiredLayers,
    [],
    [],
    selection.hitScope,
    [],
    [],
    'overwrite',
  )
}

export function planMapMove(
  map: ProjectMap,
  selection: MapSelection,
  targetAnchor: GridPointRef,
  options: {
    includeCollision: boolean
    collisionAuthorityLayerId: string
    layerMappings?: readonly MapLayerMapping[]
    conflictPolicy?: MapTransformConflictPolicy
  },
  mapId = '',
): MapTransformPlan {
  const clipboard = captureMapClipboard(mapId, map, selection, options.includeCollision)
  if (!clipboard)
    return planMapDelete(
      map,
      { kind: 'none' },
      options.includeCollision,
      options.collisionAuthorityLayerId,
    )
  const conflictPolicy = options.conflictPolicy ?? 'reject'
  const issues: MapTransformIssue[] = []
  const destination = destinationCells(
    map,
    clipboard,
    targetAnchor,
    options.layerMappings ?? [],
    issues,
  )
  const sourceVisual = new Set(clipboard.visual.map((cell) => visualSlotKey(cell.sourceRef)))
  const sourceCollision = new Set(
    clipboard.collision.kind === 'included'
      ? clipboard.collision.cells.map((cell) => gridPointKey(cell.sourceRef))
      : [],
  )
  const conflicts: MapTransformConflict[] = []
  for (const { source, ref } of destination.visual) {
    const current = map.layers.find((layer) => layer.id === ref.layerId)?.tiles[ref.row]?.[ref.col]
    if (current !== null && current !== undefined && !sourceVisual.has(visualSlotKey(ref)))
      conflicts.push({
        channel: 'visual',
        ref,
        currentValue: current,
        incomingValue: source.tileId,
      })
  }
  for (const { source, ref } of destination.collision) {
    const current = map.collision[ref.row]?.[ref.col] ?? 0
    if (current !== 0 && current !== source.value && !sourceCollision.has(gridPointKey(ref)))
      conflicts.push({
        channel: 'collision',
        ref,
        currentValue: current,
        incomingValue: source.value,
      })
  }

  const tileIdWrites = new Map<
    string,
    Extract<ProjectMapPatch['visual'][number], { channel: 'tileId' }>
  >()
  const heightWrites = new Map<
    string,
    Extract<ProjectMapPatch['visual'][number], { channel: 'height' }>
  >()
  const tilesetWrites = new Map<
    string,
    Extract<ProjectMapPatch['visual'][number], { channel: 'tilesetId' }>
  >()
  const collisionWrites = new Map<string, ProjectMapPatch['collision'][number]>()
  for (const source of clipboard.visual) {
    const key = visualSlotKey(source.sourceRef)
    tileIdWrites.set(key, { channel: 'tileId', ref: source.sourceRef, value: null })
    tilesetWrites.set(key, { channel: 'tilesetId', ref: source.sourceRef, value: null })
    heightWrites.set(key, { channel: 'height', ref: source.sourceRef, value: 0 })
    destination.requiredLayers.add(source.sourceLayerId)
  }
  if (clipboard.collision.kind === 'included') {
    destination.requiredLayers.add(options.collisionAuthorityLayerId)
    for (const source of clipboard.collision.cells)
      collisionWrites.set(gridPointKey(source.sourceRef), { ref: source.sourceRef, value: 0 })
  }
  for (const { source, ref } of destination.visual) {
    const key = visualSlotKey(ref)
    tileIdWrites.set(key, { channel: 'tileId', ref, value: source.tileId })
    tilesetWrites.set(key, { channel: 'tilesetId', ref, value: source.tilesetId })
    heightWrites.set(key, { channel: 'height', ref, value: source.height })
  }
  for (const { source, ref } of destination.collision)
    collisionWrites.set(gridPointKey(ref), { ref, value: source.value })

  return finishPlan(
    map,
    {
      visual: [...tileIdWrites.values(), ...tilesetWrites.values(), ...heightWrites.values()],
      collision: [...collisionWrites.values()],
    },
    destination.requiredLayers,
    destination.visual.map(({ ref }) => ref),
    destination.collision.map(({ ref }) => ref),
    clipboard.hitScope,
    conflicts,
    issues,
    conflictPolicy,
  )
}
