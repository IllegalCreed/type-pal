/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G05：stamp-draft 选择与边界（不重复 L 层 remap/heights）。
 * 排重：stamp-draft.test 主干 CRUD/canonicalize；boundaries M04 层门；glm-l L05 来源重映射与
 * heights 生灭；background M1 剩余入口——本文件补 moveSelection、stampDraftBounds、nextStampLayerSlotId。
 */
import { describe, expect, test } from 'vitest'
import { nudgeIsometricLattice } from './map-transform.js'
import {
  createBlankStampDraft,
  moveStampDraftLayer,
  moveStampDraftSelection,
  nextStampLayerSlotId,
  setStampDraftCollision,
  setStampDraftVisual,
  stampDraftBounds,
  stampDraftPointKey,
} from './stamp-draft.js'

const TS = 'starter'

describe('C08-G05 stamp-draft 选择移动与层 slot', () => {
  test('C08-G05-01 nextStampLayerSlotId 基名可用时返回 base', () => {
    const draft = createBlankStampDraft('d', '草稿', TS)
    expect(nextStampLayerSlotId(draft, 'roof')).toBe('roof')
  })

  test('C08-G05-02 nextStampLayerSlotId 冲突时递增 -2/-3 后缀', () => {
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = {
      ...draft,
      layers: [
        ...draft.layers,
        {
          id: 'roof',
          name: 'Roof',
          tiles: draft.layers[0]!.tiles,
          sources: draft.layers[0]!.sources,
        },
        {
          id: 'roof-2',
          name: 'Roof2',
          tiles: draft.layers[0]!.tiles,
          sources: draft.layers[0]!.sources,
        },
      ],
    }
    expect(nextStampLayerSlotId(draft, 'roof')).toBe('roof-3')
  })

  test('C08-G05-03 stampDraftBounds 默认 padding=2 扩展错排 U 范围', () => {
    const draft = createBlankStampDraft('d', '草稿', TS)
    const bounds = stampDraftBounds(draft)
    expect(bounds.minCol).toBe(-2)
    expect(bounds.maxCol).toBe(draft.width - 1 + 2)
    expect(bounds.minRow).toBe(-2)
    expect(bounds.maxRow).toBe(draft.height * 2 - 1 + 2)
  })

  test('C08-G05-04 stampDraftPointKey 稳定 row:col 文本', () => {
    expect(stampDraftPointKey({ row: 8, col: 7 })).toBe('8:7')
  })

  test('C08-G05-05 moveStampDraftLayer 上移一层交换顺序', () => {
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = {
      ...draft,
      layers: [
        draft.layers[0]!,
        {
          id: 'roof',
          name: 'Roof',
          tiles: draft.layers[0]!.tiles,
          sources: draft.layers[0]!.sources,
        },
      ],
    }
    draft = setStampDraftVisual(draft, 'base', { row: 8, col: 7 }, 1, TS, 0)
    draft = setStampDraftVisual(draft, 'roof', { row: 8, col: 8 }, 2, TS, 0)
    const moved = moveStampDraftLayer(draft, 'roof', -1)
    expect(moved.layers.map((layer) => layer.id)).toEqual(['roof', 'base'])
  })

  test('C08-G05-06 moveStampDraftSelection 视觉层 right 一步：tile 与 source 同步迁移', () => {
    const source = { row: 8, col: 7 }
    const target = nudgeIsometricLattice(source, 'right')
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = setStampDraftVisual(draft, 'base', source, 3, TS, 0)
    const moved = moveStampDraftSelection(
      draft,
      { kind: 'visual', layerSlotId: 'base' },
      [source],
      'right',
    )
    expect(moved.layers[0]?.tiles[source.row]?.[source.col]).toBeNull()
    expect(moved.layers[0]?.tiles[target.row]?.[target.col]).toBe(3)
    expect(moved.layers[0]?.sources[target.row]?.[target.col]).toBe(0)
  })

  test('C08-G05-07 moveStampDraftSelection 碰撞层 down 迁移保留数值', () => {
    const source = { row: 8, col: 7 }
    const target = nudgeIsometricLattice(source, 'down')
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = setStampDraftVisual(draft, 'base', source, 1, TS, 0)
    draft = setStampDraftCollision(draft, source, 2)
    const moved = moveStampDraftSelection(draft, { kind: 'collision' }, [source], 'down')
    expect(moved.collision[source.row]?.[source.col]).toBeNull()
    expect(moved.collision[target.row]?.[target.col]).toBe(2)
  })

  test('C08-G05-08 moveStampDraftSelection 空 points 返回原 draft 引用', () => {
    const draft = createBlankStampDraft('d', '草稿', TS)
    expect(moveStampDraftSelection(draft, { kind: 'collision' }, [], 'up')).toBe(draft)
  })

  test('C08-G05-09 moveStampDraftSelection 视觉目标占用抛错且状态不变', () => {
    const source = { row: 8, col: 7 }
    const target = nudgeIsometricLattice(source, 'right')
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = setStampDraftVisual(draft, 'base', source, 1, TS, 0)
    draft = setStampDraftVisual(draft, 'base', target, 2, TS, 0)
    const snapshot = structuredClone(draft)
    expect(() =>
      moveStampDraftSelection(draft, { kind: 'visual', layerSlotId: 'base' }, [source], 'right'),
    ).toThrow(/已有成员/)
    expect(draft).toEqual(snapshot)
  })

  test('C08-G05-10 moveStampDraftSelection 越界方向抛错', () => {
    let draft = createBlankStampDraft('d', '草稿', TS)
    draft = setStampDraftVisual(draft, 'base', { row: 0, col: 0 }, 1, TS, 0)
    expect(() =>
      moveStampDraftSelection(
        draft,
        { kind: 'visual', layerSlotId: 'base' },
        [{ row: 0, col: 0 }],
        'up',
      ),
    ).toThrow('移动目标超出组合边界。')
  })
})
