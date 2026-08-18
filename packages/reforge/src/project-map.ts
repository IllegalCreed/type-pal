/** ProjectMap v2/v3 的构造与不可变编辑纯逻辑。 */

import {
  type MapLayerV2,
  mapInstanceHeight,
  type ProjectMap,
  type ProjectMapV2,
  type StampPlacementGroupV1,
  validateProjectMap,
} from '@type-pal/content'
import { expectDefined } from './defined.js'

export interface LatticePos {
  col: number
  row: number
}

export interface ProjectMapTileEdit extends LatticePos {
  /** 稳定图层身份；重排后命令仍写同一层。 */
  layerId: string
  tileId: number | null
  /** 这次放置实例的高度；tileId=null 时强制归零。 */
  height: number
}

export interface ProjectMapCollisionEdit extends LatticePos {
  value: number
}

export interface ProjectMapTileDraw extends LatticePos {
  layerId: string
  layerIndex: number
  tileId: number
  depthMode: MapLayerV2['depthMode']
  height: number
  centerX: number
  centerY: number
}

function matrix<T>(rows: number, cols: number, make: () => T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, make))
}

export function buildBlankProjectMap(
  width: number,
  height: number,
  tilesetId: string,
): ProjectMapV2 {
  const rows = height * 2
  return {
    version: 2,
    width,
    height,
    tilesetId,
    layers: [
      {
        id: 'floor',
        name: '地板',
        depthMode: 'flat',
        tiles: matrix(rows, width, () => null),
      },
    ],
    collision: matrix(rows, width, () => 0),
  }
}

export function buildProjectMapLayer(
  map: Pick<ProjectMap, 'width' | 'height'>,
  id: string,
  name: string,
  depthMode: MapLayerV2['depthMode'] = 'height',
): MapLayerV2 {
  const rows = map.height * 2
  return {
    id,
    name,
    depthMode,
    tiles: matrix(rows, map.width, () => null),
    ...(depthMode === 'height' ? { heights: matrix(rows, map.width, () => 0) } : {}),
  }
}

export function nextProjectMapLayerId(map: ProjectMap): string {
  const used = new Set(map.layers.map((layer) => layer.id))
  for (let n = 1; ; n++) {
    const id = `layer-${n}`
    if (!used.has(id)) return id
  }
}

export function isLatticeInside(
  map: Pick<ProjectMap, 'width' | 'height'>,
  pos: LatticePos,
): boolean {
  return pos.col >= 0 && pos.col < map.width && pos.row >= 0 && pos.row < map.height * 2
}

/** 错排 lattice 中心：奇数行向右错半格。 */
export function latticeCenter(pos: LatticePos): { x: number; y: number } {
  return { x: pos.col * 32 + (pos.row & 1) * 16, y: pos.row * 8 }
}

/**
 * ProjectMap tile 的真实世界绘制矩形。渲染与编辑器透明像素命中必须共用，避免魔数漂移。
 * 实例 height 只参与遮挡排序，不改变图像几何位置。
 */
export function projectMapTileBlitRect(
  pos: LatticePos,
  frame: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const center = latticeCenter(pos)
  return { x: center.x - 16, y: center.y - 8, width: frame.width, height: frame.height }
}

/** 世界像素命中最近的错排菱形子格。 */
export function pixelToLattice(x: number, y: number): LatticePos {
  let col = Math.floor(x / 32)
  let cellRow = Math.floor(y / 16)
  let subRow = 0
  const xr = ((x % 32) + 32) % 32
  const yr = ((y % 16) + 16) % 16
  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++
      cellRow++
    } else if (32 - xr + yr * 2 < 16) {
      col++
    } else if (32 - xr + yr * 2 < 48) {
      subRow = 1
    } else {
      cellRow++
    }
  }
  return { col, row: cellRow * 2 + subRow }
}

