// @vitest-environment jsdom
import type { StampTemplateV1 } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { planStampPlacement } from '../core/stamp-placement.js'
import { StampPlacementInspector } from './StampPlacementInspector.js'

function template(): StampTemplateV1 {
  return {
    id: 'multi-conflict',
    name: '多冲突图章',
    tilesetId: 'tiles',
    origin: 'authored',
    layerSlots: [
      { id: 'floor-slot', name: '地面', depthMode: 'flat' },
      { id: 'object-slot', name: '物件', depthMode: 'flat' },
    ],
    visual: [
      { layerSlotId: 'floor-slot', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
      { layerSlotId: 'object-slot', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
    ],
    collision: [{ offset: { dRow: 0, du: 0 }, value: 1 }],
  }
}

describe('StampPlacementInspector', () => {
  test('逐项列出全部普通冲突的通道、坐标与 current → incoming', () => {
    let map = buildBlankProjectMap(2, 2, 'tiles')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'flat'))
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 2, height: 0 },
      { layerId: 'objects', row: 0, col: 0, tileId: 3, height: 0 },
    ])
    map = paintProjectMapCollision(map, [{ row: 0, col: 0, value: 4 }])
    const stamp = template()
    const mappings = [
      { layerSlotId: 'floor-slot', targetLayerId: 'floor' },
      { layerSlotId: 'object-slot', targetLayerId: 'objects' },
    ]
    const plan = planStampPlacement({
      mapId: 'map-a',
      map,
      mapRevision: 7,
      template: stamp,
      anchor: { row: 0, col: 0 },
      mappings,
      permission: { hiddenLayerIds: [], lockedLayerIds: [] },
      availableTileIds: new Set([1, 2, 3]),
      conflictPolicy: 'reject',
    })

    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <StampPlacementInspector
        template={stamp}
        map={map}
        mappings={mappings}
        plan={plan}
        activeLayerId="floor"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set()}
        onMapSlot={vi.fn()}
        onCommit={vi.fn()}
        onOverwrite={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const details = host.querySelector('[aria-label="图章放置问题明细"]')!
    expect(details.querySelectorAll('li.conflict')).toHaveLength(3)
    expect(details.textContent).toMatch(/普通视觉.*floor · r0:c0.*2 → 1/s)
    expect(details.textContent).toMatch(/普通视觉.*objects · r0:c0.*3 → 1/s)
    expect(details.textContent).toMatch(/普通碰撞.*r0:c0.*4 → 1/s)
  })

  test('错误不截断，全部保留可读消息与可定位坐标', () => {
    const map = buildBlankProjectMap(1, 1, 'tiles')
    const stamp = template()
    const basePlan = planStampPlacement({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template: stamp,
      anchor: { row: 0, col: 0 },
      mappings: [],
      permission: { hiddenLayerIds: [], lockedLayerIds: [] },
      availableTileIds: new Set([1]),
      conflictPolicy: 'reject',
    })
    const plan = {
      ...basePlan,
      issues: Array.from({ length: 5 }, (_, index) => ({
        code: 'out-of-bounds' as const,
        message: `错误 ${index + 1}`,
        ref: { row: index, col: index + 1 },
      })),
    }
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <StampPlacementInspector
        template={stamp}
        map={map}
        mappings={[]}
        plan={plan}
        activeLayerId="floor"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set()}
        onMapSlot={vi.fn()}
        onCommit={vi.fn()}
        onOverwrite={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const details = host.querySelector('[aria-label="图章放置问题明细"]')!
    expect(details.querySelectorAll('li.error')).toHaveLength(5)
    expect(details.textContent).toContain('错误 5')
    expect(details.textContent).toContain('r4:c5')
  })
})
