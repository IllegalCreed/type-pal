/**
 * W8 地图内容选择的纯状态与命中逻辑。
 *
 * 这里的 selection 是编辑器工作区临时态：不进入 EditorState、工程 JSON、URL 或 undo 栈。
 * 持久内容修改仍必须通过 Command。
 */
import type { ProjectMap, RleFrame } from '@type-pal/reforge'
import {
  isLatticeInside,
  mapInstanceHeight,
  pixelToLattice,
  projectMapTileBlitRect,
} from '@type-pal/reforge'

export interface VisualSlotRef {
  layerId: string
  row: number
  col: number
}

export interface GridPointRef {
  row: number
  col: number
}

export type MapHitScope = 'active-layer' | 'visible-unlocked-layers'

export type MapSelection =
  | { kind: 'none' }
  | {
      kind: 'cells'
      /** 引用视觉槽位；槽位本身可以是空瓦片，ref 永远不是 null。 */
      visualSlots: VisualSlotRef[]
      /** 独立碰撞作用域；跨视觉层选择同一坐标时只保留一份。 */
      gridPoints: GridPointRef[]
      hitScope: MapHitScope
    }
  | { kind: 'stamp-placement'; placementId: string }

export type SelectionChangeMode = 'replace' | 'add' | 'subtract'

