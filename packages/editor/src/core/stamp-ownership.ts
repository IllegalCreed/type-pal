import {
  mapInstanceHeight,
  mapInstanceTilesetId,
  type ProjectMap,
  type StampPlacementGroupV1,
} from '@type-pal/content'
import type { LatticePos, ProjectMapTileEdit } from '@type-pal/reforge'
import { isLatticeInside, projectMapStampPlacements } from '@type-pal/reforge'
import { floodFillIsometricTiles } from './isometric-fill.js'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'

export interface StampLookup<K, V> {
  readonly size: number
  get(key: K): V | undefined
  has(key: K): boolean
}

export interface StampPlacementIndex {
  byId: StampLookup<string, StampPlacementGroupV1>
  visualOwnerByKey: StampLookup<string, string>
  collisionOwnerByKey: StampLookup<string, string>
}

const placementIndexCache = new WeakMap<ProjectMap, StampPlacementIndex>()
const REMOVED_ENTRY = Symbol('removed-stamp-index-entry')
const MAX_OVERLAY_DEPTH = 64

type OverlayChange<V> = V | typeof REMOVED_ENTRY

/**
 * 不可变 lookup 的小型差分视图。放置/变换命令只写变动 placement 的键，
 * 不为每次落笔复制数千个 ownership 条目；ownership 消费端只依赖 size/get/has。
 */
class OverlayLookupMap<K, V> implements StampLookup<K, V> {
  readonly depth: number
  readonly size: number

  constructor(
    private readonly base: StampLookup<K, V>,
    private readonly changes: ReadonlyMap<K, OverlayChange<V>>,
  ) {
    this.depth = base instanceof OverlayLookupMap ? base.depth + 1 : 1
    let size = base.size
    for (const [key, value] of changes) {
      if (value === REMOVED_ENTRY) {
        if (base.has(key)) size--
      } else if (!base.has(key)) size++
    }
    this.size = size
  }

  get(key: K): V | undefined {
    if (this.changes.has(key)) {
      const changed = this.changes.get(key)
      return changed === REMOVED_ENTRY ? undefined : changed
    }
    return this.base.get(key)
  }

  has(key: K): boolean {
    if (this.changes.has(key)) return this.changes.get(key) !== REMOVED_ENTRY
    return this.base.has(key)
  }
}

function fullStampPlacementIndex(map: ProjectMap): StampPlacementIndex {
  const byId = new Map<string, StampPlacementGroupV1>()
  const visualOwnerByKey = new Map<string, string>()
  const collisionOwnerByKey = new Map<string, string>()
  for (const placement of projectMapStampPlacements(map)) {
    byId.set(placement.id, placement)
    for (const ref of placement.visualSlots) visualOwnerByKey.set(visualSlotKey(ref), placement.id)
    for (const ref of placement.gridPoints) collisionOwnerByKey.set(gridPointKey(ref), placement.id)
  }
  return { byId, visualOwnerByKey, collisionOwnerByKey }
}

/** 派生 ownership 反向索引；按 immutable map 引用缓存，永不进入 JSON。 */
export function buildStampPlacementIndex(map: ProjectMap): StampPlacementIndex {
  const cached = placementIndexCache.get(map)
  if (cached) return cached
  const index = fullStampPlacementIndex(map)
  placementIndexCache.set(map, index)
  return index
}

/**
 * 普通矩阵/图层改动不改 placement metadata；新 map 可直接共享原索引。
 * @internal 调用方必须保证 before/after 的 canonical stampPlacements 完全相同。
 */
export function inheritStampPlacementIndex(beforeMap: ProjectMap, afterMap: ProjectMap): void {
  if (beforeMap === afterMap || placementIndexCache.has(afterMap)) return
  const before = placementIndexCache.get(beforeMap)
  if (before) placementIndexCache.set(afterMap, before)
}

export interface StampPlacementIndexDelta {
  removedPlacementIds?: readonly string[]
  /** 只传稳定 id；实现从 afterMap 读取 validate/sort 后的 canonical placement。 */
  upsertPlacementIds?: readonly string[]
}

function canonicalPlacementById(
  map: ProjectMap,
  placementId: string,
): StampPlacementGroupV1 | undefined {
  const placements = projectMapStampPlacements(map)
  let low = 0
  let high = placements.length - 1
  while (low <= high) {
    const middle = (low + high) >>> 1
    const placement = placements[middle]
    if (!placement) return undefined
    if (placement.id === placementId) return placement
    if (placement.id < placementId) low = middle + 1
    else high = middle - 1
  }
  return undefined
}

/**
 * 为一笔 placement 原子命令登记差分索引。只移除/补入受影响 placement 的键；
 * 连续差分过深时做一次有界压实，避免长会话的首次查询链无限增长。
 * @internal afterMap 必须已经按 placement id 规范排序，且 delta 必须完整列出所有身份变化。
 */
