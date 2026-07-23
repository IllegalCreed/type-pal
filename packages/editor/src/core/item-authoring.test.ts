import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  cloneItemForAuthoring,
  createBlankItem,
  nextAuthoredItemId,
  nextCopiedItemId,
} from './item-authoring.js'

const item = (id: string): ItemData => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
})

describe('item authoring ids', () => {
  test('空工程与冲突工程都生成稳定作者 id', () => {
    expect(nextAuthoredItemId([])).toBe('item-001')
    expect(nextAuthoredItemId([item('267'), item('item-001'), item('item-003')])).toBe('item-002')
    expect(createBlankItem([])).toMatchObject({ id: 'item-001', name: '新物品' })
  })

  test('复制 id 可预测且深拷贝能力数据', () => {
    const source: ItemData = {
      ...item('key'),
      icon: 'item-icon.shared',
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 20 }] },
    }
    expect(nextCopiedItemId('key', [source])).toBe('key-copy')
    const copy = cloneItemForAuthoring(source, [source, item('key-copy')])
    expect(copy.id).toBe('key-copy-2')
    expect(copy.icon).toBe(source.icon)
    expect(copy.use).not.toBe(source.use)
    copy.use!.effects[0] = { kind: 'healHp', amount: 99 }
    expect(source.use!.effects[0]).toEqual({ kind: 'healHp', amount: 20 })
  })
})