/** 像素 AABB 内的 lattice 中心；端点任意序，界外交给写入函数忽略。 */
export function latticeInRect(x0: number, y0: number, x1: number, y1: number): LatticePos[] {
  const [xa, xb] = x0 <= x1 ? [x0, x1] : [x1, x0]
  const [ya, yb] = y0 <= y1 ? [y0, y1] : [y1, y0]
  const out: LatticePos[] = []
  for (let row = Math.ceil(ya / 8); row * 8 <= yb; row++) {
    const offset = (row & 1) * 16
    for (let col = Math.ceil((xa - offset) / 32); col * 32 + offset <= xb; col++) {
      out.push({
        col: Object.is(col, -0) ? 0 : col,
        row: Object.is(row, -0) ? 0 : row,
      })
    }
  }
  return out
}

/** 地图内的像素 AABB lattice 中心；先裁枚举边界，避免极低缩放/界外拖拽制造巨量中间数组。 */
export function latticeInMapRect(
  map: Pick<ProjectMap, 'width' | 'height'>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): LatticePos[] {
  const [xa, xb] = x0 <= x1 ? [x0, x1] : [x1, x0]
  const [ya, yb] = y0 <= y1 ? [y0, y1] : [y1, y0]
  const firstRow = Math.max(0, Math.ceil(ya / 8))
  const lastRow = Math.min(map.height * 2 - 1, Math.floor(yb / 8))
  const out: LatticePos[] = []
  for (let row = firstRow; row <= lastRow; row++) {
    const offset = (row & 1) * 16
    const firstCol = Math.max(0, Math.ceil((xa - offset) / 32))
    const lastCol = Math.min(map.width - 1, Math.floor((xb - offset) / 32))
    for (let col = firstCol; col <= lastCol; col++) out.push({ col, row })
  }
  return out
}

/** 供渲染器消费的纯计划；null 永不产出。 */
export function projectMapTilesInView(
  map: ProjectMap,
  view: { col: number; row: number; cols: number; rows: number },
  hiddenLayerIds: ReadonlySet<string> = new Set(),
): ProjectMapTileDraw[] {
  const row0 = Math.max(0, view.row * 2)
  const row1 = Math.min(map.height * 2, (view.row + view.rows) * 2)
  const col0 = Math.max(0, view.col)
  const col1 = Math.min(map.width, view.col + view.cols)
  const out: ProjectMapTileDraw[] = []
  map.layers.forEach((layer, layerIndex) => {
    if (hiddenLayerIds.has(layer.id)) return
    for (let row = row0; row < row1; row++) {
      for (let col = col0; col < col1; col++) {
        const tileId = layer.tiles[row]?.[col]
        if (tileId === null || tileId === undefined) continue
        const { x: centerX, y: centerY } = latticeCenter({ col, row })
        out.push({
          layerId: layer.id,
          layerIndex,
          tileId,
          depthMode: layer.depthMode,
          height: mapInstanceHeight(layer, row, col),
          col,
          row,
          centerX,
          centerY,
        })
      }
    }
  })
  return out
}

export function paintProjectMapTiles<T extends ProjectMap>(
  map: T,
  edits: readonly ProjectMapTileEdit[],
): T {
  const byLayer = new Map<string, ProjectMapTileEdit[]>()
  for (const edit of edits) {
    if (!isLatticeInside(map, edit)) continue
    if (!Number.isInteger(edit.height) || edit.height < 0)
      throw new Error(`地图实例高度必须是非负整数，收到 ${edit.height}`)
    const list = byLayer.get(edit.layerId)
    if (list) list.push(edit)
    else byLayer.set(edit.layerId, [edit])
  }
  if (byLayer.size === 0) return map

  let changed = false
  const layers = map.layers.map((layer) => {
    const layerEdits = byLayer.get(layer.id)
    if (!layerEdits) return layer
    if (
      layer.depthMode === 'flat' &&
      layerEdits.some((edit) => edit.tileId !== null && edit.height > 0)
    )
      throw new Error(`flat 图层 "${layer.name}" 不能写入非零高度`)
    const touchedRows = new Set(layerEdits.map((edit) => edit.row))
    const tiles = layer.tiles.map((row, index) => (touchedRows.has(index) ? [...row] : row))
    const sourceHeights = layer.heights ?? matrix(map.height * 2, map.width, () => 0)
    const heights = sourceHeights.map((row, index) => (touchedRows.has(index) ? [...row] : row))
    for (const edit of layerEdits) {
      expectDefined(tiles[edit.row])[edit.col] = edit.tileId
      expectDefined(heights[edit.row])[edit.col] = edit.tileId === null ? 0 : edit.height
    }
    changed = true
    return {
      ...layer,
      tiles,
      ...(layer.depthMode === 'height' ? { heights } : {}),
    }
  })
  return changed ? ({ ...map, layers } as T) : map
}

