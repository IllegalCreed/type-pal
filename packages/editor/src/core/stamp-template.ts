import { type ProjectMap, type StampTemplateV1, validateStampTemplates } from '@type-pal/content'
import { isLatticeInside, mapInstanceHeight } from '@type-pal/reforge'
import type { GridPointRef, MapSelection } from './map-selection.js'
import { gridPointKey, visualSlotKey } from './map-selection.js'
import { latticeU, relativeLatticeOffset } from './map-transform.js'

export interface BuildStampTemplateInput {
  map: ProjectMap
  selection: Extract<MapSelection, { kind: 'cells' }>
  id: string
  name: string
  category?: string
  /** 作者显式确认的地图锚点；UI 可先用 defaultStampTemplateAnchor 提供建议值。 */
  anchor: GridPointRef
  includeCollision: boolean
  /** “用当前选区更新模板”时钉住原模板 tileset，禁止静默换套件。 */
  expectedTilesetId?: string
  /** source layerId → 模板局部槽显示名；槽 id 首版固定复用稳定 source layerId。 */
  layerSlotNames?: Readonly<Record<string, string>>
}

export interface StampTemplateUsage {
  placementCount: number
  mapIds: string[]
}

export interface StampTemplateUsageIndex {
  byStampId: Record<string, StampTemplateUsage>
  missingSources: Array<{ sourceStampId: string; placementCount: number; mapIds: string[] }>
}

/** 只存在于编辑会话的 W8 选区快照；不进入 EditorState、JSON 或 URL。 */
export interface StampSelectionSource {
  mapId: string
  selection: Extract<MapSelection, { kind: 'cells' }>
}

/** 选区默认锚点：先 row，再按错排 lattice u；UI 可让作者显式改成其他地图格点。 */
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

/** 为“从选区保存/复制模板”生成不碰撞的稳定 id；最终仍由 content validator 把关。 */
export function nextStampTemplateId(preferred: string, existingIds: Iterable<string>): string {
  const used = new Set(existingIds)
  const stem = normalizedTemplateId(preferred) || 'stamp'
  if (!used.has(stem)) return stem
  for (let index = 2; ; index++) {
    const candidate = `${stem}-${index}`
    if (!used.has(candidate)) return candidate
  }
}

/**
 * 把 W8 普通 cells 选区快照成非链接模板。
 * 空视觉槽跳过；collision 值 0 在 includeCollision=true 时仍显式保留。
 */
export function buildStampTemplateFromSelection(input: BuildStampTemplateInput): StampTemplateV1 {
  const { map, selection } = input
  const anchor = input.anchor
  if (!isLatticeInside(map, anchor)) throw new Error('图章锚点必须位于当前地图内。')
  if (input.expectedTilesetId && map.tilesetId !== input.expectedTilesetId)
    throw new Error(
      `当前地图 tileset "${map.tilesetId}" 与模板 tileset "${input.expectedTilesetId}" 不一致。`,
    )

  const layerById = new Map(map.layers.map((layer) => [layer.id, layer] as const))
  const seenVisual = new Set<string>()
  const capturedByLayer = new Map<
    string,
    Array<{ row: number; col: number; tileId: number; height: number }>
  >()
  for (const ref of selection.visualSlots) {
    const key = visualSlotKey(ref)
    if (seenVisual.has(key)) continue
    seenVisual.add(key)
    if (!isLatticeInside(map, ref)) throw new Error(`视觉槽 ${key} 已超出地图边界。`)
    const layer = layerById.get(ref.layerId)
    if (!layer) throw new Error(`选区引用的图层 "${ref.layerId}" 不存在。`)
    const tileId = layer.tiles[ref.row]?.[ref.col]
    if (tileId === null || tileId === undefined) continue
    const member = {
      row: ref.row,
      col: ref.col,
      tileId,
      height: mapInstanceHeight(layer, ref.row, ref.col),
    }
    const bucket = capturedByLayer.get(layer.id)
    if (bucket) bucket.push(member)
    else capturedByLayer.set(layer.id, [member])
  }
  if (capturedByLayer.size === 0) throw new Error('选区没有可保存的非空视觉实例。')

  const usedLayers = map.layers.filter((layer) => capturedByLayer.has(layer.id))
  const layerSlots = usedLayers.map((layer) => ({
    id: layer.id,
    name: input.layerSlotNames?.[layer.id]?.trim() || layer.name,
    depthMode: layer.depthMode,
  }))
  const visual = usedLayers.flatMap((layer) =>
    (capturedByLayer.get(layer.id) ?? [])
      .sort((left, right) => left.row - right.row || latticeU(left) - latticeU(right))
      .map((member) => ({
        layerSlotId: layer.id,
        offset: relativeLatticeOffset(member, anchor),
        tileId: member.tileId,
        height: member.height,
      })),
  )

  const collision = input.includeCollision
    ? (() => {
        const seen = new Set<string>()
        return selection.gridPoints
          .filter((ref) => {
            const key = gridPointKey(ref)
            if (seen.has(key)) return false
            seen.add(key)
            if (!isLatticeInside(map, ref)) throw new Error(`碰撞格点 ${key} 已超出地图边界。`)
            return true
          })
          .sort((left, right) => left.row - right.row || latticeU(left) - latticeU(right))
          .map((ref) => ({
            offset: relativeLatticeOffset(ref, anchor),
            value: map.collision[ref.row]![ref.col]!,
          }))
      })()
    : []

  const category = input.category?.trim()
  const [template] = validateStampTemplates([
    {
      id: input.id.trim(),
      name: input.name.trim(),
      ...(category ? { category } : {}),
      tilesetId: map.tilesetId,
      origin: 'authored',
      layerSlots,
      visual,
      collision,
    },
  ])
  if (!template) throw new Error('图章模板构建失败。')
  return template
}

/** 已加载地图上的软来源使用统计；模板删除不会修改这些 placement。 */
export function collectStampTemplateUsage(
  maps: Readonly<Record<string, ProjectMap>>,
  templates: readonly StampTemplateV1[],
): StampTemplateUsageIndex {
  const templateIds = new Set(templates.map((template) => template.id))
  const byStampId = new Map<string, { placementCount: number; mapIds: Set<string> }>()
  for (const [mapId, map] of Object.entries(maps)) {
    if (map.version !== 3) continue
    for (const placement of map.authoring.stampPlacements) {
      if (!placement.sourceStampId) continue
      const current = byStampId.get(placement.sourceStampId) ?? {
        placementCount: 0,
        mapIds: new Set<string>(),
      }
      current.placementCount++
      current.mapIds.add(mapId)
      byStampId.set(placement.sourceStampId, current)
    }
  }
  const normalized = Object.fromEntries(
    [...byStampId]
      .sort(([left], [right]) => (left === right ? 0 : left < right ? -1 : 1))
      .map(([id, usage]) => [
        id,
        { placementCount: usage.placementCount, mapIds: [...usage.mapIds].sort() },
      ]),
  )
  return {
    byStampId: normalized,
    missingSources: Object.entries(normalized)
      .filter(([id]) => !templateIds.has(id))
      .map(([sourceStampId, usage]) => ({ sourceStampId, ...usage })),
  }
}
