/**
 * TEST-CURSOR-MAP-LOGIC-2 M1：stamp-draft 剩余公开入口。
 * 不去重 stamp-draft.boundaries 层门/空名/Map availableTiles。
 */
import { validateStampTemplates } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-map-logic-fixtures.js'
import { nudgeIsometricLattice } from './map-transform.js'
import {
  canonicalizeStampDraft,
  createBlankStampDraft,
  moveStampDraftSelection,
  nextStampLayerSlotId,
  resizeStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
  stampDraftBounds,
} from './stamp-draft.js'

const TS = 'tiles'
const point = (row: number, col: number) => ({ row, col })

function painted(height = 2) {
  return setStampDraftVisual(
    createBlankStampDraft('bush', '灌木', TS),
    'base',
    point(8, 7),
    1,
    TS,
    height,
  )
}

describe('M1 stamp-draft 剩余合同', () => {
  test('setStampDraftVisual 越界/缺层拒绝；合法高度经 canonicalize 过 validator', () => {
    const blank = createBlankStampDraft('bush', '灌木', TS)
    const rejectSnap = inputSnap(blank)
    expect(() => setStampDraftVisual(blank, 'base', point(99, 0), 1, TS, 0)).toThrow(
      '组合绘制点超出局部地图边界。',
    )
    expect(blank).toEqual(rejectSnap)
    expect(() => setStampDraftVisual(blank, 'ghost', point(8, 7), 1, TS, 0)).toThrow(
      '组合图层 “ghost” 不存在。',
    )
    expect(blank).toEqual(rejectSnap)
    const paintSnap = inputSnap(blank)
    const paintedDraft = setStampDraftVisual(blank, 'base', point(8, 7), 1, TS, 2)
    expect(blank).toEqual(paintSnap)
    expect(paintedDraft.layers[0]!.tiles[8]![7]).toBe(1)
    expect(paintedDraft.layers[0]!.heights?.[8]![7]).toBe(2)
    const canonicalSnap = inputSnap(paintedDraft)
    const canonical = canonicalizeStampDraft(paintedDraft, new Map([[TS, new Set([1])]]))
    expect(paintedDraft).toEqual(canonicalSnap)
    expect(validateStampTemplates([canonical])[0]!.layers[0]!.heights?.[8]![7]).toBe(2)
  })

  test('setStampDraftCollision 越界/负值拒绝；0 值可 canonicalize', () => {
    const draft = painted(0)
    const rejectSnap = inputSnap(draft)
    expect(() => setStampDraftCollision(draft, point(-1, 0), 1)).toThrow(
      '组合绘制点超出局部地图边界。',
    )
    expect(draft).toEqual(rejectSnap)
    expect(() => setStampDraftCollision(draft, point(8, 7), -1)).toThrow('碰撞值必须是非负整数。')
    expect(draft).toEqual(rejectSnap)
    const writeSnap = inputSnap(draft)
    const withCollision = setStampDraftCollision(draft, point(8, 7), 0)
    expect(draft).toEqual(writeSnap)
    expect(withCollision.collision[8]![7]).toBe(0)
    const canonicalSnap = inputSnap(withCollision)
    expect(
      canonicalizeStampDraft(withCollision, new Map([[TS, new Set([1])]])).collision[8]![7],
    ).toBe(0)
    expect(withCollision).toEqual(canonicalSnap)
  })

  test('moveStampDraftSelection：空点同引用；占用目标拒绝；两点重叠平移保双方值', () => {
    const first = painted(2)
    const occupiedAt = nudgeIsometricLattice(point(8, 7), 'down')
    const two = setStampDraftVisual(first, 'base', occupiedAt, 3, TS, 1)
    const emptySnap = inputSnap(two)
    expect(moveStampDraftSelection(two, { kind: 'visual', layerSlotId: 'base' }, [], 'right')).toBe(
      two,
    )
    expect(two).toEqual(emptySnap)
    const occupiedSnap = inputSnap(two)
    expect(() =>
      moveStampDraftSelection(two, { kind: 'visual', layerSlotId: 'base' }, [point(8, 7)], 'down'),
    ).toThrow('移动目标在当前视觉层已有成员，请先清理目标位置。')
    expect(two).toEqual(occupiedSnap)
    const edge = setStampDraftVisual(
      createBlankStampDraft('edge', '边', TS),
      'base',
      point(0, 0),
      1,
      TS,
      0,
    )
    const edgeSnap = inputSnap(edge)
    expect(() =>
      moveStampDraftSelection(edge, { kind: 'visual', layerSlotId: 'base' }, [point(0, 0)], 'up'),
    ).toThrow('移动目标超出组合边界。')
    expect(edge).toEqual(edgeSnap)
    const moveSnap = inputSnap(two)
    const moved = moveStampDraftSelection(
      two,
      { kind: 'visual', layerSlotId: 'base' },
      [point(8, 7), occupiedAt],
      'down',
    )
    expect(two).toEqual(moveSnap)
    const firstDest = nudgeIsometricLattice(point(8, 7), 'down')
    const secondDest = nudgeIsometricLattice(occupiedAt, 'down')
    expect(moved.layers[0]!.tiles[firstDest.row]![firstDest.col]).toBe(1)
    expect(moved.layers[0]!.heights?.[firstDest.row]![firstDest.col]).toBe(2)
    expect(moved.layers[0]!.tiles[secondDest.row]![secondDest.col]).toBe(3)
    expect(moved.layers[0]!.heights?.[secondDest.row]![secondDest.col]).toBe(1)
  })

  test('resizeStampDraft 同尺寸返回原对象；扩画布保留 heights', () => {
    const draft = painted(2)
    const identitySnap = inputSnap(draft)
    expect(resizeStampDraft(draft, draft.width, draft.height)).toBe(draft)
    expect(draft).toEqual(identitySnap)
    const expandSnap = inputSnap(draft)
    const expanded = resizeStampDraft(draft, draft.width + 1, draft.height + 1)
    expect(draft).toEqual(expandSnap)
    expect(expanded.width).toBe(17)
    expect(expanded.height).toBe(9)
    expect(expanded.layers[0]!.heights?.[8]![7]).toBe(2)
    expect(expanded.layers[0]!.tiles[8]![7]).toBe(1)
  })

  test('stampDraftBounds 默认 padding=2；padding=0 精确贴边', () => {
    const draft = painted(0)
    const snap = inputSnap(draft)
    expect(stampDraftBounds(draft)).toEqual({
      minRow: -2,
      maxRow: draft.height * 2 - 1 + 2,
      minCol: -2,
      maxCol: draft.width - 1 + 2,
      minU: -4,
      maxU: 35,
    })
    expect(draft).toEqual(snap)
    const tight = stampDraftBounds(draft, 0)
    expect(draft).toEqual(snap)
    expect(tight.minRow + 0).toBe(0)
    expect(tight.maxRow).toBe(15)
    expect(tight.minCol + 0).toBe(0)
    expect(tight.maxCol).toBe(15)
    expect(tight.minU + 0).toBe(0)
    expect(tight.maxU).toBe(31)
  })

  test('nextStampLayerSlotId：base 已占用则给 base-2', () => {
    const draft = painted(0)
    const snap = inputSnap(draft)
    expect(nextStampLayerSlotId(draft, 'base')).toBe('base-2')
    expect(nextStampLayerSlotId(draft, 'layer')).toBe('layer')
    expect(draft).toEqual(snap)
  })
})