export function seedStampPlacementIndexDelta(
  beforeMap: ProjectMap,
  afterMap: ProjectMap,
  delta: StampPlacementIndexDelta,
): StampPlacementIndex {
  const cached = placementIndexCache.get(afterMap)
  if (cached) return cached
  const before = buildStampPlacementIndex(beforeMap)
  const depth = before.byId instanceof OverlayLookupMap ? before.byId.depth : 0
  if (depth >= MAX_OVERLAY_DEPTH) {
    const compacted = fullStampPlacementIndex(afterMap)
    placementIndexCache.set(afterMap, compacted)
    return compacted
  }

  const upsertIds = new Set(delta.upsertPlacementIds ?? [])
  const upsertPlacements = [...upsertIds].map((id) => canonicalPlacementById(afterMap, id))
  const missing = [...upsertIds].filter((_id, index) => !upsertPlacements[index])
  if (missing.length > 0)
    throw new Error(`组合归属索引无法在 afterMap 找到 placement：${missing.join(', ')}`)
  const removedIds = new Set(delta.removedPlacementIds ?? [])
  for (const placement of upsertPlacements) if (placement) removedIds.add(placement.id)
  const byIdChanges = new Map<string, OverlayChange<StampPlacementGroupV1>>()
  const visualChanges = new Map<string, OverlayChange<string>>()
  const collisionChanges = new Map<string, OverlayChange<string>>()

  for (const id of removedIds) {
    const previous = before.byId.get(id)
    if (!previous) continue
    byIdChanges.set(id, REMOVED_ENTRY)
    for (const ref of previous.visualSlots) {
      const key = visualSlotKey(ref)
      if (before.visualOwnerByKey.get(key) === id) visualChanges.set(key, REMOVED_ENTRY)
    }
    for (const ref of previous.gridPoints) {
      const key = gridPointKey(ref)
      if (before.collisionOwnerByKey.get(key) === id) collisionChanges.set(key, REMOVED_ENTRY)
    }
  }
  for (const placement of upsertPlacements) {
    if (!placement) continue
    byIdChanges.set(placement.id, placement)
    for (const ref of placement.visualSlots) visualChanges.set(visualSlotKey(ref), placement.id)
    for (const ref of placement.gridPoints) collisionChanges.set(gridPointKey(ref), placement.id)
  }

  const index: StampPlacementIndex = {
    byId: new OverlayLookupMap(before.byId, byIdChanges),
    visualOwnerByKey: new OverlayLookupMap(before.visualOwnerByKey, visualChanges),
    collisionOwnerByKey: new OverlayLookupMap(before.collisionOwnerByKey, collisionChanges),
  }
  placementIndexCache.set(afterMap, index)
  return index
}

export function stampVisualOwner(map: ProjectMap, ref: VisualSlotRef): string | undefined {
  return buildStampPlacementIndex(map).visualOwnerByKey.get(visualSlotKey(ref))
}

export function stampCollisionOwner(map: ProjectMap, ref: GridPointRef): string | undefined {
  return buildStampPlacementIndex(map).collisionOwnerByKey.get(gridPointKey(ref))
}

/** 组内填充以 tileId + height 判断当前层成员的连通域；普通格不能作为起点或桥。 */
export function floodFillStampPlacementTiles(
  map: ProjectMap,
  placementId: string,
  layerId: string,
  start: LatticePos,
  tileId: number | null,
  tilesetId: string | null,
  height: number,
): ProjectMapTileEdit[] {
  const placement = buildStampPlacementIndex(map).byId.get(placementId)
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!placement || !layer || !isLatticeInside(map, start)) return []
  const allowed = new Set(
    placement.visualSlots.filter((ref) => ref.layerId === layerId).map((ref) => visualSlotKey(ref)),
  )
  if (!allowed.has(visualSlotKey({ layerId, ...start }))) return []
  return floodFillIsometricTiles({
    start,
    isInside: (point) =>
      isLatticeInside(map, point) && allowed.has(visualSlotKey({ layerId, ...point })),
    sampleAt: (point) => {
      const currentTileId = layer.tiles[point.row]?.[point.col]
      return currentTileId === undefined
        ? undefined
        : {
            tileId: currentTileId,
            tilesetId: mapInstanceTilesetId(map, layer, point.row, point.col),
            height: mapInstanceHeight(layer, point.row, point.col),
          }
    },
  }).flatMap((point) =>
    layer.tiles[point.row]?.[point.col] === tileId &&
    mapInstanceTilesetId(map, layer, point.row, point.col) === (tilesetId ?? undefined) &&
    mapInstanceHeight(layer, point.row, point.col) === height
      ? []
      : [{ ...point, layerId, tileId, tilesetId, height }],
  )
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
