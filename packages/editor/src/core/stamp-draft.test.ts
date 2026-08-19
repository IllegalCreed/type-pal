import { formatStampTemplates, mapInstanceTilesetId, type StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  createBlankStampDraft,
  deleteStampDraftLayer,
  eraseStampDraftCollision,
  eraseStampDraftVisual,
  moveStampDraftLayer,
  moveStampDraftSelection,
  openStampDraft,
  reanchorStampDraft,
  resizeStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
  updateStampDraftLayer,
} from './stamp-draft.js'

function fixture(): StampTemplate {
  let draft = createBlankStampDraft('gate', '村口门楼', 'town')
  draft = setStampDraftVisual(draft, 'base', { row: 8, col: 7 }, 2, 'town', 0)
  draft = addStampDraftLayer(draft, { id: 'roof', name: '屋檐' })
  draft = setStampDraftVisual(draft, 'roof', { row: 7, col: 7 }, 8, 'roof', 2)
  draft = setStampDraftVisual(draft, 'roof', { row: 9, col: 7 }, 9, 'roof', 3)
  draft = setStampDraftCollision(draft, { row: 8, col: 7 }, 0)
  draft = setStampDraftCollision(draft, { row: 9, col: 7 }, 1)
  return draft
}

const available = new Map([
  ['town', new Set([2])],
  ['roof', new Set([8, 9])],
])

describe('canonical stamp draft', () => {
  test('open-save is byte stable and validates every per-cell source', () => {
    const first = canonicalizeStampDraft(openStampDraft(fixture()), available)
    const second = canonicalizeStampDraft(openStampDraft(first), available)
    expect(formatStampTemplates([second])).toBe(formatStampTemplates([first]))
    expect(first.tilesetRefs).toEqual(['roof', 'town'])
    expect(mapInstanceTilesetId(first, first.layers[0]!, 8, 7)).toBe('town')
    expect(() => canonicalizeStampDraft(first, new Map([['town', new Set([2])]]))).toThrow(
      '缺少 tileId',
    )
  })

  test('reanchor only changes the local anchor and must remain inside the mini map', () => {
    const before = fixture()
    const after = reanchorStampDraft(before, { row: 10, col: 8 })
    expect(after.anchor).toEqual({ row: 10, col: 8 })
    expect(after.layers).toEqual(before.layers)
    expect(() => reanchorStampDraft(before, { row: -1, col: 0 })).toThrow('边界内')
  })

  test('canvas resize is top-left anchored, expands dense matrices and only shrinks empty edges', () => {
    const before = fixture()
    const expanded = resizeStampDraft(before, 18, 10)
    expect(expanded).toMatchObject({ width: 18, height: 10, anchor: before.anchor })
    expect(expanded.layers[1]?.tiles[7]?.[7]).toBe(8)
    expect(expanded.layers[1]?.tiles).toHaveLength(20)
    expect(expanded.layers[1]?.tiles[0]).toHaveLength(18)
    expect(expanded.collision).toHaveLength(20)

    let compact = createBlankStampDraft('compact', '紧凑组合', 'town')
    compact = reanchorStampDraft(compact, { row: 0, col: 0 })
    compact = setStampDraftVisual(compact, 'base', { row: 0, col: 0 }, 2, 'town', 0)
    expect(resizeStampDraft(compact, 3, 2)).toMatchObject({ width: 3, height: 2 })
  })

  test('canvas shrink rejects clipping the anchor, visual tiles or collision', () => {
    expect(() => resizeStampDraft(fixture(), 7, 8)).toThrow('锚点')

    let visual = reanchorStampDraft(fixture(), { row: 0, col: 0 })
    expect(() => resizeStampDraft(visual, 7, 8)).toThrow('视觉瓦片')

    let collision = createBlankStampDraft('collision', '碰撞边缘', 'town')
    collision = reanchorStampDraft(collision, { row: 0, col: 0 })
    collision = setStampDraftVisual(collision, 'base', { row: 0, col: 0 }, 2, 'town', 0)
    collision = setStampDraftCollision(collision, { row: 0, col: 2 }, 1)
    expect(() => resizeStampDraft(collision, 2, 8)).toThrow('碰撞')
  })

  test('layer CRUD preserves dense matrices', () => {
    let draft = fixture()
    draft = addStampDraftLayer(draft, { id: 'decor', name: '装饰' })
    draft = setStampDraftVisual(draft, 'decor', { row: 8, col: 8 }, 11, 'town', 4)
    draft = moveStampDraftLayer(draft, 'decor', -1)
    draft = updateStampDraftLayer(draft, 'decor', { name: '前景装饰' })
    expect(draft.layers.map(({ id }) => id)).toEqual(['base', 'decor', 'roof'])
    expect(draft.layers[1]?.heights?.[8]?.[8]).toBe(4)
    draft = deleteStampDraftLayer(draft, 'decor')
    expect(draft.layers.map(({ id }) => id)).toEqual(['base', 'roof'])
  })

  test('blank draft stays local-invalid and the last visual member cannot be erased', () => {
    let draft = createBlankStampDraft('new-gate', '新门楼', 'town')
    expect(() => canonicalizeStampDraft(draft)).toThrow('视觉瓦片实例')
    draft = setStampDraftVisual(draft, 'base', { row: 0, col: 0 }, 2, 'town', 0)
    expect(() => eraseStampDraftVisual(draft, 'base', { row: 0, col: 0 })).toThrow('至少保留')
  })

  test('selection moves tile/source/relative-height and nullable collision in lockstep', () => {
    const before = fixture()
    const visual = moveStampDraftSelection(
      before,
      { kind: 'visual', layerSlotId: 'roof' },
      [{ row: 7, col: 7 }],
      'right',
    )
    expect(visual.layers[1]?.tiles[8]?.[8]).toBe(8)
    expect(visual.layers[1]?.heights?.[8]?.[8]).toBe(2)
    expect(mapInstanceTilesetId(visual, visual.layers[1]!, 8, 8)).toBe('roof')

    const collision = moveStampDraftSelection(
      before,
      { kind: 'collision' },
      [{ row: 9, col: 7 }],
      'right',
    )
    expect(collision.collision[10]?.[8]).toBe(1)
    expect(eraseStampDraftCollision(collision, { row: 10, col: 8 }).collision[10]?.[8]).toBeNull()
  })
})
