/** 自有地图 v1 的构造与不可变编辑纯逻辑。 */
import type { OwnMap, OwnMapLayer } from '@type-pal/content'

export interface LatticePos {
  col: number
  row: number
}

export interface OwnMapTileEdit extends LatticePos {
  /** 稳定图层身份；重排后命令仍写同一层。 */
  layerId: string
  tileId: number | null
}

export interface OwnMapCollisionEdit extends LatticePos {
  value: number
}

export interface OwnMapTileDraw extends LatticePos {
  layerId: string
  layerIndex: number
  tileId: number
  occlude: boolean
  centerX: number
  centerY: number
}

function matrix<T>(rows: number, cols: number, make: () => T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, make))
}

export function buildBlankOwnMap(width: number, height: number, tileset: string): OwnMap {
  const rows = height * 2
  return {
    version: 1,
    width,
    height,
    tileset,
    layers: [
      {
        id: 'floor',
        name: '地板',
        occlude: false,
        tiles: matrix(rows, width, () => null),
      },
    ],
    collision: matrix(rows, width, () => 0),
  }
}

export function buildOwnMapLayer(
  map: Pick<OwnMap, 'width' | 'height'>,
  id: string,
  name: string,
  occlude = false,
): OwnMapLayer {
  return {
    id,
    name,
    occlude,
    tiles: matrix(map.height * 2, map.width, () => null),
  }
}

export function nextOwnMapLayerId(map: OwnMap): string {
  const used = new Set(map.layers.map((layer) => layer.id))
  for (let n = 1; ; n++) {
    const id = `layer-${n}`
    if (!used.has(id)) return id
  }
}

export function isLatticeInside(map: Pick<OwnMap, 'width' | 'height'>, pos: LatticePos): boolean {
  return pos.col >= 0 && pos.col < map.width && pos.row >= 0 && pos.row < map.height * 2
}

/** 错排 lattice 中心：奇数行向右错半格。 */
export function latticeCenter(pos: LatticePos): { x: number; y: number } {
  return { x: pos.col * 32 + (pos.row & 1) * 16, y: pos.row * 8 }
}

/** 世界像素命中最近的错排菱形子格；不向外暴露旧格式 h/lower-upper。 */
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
      out.push({ col: Object.is(col, -0) ? 0 : col, row })
    }
  }
  return out
}

