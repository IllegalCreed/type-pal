import { formatStampTemplates, type StampTemplateV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { nudgeIsometricLattice, resolveRelativeLatticeOffset } from './map-transform.js'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  createBlankStampDraft,
  deleteStampDraftLayer,
  eraseStampDraftVisual,
  moveStampDraftLayer,
  moveStampDraftSelection,
  openStampDraft,
  reanchorStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
  stampDraftPoint,
  stampDraftPointKey,
  updateStampDraftLayer,
} from './stamp-draft.js'

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
      { layerSlotId: 'roof', offset: { dRow: 3, du: -1 }, tileId: 9, height: 3 },
      { layerSlotId: 'ground', offset: { dRow: -2, du: -2 }, tileId: 2, height: 0 },
      { layerSlotId: 'roof', offset: { dRow: 1, du: 1 }, tileId: 8, height: 2 },
    ],
    collision: [
      { offset: { dRow: 1, du: -1 }, value: 1 },
      { offset: { dRow: -1, du: -1 }, value: 0 },
    ],
  }
}

describe('stamp draft', () => {
  test('canonicalizes negative offsets and repeated open-save is byte stable', () => {
    const first = canonicalizeStampDraft(openStampDraft(fixture()), new Set([2, 8, 9]))
    const second = canonicalizeStampDraft(openStampDraft(first), new Set([2, 8, 9]))
    expect(formatStampTemplates([second])).toBe(formatStampTemplates([first]))
    expect(first.visual.map((member) => member.layerSlotId)).toEqual(['ground', 'roof', 'roof'])
    for (const member of [...first.visual, ...first.collision])
      expect(Math.abs(member.offset.dRow % 2)).toBe(Math.abs(member.offset.du % 2))
    expect(() => canonicalizeStampDraft(first, new Set([2, 8]))).toThrow('瓦片集缺少 tileId：9')

    const wrongParity = openStampDraft(first)
    wrongParity.visual[0]!.offset = { dRow: 0, du: 1 }
    expect(() => canonicalizeStampDraft(wrongParity)).toThrow('必须同奇偶')
  })

  test('reanchors outside the member bounds without changing absolute draft points', () => {
    const before = fixture()
    const anchor = { row: 5, col: -4 }
    const after = canonicalizeStampDraft(reanchorStampDraft(before, anchor), new Set([2, 8, 9]))
    const restoredPoints = after.visual.map((member) =>
      resolveRelativeLatticeOffset(anchor, member.offset),
    )
    const originalPoints = canonicalizeStampDraft(before).visual.map((member) =>
      stampDraftPoint(member.offset),
    )
    expect(restoredPoints).toEqual(originalPoints)
  })

  test('supports layer CRUD and keeps flat members at height zero', () => {
    let draft = fixture()
    draft = addStampDraftLayer(draft, { id: 'decor', name: '装饰', depthMode: 'height' })
    expect(() => canonicalizeStampDraft(draft)).toThrow('没有视觉成员')
    draft = setStampDraftVisual(draft, 'decor', { row: 0, col: 1 }, 11, 4)
    draft = moveStampDraftLayer(draft, 'decor', -1)
    expect(draft.layerSlots.map((slot) => slot.id)).toEqual(['ground', 'decor', 'roof'])
    draft = updateStampDraftLayer(draft, 'decor', { name: '前景装饰', depthMode: 'flat' })
    expect(draft.visual.find((member) => member.layerSlotId === 'decor')?.height).toBe(0)
    draft = deleteStampDraftLayer(draft, 'decor')
    expect(draft.layerSlots.map((slot) => slot.id)).toEqual(['ground', 'roof'])
  })

  test('guards the last visual member and keeps invalid blank drafts local', () => {
    let draft = createBlankStampDraft('new-gate', '新门楼', 'town')
    expect(() => canonicalizeStampDraft(draft)).toThrow('至少包含一个视觉成员')
    draft = setStampDraftVisual(draft, 'base', { row: 0, col: 0 }, 2, 0)
    expect(() => eraseStampDraftVisual(draft, 'base', { row: 0, col: 0 })).toThrow(
      '至少保留一个视觉成员',
    )
    expect(canonicalizeStampDraft(draft, new Set([2])).visual).toHaveLength(1)
  })

  test('moves selected visual/collision members on the isometric lattice and rejects conflicts', () => {
    let draft = fixture()
    const roofPoint = stampDraftPoint(
      draft.visual.find((member) => member.layerSlotId === 'roof')!.offset,
    )
    draft = moveStampDraftSelection(
      draft,
      { kind: 'visual', layerSlotId: 'roof' },
      [roofPoint],
      'right',
    )
    const movedRoofPoints = draft.visual
      .filter((member) => member.layerSlotId === 'roof')
      .map((member) => stampDraftPointKey(stampDraftPoint(member.offset)))
    expect(movedRoofPoints).toContain(stampDraftPointKey(nudgeIsometricLattice(roofPoint, 'right')))

    const collisionPoint = stampDraftPoint(draft.collision[0]!.offset)
    draft = moveStampDraftSelection(draft, { kind: 'collision' }, [collisionPoint], 'left')
    expect(
      draft.collision.some(
        (member) =>
          stampDraftPointKey(stampDraftPoint(member.offset)) ===
          stampDraftPointKey(nudgeIsometricLattice(collisionPoint, 'left')),
      ),
    ).toBe(true)

    draft = setStampDraftCollision(draft, { row: 8, col: 8 }, 0)
    expect(draft.collision.at(-1)?.value).toBe(0)
  })
})
