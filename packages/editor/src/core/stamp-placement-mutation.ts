import type { ProjectMap, StampPlacementGroupV1 } from '@type-pal/content'
import { projectMapStampPlacements } from '@type-pal/reforge'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { buildStampPlacementIndex, seedStampPlacementIndexDelta } from './stamp-ownership.js'

export interface StampPlacementMutation {
  removedPlacementIds?: readonly string[]
  upsertPlacements?: readonly StampPlacementGroupV1[]
}

function compareText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function nonEmpty(value: string | undefined, field: string): void {
  if (value !== undefined && value.length === 0)
    throw new Error(`组合 placement 的 ${field} 不能为空字符串。`)
}

function point(
  map: ProjectMap,
  value: { row: number; col: number },
  field: string,
): { row: number; col: number } {
  if (!Number.isSafeInteger(value.row) || !Number.isSafeInteger(value.col))
    throw new Error(`组合 placement 的 ${field} 必须使用安全整数坐标。`)
  if (value.row < 0 || value.row >= map.height * 2 || value.col < 0 || value.col >= map.width)
    throw new Error(`组合 placement 的 ${field} 坐标 (${value.row},${value.col}) 超出地图边界。`)
  return { row: value.row, col: value.col }
}

function assertMatrixDerivative(beforeMap: ProjectMap, matrixMap: ProjectMap): void {
  const sameLayers =
    beforeMap.layers.length === matrixMap.layers.length &&
    beforeMap.layers.every((layer, index) => layer.id === matrixMap.layers[index]?.id)
  const sameAuthoring =
    beforeMap.authoring?.stampPlacements === matrixMap.authoring?.stampPlacements
  if (
    beforeMap.width !== matrixMap.width ||
    beforeMap.height !== matrixMap.height ||
    !sameLayers ||
    !sameAuthoring
  )
    throw new Error('组合 placement mutation 只接受保留结构与原 authoring 的矩阵 patch 派生地图。')
}

/**
 * 已通过加载边界 validator 的 ProjectMap 上，只校验并规范化本次受影响 placement。
 * unchanged placement 直接复用 canonical 对象，避免每次作者命令重扫数千组全部成员。
 *
 * @internal matrixMap 必须由 beforeMap 经 ownership-guarded 普通矩阵 patch 派生；不得改变结构、
 * authoring identity，或清空任一 unchanged placement 的视觉成员。结构操作须先移除受影响 identity。
 */
