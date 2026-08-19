import { mapInstanceTilesetId, type StampTemplate, validateStampTemplates } from '@type-pal/content'
import type { GridPointRef } from './map-selection.js'
import type { IsometricNudgeDirection } from './map-transform.js'
import { latticeU, nudgeIsometricLattice } from './map-transform.js'

export type StampDraftChannel = { kind: 'visual'; layerSlotId: string } | { kind: 'collision' }

function matrix<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array<T>(cols).fill(value))
}

function resizeMatrix<T>(
  source: readonly (readonly T[])[],
  rows: number,
  cols: number,
  value: T,
): T[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => source[row]?.[col] ?? value),
  )
}

export function stampDraftPointKey(point: GridPointRef): string {
  return `${point.row}:${point.col}`
}

/** Canonical 组合已直接使用局部 lattice 坐标；不再存在 offset adapter。 */
export function stampDraftPoint(point: GridPointRef): GridPointRef {
  return point
}

export function openStampDraft(template: StampTemplate): StampTemplate {
  return structuredClone(template)
}

/** Blank draft 在首个视觉瓦片落笔前允许暂时不满足持久化 validator。 */
export function createBlankStampDraft(id: string, name: string, tilesetId: string): StampTemplate {
  const width = 16
  const height = 8
  const rows = height * 2
  return {
    id,
    name,
    origin: 'authored',
    width,
    height,
    anchor: { row: 8, col: 7 },
    tilesetRefs: [tilesetId],
    layers: [
      {
        id: 'base',
        name: '基础',
        tiles: matrix<number | null>(rows, width, null),
        sources: matrix<number | null>(rows, width, null),
      },
    ],
    collision: matrix<number | null>(rows, width, null),
  }
}

export function canonicalizeStampDraft(
  draft: StampTemplate,
  availableTiles?: ReadonlyMap<string, ReadonlySet<number>> | ReadonlySet<number>,
): StampTemplate {
  if (availableTiles)
    for (const layer of draft.layers)
      for (let row = 0; row < draft.height * 2; row++)
        for (let col = 0; col < draft.width; col++) {
          const tileId = layer.tiles[row]?.[col]
          if (tileId === null || tileId === undefined) continue
          const tilesetId = mapInstanceTilesetId(draft, layer, row, col)
          const available =
            availableTiles instanceof Set
              ? availableTiles
              : tilesetId && 'get' in availableTiles
                ? availableTiles.get(tilesetId)
                : undefined
          if (!available?.has(tileId))
            throw new Error(`瓦片集 ${tilesetId ?? '(缺失来源)'} 缺少 tileId：${tileId}。`)
        }
  return validateStampTemplates([
    {
      ...draft,
      id: draft.id.trim(),
      name: draft.name.trim(),
      ...(draft.category?.trim() ? { category: draft.category.trim() } : { category: undefined }),
      layers: draft.layers.map((layer) => ({ ...layer, name: layer.name.trim() })),
    },
  ])[0]!
}

