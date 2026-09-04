import {
  mapInstanceHeight,
  mapInstanceTilesetId,
  type ProjectMap,
  type StampTemplate,
  validateStampTemplates,
} from '@type-pal/content'
import { isLatticeInside } from '@type-pal/reforge'
import type { GridPointRef, MapSelection } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { latticeU, relativeLatticeOffset, resolveRelativeLatticeOffset } from './map-transform.js'

export interface BuildStampTemplateInput {
  map: ProjectMap
  selection: Extract<MapSelection, { kind: 'cells' }>
  id: string
  name: string
  category?: string
  /** 作者显式确认的地图锚点；保存后转为组合内容内的局部 anchor。 */
  anchor: GridPointRef
  includeCollision: boolean
  /** source layerId → 组合局部层显示名；稳定 id 复用 source layerId。 */
  layerSlotNames?: Readonly<Record<string, string>>
}

export interface StampSelectionSource {
  mapId: string
  selection: Extract<MapSelection, { kind: 'cells' }>
}

export function defaultStampTemplateAnchor(
  selection: Extract<MapSelection, { kind: 'cells' }>,
): GridPointRef | undefined {
  const points = [
    ...selection.visualSlots.map(({ row, col }) => ({ row, col })),
    ...selection.gridPoints,
  ]
  return points.sort((left, right) => left.row - right.row || latticeU(left) - latticeU(right))[0]
}

function normalizedTemplateId(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function nextStampTemplateId(preferred: string, existingIds: Iterable<string>): string {
  const used = new Set(existingIds)
  const stem = normalizedTemplateId(preferred) || 'stamp'
  if (!used.has(stem)) return stem
  for (let index = 2; ; index++) {
    const candidate = `${stem}-${index}`
    if (!used.has(candidate)) return candidate
  }
}

function matrix<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array<T>(cols).fill(value))
}

/**
 * 将地图选区裁成与地图同构的局部等距内容。来源、高度、图层和 nullable collision
 * 都原样保留；组合 anchor 只从世界坐标平移为局部坐标。
 */
export function buildStampTemplateFromSelection(input: BuildStampTemplateInput): StampTemplate {
  const { map, selection } = input
  if (!isLatticeInside(map, input.anchor)) throw new Error('组合锚点必须位于当前地图内。')

  const layerById = new Map(map.layers.map((layer) => [layer.id, layer] as const))
  const selectedVisual = new Map<string, { layerId: string; row: number; col: number }>()
  for (const ref of selection.visualSlots) {
    const key = visualSlotKey(ref)
    if (selectedVisual.has(key)) continue
    if (!isLatticeInside(map, ref)) throw new Error(`视觉槽 ${key} 已超出地图边界。`)
    const layer = layerById.get(ref.layerId)
    if (!layer) throw new Error(`选区引用的图层 "${ref.layerId}" 不存在。`)
    const tileId = layer.tiles[ref.row]?.[ref.col]
    if (tileId !== null && tileId !== undefined) selectedVisual.set(key, { ...ref })
  }
  if (selectedVisual.size === 0) throw new Error('选区没有可保存的非空视觉实例。')

  const selectedCollision = new Map<string, GridPointRef>()
  if (input.includeCollision)
    for (const ref of selection.gridPoints) {
      const key = gridPointKey(ref)
      if (selectedCollision.has(key)) continue
      if (!isLatticeInside(map, ref)) throw new Error(`碰撞格点 ${key} 已超出地图边界。`)
      selectedCollision.set(key, { ...ref })
    }

  const points = [input.anchor, ...selectedVisual.values(), ...selectedCollision.values()]
  const offsets = points.map((point) => relativeLatticeOffset(point, input.anchor))
  const minDRow = Math.min(...offsets.map(({ dRow }) => dRow))
  const localAnchorRow = Math.ceil(Math.max(0, -minDRow) / 2) * 2
  const provisionalAnchor = { row: localAnchorRow, col: 0 }
  const provisional = offsets.map((offset) =>
    resolveRelativeLatticeOffset(provisionalAnchor, offset),
  )
  const localAnchorCol = Math.max(0, -Math.min(...provisional.map(({ col }) => col)))
  const anchor = { row: localAnchorRow, col: localAnchorCol }
  const toLocal = (point: GridPointRef): GridPointRef =>
    resolveRelativeLatticeOffset(anchor, relativeLatticeOffset(point, input.anchor))
  const localPoints = points.map(toLocal)
  const width = Math.max(...localPoints.map(({ col }) => col)) + 1
  const latticeRows = Math.max(...localPoints.map(({ row }) => row)) + 1
  const height = Math.max(1, Math.ceil(latticeRows / 2))
  const rows = height * 2

  const usedLayerIds = new Set([...selectedVisual.values()].map(({ layerId }) => layerId))
  const usedLayers = map.layers.filter(({ id }) => usedLayerIds.has(id))
  const usedTilesetIds = new Set<string>()
  for (const ref of selectedVisual.values()) {
    const layer = layerById.get(ref.layerId)!
    const tilesetId = mapInstanceTilesetId(map, layer, ref.row, ref.col)
    if (!tilesetId) throw new Error(`视觉槽 ${visualSlotKey(ref)} 缺少瓦片集来源。`)
    usedTilesetIds.add(tilesetId)
  }
  const tilesetRefs = [...usedTilesetIds].sort()
  const sourceIndex = new Map(tilesetRefs.map((tilesetId, index) => [tilesetId, index]))

  const layers = usedLayers.map((sourceLayer) => {
    const tiles = matrix<number | null>(rows, width, null)
    const sources = matrix<number | null>(rows, width, null)
    const heights = matrix(rows, width, 0)
    for (const ref of selectedVisual.values()) {
      if (ref.layerId !== sourceLayer.id) continue
      const point = toLocal(ref)
      const tileId = sourceLayer.tiles[ref.row]?.[ref.col]
      const tilesetId = mapInstanceTilesetId(map, sourceLayer, ref.row, ref.col)
      if (tileId === null || tileId === undefined || !tilesetId) continue
      tiles[point.row]![point.col] = tileId
      sources[point.row]![point.col] = sourceIndex.get(tilesetId)!
      heights[point.row]![point.col] = mapInstanceHeight(sourceLayer, ref.row, ref.col)
    }
    return {
      id: sourceLayer.id,
      name: input.layerSlotNames?.[sourceLayer.id]?.trim() || sourceLayer.name,
      tiles,
      sources,
      ...(heights.some((row) => row.some((value) => value !== 0)) ? { heights } : {}),
    }
  })
  const collision = matrix<number | null>(rows, width, null)
  for (const ref of selectedCollision.values()) {
    const point = toLocal(ref)
    collision[point.row]![point.col] = map.collision[ref.row]![ref.col]!
  }

  const category = input.category?.trim()
  const [template] = validateStampTemplates([
    {
      id: input.id.trim(),
      name: input.name.trim(),
      ...(category ? { category } : {}),
      origin: 'authored',
      width,
      height,
      anchor,
      tilesetRefs,
      layers,
      collision,
    },
  ])
  if (!template) throw new Error('组合模板构建失败。')
  return template
}