export function paintProjectMapCollision<T extends ProjectMap>(
  map: T,
  edits: readonly ProjectMapCollisionEdit[],
): T {
  const valid = edits.filter((edit) => isLatticeInside(map, edit))
  if (valid.length === 0) return map
  const touchedRows = new Set(valid.map((edit) => edit.row))
  const collision = map.collision.map((row, index) => (touchedRows.has(index) ? [...row] : row))
  for (const edit of valid) {
    if (!Number.isInteger(edit.value) || edit.value < 0)
      throw new Error(`碰撞值必须是非负整数，收到 ${edit.value}`)
    expectDefined(collision[edit.row])[edit.col] = edit.value
  }
  return { ...map, collision } as T
}

/** 同 tileId + 实例高度的四邻域填充；null/H0 空格同样是可填充区域。 */
export function floodFillProjectMapTiles(
  map: ProjectMap,
  layerId: string,
  start: LatticePos,
  tileId: number | null,
  height: number,
): ProjectMapTileEdit[] {
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!layer || !isLatticeInside(map, start)) return []
  const target = layer.tiles[start.row]?.[start.col]
  const targetHeight = mapInstanceHeight(layer, start.row, start.col)
  if (target === undefined || (target === tileId && targetHeight === height)) return []

  const out: ProjectMapTileEdit[] = []
  const seen = new Set<string>([`${start.col},${start.row}`])
  const queue: LatticePos[] = [start]
  while (queue.length > 0) {
    const current = queue.pop()
    if (
      !current ||
      layer.tiles[current.row]?.[current.col] !== target ||
      mapInstanceHeight(layer, current.row, current.col) !== targetHeight
    )
      continue
    out.push({ ...current, layerId, tileId, height })
    const left = current.col - (current.row % 2 === 0 ? 1 : 0)
    const neighbors: LatticePos[] = [
      { col: left, row: current.row - 1 },
      { col: left + 1, row: current.row - 1 },
      { col: left, row: current.row + 1 },
      { col: left + 1, row: current.row + 1 },
    ]
    for (const neighbor of neighbors) {
      if (!isLatticeInside(map, neighbor)) continue
      const key = `${neighbor.col},${neighbor.row}`
      if (seen.has(key)) continue
      seen.add(key)
      queue.push(neighbor)
    }
  }
  return out
}

function isInsideProjectMapSize(
  width: number,
  height: number,
  ref: Pick<LatticePos, 'row' | 'col'>,
): boolean {
  return ref.row >= 0 && ref.row < height * 2 && ref.col >= 0 && ref.col < width
}

function assertResizeKeepsStampPlacements(map: ProjectMap, width: number, height: number): void {
  const affected = projectMapStampPlacements(map).filter(
    (placement) =>
      !isInsideProjectMapSize(width, height, placement.anchor) ||
      placement.visualSlots.some((ref) => !isInsideProjectMapSize(width, height, ref)) ||
      placement.gridPoints.some((ref) => !isInsideProjectMapSize(width, height, ref)),
  )
  if (affected.length > 0)
    throw new Error(
      `缩小地图会破坏 ${affected.length} 个组合（${affected.map(({ id }) => id).join(', ')}）；请先解组或删除整组。`,
    )
}