export function nextStampLayerSlotId(draft: StampTemplate, base = 'layer'): string {
  const used = new Set(draft.layers.map(({ id }) => id))
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

export function addStampDraftLayer(
  draft: StampTemplate,
  layer: { id: string; name: string },
): StampTemplate {
  const id = layer.id.trim()
  const name = layer.name.trim()
  if (!id || !name) throw new Error('组合图层 ID 和名称不能为空。')
  if (draft.layers.some((candidate) => candidate.id === id))
    throw new Error(`组合图层 ID “${id}” 已存在。`)
  const rows = draft.height * 2
  return {
    ...draft,
    layers: [
      ...draft.layers,
      {
        id,
        name,
        tiles: matrix<number | null>(rows, draft.width, null),
        sources: matrix<number | null>(rows, draft.width, null),
      },
    ],
  }
}

export function updateStampDraftLayer(
  draft: StampTemplate,
  layerId: string,
  patch: { name?: string },
): StampTemplate {
  if (!draft.layers.some(({ id }) => id === layerId))
    throw new Error(`组合图层 “${layerId}” 不存在。`)
  return {
    ...draft,
    layers: draft.layers.map((layer) =>
      layer.id === layerId
        ? { ...layer, ...(patch.name === undefined ? {} : { name: patch.name }) }
        : layer,
    ),
  }
}

export function moveStampDraftLayer(
  draft: StampTemplate,
  layerId: string,
  direction: -1 | 1,
): StampTemplate {
  const index = draft.layers.findIndex(({ id }) => id === layerId)
  if (index < 0) throw new Error(`组合图层 “${layerId}” 不存在。`)
  const target = index + direction
  if (target < 0 || target >= draft.layers.length) return draft
  const layers = [...draft.layers]
  const [layer] = layers.splice(index, 1)
  layers.splice(target, 0, layer!)
  return { ...draft, layers }
}

export function deleteStampDraftLayer(draft: StampTemplate, layerId: string): StampTemplate {
  if (draft.layers.length <= 1) throw new Error('组合必须至少保留一个视觉层。')
  const layer = draft.layers.find(({ id }) => id === layerId)
  if (!layer) throw new Error(`组合图层 “${layerId}” 不存在。`)
  const visualCount = draft.layers.reduce(
    (count, candidate) =>
      count +
      (candidate.id === layerId
        ? 0
        : candidate.tiles.reduce(
            (layerCount, row) => layerCount + row.filter((tileId) => tileId !== null).length,
            0,
          )),
    0,
  )
  if (!visualCount) throw new Error('不能删除包含最后一个视觉成员的图层。')
  return { ...draft, layers: draft.layers.filter(({ id }) => id !== layerId) }
}

function inside(draft: StampTemplate, point: GridPointRef): boolean {
  return point.row >= 0 && point.row < draft.height * 2 && point.col >= 0 && point.col < draft.width
}

function ensureTilesetSource(
  draft: StampTemplate,
  tilesetId: string,
): { draft: StampTemplate; source: number } {
  const refs = [...new Set([...draft.tilesetRefs, tilesetId])].sort()
  const source = refs.indexOf(tilesetId)
  if (refs.every((ref, index) => ref === draft.tilesetRefs[index])) return { draft, source }
  const indexByRef = new Map(refs.map((ref, index) => [ref, index]))
  return {
    source,
    draft: {
      ...draft,
      tilesetRefs: refs,
      layers: draft.layers.map((layer) => ({
        ...layer,
        sources: layer.sources.map((row) =>
          row.map((oldSource) =>
            oldSource === null ? null : indexByRef.get(draft.tilesetRefs[oldSource]!)!,
          ),
        ),
      })),
    },
  }
}

export function setStampDraftVisual(
  input: StampTemplate,
  layerId: string,
  point: GridPointRef,
  tileId: number,
  tilesetId: string,
  height: number,
): StampTemplate {
  if (!inside(input, point)) throw new Error('组合绘制点超出局部地图边界。')
  if (!Number.isSafeInteger(tileId) || tileId < 0) throw new Error('tileId 必须是非负整数。')
  if (!Number.isSafeInteger(height) || height < 0) throw new Error('高度必须是非负整数。')
  const normalized = ensureTilesetSource(input, tilesetId)
  const layerIndex = normalized.draft.layers.findIndex(({ id }) => id === layerId)
  if (layerIndex < 0) throw new Error(`组合图层 “${layerId}” 不存在。`)
  const layers = [...normalized.draft.layers]
  const layer = layers[layerIndex]!
  const tiles = layer.tiles.map((row, index) => (index === point.row ? [...row] : row))
  const sources = layer.sources.map((row, index) => (index === point.row ? [...row] : row))
  const heights = (
    layer.heights ?? matrix(normalized.draft.height * 2, normalized.draft.width, 0)
  ).map((row, index) => (index === point.row ? [...row] : row))
  tiles[point.row]![point.col] = tileId
  sources[point.row]![point.col] = normalized.source
  heights[point.row]![point.col] = height
  layers[layerIndex] = { ...layer, tiles, sources, ...(height || layer.heights ? { heights } : {}) }
  return { ...normalized.draft, layers }
}

export function eraseStampDraftVisual(
  draft: StampTemplate,
  layerId: string,
  point: GridPointRef,
): StampTemplate {
  const layerIndex = draft.layers.findIndex(({ id }) => id === layerId)
  const layer = draft.layers[layerIndex]
  if (!layer || layer.tiles[point.row]?.[point.col] === null) return draft
  const visualCount = draft.layers.reduce(
    (count, candidate) =>
      count +
      candidate.tiles.reduce((sum, row) => sum + row.filter((tile) => tile !== null).length, 0),
    0,
  )
  if (visualCount <= 1) throw new Error('组合必须至少保留一个视觉成员。')
  const tiles = layer.tiles.map((row, index) => (index === point.row ? [...row] : row))
  const sources = layer.sources.map((row, index) => (index === point.row ? [...row] : row))
  const heights = layer.heights?.map((row, index) => (index === point.row ? [...row] : row))
  tiles[point.row]![point.col] = null
  sources[point.row]![point.col] = null
  if (heights) heights[point.row]![point.col] = 0
  const { heights: _old, ...withoutHeights } = layer
  const keepHeights = heights?.some((row) => row.some((value) => value !== 0)) ?? false
  const layers = [...draft.layers]
  layers[layerIndex] = { ...withoutHeights, tiles, sources, ...(keepHeights ? { heights } : {}) }
  return { ...draft, layers }
}

export function setStampDraftCollision(
  draft: StampTemplate,
  point: GridPointRef,
  value: number,
): StampTemplate {
  if (!inside(draft, point)) throw new Error('组合绘制点超出局部地图边界。')
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('碰撞值必须是非负整数。')
  const collision = draft.collision.map((row, index) => (index === point.row ? [...row] : row))
  collision[point.row]![point.col] = value
  return { ...draft, collision }
}

export function eraseStampDraftCollision(draft: StampTemplate, point: GridPointRef): StampTemplate {
  if (!inside(draft, point) || draft.collision[point.row]?.[point.col] === null) return draft
  const collision = draft.collision.map((row, index) => (index === point.row ? [...row] : row))
  collision[point.row]![point.col] = null
  return { ...draft, collision }
}

export function reanchorStampDraft(draft: StampTemplate, nextAnchor: GridPointRef): StampTemplate {
  if (!inside(draft, nextAnchor)) throw new Error('组合锚点必须位于局部地图边界内。')
  return { ...draft, anchor: { ...nextAnchor } }
}

/** 左上固定调整组合局部地图；缩小时拒绝静默裁掉锚点、视觉成员或碰撞。 */
export function resizeStampDraft(
  draft: StampTemplate,
  width: number,
  height: number,
): StampTemplate {
  if (!Number.isSafeInteger(width) || width < 1 || width > 256)
    throw new Error('组合画布宽度必须是 1–256 的整数。')
  if (!Number.isSafeInteger(height) || height < 1 || height > 256)
    throw new Error('组合画布高度必须是 1–256 的整数。')
  if (width === draft.width && height === draft.height) return draft
  const rows = height * 2
  if (draft.anchor.col >= width || draft.anchor.row >= rows)
    throw new Error('缩小后的画布不能裁掉组合锚点。请先重新设置锚点。')

  for (const layer of draft.layers)
    for (let row = 0; row < draft.height * 2; row++)
      for (let col = 0; col < draft.width; col++)
        if ((row >= rows || col >= width) && layer.tiles[row]?.[col] !== null)
          throw new Error('缩小后的画布会裁掉视觉瓦片。请先移动或清理边缘内容。')
  for (let row = 0; row < draft.height * 2; row++)
    for (let col = 0; col < draft.width; col++)
      if ((row >= rows || col >= width) && draft.collision[row]?.[col] !== null)
        throw new Error('缩小后的画布会裁掉碰撞。请先移动或清理边缘内容。')

  return {
    ...draft,
    width,
    height,
    layers: draft.layers.map((layer) => ({
      ...layer,
      tiles: resizeMatrix(layer.tiles, rows, width, null),
      sources: resizeMatrix(layer.sources, rows, width, null),
      ...(layer.heights
        ? { heights: resizeMatrix(layer.heights, rows, width, 0) }
        : { heights: undefined }),
    })),
    collision: resizeMatrix(draft.collision, rows, width, null),
  }
}

export function moveStampDraftSelection(
  draft: StampTemplate,
  channel: StampDraftChannel,
  points: readonly GridPointRef[],
  direction: IsometricNudgeDirection,
): StampTemplate {
  if (!points.length) return draft
  const moves = points.map((source) => ({
    source,
    target: nudgeIsometricLattice(source, direction),
  }))
  if (moves.some(({ target }) => !inside(draft, target))) throw new Error('移动目标超出组合边界。')
  if (channel.kind === 'collision') {
    const collision = draft.collision.map((row) => [...row])
    const selected = new Set(points.map(stampDraftPointKey))
    for (const { target } of moves)
      if (collision[target.row]?.[target.col] !== null && !selected.has(stampDraftPointKey(target)))
        throw new Error('移动目标已有碰撞成员，请先清理目标位置。')
    const values = moves.map(({ source }) => collision[source.row]![source.col]!)
    for (const { source } of moves) collision[source.row]![source.col] = null
    moves.forEach(({ target }, index) => {
      collision[target.row]![target.col] = values[index]!
    })
    return { ...draft, collision }
  }
  const layerIndex = draft.layers.findIndex(({ id }) => id === channel.layerSlotId)
  const layer = draft.layers[layerIndex]
  if (!layer) throw new Error(`组合图层 “${channel.layerSlotId}” 不存在。`)
  const selected = new Set(points.map(stampDraftPointKey))
  for (const { target } of moves)
    if (layer.tiles[target.row]?.[target.col] !== null && !selected.has(stampDraftPointKey(target)))
      throw new Error('移动目标在当前视觉层已有成员，请先清理目标位置。')
  const tiles = layer.tiles.map((row) => [...row])
  const sources = layer.sources.map((row) => [...row])
  const heights = (layer.heights ?? matrix(draft.height * 2, draft.width, 0)).map((row) => [...row])
  const values = moves.map(({ source }) => ({
    tile: tiles[source.row]![source.col]!,
    source: sources[source.row]![source.col]!,
    height: heights[source.row]![source.col]!,
  }))
  for (const { source } of moves) {
    tiles[source.row]![source.col] = null
    sources[source.row]![source.col] = null
    heights[source.row]![source.col] = 0
  }
  moves.forEach(({ target }, index) => {
    const value = values[index]!
    tiles[target.row]![target.col] = value.tile
    sources[target.row]![target.col] = value.source
    heights[target.row]![target.col] = value.height
  })
  const hasHeight = heights.some((row) => row.some((value) => value !== 0))
  const layers = [...draft.layers]
  layers[layerIndex] = { ...layer, tiles, sources, ...(hasHeight ? { heights } : {}) }
  return { ...draft, layers }
}

export function stampDraftBounds(draft: StampTemplate, padding = 2) {
  return {
    minRow: -padding,
    maxRow: draft.height * 2 - 1 + padding,
    minCol: -padding,
    maxCol: draft.width - 1 + padding,
    minU: -padding * 2,
    maxU: latticeU({ row: draft.height * 2 - 1, col: draft.width - 1 }) + padding * 2,
  }
}
