import { describe, expect, test } from 'vitest'
import {
  createBlankStampDraft,
  eraseStampDraftCollision,
  eraseStampDraftVisual,
  setStampDraftVisual,
} from './stamp-draft.js'

describe('TEST-GLM-WAVE-L-1 L05 stamp draft sources & heights lifecycle', () => {
  test('后画字母序更小的瓦片集时，既有 cells 的来源索引被整体重映射', () => {
    let draft = createBlankStampDraft('d', '草稿', 'b')
    expect(draft.tilesetRefs).toEqual(['b'])
    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 7 }, 3, 'b', 0)
    expect(draft.layers[0]?.sources[8]?.[7]).toBe(0)

    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 8 }, 2, 'a', 0)
    expect(draft.tilesetRefs).toEqual(['a', 'b'])
    expect(draft.layers[0]?.sources[8]?.[7]).toBe(1)
    expect(draft.layers[0]?.sources[8]?.[8]).toBe(0)
    expect(draft.layers[0]?.tiles[8]?.[7]).toBe(3)
    expect(draft.layers[0]?.tiles[8]?.[8]).toBe(2)
  })

  test('高度键随内容生灭：全零后整键移除，非零时保留', () => {
    let draft = createBlankStampDraft('d', '草稿', 'b')
    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 7 }, 3, 'b', 2)
    expect(draft.layers[0]?.heights?.[8]?.[7]).toBe(2)
    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 8 }, 4, 'b', 0)
    expect(draft.layers[0]?.heights?.[8]?.[8]).toBe(0)

    draft = eraseStampDraftVisual(draft, 'base', { row: 8, col: 7 })
    expect(draft.layers[0]?.tiles[8]?.[7]).toBeNull()
    expect(draft.layers[0]?.heights).toBeUndefined()

    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 7 }, 3, 'b', 1)
    expect(draft.layers[0]?.heights?.[8]?.[7]).toBe(1)
    draft = eraseStampDraftVisual(draft, 'base', { row: 8, col: 8 })
    expect(draft.layers[0]?.heights?.[8]?.[7]).toBe(1)
  })

  test('零高度落笔不引入 heights 键', () => {
    const draft = setStampDraftVisual(
      createBlankStampDraft('d', '草稿', 'b'),
      'base',
      { row: 8, col: 7 },
      3,
      'b',
      0,
    )
    expect(draft.layers[0]?.tiles[8]?.[7]).toBe(3)
    expect('heights' in (draft.layers[0] ?? {})).toBe(false)
  })

  test('碰撞擦除幂等：已空格返回同一引用', () => {
    const draft = createBlankStampDraft('d', '草稿', 'b')
    expect(eraseStampDraftCollision(draft, { row: 8, col: 7 })).toBe(draft)
  })
})
