import { mapInstanceHeight, type StampTemplateV1 } from '@type-pal/content'
import { isLatticeInside } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { isometricBrushPoints } from './isometric-brush.js'
import { stampDraftMapAdapter } from './stamp-draft-map.js'
import { stampDraftPoint, stampDraftPointKey } from './stamp-draft.js'

function fixture(): StampTemplateV1 {
  return {
    id: 'gate',
    name: '村口门楼',
    tilesetId: 'town',
    origin: 'authored',
    layerSlots: [
      { id: 'ground', name: '地面', depthMode: 'flat' },
      { id: 'roof', name: '屋檐', depthMode: 'height' },
    ],
    visual: [
      { layerSlotId: 'ground', offset: { dRow: -2, du: -2 }, tileId: 2, height: 0 },
      { layerSlotId: 'roof', offset: { dRow: 3, du: -1 }, tileId: 9, height: 5 },
    ],
    collision: [
      { offset: { dRow: -1, du: -1 }, value: 0 },
      { offset: { dRow: 1, du: 1 }, value: 1 },
    ],
  }
}

describe('stamp draft transient map adapter', () => {
  test('round-trips negative relative lattice positions without parity drift', () => {
    const adapter = stampDraftMapAdapter(fixture())
    for (const member of [...fixture().visual, ...fixture().collision]) {
      const point = stampDraftPoint(member.offset)
      const mapped = adapter.toMapPoint(point)
      expect(isLatticeInside(adapter.map, mapped)).toBe(true)
      expect(adapter.toDraftPoint(mapped)).toEqual(point)
    }
    expect(adapter.anchor.row % 2).toBe(0)
  })

  test('presents stamp layers, instance heights and sparse collision through ProjectMap semantics', () => {
    const draft = fixture()
    const adapter = stampDraftMapAdapter(draft)
    const roof = adapter.map.layers.find((layer) => layer.id === 'roof')!
    const roofPoint = adapter.toMapPoint(stampDraftPoint(draft.visual[1]!.offset))
    expect(roof.tiles[roofPoint.row]?.[roofPoint.col]).toBe(9)
    expect(mapInstanceHeight(roof, roofPoint.row, roofPoint.col)).toBe(5)

    const explicitZero = adapter.toMapPoint(stampDraftPoint(draft.collision[0]!.offset))
    expect(adapter.map.collision[explicitZero.row]?.[explicitZero.col]).toBe(0)
    expect(adapter.collisionMemberKeys.has(stampDraftPointKey(explicitZero))).toBe(true)
  })

  test('keeps the full 5×5 isometric brush footprint inside the transient map margin', () => {
    const adapter = stampDraftMapAdapter(fixture())
    for (const point of isometricBrushPoints({ row: 0, col: 0 }, 5))
      expect(isLatticeInside(adapter.map, adapter.toMapPoint(point))).toBe(true)
  })
})
