/**
 * TEST-EDITOR-MAP-DATA-1 M04：stamp-draft CRUD 门（stamp-draft.ts）。
 * 既有 stamp-draft.test 已覆盖来源保真/resize/CRUD 主干/最后视觉/旧移动——不重复。
 * 本文件：空名与重复 ID 精确拒绝、缺层精确拒绝、layerTo 边界 no-op 身份不变、
 * 两层仅一有值时删最后视觉拒绝、Map 式 availableTiles 缺 tile 拒绝（Set 式不测无 caller）。
 */

import type { StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  createBlankStampDraft,
  deleteStampDraftLayer,
  moveStampDraftLayerTo,
  setStampDraftVisual,
  updateStampDraftLayer,
} from './stamp-draft.js'

const TS = 'ts-a'
const point = (row: number, col: number) => ({ row, col })

function paintedDraft(): StampTemplate {
  return setStampDraftVisual(createBlankStampDraft('d', '草稿', TS), 'base', point(2, 3), 5, TS, 0)
}

describe('M04 stamp-draft 层 CRUD 门', () => {
  test('空 ID/空名/重复 ID/缺层精确拒绝', () => {
    const draft = paintedDraft()
    expect(() => addStampDraftLayer(draft, { id: ' ', name: 'x' })).toThrow(
      '组合图层 ID 和名称不能为空。',
    )
    expect(() => addStampDraftLayer(draft, { id: 'x', name: '' })).toThrow(
      '组合图层 ID 和名称不能为空。',
    )
    expect(() => addStampDraftLayer(draft, { id: 'base', name: '重' })).toThrow(
      '组合图层 ID “base” 已存在。',
    )
    expect(() => updateStampDraftLayer(draft, 'ghost', { name: 'n' })).toThrow(
      '组合图层 “ghost” 不存在。',
    )
    // 单层时 delete 先触发"至少保留一层"门（守卫顺序即合同）
    expect(() => deleteStampDraftLayer(draft, 'ghost')).toThrow('组合必须至少保留一个视觉层。')
  })
  test('moveLayerTo 越界/原位 no-op 返回原对象身份', () => {
    const draft = paintedDraft()
    expect(moveStampDraftLayerTo(draft, 'base', -1)).toBe(draft)
    expect(moveStampDraftLayerTo(draft, 'base', 99)).toBe(draft)
    expect(moveStampDraftLayerTo(draft, 'base', 0)).toBe(draft) // 原位
  })
  test('两层仅其一有值：删有值层拒绝（保最后视觉），删空层通过', () => {
    const two = addStampDraftLayer(paintedDraft(), { id: 'empty', name: '空层' })
    expect(() => deleteStampDraftLayer(two, 'ghost')).toThrow('组合图层 “ghost” 不存在。')
    // base 有视觉、empty 空 → 删 base 拒绝
    expect(() => deleteStampDraftLayer(two, 'base')).toThrow('不能删除包含最后一个视觉成员的图层。')
    // 删 empty（无视觉）通过
    const after = deleteStampDraftLayer(two, 'empty')
    expect(after.layers.map((layer) => layer.id)).toEqual(['base'])
    // 单层删 → 至少保留一层拒绝
    expect(() => deleteStampDraftLayer(paintedDraft(), 'base')).toThrow(
      '组合必须至少保留一个视觉层。',
    )
  })
  test('canonicalize：Map 式 availableTiles 缺 tile 精确拒绝；合法 draft 通过真 validator', () => {
    const draft = paintedDraft()
    const available = new Map([[TS, new Set([1, 2, 3])]])
    expect(() => canonicalizeStampDraft(draft, available)).toThrow(`瓦片集 ${TS} 缺少 tileId：5。`)
    const ok = canonicalizeStampDraft(draft, new Map([[TS, new Set([5])]]))
    expect(ok.id).toBe('d')
    expect(ok.layers[0]!.tiles[2]![3]).toBe(5)
  })
})