export interface SelectionModifierState {
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

export interface MapCellSelectionInput {
  visualSlots: readonly VisualSlotRef[]
  gridPoints: readonly GridPointRef[]
  hitScope: MapHitScope
}

export interface MapWorkspaceDocumentState {
  selection: MapSelection
  hitScope: MapHitScope
  hiddenLayerIds: string[]
  lockedLayerIds: string[]
}

export interface MapWorkspaceState {
  maps: Record<string, MapWorkspaceDocumentState>
}

export type MapWorkspaceAction =
  | {
      type: 'change-selection'
      mapId: string
      input: MapCellSelectionInput
      mode: SelectionChangeMode
    }
  | { type: 'set-selection'; mapId: string; selection: MapSelection }
  | { type: 'clear-selection'; mapId: string }
  | { type: 'set-hit-scope'; mapId: string; hitScope: MapHitScope }
  | { type: 'toggle-hidden-layer'; mapId: string; layerId: string }
  | { type: 'toggle-locked-layer'; mapId: string; layerId: string }
  | { type: 'clip-map'; mapId: string; map: ProjectMap }
  | { type: 'remove-map'; mapId: string }

export interface MapSelectionBounds {
  minRow: number
  minCol: number
  maxRow: number
  maxCol: number
}

export interface MapSelectionSummary {
  visualSlotCount: number
  visualInstanceCount: number
  emptySlotCount: number
  gridPointCount: number
  layerIds: string[]
  flatInstanceCount: number
  heightInstanceCount: number
  bounds?: MapSelectionBounds
  tileId: MixedValue<number | null>
  height: MixedValue<number>
  collision: MixedValue<number>
}

export type MixedValue<T> = { kind: 'empty' } | { kind: 'single'; value: T } | { kind: 'mixed' }

export interface MapHitCandidate {
  ref: VisualSlotRef
  layerName: string
  layerIndex: number
  tileId: number | null
  height: number
  pixelHit: boolean
  logicalHit: boolean
  locked: boolean
  selectable: boolean
  /** 非空实例的真实绘制边界；用于“图像边界 + 源格”双反馈。 */
  imageBounds?: { x: number; y: number; width: number; height: number }
}

export interface MapPointerHit {
  logicalPoint: GridPointRef
  /** R1：活动层透明像素命中优先；否则是活动层逻辑槽。 */
  primary: MapHitCandidate | undefined
  /** R5：图层面板从上到下，再按源格 row/col。 */
  candidates: MapHitCandidate[]
}

const EMPTY_DOCUMENT: MapWorkspaceDocumentState = {
  selection: { kind: 'none' },
  hitScope: 'active-layer',
  hiddenLayerIds: [],
  lockedLayerIds: [],
}

export function createMapWorkspaceState(): MapWorkspaceState {
  return { maps: {} }
}

export function mapWorkspaceDocument(
  state: MapWorkspaceState,
  mapId: string,
): MapWorkspaceDocumentState {
  return state.maps[mapId] ?? EMPTY_DOCUMENT
}

export function visualSlotKey(ref: VisualSlotRef): string {
  return `${ref.layerId}:${ref.row}:${ref.col}`
}

export function gridPointKey(ref: GridPointRef): string {
  return `${ref.row}:${ref.col}`
}

function uniqueBy<T>(values: readonly T[], keyOf: (value: T) => string): T[] {
  const found = new Map<string, T>()
  for (const value of values) found.set(keyOf(value), value)
  return [...found.values()]
}

function normalizeCellSelection(input: MapCellSelectionInput): MapSelection {
  const visualSlots = uniqueBy(input.visualSlots, visualSlotKey)
  const gridPoints = uniqueBy(input.gridPoints, gridPointKey)
  if (visualSlots.length === 0 && gridPoints.length === 0) return { kind: 'none' }
  return { kind: 'cells', visualSlots, gridPoints, hitScope: input.hitScope }
}

function cellsOrEmpty(selection: MapSelection): MapCellSelectionInput {
  switch (selection.kind) {
    case 'cells':
      return selection
    case 'none':
      return { visualSlots: [], gridPoints: [], hitScope: 'active-layer' }
    case 'stamp-placement':
      throw new Error('W7G 尚未接入 stamp-placement 的增选/减选语义')
    default: {
      const unreachable: never = selection
      return unreachable
    }
  }
}

/** replace/add/subtract 表驱动 reducer；stamp 分支只作 W7G 扩展点，不猜成员。 */
export function changeMapSelection(
  current: MapSelection,
  input: MapCellSelectionInput,
  mode: SelectionChangeMode,
): MapSelection {
  if (mode === 'replace') return normalizeCellSelection(input)
  const before = cellsOrEmpty(current)
  if (mode === 'add') {
    return normalizeCellSelection({
      visualSlots: [...before.visualSlots, ...input.visualSlots],
      gridPoints: [...before.gridPoints, ...input.gridPoints],
      hitScope: input.hitScope,
    })
  }
  if (mode === 'subtract') {
    const visualKeys = new Set(input.visualSlots.map(visualSlotKey))
    const pointKeys = new Set(input.gridPoints.map(gridPointKey))
    return normalizeCellSelection({
      visualSlots: before.visualSlots.filter((ref) => !visualKeys.has(visualSlotKey(ref))),
      gridPoints: before.gridPoints.filter((ref) => !pointKeys.has(gridPointKey(ref))),
      hitScope: before.hitScope,
    })
  }
  const unreachable: never = mode
  return unreachable
}

/** Ctrl/Cmd 减选优先于 Shift 增选；两者同时按减选处理，避免平台差异。 */
export function selectionModeFromModifiers(modifiers: SelectionModifierState): SelectionChangeMode {
  if (modifiers.ctrlKey || modifiers.metaKey) return 'subtract'
  if (modifiers.shiftKey) return 'add'
  return 'replace'
}

/** 以 CSS 屏幕像素判定 click/drag，缩放倍率不改变手感。 */
export function isMapSelectionDrag(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 3,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold
}

/** 删除图层/缩图后裁去悬空 ref；stamp placement 留给 W7G 自己定义裁剪语义。 */
export function clipMapSelection(selection: MapSelection, map: ProjectMap): MapSelection {
  if (selection.kind === 'none') return selection
  if (selection.kind === 'stamp-placement') return selection
  const layerIds = new Set(map.layers.map((layer) => layer.id))
  const next = normalizeCellSelection({
    visualSlots: selection.visualSlots.filter(
      (ref) => layerIds.has(ref.layerId) && isLatticeInside(map, ref),
    ),
    gridPoints: selection.gridPoints.filter((ref) => isLatticeInside(map, ref)),
    hitScope: selection.hitScope,
  })
  if (
    next.kind === 'cells' &&
    next.visualSlots.length === selection.visualSlots.length &&
    next.gridPoints.length === selection.gridPoints.length
  )
    return selection
  return next
}

function toggle(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function mapWorkspaceReducer(
  state: MapWorkspaceState,
  action: MapWorkspaceAction,
): MapWorkspaceState {
  if (action.type === 'remove-map') {
    if (!state.maps[action.mapId]) return state
    const maps = { ...state.maps }
    delete maps[action.mapId]
    return { maps }
  }
  const current = mapWorkspaceDocument(state, action.mapId)
  let next: MapWorkspaceDocumentState
  switch (action.type) {
    case 'change-selection':
      next = {
        ...current,
        selection: changeMapSelection(current.selection, action.input, action.mode),
      }
      break
    case 'set-selection':
      next = {
        ...current,
        selection:
          action.selection.kind === 'cells'
            ? normalizeCellSelection(action.selection)
            : action.selection,
      }
      break
    case 'clear-selection':
      next = { ...current, selection: { kind: 'none' } }
      break
    case 'set-hit-scope':
      // R2：切 scope 保留既有选区，只影响下一次命中；UI 会明确提示。
      next = { ...current, hitScope: action.hitScope }
      break
    case 'toggle-hidden-layer':
      next = { ...current, hiddenLayerIds: toggle(current.hiddenLayerIds, action.layerId) }
      break
    case 'toggle-locked-layer':
      next = { ...current, lockedLayerIds: toggle(current.lockedLayerIds, action.layerId) }
      break
    case 'clip-map': {
      const validLayers = new Set(action.map.layers.map((layer) => layer.id))
      next = {
        ...current,
        selection: clipMapSelection(current.selection, action.map),
        hiddenLayerIds: current.hiddenLayerIds.filter((id) => validLayers.has(id)),
        lockedLayerIds: current.lockedLayerIds.filter((id) => validLayers.has(id)),
      }
      break
    }
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
  if (next === current) return state
  return { maps: { ...state.maps, [action.mapId]: next } }
}

function layersInScope(
  map: ProjectMap,
  activeLayerId: string,
  hitScope: MapHitScope,
  hiddenLayerIds: ReadonlySet<string>,
  lockedLayerIds: ReadonlySet<string>,
) {
  if (hitScope === 'active-layer') {
    const active = map.layers.find((layer) => layer.id === activeLayerId)
    return active && !hiddenLayerIds.has(active.id) && !lockedLayerIds.has(active.id)
      ? [active]
      : []
  }
  return map.layers.filter(
    (layer) => !hiddenLayerIds.has(layer.id) && !lockedLayerIds.has(layer.id),
  )
}

/** 单击/框选把逻辑格扩成当前显式作用域；空视觉槽仍保留，便于粘贴目标和碰撞编辑。 */
export function selectionForGridPoints(
  map: ProjectMap,
  points: readonly GridPointRef[],
  options: {
    activeLayerId: string
    hitScope: MapHitScope
    hiddenLayerIds?: ReadonlySet<string>
    lockedLayerIds?: ReadonlySet<string>
  },
): MapCellSelectionInput {
  const hidden = options.hiddenLayerIds ?? new Set<string>()
  const locked = options.lockedLayerIds ?? new Set<string>()
  const validPoints = uniqueBy(
    points.filter((point) => isLatticeInside(map, point)),
    gridPointKey,
  )
  const layers = layersInScope(map, options.activeLayerId, options.hitScope, hidden, locked)
  if (layers.length === 0) return { visualSlots: [], gridPoints: [], hitScope: options.hitScope }
  return {
    visualSlots: layers.flatMap((layer) =>
      validPoints.map((point) => ({ ...point, layerId: layer.id })),
    ),
    gridPoints: validPoints,
    hitScope: options.hitScope,
  }
}

/** R3：全选固定取活动层非空视觉实例 + 非默认碰撞格，不受跨层框选开关影响。 */
export function selectAllMapContent(
  map: ProjectMap,
  options: {
    activeLayerId: string
    hitScope: MapHitScope
    hiddenLayerIds?: ReadonlySet<string>
    lockedLayerIds?: ReadonlySet<string>
  },
): MapSelection {
  const hidden = options.hiddenLayerIds ?? new Set<string>()
  const locked = options.lockedLayerIds ?? new Set<string>()
  const layers = layersInScope(map, options.activeLayerId, 'active-layer', hidden, locked)
  if (layers.length === 0) return { kind: 'none' }
  const visualSlots: VisualSlotRef[] = []
  for (const layer of layers) {
    for (let row = 0; row < map.height * 2; row++) {
      for (let col = 0; col < map.width; col++) {
        if (layer.tiles[row]?.[col] !== null && layer.tiles[row]?.[col] !== undefined)
          visualSlots.push({ layerId: layer.id, row, col })
      }
    }
  }
  const gridPoints: GridPointRef[] = []
  for (let row = 0; row < map.height * 2; row++) {
    for (let col = 0; col < map.width; col++) {
      if ((map.collision[row]?.[col] ?? 0) !== 0) gridPoints.push({ row, col })
    }
  }
  return normalizeCellSelection({ visualSlots, gridPoints, hitScope: options.hitScope })
}

function mixed<T>(values: readonly T[]): MixedValue<T> {
  if (values.length === 0) return { kind: 'empty' }
  const first = values[0] as T
  return values.every((value) => Object.is(value, first))
    ? { kind: 'single', value: first }
    : { kind: 'mixed' }
}

export function mapSelectionBounds(selection: MapSelection): MapSelectionBounds | undefined {
  if (selection.kind !== 'cells') return undefined
  if (selection.gridPoints.length === 0 && selection.visualSlots.length === 0) return undefined
  let minRow = Number.POSITIVE_INFINITY
  let minCol = Number.POSITIVE_INFINITY
  let maxRow = Number.NEGATIVE_INFINITY
  let maxCol = Number.NEGATIVE_INFINITY
  const include = (point: GridPointRef): void => {
    minRow = Math.min(minRow, point.row)
    minCol = Math.min(minCol, point.col)
    maxRow = Math.max(maxRow, point.row)
    maxCol = Math.max(maxCol, point.col)
  }
  for (const point of selection.gridPoints) include(point)
  for (const { row, col } of selection.visualSlots) include({ row, col })
  return {
    minRow,
    minCol,
    maxRow,
    maxCol,
  }
}

/** Inspector 的单值/混合值模型；视觉槽和格点通道分别统计。 */
export function summarizeMapSelection(
  selection: MapSelection,
  map: ProjectMap,
): MapSelectionSummary {
  if (selection.kind !== 'cells') {
    return {
      visualSlotCount: 0,
      visualInstanceCount: 0,
      emptySlotCount: 0,
      gridPointCount: 0,
      layerIds: [],
      flatInstanceCount: 0,
      heightInstanceCount: 0,
      tileId: { kind: 'empty' },
      height: { kind: 'empty' },
      collision: { kind: 'empty' },
    }
  }
  const tiles: (number | null)[] = []
  const heights: number[] = []
  let emptySlotCount = 0
  let flatInstanceCount = 0
  let heightInstanceCount = 0
  const layerIds = new Set<string>()
  for (const ref of selection.visualSlots) {
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    if (!layer) continue
    layerIds.add(layer.id)
    const tileId = layer.tiles[ref.row]?.[ref.col]
    if (tileId === undefined) continue
    tiles.push(tileId)
    if (tileId === null) {
      emptySlotCount++
      continue
    }
    heights.push(mapInstanceHeight(layer, ref.row, ref.col))
    if (layer.depthMode === 'flat') flatInstanceCount++
    else heightInstanceCount++
  }
  const collision = selection.gridPoints.flatMap((point) => {
    const value = map.collision[point.row]?.[point.col]
    return value === undefined ? [] : [value]
  })
  return {
    visualSlotCount: tiles.length,
    visualInstanceCount: tiles.length - emptySlotCount,
    emptySlotCount,
    gridPointCount: collision.length,
    layerIds: [...layerIds],
    flatInstanceCount,
    heightInstanceCount,
    bounds: mapSelectionBounds(selection),
    tileId: mixed(tiles),
    height: mixed(heights),
    collision: mixed(collision),
  }
}

function frameHit(
  frame: RleFrame,
  drawX: number,
  drawY: number,
  worldX: number,
  worldY: number,
): boolean {
  const x = Math.floor(worldX - drawX)
  const y = Math.floor(worldY - drawY)
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return false
  return frame.opaque[y * frame.width + x] === 1
}

/**
 * R1/R5 的唯一真值：活动层像素命中优先于逻辑格；跨层像素只进候选。
 * hidden 不出现；locked 可在候选中灰显，但不可成为 primary。
 */
export function hitTestMapContent(
  map: ProjectMap,
  tiles: ReadonlyMap<number, RleFrame>,
  worldX: number,
  worldY: number,
  options: {
    activeLayerId: string
    hiddenLayerIds?: ReadonlySet<string>
    lockedLayerIds?: ReadonlySet<string>
  },
): MapPointerHit {
  const hidden = options.hiddenLayerIds ?? new Set<string>()
  const locked = options.lockedLayerIds ?? new Set<string>()
  const logicalPoint = pixelToLattice(worldX, worldY)
  const candidatesByKey = new Map<string, MapHitCandidate>()

  map.layers.forEach((layer, layerIndex) => {
    if (hidden.has(layer.id)) return
    for (let row = 0; row < map.height * 2; row++) {
      for (let col = 0; col < map.width; col++) {
        const tileId = layer.tiles[row]?.[col]
        if (tileId === undefined) continue
        const logicalHit = row === logicalPoint.row && col === logicalPoint.col
        const frame = tileId === null ? undefined : tiles.get(tileId)
        const imageBounds = frame ? projectMapTileBlitRect({ row, col }, frame) : undefined
        const pixelHit =
          frame !== undefined &&
          imageBounds !== undefined &&
          frameHit(frame, imageBounds.x, imageBounds.y, worldX, worldY)
        if (!logicalHit && !pixelHit) continue
        const ref = { layerId: layer.id, row, col }
        candidatesByKey.set(visualSlotKey(ref), {
          ref,
          layerName: layer.name,
          layerIndex,
          tileId,
          height: mapInstanceHeight(layer, row, col),
          pixelHit,
          logicalHit,
          locked: locked.has(layer.id),
          selectable: !locked.has(layer.id),
          imageBounds,
        })
      }
    }
  })

  const candidates = [...candidatesByKey.values()].sort(
    (a, b) => b.layerIndex - a.layerIndex || a.ref.row - b.ref.row || a.ref.col - b.ref.col,
  )
  const activePixelHits = candidates.filter(
    (candidate) =>
      candidate.ref.layerId === options.activeLayerId && candidate.pixelHit && candidate.selectable,
  )
  const primary =
    activePixelHits.at(-1) ??
    candidates.find(
      (candidate) =>
        candidate.ref.layerId === options.activeLayerId &&
        candidate.logicalHit &&
        candidate.selectable,
    )
  return { logicalPoint, primary, candidates }
}
