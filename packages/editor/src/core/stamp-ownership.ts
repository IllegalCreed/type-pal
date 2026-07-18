import { mapInstanceHeight, type ProjectMap, type StampPlacementGroupV1 } from '@type-pal/content'
import type { LatticePos, ProjectMapTileEdit } from '@type-pal/reforge'
import { isLatticeInside, projectMapStampPlacements } from '@type-pal/reforge'
import type { GridPointRef, VisualSlotRef } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'

export interface StampPlacementIndex {
  byId: ReadonlyMap<string, StampPlacementGroupV1>
  visualOwnerByKey: ReadonlyMap<string, string>
  collisionOwnerByKey: ReadonlyMap<string, string>
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

export function stampVisualOwner(map: ProjectMap, ref: VisualSlotRef): string | undefined {
  return buildStampPlacementIndex(map).visualOwnerByKey.get(visualSlotKey(ref))
}

export function stampCollisionOwner(map: ProjectMap, ref: GridPointRef): string | undefined {
  return buildStampPlacementIndex(map).collisionOwnerByKey.get(gridPointKey(ref))
}

/**
 * 组内填充只能把当前 placement 的活动层成员视作连通域；普通格既不能作为起点，也不能充当桥。
 */
export function floodFillStampPlacementTiles(
  map: ProjectMap,
  placementId: string,
  layerId: string,
  start: LatticePos,
  tileId: number | null,
  height: number,
): ProjectMapTileEdit[] {
  const placement = buildStampPlacementIndex(map).byId.get(placementId)
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!placement || !layer || !isLatticeInside(map, start)) return []
  const allowed = new Set(
    placement.visualSlots.filter((ref) => ref.layerId === layerId).map((ref) => visualSlotKey(ref)),
  )
  if (!allowed.has(visualSlotKey({ layerId, ...start }))) return []
  const target = layer.tiles[start.row]?.[start.col]
  if (target === undefined) return []

  const out: ProjectMapTileEdit[] = []
  const seen = new Set<string>([gridPointKey(start)])
  const queue: LatticePos[] = [start]
  while (queue.length > 0) {
    const current = queue.pop()
    if (
      !current ||
      !allowed.has(visualSlotKey({ layerId, ...current })) ||
      layer.tiles[current.row]?.[current.col] !== target
    )
      continue
    if (
      layer.tiles[current.row]?.[current.col] !== tileId ||
      mapInstanceHeight(layer, current.row, current.col) !== height
    )
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
      const key = gridPointKey(neighbor)
      if (seen.has(key)) continue
      seen.add(key)
      if (allowed.has(visualSlotKey({ layerId, ...neighbor }))) queue.push(neighbor)
    }
  }
  return out
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
