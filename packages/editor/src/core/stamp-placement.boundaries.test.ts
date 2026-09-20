/**
 * TEST-EDITOR-MAP-DATA-1 M05：planStampPlacement 身份与映射门（stamp-placement.ts）。
 * 既有 stamp-placement.test 已覆盖多源解析/错排公式/overwrite 语义/id 递增——不重复。
 * 本文件：已占 placementId、未知/重复 mapping、锁定层、完整 issues 且 map 实参不变。
 */
import {
  buildBlankProjectMap,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { createBlankStampDraft, setStampDraftVisual } from './stamp-draft.js'
import { planStampPlacement } from './stamp-placement.js'

const TILESET = 'ts'
const TEMPLATE_ID = 't1'

function template() {
  return setStampDraftVisual(
    createBlankStampDraft(TEMPLATE_ID, 'T', TILESET),
    'base',
    { row: 8, col: 7 },
    3,
    TILESET,
    0,
  )
}

function baseInput(map: ReturnType<typeof buildBlankProjectMap>) {
  return {
    mapId: 'm1',
    map,
    mapRevision: 1,
    template: template(),
    anchor: { row: 2, col: 2 },
    placementBaseHeight: 0,
    mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
    permission: { hiddenLayerIds: [], lockedLayerIds: [] },
    availableTileIdsByTileset: new Map([[TILESET, new Set([3])]]),
    conflictPolicy: 'reject' as const,
  }
}

describe('M05 planStampPlacement 身份与映射门', () => {
  test('已占 placementId / 未知 mapping / 重复 mapping / 锁定层：完整 issues、canApply=false、map 不变', () => {
    const blank = paintProjectMapTiles(buildBlankProjectMap(4, 4, TILESET), [
      { layerId: 'floor', row: 0, col: 0, tileId: 9, tilesetId: TILESET, height: 0 },
    ])
    // 建一个已存在的 placement 占位 id（真实 reforge 写入 API + 真实 validator；成员指向非空瓦片）
    const withPlacement = withProjectMapStampPlacements(blank, [
      {
        id: `${TEMPLATE_ID}-placement`,
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    const mapSnapshot = structuredClone({
      layers: withPlacement.layers.map((layer) => ({ id: layer.id, tiles: layer.tiles })),
      authoring: (withPlacement as unknown as { authoring?: unknown }).authoring,
    })
    const usedId = planStampPlacement({ ...baseInput(withPlacement) }).placement.id
    expect(usedId).toBe(`${TEMPLATE_ID}-placement-2`)

    const occupied = planStampPlacement({
      ...baseInput(withPlacement),
      placementId: `${TEMPLATE_ID}-placement`,
    })
    expect(occupied.canApply).toBe(false)
    expect(occupied.preparedPatch).toBeUndefined()
    expect(occupied.issues).toEqual([
      {
        code: 'placement-id-duplicate',
        message: `放置组 ID "${TEMPLATE_ID}-placement" 已存在。`,
      },
    ])

    const unknown = planStampPlacement({
      ...baseInput(blank),
      mappings: [{ layerSlotId: 'ghost', targetLayerId: 'floor' }],
    })
    expect(unknown.issues.map((issue) => issue.code)).toEqual([
      'mapping-unknown-slot',
      'mapping-missing',
    ])

    const duplicate = planStampPlacement({
      ...baseInput(blank),
      mappings: [
        { layerSlotId: 'base', targetLayerId: 'floor' },
        { layerSlotId: 'base', targetLayerId: 'floor' },
      ],
    })
    expect(duplicate.issues.map((issue) => issue.code)).toEqual(['mapping-duplicate-slot'])

    const locked = planStampPlacement({
      ...baseInput(blank),
      permission: { hiddenLayerIds: [], lockedLayerIds: ['floor'] },
    })
    expect(locked.issues.map((issue) => issue.code)).toEqual(['locked-layer'])
    expect(locked.canApply).toBe(false)

    expect(
      structuredClone({
        layers: withPlacement.layers.map((layer) => ({ id: layer.id, tiles: layer.tiles })),
        authoring: (withPlacement as unknown as { authoring?: unknown }).authoring,
      }),
    ).toEqual(mapSnapshot)
  })
})