export function applyStampPlacementMutation(
  beforeMap: ProjectMap,
  matrixMap: ProjectMap,
  mutation: StampPlacementMutation,
): ProjectMap {
  assertMatrixDerivative(beforeMap, matrixMap)
  const beforeIndex = buildStampPlacementIndex(beforeMap)
  const removedIds = new Set(mutation.removedPlacementIds ?? [])
  for (const id of removedIds)
    if (!beforeIndex.byId.has(id)) throw new Error(`组合 placement "${id}" 不存在或已被移除。`)

  const upsertById = new Map<string, StampPlacementGroupV1>()
  for (const placement of mutation.upsertPlacements ?? []) {
    if (!placement.id) throw new Error('组合 placement id 不能为空。')
    if (upsertById.has(placement.id)) throw new Error(`组合 placement id "${placement.id}" 重复。`)
    upsertById.set(placement.id, placement)
  }
  const mutableOwnerIds = new Set([...removedIds, ...upsertById.keys()])
  const nextVisualOwners = new Map<string, string>()
  const nextCollisionOwners = new Map<string, string>()
  const layerById = new Map(matrixMap.layers.map((layer) => [layer.id, layer]))

  const canonicalUpserts = [...upsertById.values()].map((placement) => {
    nonEmpty(placement.sourceStampId, 'sourceStampId')
    nonEmpty(placement.sourceStampName, 'sourceStampName')
    const anchor = point(matrixMap, placement.anchor, `${placement.id}.anchor`)
    if (placement.visualSlots.length === 0)
      throw new Error(`组合 placement "${placement.id}" 必须至少拥有一个视觉槽。`)

    const localVisual = new Set<string>()
    const visualSlots = placement.visualSlots
      .map((candidate) => {
        if (!candidate.layerId)
          throw new Error(`组合 placement "${placement.id}" 的 layerId 不能为空。`)
        const layer = layerById.get(candidate.layerId)
        if (!layer)
          throw new Error(
            `组合 placement "${placement.id}" 引用了不存在的图层 "${candidate.layerId}"。`,
          )
        const ref = { layerId: candidate.layerId, ...point(matrixMap, candidate, 'visualSlots') }
        if (
          layer.tiles[ref.row]?.[ref.col] === null ||
          layer.tiles[ref.row]?.[ref.col] === undefined
        )
          throw new Error(`组合 placement "${placement.id}" 的视觉成员不得指向空瓦片。`)
        const key = visualSlotKey(ref)
        if (localVisual.has(key))
          throw new Error(`组合 placement "${placement.id}" 内存在重复视觉槽 ${key}。`)
        localVisual.add(key)
        const previousOwner = beforeIndex.visualOwnerByKey.get(key)
        if (previousOwner && !mutableOwnerIds.has(previousOwner))
          throw new Error(`视觉槽 ${key} 已属于组合 placement "${previousOwner}"。`)
        const nextOwner = nextVisualOwners.get(key)
        if (nextOwner)
          throw new Error(`视觉槽 ${key} 同时属于组合 "${nextOwner}" 与 "${placement.id}"。`)
        nextVisualOwners.set(key, placement.id)
        return ref
      })
      .sort(
        (left, right) =>
          compareText(left.layerId, right.layerId) || left.row - right.row || left.col - right.col,
      )

    const localCollision = new Set<string>()
    const gridPoints = placement.gridPoints
      .map((candidate) => {
        const ref = point(matrixMap, candidate, 'gridPoints')
        const key = gridPointKey(ref)
        if (localCollision.has(key))
          throw new Error(`组合 placement "${placement.id}" 内存在重复碰撞格点 ${key}。`)
        localCollision.add(key)
        const previousOwner = beforeIndex.collisionOwnerByKey.get(key)
        if (previousOwner && !mutableOwnerIds.has(previousOwner))
          throw new Error(`碰撞格点 ${key} 已属于组合 placement "${previousOwner}"。`)
        const nextOwner = nextCollisionOwners.get(key)
        if (nextOwner)
          throw new Error(`碰撞格点 ${key} 同时属于组合 "${nextOwner}" 与 "${placement.id}"。`)
        nextCollisionOwners.set(key, placement.id)
        return ref
      })
      .sort((left, right) => left.row - right.row || left.col - right.col)

    return {
      id: placement.id,
      ...(placement.sourceStampId === undefined ? {} : { sourceStampId: placement.sourceStampId }),
      ...(placement.sourceStampName === undefined
        ? {}
        : { sourceStampName: placement.sourceStampName }),
      anchor,
      visualSlots,
      gridPoints,
    } satisfies StampPlacementGroupV1
  })

  const replacedIds = new Set([...removedIds, ...upsertById.keys()])
  const placements = [
    ...projectMapStampPlacements(beforeMap).filter((placement) => !replacedIds.has(placement.id)),
    ...canonicalUpserts,
  ].sort((left, right) => compareText(left.id, right.id))
  const base = {
    version: 4 as const,
    width: matrixMap.width,
    height: matrixMap.height,
    tilesetRefs: matrixMap.tilesetRefs,
    layers: matrixMap.layers,
    collision: matrixMap.collision,
  }
  const afterMap: ProjectMap = placements.length
    ? { ...base, authoring: { version: 1, stampPlacements: placements } }
    : base
  seedStampPlacementIndexDelta(beforeMap, afterMap, {
    removedPlacementIds: [...removedIds],
    upsertPlacementIds: canonicalUpserts.map((placement) => placement.id),
  })
  return afterMap
}