/** 供渲染器消费的纯计划；null 永不产出，因此 occlude 空格不会进入遮挡表。 */
export function ownMapTilesInView(
  map: OwnMap,
  view: { col: number; row: number; cols: number; rows: number },
  hiddenLayerIds: ReadonlySet<string> = new Set(),
): OwnMapTileDraw[] {
  const row0 = Math.max(0, view.row * 2)
  const row1 = Math.min(map.height * 2, (view.row + view.rows) * 2)
  const col0 = Math.max(0, view.col)
  const col1 = Math.min(map.width, view.col + view.cols)
  const out: OwnMapTileDraw[] = []
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
          occlude: layer.occlude,
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

export function paintOwnMapTiles(map: OwnMap, edits: readonly OwnMapTileEdit[]): OwnMap {
  const byLayer = new Map<string, OwnMapTileEdit[]>()
  for (const edit of edits) {
    if (!isLatticeInside(map, edit)) continue
    const list = byLayer.get(edit.layerId)
    if (list) list.push(edit)
    else byLayer.set(edit.layerId, [edit])
  }
  if (byLayer.size === 0) return map

  let changed = false
  const layers = map.layers.map((layer) => {
    const layerEdits = byLayer.get(layer.id)
    if (!layerEdits) return layer
    const touchedRows = new Set(layerEdits.map((edit) => edit.row))
    const tiles = layer.tiles.map((row, index) => (touchedRows.has(index) ? [...row] : row))
    for (const edit of layerEdits) {
      const row = tiles[edit.row]
      if (row) row[edit.col] = edit.tileId
    }
    changed = true
    return { ...layer, tiles }
  })
  return changed ? { ...map, layers } : map
}

export function paintOwnMapCollision(map: OwnMap, edits: readonly OwnMapCollisionEdit[]): OwnMap {
  const valid = edits.filter((edit) => isLatticeInside(map, edit))
  if (valid.length === 0) return map
  const touchedRows = new Set(valid.map((edit) => edit.row))
  const collision = map.collision.map((row, index) => (touchedRows.has(index) ? [...row] : row))
  for (const edit of valid) {
    const row = collision[edit.row]
    if (row) row[edit.col] = edit.value
  }
  return { ...map, collision }
}

/** 同 tileId 的四邻域填充；错排行的左右邻居随奇偶行变化。 */
export function floodFillOwnMapTiles(
  map: OwnMap,
  layerId: string,
  start: LatticePos,
  tileId: number | null,
): OwnMapTileEdit[] {
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!layer || !isLatticeInside(map, start)) return []
  const target = layer.tiles[start.row]?.[start.col]
  if (target === undefined || target === tileId) return []

  const out: OwnMapTileEdit[] = []
  const seen = new Set<string>([`${start.col},${start.row}`])
  const queue: LatticePos[] = [start]
  while (queue.length > 0) {
    const current = queue.pop()
    if (!current || layer.tiles[current.row]?.[current.col] !== target) continue
    out.push({ ...current, layerId, tileId })
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

/**
 * 改图尺寸(W7c-4):左上锚定 —— 重叠区原样保留,扩展区补 null/0,裁剪区丢弃。
 * 全层 tiles 与 collision 同步重建到 2H'×W';尺寸不变返回原图。undo 由命令层整图还原
 * (裁剪破坏性,diff 不够)。
 */
export function resizeOwnMap(map: OwnMap, width: number, height: number): OwnMap {
  if (width === map.width && height === map.height) return map
  const rows = height * 2
  const rebuild = <T>(src: readonly (readonly T[])[], fill: T): T[][] =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: width }, (_, c) => src[r]?.[c] ?? fill),
    )
  return {
    ...map,
    width,
    height,
    layers: map.layers.map((layer) => ({
      ...layer,
      tiles: rebuild<number | null>(layer.tiles, null),
    })),
    collision: rebuild(map.collision, 0),
  }
}

export function insertOwnMapLayer(
  map: OwnMap,
  layer: OwnMapLayer,
  index = map.layers.length,
): OwnMap {
  if (map.layers.some((candidate) => candidate.id === layer.id)) return map
  const at = Math.max(0, Math.min(index, map.layers.length))
  return { ...map, layers: [...map.layers.slice(0, at), layer, ...map.layers.slice(at)] }
}

export function removeOwnMapLayer(map: OwnMap, layerId: string): OwnMap {
  if (map.layers.length <= 1 || !map.layers.some((layer) => layer.id === layerId)) return map
  return { ...map, layers: map.layers.filter((layer) => layer.id !== layerId) }
}

export function moveOwnMapLayer(map: OwnMap, layerId: string, toIndex: number): OwnMap {
  const from = map.layers.findIndex((layer) => layer.id === layerId)
  if (from < 0) return map
  const to = Math.max(0, Math.min(toIndex, map.layers.length - 1))
  if (from === to) return map
  const layers = [...map.layers]
  const [layer] = layers.splice(from, 1)
  if (!layer) return map
  layers.splice(to, 0, layer)
  return { ...map, layers }
}

export function updateOwnMapLayer(
  map: OwnMap,
  layerId: string,
  patch: Partial<Pick<OwnMapLayer, 'name' | 'occlude'>>,
): OwnMap {
  const index = map.layers.findIndex((layer) => layer.id === layerId)
  if (index < 0) return map
  const layers = [...map.layers]
  layers[index] = { ...layers[index]!, ...patch }
  return { ...map, layers }
}
