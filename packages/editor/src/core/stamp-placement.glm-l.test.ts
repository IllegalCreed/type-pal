import type { ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { planStampPlacement } from './stamp-placement.js'

function fixtureMap(): ProjectMap {
  return buildBlankProjectMap(4, 2, 'tiles')
}

function twoLayerTemplate(): StampTemplate {
  const layer = (id: string, name: string): StampTemplate['layers'][number] => ({
    id,
    name,
    tiles: [
      [1, null],
      [null, null],
    ],
    sources: [
      [0, null],
      [null, null],
    ],
  })
  return {
    id: 'arch',
    name: '拱门',
    origin: 'authored',
    width: 2,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tiles'],
    layers: [layer('layer-a', '底层'), layer('layer-b', '顶层')],
    collision: [
      [null, null],
      [null, null],
    ],
  }
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('TEST-GLM-WAVE-L-1 L06 stamp placement planning gaps', () => {
  test('两个模板图层映射到同一目标层且同格落笔：ambiguous-destination 整笔拒绝', () => {
    const plan = planStampPlacement({
      mapId: 'map-a',
      map: fixtureMap(),
      mapRevision: 1,
      template: twoLayerTemplate(),
      anchor: { row: 0, col: 0 },
      placementBaseHeight: 0,
      mappings: [
        { layerSlotId: 'layer-a', targetLayerId: 'floor' },
        { layerSlotId: 'layer-b', targetLayerId: 'floor' },
      ],
      permission: writable,
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject',
    })
    expect(plan.issues).toContainEqual({
      code: 'ambiguous-destination',
      message: '多个组合实例映射到同一视觉槽 floor:0:0。',
      layerSlotId: 'layer-b',
      ref: { layerId: 'floor', row: 0, col: 0 },
    })
    expect(plan.canApply).toBe(false)
    expect(plan.resolvedVisual).toHaveLength(1)
    expect(plan.resolvedVisual[0]?.layerSlotId).toBe('layer-a')
    expect(plan.patch.visual).toEqual([
      { channel: 'tileId', ref: { layerId: 'floor', row: 0, col: 0 }, value: 1 },
      { channel: 'tilesetId', ref: { layerId: 'floor', row: 0, col: 0 }, value: 'tiles' },
      { channel: 'height', ref: { layerId: 'floor', row: 0, col: 0 }, value: 0 },
    ])
  })

  test('模板瓦片缺来源实例：patch-invalid 指名实例且整笔不可提交', () => {
    const template = twoLayerTemplate()
    const broken: StampTemplate = {
      ...template,
      layers: template.layers.slice(0, 1).map((layer) => ({
        ...layer,
        sources: [
          [null, null],
          [null, null],
        ],
      })),
    }
    const plan = planStampPlacement({
      mapId: 'map-a',
      map: fixtureMap(),
      mapRevision: 1,
      template: broken,
      anchor: { row: 0, col: 0 },
      placementBaseHeight: 0,
      mappings: [{ layerSlotId: 'layer-a', targetLayerId: 'floor' }],
      permission: writable,
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject',
    })
    expect(plan.issues).toEqual([
      { code: 'patch-invalid', message: '组合视觉实例 layer-a:0:0 缺少来源。' },
    ])
    expect(plan.canApply).toBe(false)
    expect(plan.resolvedVisual).toEqual([])
    expect(plan.preparedPatch).toBeUndefined()
  })
})
