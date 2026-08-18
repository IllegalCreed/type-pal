import type { ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { GridPointRef } from './map-selection.js'
import { relativeLatticeOffset, resolveRelativeLatticeOffset } from './map-transform.js'
import { stampDraftBounds, stampDraftPoint, stampDraftPointKey } from './stamp-draft.js'

const DRAFT_ANCHOR: GridPointRef = { row: 0, col: 0 }

function matrix<T>(rows: number, cols: number, make: () => T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, make))
}

export interface StampDraftMapAdapter {
  map: ProjectMap
  /** The draft's relative origin represented inside the transient ProjectMap. */
  anchor: GridPointRef
  /** Explicit collision membership, including value 0 which a ProjectMap matrix cannot distinguish. */
  collisionMemberKeys: ReadonlySet<string>
  toMapPoint: (point: GridPointRef) => GridPointRef
  toDraftPoint: (point: GridPointRef) => GridPointRef
}

/**
 * A stamp is edited as a small transient ProjectMap. The adapter is pure and never enters
 * EditSession, MapIndex or project IO; persisted stamp coordinates remain anchor-relative.
 */
export function stampDraftMapAdapter(
  draft: StampTemplateV1,
  padding = 8,
): StampDraftMapAdapter {
  const bounds = stampDraftBounds(draft, 0)
  // An even anchor row preserves raw stagger parity, so the adapter is a pure translation.
  const anchor: GridPointRef = {
    row: Math.max(0, Math.ceil((padding - bounds.minRow) / 2) * 2),
    col: Math.max(0, padding - bounds.minCol),
  }
  const toMapPoint = (point: GridPointRef): GridPointRef =>
    resolveRelativeLatticeOffset(anchor, relativeLatticeOffset(point, DRAFT_ANCHOR))
  const toDraftPoint = (point: GridPointRef): GridPointRef =>
    resolveRelativeLatticeOffset(DRAFT_ANCHOR, relativeLatticeOffset(point, anchor))

  const mappedPoints = [
    toMapPoint(DRAFT_ANCHOR),
    ...draft.visual.map((member) => toMapPoint(stampDraftPoint(member.offset))),
    ...draft.collision.map((member) => toMapPoint(stampDraftPoint(member.offset))),
  ]
  const maxRow = Math.max(...mappedPoints.map((point) => point.row)) + padding
  const maxCol = Math.max(...mappedPoints.map((point) => point.col)) + padding
  const width = Math.max(1, maxCol + 1)
  const height = Math.max(1, Math.ceil((maxRow + 1) / 2))
  const rows = height * 2

  const layers = draft.layerSlots.map((slot) => ({
    id: slot.id,
    name: slot.name,
    depthMode: slot.depthMode,
    tiles: matrix<number | null>(rows, width, () => null),
    ...(slot.depthMode === 'height' ? { heights: matrix(rows, width, () => 0) } : {}),
  }))
  const layerById = new Map(layers.map((layer) => [layer.id, layer] as const))
  for (const member of draft.visual) {
    const layer = layerById.get(member.layerSlotId)
    if (!layer) continue
    const point = toMapPoint(stampDraftPoint(member.offset))
    layer.tiles[point.row]![point.col] = member.tileId
    if (layer.depthMode === 'height' && layer.heights)
      layer.heights[point.row]![point.col] = member.height
  }

  const collision = matrix(rows, width, () => 0)
  const collisionMemberKeys = new Set<string>()
  for (const member of draft.collision) {
    const point = toMapPoint(stampDraftPoint(member.offset))
    collision[point.row]![point.col] = member.value
    collisionMemberKeys.add(stampDraftPointKey(point))
  }

  return {
    map: { version: 2, width, height, tilesetId: draft.tilesetId, layers, collision },
    anchor,
    collisionMemberKeys,
    toMapPoint,
    toDraftPoint,
  }
}