export function resizeProjectMap<T extends ProjectMap>(map: T, width: number, height: number): T {
  if (width === map.width && height === map.height) return map
  assertResizeKeepsStampPlacements(map, width, height)
  const rows = height * 2
  const rebuild = <T>(src: readonly (readonly T[])[], fill: T): T[][] =>
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: width }, (_, col) => src[row]?.[col] ?? fill),
    )
  return {
    ...map,
    width,
    height,
    layers: map.layers.map((layer) => ({
      ...layer,
      tiles: rebuild<number | null>(layer.tiles, null),
      ...(layer.depthMode === 'height' ? { heights: rebuild(layer.heights ?? [], 0) } : {}),
    })),
    collision: rebuild(map.collision, 0),
  } as T
}

export function insertProjectMapLayer<T extends ProjectMap>(
  map: T,
  layer: MapLayerV2,
  index = map.layers.length,
): T {
  if (map.layers.some((candidate) => candidate.id === layer.id)) return map
  const at = Math.max(0, Math.min(index, map.layers.length))
  return { ...map, layers: [...map.layers.slice(0, at), layer, ...map.layers.slice(at)] } as T
}

export function removeProjectMapLayer<T extends ProjectMap>(map: T, layerId: string): T {
  if (map.layers.length <= 1 || !map.layers.some((layer) => layer.id === layerId)) return map
  const affected = projectMapStampPlacements(map).filter((placement) =>
    placement.visualSlots.some((ref) => ref.layerId === layerId),
  )
  if (affected.length > 0)
    throw new Error(
      `删除图层会破坏 ${affected.length} 个组合（${affected.map(({ id }) => id).join(', ')}）；请先解组或删除整组。`,
    )
  return { ...map, layers: map.layers.filter((layer) => layer.id !== layerId) } as T
}

export function moveProjectMapLayer<T extends ProjectMap>(
  map: T,
  layerId: string,
  toIndex: number,
): T {
  const from = map.layers.findIndex((layer) => layer.id === layerId)
  if (from < 0) return map
  const to = Math.max(0, Math.min(toIndex, map.layers.length - 1))
  if (from === to) return map
  const layers = [...map.layers]
  const [layer] = layers.splice(from, 1)
  if (!layer) return map
  layers.splice(to, 0, layer)
  return { ...map, layers } as T
}

export function updateProjectMapLayer<T extends ProjectMap>(
  map: T,
  layerId: string,
  patch: Partial<Pick<MapLayerV2, 'name' | 'depthMode'>>,
): T {
  const index = map.layers.findIndex((layer) => layer.id === layerId)
  if (index < 0) return map
  const current = expectDefined(map.layers[index])
  if (patch.depthMode === 'flat' && current.depthMode !== 'flat') {
    const hasHeight = current.heights?.some((row) => row.some((height) => height !== 0)) ?? false
    if (hasHeight) throw new Error(`图层 "${current.name}" 仍有非零实例高度，不能切换为 flat`)
  }
  const depthMode = patch.depthMode ?? current.depthMode
  const layers = [...map.layers]
  layers[index] = {
    ...current,
    ...patch,
    ...(depthMode === 'height'
      ? { heights: current.heights ?? matrix(map.height * 2, map.width, () => 0) }
      : {}),
  }
  const updated = layers[index]
  if (depthMode === 'flat' && updated) delete updated.heights
  return { ...map, layers } as T
}

/** v2 不物化空 authoring；非空 placement 与普通矩阵一同成为 v3。 */
export function withProjectMapStampPlacements(
  map: ProjectMap,
  placements: readonly StampPlacementGroupV1[],
): ProjectMap {
  const base = {
    width: map.width,
    height: map.height,
    tilesetId: map.tilesetId,
    layers: map.layers,
    collision: map.collision,
  }
  if (placements.length === 0) return { version: 2, ...base }
  return validateProjectMap({
    version: 3,
    ...base,
    authoring: { version: 1, stampPlacements: placements },
  })
}

export function projectMapStampPlacements(map: ProjectMap): readonly StampPlacementGroupV1[] {
  return map.version === 3 ? map.authoring.stampPlacements : []
}
